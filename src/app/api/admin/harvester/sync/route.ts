import { NextRequest, NextResponse } from 'next/server';
import { importHarvestedMovieAction, HarvestedMovieGroup } from '@/app/admin/actions';
import { cleanHarvesterTitle } from '@/lib/harvester-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check payload
    let rawItems: any[] = [];
    let requireTmdbMatch = true;

    if (Array.isArray(body)) {
      rawItems = body;
    } else if (body && Array.isArray(body.items)) {
      rawItems = body.items;
      if (body.requireTmdbMatch !== undefined) {
        requireTmdbMatch = Boolean(body.requireTmdbMatch);
      }
    } else if (body && Array.isArray(body.movies)) {
      rawItems = body.movies;
      if (body.requireTmdbMatch !== undefined) {
        requireTmdbMatch = Boolean(body.requireTmdbMatch);
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid payload. Expected an array of scraped movie objects or { items: [...] }' },
        { status: 400 }
      );
    }

    if (rawItems.length === 0) {
      return NextResponse.json({ success: true, processed: 0, imported: 0, skipped: 0, failed: 0 });
    }

    // Convert raw scraped objects to HarvestedMovieGroup
    const groups: HarvestedMovieGroup[] = [];

    for (let idx = 0; idx < rawItems.length; idx++) {
      const item = rawItems[idx];
      const rawTitle = item.title || item.cleanTitle || item.name || `Scraped-Movie-${idx + 1}`;
      const { cleanTitle, year, languageTags, isTvSeries } = cleanHarvesterTitle(rawTitle);

      const rawLinks = item.download_links || item.downloadLinks || item.links || [];
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
        const linkId = idMatch ? parseInt(idMatch[1], 10) : (50000 + idx * 10 + lIdx);
        const jioServer = urlStr.includes('jio=yes') ? 'yes' : undefined;

        return {
          id: linkId,
          quality,
          url: urlStr,
          rawTitle,
          jioServer
        };
      }).filter((l: any) => l.url);

      if (links.length > 0) {
        const groupKey = `${cleanTitle.toLowerCase().trim()}_${year || 'na'}`;
        groups.push({
          key: groupKey,
          cleanTitle,
          rawTitleSample: rawTitle,
          year,
          languageTags,
          isTvSeries,
          links,
          imported: false
        });
      }
    }

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const details: { title: string; status: 'imported' | 'skipped' | 'failed'; contentId?: string; error?: string }[] = [];

    // Process each group with TMDB strict filter
    for (const group of groups) {
      const res = await importHarvestedMovieAction(group, { requireTmdbMatch });
      if (res.success) {
        importedCount++;
        details.push({ title: group.cleanTitle, status: 'imported', contentId: res.contentId });
      } else if (res.skipped) {
        skippedCount++;
        details.push({ title: group.cleanTitle, status: 'skipped', error: res.error });
      } else {
        failedCount++;
        details.push({ title: group.cleanTitle, status: 'failed', error: res.error });
      }
    }

    return NextResponse.json({
      success: true,
      totalReceived: rawItems.length,
      groupsCreated: groups.length,
      importedCount,
      skippedCount,
      failedCount,
      details: details.slice(0, 50) // Return first 50 summary logs
    });
  } catch (error: any) {
    console.error('Error in /api/admin/harvester/sync:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
