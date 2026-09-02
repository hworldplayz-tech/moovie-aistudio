import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDfHacRQKUhbeGXx-YuaMJjCTcFs8CYgNo",
  authDomain: "studio-1095783527-40951.firebaseapp.com",
  projectId: "studio-1095783527-40951",
  storageBucket: "studio-1095783527-40951.firebasestorage.app",
  messagingSenderId: "78347104240",
  appId: "1:78347104240:web:d9918ba5d86b48dee53735"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TMDB_API_KEY = "46d13701165988b5bb5fb4d123c0447e";

const RAW_ITEMS = [
  {
    "title": "Download Her Private Hell (2026) Hollywood English (Hindi Subs) Movie",
    "page_url": "https://www.mp4moviez.trading/her-private-hell-(2026)-hollywood-english-(hindi-subs)-movie-hd-58280.html",
    "download_links": [
      "https://www.mp4moviez.trading/dl.php?id=58280&q=720&title=Her-Private-Hell-(2026)-Hollywood-English-(Hindi-Subs)-Movie",
      "https://www.mp4moviez.trading/dl.php?id=58280&q=480&jio=yes&title=Her-Private-Hell-(2026)-Hollywood-English-(Hindi-Subs)-Movie",
      "https://www.mp4moviez.trading/dl.php?id=58280&q=720&jio=yes&title=Her-Private-Hell-(2026)-Hollywood-English-(Hindi-Subs)-Movie",
      "https://www.mp4moviez.trading/dl.php?id=58280&q=240&title=Her-Private-Hell-(2026)-Hollywood-English-(Hindi-Subs)-Movie",
      "https://www.mp4moviez.trading/dl.php?id=58280&q=360&jio=yes&title=Her-Private-Hell-(2026)-Hollywood-English-(Hindi-Subs)-Movie",
      "https://www.mp4moviez.trading/dl.php?id=58280&q=240&jio=yes&title=Her-Private-Hell-(2026)-Hollywood-English-(Hindi-Subs)-Movie",
      "https://www.mp4moviez.trading/dl.php?id=58280&q=360&title=Her-Private-Hell-(2026)-Hollywood-English-(Hindi-Subs)-Movie",
      "https://www.mp4moviez.trading/dl.php?id=58280&q=480&title=Her-Private-Hell-(2026)-Hollywood-English-(Hindi-Subs)-Movie"
    ]
  },
  {
    "title": "Download Baba Rancho (2025) Season 1 Hindi CinePrime Hot Web Series",
    "page_url": "https://www.mp4moviez.trading/baba-rancho-(2025)-season-1-hindi-cineprime-hot-web-series-hd-56027.html",
    "download_links": [
      "https://www.mp4moviez.trading/dl.php?id=56027&q=720&title=Baba-Rancho-(2025)-Season-1-Hindi-CinePrime-Hot-Web-Series",
      "https://www.mp4moviez.trading/dl.php?id=56027&q=360&jio=yes&title=Baba-Rancho-(2025)-Season-1-Hindi-CinePrime-Hot-Web-Series",
      "https://www.mp4moviez.trading/dl.php?id=56027&q=240&title=Baba-Rancho-(2025)-Season-1-Hindi-CinePrime-Hot-Web-Series",
      "https://www.mp4moviez.trading/dl.php?id=56027&q=480&title=Baba-Rancho-(2025)-Season-1-Hindi-CinePrime-Hot-Web-Series",
      "https://www.mp4moviez.trading/dl.php?id=56027&q=480&jio=yes&title=Baba-Rancho-(2025)-Season-1-Hindi-CinePrime-Hot-Web-Series",
      "https://www.mp4moviez.trading/dl.php?id=56027&q=720&jio=yes&title=Baba-Rancho-(2025)-Season-1-Hindi-CinePrime-Hot-Web-Series",
      "https://www.mp4moviez.trading/dl.php?id=56027&q=240&jio=yes&title=Baba-Rancho-(2025)-Season-1-Hindi-CinePrime-Hot-Web-Series",
      "https://www.mp4moviez.trading/dl.php?id=56027&q=360&title=Baba-Rancho-(2025)-Season-1-Hindi-CinePrime-Hot-Web-Series"
    ]
  }
];

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

