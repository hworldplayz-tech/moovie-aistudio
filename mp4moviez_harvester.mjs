/**
 * Mp4Moviez Standalone High-Speed ID Harvester & Grouping Engine
 * -------------------------------------------------------------
 * Usage:
 *   node mp4moviez_harvester.mjs [START_ID] [END_ID] [DOMAIN]
 *
 * Example:
 *   node mp4moviez_harvester.mjs 58000 60000 mp4moviez.trading
 */

import fs from 'fs';
import path from 'path';

// Configuration Defaults
const CONFIG = {
  domain: process.argv[4] || 'mp4moviez.trading',
  startId: parseInt(process.argv[2], 10) || 58000,
  endId: parseInt(process.argv[3], 10) || 60000,
  concurrency: 12,           // Number of parallel workers
  requestTimeoutMs: 6000,    // 6 seconds per probe
  checkpointInterval: 50,    // Save file every 50 IDs scanned
  outputJsonFile: 'mp4moviez_catalog.json',
  checkpointFile: 'harvester_checkpoint.json'
};

// State storage
let groupedMoviesMap = new Map();
let activeLinksCount = 0;
let deadIdsCount = 0;
let errorCount = 0;

function log(msg) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${msg}`);
}

function cleanDomainHost(domain) {
  if (!domain) return 'mp4moviez.trading';
  return domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
}

function parseTitleSlug(rawSlug) {
  if (!rawSlug) return { cleanTitle: 'Unknown Movie', languageTags: [], isTvSeries: false };

  let text = decodeURIComponent(rawSlug).replace(/[-_+]/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract release year
  let year = null;
  const yearMatch = text.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    year = yearMatch[1];
  }

  // Detect TV Series
  const isTvSeries = /\b(Season|Episode|S\d{1,2}|E\d{1,2}|Series)\b/i.test(text);

  // Audio / Language Tags
  const languageTags = [];
  const tagPatterns = [
    { pattern: /\b(Hindi Dubbed|Hindi-Dubbed)\b/i, label: 'Hindi Dubbed' },
    { pattern: /\b(Dual Audio|Dual-Audio)\b/i, label: 'Dual Audio' },
    { pattern: /\b(Multi Audio|Multi-Audio)\b/i, label: 'Multi Audio' },
    { pattern: /\b(English)\b/i, label: 'English' },
    { pattern: /\b(Punjabi)\b/i, label: 'Punjabi' },
    { pattern: /\b(Tamil)\b/i, label: 'Tamil' },
    { pattern: /\b(Telugu)\b/i, label: 'Telugu' },
    { pattern: /\b(South Hindi|South)\b/i, label: 'South Hindi' },
    { pattern: /\b(Bengali|Bangla)\b/i, label: 'Bengali' },
    { pattern: /\b(Marathi)\b/i, label: 'Marathi' },
    { pattern: /\b(Gujarati)\b/i, label: 'Gujarati' },
    { pattern: /\b(Malayalam)\b/i, label: 'Malayalam' },
    { pattern: /\b(Kannada)\b/i, label: 'Kannada' },
    { pattern: /\b(Korean|K-Drama)\b/i, label: 'Korean' },
    { pattern: /\b(Anime|Japanese)\b/i, label: 'Anime' },
  ];

  for (const item of tagPatterns) {
    if (item.pattern.test(text)) {
      languageTags.push(item.label);
    }
  }

  // Clean title for grouping
  let clean = text
    .replace(/\(\s*(19\d\d|20\d\d)\s*\)/gi, '')
    .replace(/\b(19\d\d|20\d\d)\b/gi, '')
    .replace(/\b(Hindi Dubbed|Dual Audio|Multi Audio|English|Punjabi|Tamil|Telugu|South Hindi|Bengali|Marathi|Gujarati|Malayalam|Kannada)\b/gi, '')
    .replace(/\b(Movie|Full Movie|Download|Original|HQ|HDRip|WEBRip|BluRay|HDTC|PreDVDRip|CAMRip|UNCUT|Extended|ESubs?|x264|x265|HEVC|720p|480p|1080p|360p|4k)\b/gi, '')
    .replace(/[()[\]{}|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    cleanTitle: clean || text,
    year,
    languageTags,
    isTvSeries
  };
}

function parseMp4moviezUrl(rawUrl, cleanDomain, fallbackId) {
  let fullUrl = rawUrl;
  if (!fullUrl.startsWith('http')) {
    fullUrl = `https://${cleanDomain}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  }

  try {
    const urlObj = new URL(fullUrl);
    const idParam = urlObj.searchParams.get('id');
    const id = idParam ? parseInt(idParam, 10) : fallbackId;
    const qParam = urlObj.searchParams.get('q') || '720';
    const rawTitle = urlObj.searchParams.get('title') || `Movie-${id}`;
    const jio = urlObj.searchParams.get('jio') || null;

    let quality = qParam;
    if (/^\d+$/.test(quality)) {
      quality = `${quality}p`;
    }

    const { cleanTitle, year, languageTags, isTvSeries } = parseTitleSlug(rawTitle);

    return {
      id: isNaN(id) ? fallbackId : id,
      quality,
      rawTitle,
      cleanTitle,
      year,
      languageTags,
      isTvSeries,
      jioServer: jio,
      fullUrl
    };
  } catch {
    const { cleanTitle, year, languageTags, isTvSeries } = parseTitleSlug(`Movie-${fallbackId}`);
    return {
      id: fallbackId,
      quality: '720p',
      rawTitle: `Movie-${fallbackId}`,
      cleanTitle,
      year,
      languageTags,
      isTvSeries,
      jioServer: null,
      fullUrl
    };
  }
}

