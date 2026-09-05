import { NextRequest, NextResponse } from 'next/server';
import { cleanHarvesterTitle, cleanDownloadLabel } from '@/lib/harvester-utils';
import { importHarvestedMovieAction, HarvestedMovieGroup } from '@/app/admin/actions';
import { revalidatePath } from 'next/cache';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    ready: true,
    message: 'FilmyFly Scraper Ingestion API is ready to accept scraped movies and TV shows.',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Normalize payload to array of items
    let rawItems: any[] = [];
    if (Array.isArray(body)) {
      rawItems = body;
    } else if (body && Array.isArray(body.items)) {
      rawItems = body.items;
    } else if (body && typeof body === 'object') {
      rawItems = [body];
    }

    if (rawItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items provided in request body.' },
        { status: 400 }
      );
    }

    // Group items by cleanTitle + year (merging multi-quality links or seasons/episodes)
    const groupsMap = new Map<string, HarvestedMovieGroup & { scrapedPoster?: string; scrapedDescription?: string }>();

    for (let idx = 0; idx < rawItems.length; idx++) {
      const item = rawItems[idx];
      const rawTitle = item.title || item.cleanTitle || item.name || `Scraped-Item-${idx + 1}`;
      const {
        cleanTitle,
        year,
        languageTags,
        isTvSeries,
        seasonNumber,
        episodeNumber,
        isCompleteSeason,
        isEpisodeRange,
        startEpisode,
        endEpisode,
        episodeTitle
      } = cleanHarvesterTitle(rawTitle);

      const typePrefix = isTvSeries ? 'tv' : 'movie';
      const groupKey = `${typePrefix}_${cleanTitle.toLowerCase().trim()}_${year || 'na'}`;

      const rawLinks = item.download_links || item.downloadLinks || item.links || item.qualities || [];
      const links = rawLinks.map((l: any, lIdx: number) => {
        const urlStr = typeof l === 'string' ? l : (l.url || '');
        let quality = '720p';
        const qMatch = urlStr.match(/[?&]q=(\d+)/i);
        if (qMatch) {
          quality = `${qMatch[1]}p`;
        } else if (typeof l === 'object' && l.quality) {
          quality = l.quality;
        }

        const idMatch = urlStr.match(/[?&]id=(\d+)/i);
        const linkId = idMatch ? parseInt(idMatch[1], 10) : (60000 + idx * 10 + lIdx);

        return {
          id: linkId,
          quality,
          url: urlStr,
          rawTitle
        };
      }).filter((l: any) => l.url);

      // If item has no download links, but has a page_url, use it as placeholder if allowed
      if (links.length === 0 && item.page_url) {
        links.push({
          id: 60000 + idx,
          quality: '720p',
          url: item.page_url,
          rawTitle
        });
      }

      if (links.length === 0) continue;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          key: groupKey,
          cleanTitle,
          rawTitleSample: rawTitle,
          year,
          languageTags: [...languageTags],
          isTvSeries,
          links: [],
          seasons: isTvSeries ? [] : undefined,
          scrapedPoster: item.poster_url || item.image_url || item.poster || item.image,
          scrapedDescription: item.description || item.storyline || item.overview
        });
      }

      const group = groupsMap.get(groupKey)!;

      // Merge poster if not yet set
      if (!group.scrapedPoster && (item.poster_url || item.image_url || item.poster || item.image)) {
        group.scrapedPoster = item.poster_url || item.image_url || item.poster || item.image;
      }
      if (!group.scrapedDescription && (item.description || item.storyline || item.overview)) {
        group.scrapedDescription = item.description || item.storyline || item.overview;
      }

      // Merge language tags
      for (const t of languageTags) {
        if (!group.languageTags.includes(t)) group.languageTags.push(t);
      }

      // Merge links
      for (const l of links) {
        if (!group.links.some(el => el.url === l.url)) {
          group.links.push(l);
        }
      }

      // Consolidate TV Series seasons and episodes
      if (group.isTvSeries) {
        if (!group.seasons) group.seasons = [];
        const sNum = seasonNumber || 1;
        let sObj = group.seasons.find(s => s.seasonNumber === sNum);
        if (!sObj) {
          sObj = {
            seasonNumber: sNum,
            seasonTitle: `Season ${sNum}`,
            zipPackLinks: [],
            episodes: []
          };
          group.seasons.push(sObj);
        }

        for (const l of links) {
          const cleanLabel = cleanDownloadLabel(l.quality);
          if (isCompleteSeason) {
            if (!sObj.zipPackLinks) sObj.zipPackLinks = [];
            if (!sObj.zipPackLinks.some(z => z.url === l.url)) {
              sObj.zipPackLinks.push({ label: cleanLabel, url: l.url });
            }
          } else {
            const epNum = startEpisode || episodeNumber || 1;
            const epTitle = isEpisodeRange
              ? `Episodes ${startEpisode || epNum} to ${endEpisode || epNum}`
              : (episodeTitle || `Episode ${epNum}`);

            let epObj = sObj.episodes.find(e =>
              (isEpisodeRange && e.isEpisodeRange && e.startEpisode === startEpisode && e.endEpisode === endEpisode) ||
              e.episodeNumber === epNum
            );

            if (!epObj) {
              epObj = {
                episodeNumber: epNum,
                episodeTitle: epTitle,
                isEpisodeRange: !!isEpisodeRange,
                startEpisode,
                endEpisode,
                downloadLinks: []
              };
              sObj.episodes.push(epObj);
            } else if (isEpisodeRange) {
              epObj.isEpisodeRange = true;
              epObj.startEpisode = startEpisode;
              epObj.endEpisode = endEpisode;
              epObj.episodeTitle = epTitle;
            }

            if (!epObj.downloadLinks) epObj.downloadLinks = [];
            if (!epObj.downloadLinks.some(dl => dl.url === l.url)) {
              epObj.downloadLinks.push({ label: cleanLabel, url: l.url });
            }
          }
        }
      }
    }

    // Sort seasons and episodes
    for (const group of groupsMap.values()) {
      if (group.seasons) {
        group.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
        let totalEps = 0;
        for (const s of group.seasons) {
          s.episodes.sort((a, b) => (a.startEpisode || a.episodeNumber) - (b.startEpisode || b.episodeNumber));
          totalEps += s.episodes.length;
        }
        group.totalEpisodesCount = totalEps;
      }
    }

    const groups = Array.from(groupsMap.values());
    if (groups.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid movies or series with download links could be parsed.'
      }, { status: 400 });
    }

    // Import each group into Firestore using importHarvestedMovieAction
    let imported = 0;
    let merged = 0;
    let skipped = 0;
    let failed = 0;
    const results: any[] = [];

    for (const group of groups) {
      try {
        const res = await importHarvestedMovieAction(group, { requireTmdbMatch: false });
        if (res.success) {
          if (res.isNew) imported++;
          else if (res.merged) merged++;
          else if (res.skipped) skipped++;
          else imported++;

          results.push({
            title: group.cleanTitle,
            type: group.isTvSeries ? 'tv' : 'movie',
            contentId: res.contentId,
            status: res.isNew ? 'imported' : res.merged ? 'merged' : 'skipped'
          });
        } else {
          failed++;
          results.push({
            title: group.cleanTitle,
            status: 'failed',
            error: res.error
          });
        }
      } catch (err: any) {
        failed++;
        results.push({
          title: group.cleanTitle,
          status: 'error',
          error: err?.message || 'Import error'
        });
      }
    }

    // Invalidate site cache so new additions show immediately
    try {
      revalidatePath('/');
      revalidatePath('/movies');
      revalidatePath('/series');
      revalidatePath('/search');
    } catch {
      // Revalidation is non-blocking
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${rawItems.length} items into ${groups.length} distinct titles.`,
      stats: {
        totalReceived: rawItems.length,
        distinctTitles: groups.length,
        imported,
        merged,
        skipped,
        failed
      },
      results
    });
  } catch (error: any) {
    console.error('Ingest API error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Server error processing scraped items.'
    }, { status: 500 });
  }
}