function parseTitleSlug(rawTitle) {
  let text = decodeURIComponent(rawTitle).replace(/[-_+]/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract year
  let year = null;
  const yearMatch = text.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    year = yearMatch[1];
  }

  // Detect TV Series
  const isTvSeries = /\b(Season|Episode|S\d{1,2}|E\d{1,2}|Series|Web Series)\b/i.test(text);

  // Audio / Language Tags
  const languageTags = [];
  const tagPatterns = [
    { pattern: /\b(Hindi Dubbed|Hindi-Dubbed)\b/i, label: 'Hindi Dubbed' },
    { pattern: /\b(Hindi Subs|Hindi-Subs|Hindi Subtitles)\b/i, label: 'Hindi Subtitles' },
    { pattern: /\b(Dual Audio|Dual-Audio)\b/i, label: 'Dual Audio' },
    { pattern: /\b(Multi Audio|Multi-Audio)\b/i, label: 'Multi Audio' },
    { pattern: /\b(English)\b/i, label: 'English' },
    { pattern: /\b(Hindi)\b/i, label: 'Hindi' },
    { pattern: /\b(Punjabi)\b/i, label: 'Punjabi' },
    { pattern: /\b(Tamil)\b/i, label: 'Tamil' },
    { pattern: /\b(Telugu)\b/i, label: 'Telugu' },
    { pattern: /\b(South Hindi|South)\b/i, label: 'South Hindi' },
    { pattern: /\b(Hollywood)\b/i, label: 'Hollywood' },
    { pattern: /\b(Bollywood)\b/i, label: 'Bollywood' },
    { pattern: /\b(CinePrime|Hot Web Series|Web Series|Hot)\b/i, label: 'Web Series' },
  ];

  for (const item of tagPatterns) {
    if (item.pattern.test(text) && !languageTags.includes(item.label)) {
      languageTags.push(item.label);
    }
  }

  let clean = text
    .replace(/^Download\s+/i, '')
    .replace(/\(\s*(19\d\d|20\d\d)\s*\)/gi, '')
    .replace(/\b(19\d\d|20\d\d)\b/gi, '')
    .replace(/\b(Hollywood|Bollywood|English|Hindi|Hindi Dubbed|Hindi Subs|Hindi Subtitles|Dual Audio|Multi Audio|CinePrime|Hot Web Series|Web Series|Hot|Season \d+|Subs)\b/gi, '')
    .replace(/\b(Movie|Full Movie|Download|Original|HQ|HDRip|WEBRip|BluRay|HDTC|PreDVDRip|CAMRip|UNCUT|Extended|ESubs?|x264|x265|HEVC|720p|480p|1080p|360p|240p|4k)\b/gi, '')
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

async function searchTmdb(query, year, type) {
  try {
    const endpoint = type === 'tv'
      ? `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      : `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;

    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      let match = data.results[0];
      if (year) {
        const yearMatch = data.results.find(r => (r.release_date || r.first_air_date || '').startsWith(year));
        if (yearMatch) match = yearMatch;
      }
      return match;
    }

    // Fallback search multi
    const multiRes = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
    if (multiRes.ok) {
      const multiData = await multiRes.json();
      if (multiData.results && multiData.results.length > 0) {
        return multiData.results[0];
      }
    }
    return null;
  } catch (err) {
    console.warn(`TMDB search error for "${query}":`, err.message);
    return null;
  }
}