async function probeId(cleanDomain, id) {
  const targetUrl = `https://${cleanDomain}/dl.php?id=${id}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

    const res = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': `https://${cleanDomain}/`
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    // 1. Check HTTP Redirect
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (loc && (loc.includes('title=') || loc.includes('id=') || loc.includes('q='))) {
        return { status: 'found', parsed: parseMp4moviezUrl(loc, cleanDomain, id) };
      }
    }

    // 2. Check HTML body for links or title
    if (res.status === 200) {
      const text = await res.text();
      const match = text.match(/dl\.php\?[^"'\s<>]+/i);
      if (match && (match[0].includes('title=') || match[0].includes('id='))) {
        return { status: 'found', parsed: parseMp4moviezUrl(match[0], cleanDomain, id) };
      }

      const titleTagMatch = text.match(/<title>([^<]+)<\/title>/i);
      if (titleTagMatch && titleTagMatch[1] && !titleTagMatch[1].toLowerCase().includes('404')) {
        const rawSlug = titleTagMatch[1].trim().replace(/\s+/g, '-');
        const fallbackUrl = `https://${cleanDomain}/dl.php?id=${id}&q=720&jio=yes&title=${encodeURIComponent(rawSlug)}`;
        return { status: 'found', parsed: parseMp4moviezUrl(fallbackUrl, cleanDomain, id) };
      }
    }

    // 3. Follow redirect fallback
    if (res.status !== 404) {
      const followController = new AbortController();
      const followTimeout = setTimeout(() => followController.abort(), CONFIG.requestTimeoutMs);

      const followRes = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': `https://${cleanDomain}/`
        },
        signal: followController.signal
      });

      clearTimeout(followTimeout);

      if (followRes.ok && followRes.url && (followRes.url.includes('title=') || followRes.url.includes('id='))) {
        return { status: 'found', parsed: parseMp4moviezUrl(followRes.url, cleanDomain, id) };
      }
    }

    return { status: 'not_found' };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

function addLinkToGroup(parsed) {
  const groupKey = `${parsed.cleanTitle.toLowerCase().trim()}_${parsed.year || 'na'}`;

  if (!groupedMoviesMap.has(groupKey)) {
    groupedMoviesMap.set(groupKey, {
      title: parsed.cleanTitle,
      year: parsed.year,
      languageTags: [...parsed.languageTags],
      isTvSeries: parsed.isTvSeries,
      rawTitleSample: parsed.rawTitle,
      downloadLinks: []
    });
  }

  const group = groupedMoviesMap.get(groupKey);

  // Merge language tags
  for (const tag of parsed.languageTags) {
    if (!group.languageTags.includes(tag)) {
      group.languageTags.push(tag);
    }
  }

  // Add link if not duplicate ID
  if (!group.downloadLinks.some(l => l.id === parsed.id)) {
    group.downloadLinks.push({
      id: parsed.id,
      quality: parsed.quality,
      url: parsed.fullUrl,
      rawTitle: parsed.rawTitle,
      jioServer: parsed.jioServer
    });
    activeLinksCount++;
  }
}

function saveCatalogToFile() {
  const qualityPriority = { '4k': 1, '2160p': 1, '1080p': 2, '720p': 3, '480p': 4, '360p': 5 };

  const moviesArray = Array.from(groupedMoviesMap.values()).map((m, index) => {
    // Sort links by resolution
    m.downloadLinks.sort((a, b) => {
      const pA = qualityPriority[a.quality.toLowerCase()] || 10;
      const pB = qualityPriority[b.quality.toLowerCase()] || 10;
      return pA - pB;
    });

    return {
      sequence: index + 1,
      ...m
    };
  });

  const exportPayload = {
    sourceDomain: CONFIG.domain,
    exportedAt: new Date().toISOString(),
    totalGroupedMovies: moviesArray.length,
    totalActiveLinks: activeLinksCount,
    movies: moviesArray
  };

  fs.writeFileSync(CONFIG.outputJsonFile, JSON.stringify(exportPayload, null, 2), 'utf-8');
}

function saveCheckpoint(lastProcessedId) {
  const data = {
    lastProcessedId,
    timestamp: new Date().toISOString(),
    activeLinksCount,
    totalMoviesCount: groupedMoviesMap.size
  };
  fs.writeFileSync(CONFIG.checkpointFile, JSON.stringify(data, null, 2), 'utf-8');
}

function loadCheckpointIfExists() {
  if (fs.existsSync(CONFIG.checkpointFile) && fs.existsSync(CONFIG.outputJsonFile)) {
    try {
      const checkpoint = JSON.parse(fs.readFileSync(CONFIG.checkpointFile, 'utf-8'));
      const catalog = JSON.parse(fs.readFileSync(CONFIG.outputJsonFile, 'utf-8'));

      if (catalog && Array.isArray(catalog.movies)) {
        for (const movie of catalog.movies) {
          const groupKey = `${movie.title.toLowerCase().trim()}_${movie.year || 'na'}`;
          groupedMoviesMap.set(groupKey, movie);
          activeLinksCount += movie.downloadLinks?.length || 0;
        }
        log(`Resumed checkpoint from ID #${checkpoint.lastProcessedId}. Loaded ${groupedMoviesMap.size} existing movies.`);
        return checkpoint.lastProcessedId + 1;
      }
    } catch (e) {
      log(`Checkpoint load warning: ${e.message}`);
    }
  }
  return null;
}

// Concurrency Worker Queue
async function runHarvester() {
  const cleanDomain = cleanDomainHost(CONFIG.domain);

  console.log('====================================================');
  console.log('  MP4MOVIEZ HIGH-SPEED STANDALONE ID HARVESTER      ');
  console.log('====================================================');
  log(`Domain: ${cleanDomain}`);
  log(`Target ID Range: ${CONFIG.startId} to ${CONFIG.endId} (${CONFIG.endId - CONFIG.startId + 1} IDs)`);
  log(`Concurrency: ${CONFIG.concurrency} parallel workers`);
  log(`Output File: ${CONFIG.outputJsonFile}`);

  let currentId = CONFIG.startId;
  const resumedId = loadCheckpointIfExists();
  if (resumedId && resumedId >= CONFIG.startId && resumedId <= CONFIG.endId) {
    currentId = resumedId;
  }

  const startTime = Date.now();

  while (currentId <= CONFIG.endId) {
    const chunkIds = [];
    for (let i = 0; i < CONFIG.concurrency && currentId <= CONFIG.endId; i++) {
      chunkIds.push(currentId);
      currentId++;
    }

    // Process chunk in parallel
    await Promise.all(
      chunkIds.map(async (id) => {
        const result = await probeId(cleanDomain, id);

        if (result.status === 'found') {
          addLinkToGroup(result.parsed);
          log(`[FOUND #${id}] ${result.parsed.quality.toUpperCase()} | "${result.parsed.cleanTitle}" (${result.parsed.year || 'N/A'})`);
        } else if (result.status === 'not_found') {
          deadIdsCount++;
        } else {
          errorCount++;
        }
      })
    );

    // Save checkpoint periodically
    const lastDone = chunkIds[chunkIds.length - 1];
    if (lastDone % CONFIG.checkpointInterval === 0 || currentId > CONFIG.endId) {
      saveCatalogToFile();
      saveCheckpoint(lastDone);

      const progress = Math.min(100, Math.round(((lastDone - CONFIG.startId + 1) / (CONFIG.endId - CONFIG.startId + 1)) * 100));
      log(`--- Checkpoint at ID #${lastDone} (${progress}%) | Movies: ${groupedMoviesMap.size} | Links: ${activeLinksCount} ---`);
    }
  }

  // Final Save
  saveCatalogToFile();
  if (fs.existsSync(CONFIG.checkpointFile)) {
    fs.unlinkSync(CONFIG.checkpointFile);
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log('====================================================');
  log(`HARVEST COMPLETED in ${durationSec} seconds!`);
  log(`Total Unique Movies Grouped: ${groupedMoviesMap.size}`);
  log(`Total Active Download Links Found: ${activeLinksCount}`);
  log(`Dead (404) IDs: ${deadIdsCount} | Errors: ${errorCount}`);
  log(`Output saved to: ${path.resolve(CONFIG.outputJsonFile)}`);
  console.log('====================================================');
}

// Run the script
runHarvester().catch((err) => {
  console.error('Fatal Harvester Error:', err);
});