async function run() {
  console.log('--- Starting Scraped Data Ingestion Test ---');

  for (const raw of RAW_ITEMS) {
    const { cleanTitle, year, languageTags, isTvSeries } = parseTitleSlug(raw.title);
    console.log(`\nProcessing: "${raw.title}"`);
    console.log(`Parsed: Clean Title: "${cleanTitle}", Year: ${year}, Type: ${isTvSeries ? 'TV Series' : 'Movie'}, Tags:`, languageTags);

    // Search TMDB
    const tmdbData = await searchTmdb(cleanTitle, year, isTvSeries ? 'tv' : 'movie');

    // Parse and group download links
    const parsedLinks = raw.download_links.map(linkStr => {
      try {
        const urlObj = new URL(linkStr);
        const q = urlObj.searchParams.get('q') || '720';
        const jio = urlObj.searchParams.get('jio') === 'yes';
        const id = urlObj.searchParams.get('id') || 'unknown';
        const quality = /^\d+$/.test(q) ? `${q}p` : q;
        return {
          id,
          quality,
          isJio: jio,
          label: `Mp4Moviez (${quality.toUpperCase()})${jio ? ' [Fast Server]' : ' [Main Server]'}`,
          url: linkStr
        };
      } catch {
        return {
          id: '50000',
          quality: '720p',
          isJio: false,
          label: 'Mp4Moviez (720P) [Direct]',
          url: linkStr
        };
      }
    });

    // Sort links: 1080p > 720p > 480p > 360p > 240p
    const qualityPriority = { '4k': 1, '1080p': 2, '720p': 3, '480p': 4, '360p': 5, '240p': 6 };
    parsedLinks.sort((a, b) => {
      const pA = qualityPriority[a.quality.toLowerCase()] || 10;
      const pB = qualityPriority[b.quality.toLowerCase()] || 10;
      return pA - pB;
    });

    const qualities = Array.from(new Set(parsedLinks.map(l => l.quality)));

    const contentId = tmdbData?.id ? `tmdb-${tmdbData.id}` : `mp4-${parsedLinks[0]?.id || Date.now()}`;
    const displayTitle = tmdbData?.title || tmdbData?.name || cleanTitle;
    const finalYear = year || (tmdbData?.release_date || tmdbData?.first_air_date || '2026').substring(0, 4);

    const isHindi = languageTags.some(t => t.toLowerCase().includes('hindi')) || raw.title.toLowerCase().includes('hindi');
    const isEnglish = languageTags.some(t => t.toLowerCase().includes('english')) || raw.title.toLowerCase().includes('english') || raw.title.toLowerCase().includes('hollywood');
    const isDubbed = languageTags.some(t => t.toLowerCase().includes('dubbed')) || raw.title.toLowerCase().includes('dubbed');

    const posterPath = tmdbData?.poster_path
      ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
      : `https://picsum.photos/seed/${slugify(displayTitle)}-poster/500/750`;

    const backdropPath = tmdbData?.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}`
      : `https://picsum.photos/seed/${slugify(displayTitle)}-backdrop/1280/720`;

    const description = tmdbData?.overview || `Download ${displayTitle} (${finalYear}) in HD (${qualities.join(', ')}) with high speed direct download servers.`;

    const contentDoc = {
      id: contentId,
      title: displayTitle,
      description,
      posterPath,
      backdropPath,
      genres: isTvSeries ? ['Web Series', 'Drama', 'Thriller'] : ['Hollywood', 'Drama', 'Thriller'],
      releaseDate: tmdbData?.release_date || tmdbData?.first_air_date || `${finalYear}-01-01`,
      rating: tmdbData?.vote_average || 7.4,
      type: isTvSeries ? 'tv' : 'movie',
      downloadLinks: parsedLinks.map(l => ({ label: l.label, url: l.url })),
      downloadLink: parsedLinks[0]?.url || '',
      isHindiDubbed: isDubbed || (isHindi && isEnglish),
      languages: isHindi && isEnglish ? ['Hindi', 'English'] : (isHindi ? ['Hindi'] : ['English']),
      quality: qualities,
      customTags: ['Mp4Moviez', ...languageTags],
      sourcePageUrl: raw.page_url,
      inLibrary: true,
      slug: `download-${slugify(displayTitle)}-${finalYear}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log(`Writing to Firestore: collection="manually_added_content", docId="${contentId}"...`);
    const docRef = doc(db, 'manually_added_content', contentId);
    await setDoc(docRef, contentDoc);
    console.log(`SUCCESS! Saved "${displayTitle}" to Firestore with ${parsedLinks.length} quality links & TMDB metadata.`);
  }

  console.log('\n--- Test Completed Successfully! Both items are now in your Firestore database! ---');
  process.exit(0);
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
