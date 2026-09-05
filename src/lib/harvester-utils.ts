// Unicode small-caps character map for titles like "ɴᴀᴡᴀʙᴢᴀᴀᴅᴇ" or "ʙᴀᴊʀᴀɴɢ"
const UNICODE_SMALL_CAPS_MAP: Record<string, string> = {
  'ᴀ': 'A', 'ʙ': 'B', 'ᴄ': 'C', 'ᴅ': 'D', 'ᴇ': 'E', 'ꜰ': 'F', 'ɢ': 'G', 'ʜ': 'H',
  'ɪ': 'I', 'ᴊ': 'J', 'ᴋ': 'K', 'ʟ': 'L', 'ᴍ': 'M', 'ɴ': 'N', 'ᴏ': 'O', 'ᴘ': 'P',
  'ꞯ': 'Q', 'ʀ': 'R', 'ꜱ': 'S', 'ᴛ': 'T', 'ᴜ': 'U', 'ᴠ': 'V', 'ᴡ': 'W', 'x': 'X',
  'ʏ': 'Y', 'ᴢ': 'Z',
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h',
  'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p',
  'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x',
  'ｙ': 'y', 'ｚ': 'z'
};

export function normalizeUnicodeTitle(text: string): string {
  if (!text) return '';
  return text.split('').map(ch => UNICODE_SMALL_CAPS_MAP[ch] || ch).join('');
}

/**
 * Standardize quality strings (e.g. "720" -> "720p", "480" -> "480p", "2160" -> "4K")
 */
export function formatQualityString(quality?: string): string {
  if (!quality) return '720p';
  const q = quality.toLowerCase().trim();
  if (q === '4k' || q === '2160' || q === '2160p') return '4K';
  if (q === '1080' || q === '1080p') return '1080p';
  if (q === '720' || q === '720p') return '720p';
  if (q === '480' || q === '480p') return '480p';
  if (q === '360' || q === '360p') return '360p';
  if (q === '240' || q === '240p') return '240p';
  if (q.endsWith('p')) return q;
  if (/^\d{3,4}$/.test(q)) return `${q}p`;
  return quality;
}

/**
 * Clean & standardize download button labels:
 * Converts "Mp4Moviez (720P) [Hindi] [Fast Server]" -> "Download 720p"
 * Strictly removes any mention of mp4 / mp4moviez / server tags.
 */
export function cleanDownloadLabel(rawLabelOrQuality?: string, fallbackQuality?: string): string {
  const quality = formatQualityString(fallbackQuality || '720p');
  if (!rawLabelOrQuality) {
    return `Download ${quality}`;
  }

  const str = String(rawLabelOrQuality)
    .replace(/Mp4Moviez/gi, '')
    .replace(/Filmyzilla/gi, '')
    .replace(/\[Fast Server\]/gi, '')
    .replace(/\(Fast Server\)/gi, '')
    .replace(/Fast Server/gi, '')
    .replace(/Server \d+/gi, '')
    .trim();

  // Extract explicit resolution if present in text
  const match = str.match(/\b(2160p|4k|1080p|720p|480p|360p|240p|1080|720|480|360|240)\b/i);
  if (match) {
    return `Download ${formatQualityString(match[1])}`;
  }

  if (/^\d{3,4}p?$/i.test(str)) {
    return `Download ${formatQualityString(str)}`;
  }

  // If label is clean already e.g. "Download 720p"
  if (/^Download\s+\d{3,4}p?$/i.test(str) || /^Download\s+4K$/i.test(str)) {
    return str;
  }

  return `Download ${quality}`;
}

export type ParsedHarvesterTitle = {
  cleanTitle: string;
  year?: string;
  languageTags: string[];
  isTvSeries: boolean;
  seasonNumber?: number;
  episodeNumber?: number;
  isCompleteSeason?: boolean;
  episodeTitle?: string;
  isEpisodeRange?: boolean;
  startEpisode?: number;
  endEpisode?: number;
};

export function cleanHarvesterTitle(rawSlug: string): ParsedHarvesterTitle {
  if (!rawSlug) {
    return { cleanTitle: 'Unknown Title', languageTags: [], isTvSeries: false };
  }

  // 1. Convert unicode small-caps / stylized characters
  let text = normalizeUnicodeTitle(decodeURIComponent(rawSlug))
    .replace(/[-_+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 2. Extract release year e.g. (2026) or 2026
  let year: string | undefined = undefined;
  const yearMatch = text.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    year = yearMatch[1];
  }

  // 3. Detect TV Series indicators, Season, Episode numbers, and Episode Ranges (e.g. "Episodes 1 to 10")
  let isTvSeries = /\b(Season|Episode|S\d{1,2}|E\d{1,2}|Series|Web Series|TV Series|Anime Series|K-Drama|Ep\s*\d+|Part\s*\d+)\b/i.test(text);
  let seasonNumber: number | undefined = undefined;
  let episodeNumber: number | undefined = undefined;
  let isCompleteSeason: boolean | undefined = undefined;
  let isEpisodeRange: boolean | undefined = undefined;
  let startEpisode: number | undefined = undefined;
  let endEpisode: number | undefined = undefined;
  let episodeTitle: string | undefined = undefined;

  // Check for Season + Episode Range format: e.g. S01E01-E10, S1E1-10, S02 Ep 1 to 10
  const sxxRangeMatch = text.match(/\bS(\d{1,2})\s*[-_]?\s*E(?:p)?(\d{1,3})\s*(?:to|-|–|—)\s*(?:E(?:p)?)?(\d{1,3})\b/i);
  if (sxxRangeMatch) {
    isTvSeries = true;
    seasonNumber = parseInt(sxxRangeMatch[1], 10);
    startEpisode = parseInt(sxxRangeMatch[2], 10);
    endEpisode = parseInt(sxxRangeMatch[3], 10);
    isEpisodeRange = true;
    episodeNumber = startEpisode;
    episodeTitle = `Episodes ${startEpisode} to ${endEpisode}`;
  } else {
    // Check for Single S01E02 format
    const sxxExxMatch = text.match(/\bS(\d{1,2})\s*E(?:p)?(\d{1,3})\b/i);
    if (sxxExxMatch) {
      isTvSeries = true;
      seasonNumber = parseInt(sxxExxMatch[1], 10);
      episodeNumber = parseInt(sxxExxMatch[2], 10);
      episodeTitle = `Episode ${episodeNumber}`;
    } else {
      // Check Season separately: "Season 4", "Season-4", "S04", "Part 2"
      const seasonMatch = text.match(/\b(?:Season|S|Part)\s*[-_]?\s*(\d{1,2})\b/i);
      if (seasonMatch) {
        isTvSeries = true;
        seasonNumber = parseInt(seasonMatch[1], 10);
      }

      // Check Episode Range: "Episodes 1 to 10", "Episode 1-10", "Ep 01 to 08", "Ep 1-8", "Episodes 01-10", "Parts 1 to 5"
      const epRangeMatch = text.match(/\b(?:Episodes?|Eps?|E|Parts?|Part)\s*[-_.]?\s*(\d{1,3})\s*(?:to|-|–|—)\s*(?:(?:Episodes?|Eps?|E|Parts?|Part)\s*[-_.]?)?(\d{1,3})\b/i);
      if (epRangeMatch) {
        isTvSeries = true;
        startEpisode = parseInt(epRangeMatch[1], 10);
        endEpisode = parseInt(epRangeMatch[2], 10);
        isEpisodeRange = true;
        episodeNumber = startEpisode;
        episodeTitle = `Episodes ${startEpisode} to ${endEpisode}`;
      } else {
        // Check Episode separately: "Episode 3", "Ep 03", "Ep. 3", "E03"
        const episodeMatch = text.match(/\b(?:Episode|Ep|E)\s*[-_.]?\s*(\d{1,3})\b/i);
        if (episodeMatch) {
          isTvSeries = true;
          episodeNumber = parseInt(episodeMatch[1], 10);
          episodeTitle = `Episode ${episodeNumber}`;
        }
      }
    }
  }

  // Check complete season / zip pack indicator
  if (/\b(Complete\s*(?:Season|Series|All\s*Episodes)|All\s*Episodes|Full\s*Season|Zip\s*Pack|Zip)\b/i.test(text)) {
    isTvSeries = true;
    isCompleteSeason = true;
  }

  if (isTvSeries && !seasonNumber) {
    seasonNumber = 1; // Default to Season 1 if series detected without explicit season number
  }

  // 4. Detect language / audio tags
  const languageTags: string[] = [];
  const tagPatterns: { pattern: RegExp; label: string }[] = [
    { pattern: /\b(Hindi Dubbed|Hindi-Dubbed|Hindi Dub|Dubbed In Hindi)\b/i, label: 'Hindi Dubbed' },
    { pattern: /\b(Dual Audio|Dual-Audio)\b/i, label: 'Dual Audio' },
    { pattern: /\b(Multi Audio|Multi-Audio)\b/i, label: 'Multi Audio' },
    { pattern: /\b(Hindi)\b/i, label: 'Hindi' },
    { pattern: /\b(English)\b/i, label: 'English' },
    { pattern: /\b(Bhojpuri)\b/i, label: 'Bhojpuri' },
    { pattern: /\b(Punjabi)\b/i, label: 'Punjabi' },
    { pattern: /\b(Tamil)\b/i, label: 'Tamil' },
    { pattern: /\b(Telugu)\b/i, label: 'Telugu' },
    { pattern: /\b(Bengali|Bangla)\b/i, label: 'Bengali' },
    { pattern: /\b(Marathi|Matahi)\b/i, label: 'Marathi' },
    { pattern: /\b(Gujarati)\b/i, label: 'Gujarati' },
    { pattern: /\b(Malayalam)\b/i, label: 'Malayalam' },
    { pattern: /\b(Kannada)\b/i, label: 'Kannada' },
    { pattern: /\b(Korean)\b/i, label: 'Korean' },
    { pattern: /\b(Anime|Japanese)\b/i, label: 'Anime' },
    { pattern: /\b(Filipino)\b/i, label: 'Filipino' },
  ];

  for (const tag of tagPatterns) {
    if (tag.pattern.test(text)) {
      if (!languageTags.includes(tag.label)) {
        languageTags.push(tag.label);
      }
    }
  }

  // 5. Clean out noise words for clean series/movie title matching
  let clean = text
    .replace(/^Download\s+/i, '')
    .replace(/\(\s*18[+＋]\s*\)/gi, '')
    .replace(/\[\s*18[+＋]\s*\]/gi, '')
    .replace(/\b18[+＋]\b/gi, '')
    .replace(/\(\s*(19\d\d|20\d\d)\s*\)/gi, '')
    .replace(/\b(19\d\d|20\d\d)\b/gi, '')
    .replace(/\bS\d{1,2}\s*[-_]?\s*E(?:p)?\d{1,3}\s*(?:to|-|–|—)\s*(?:E(?:p)?)?\d{1,3}\b/gi, '')
    .replace(/\b(?:Episodes?|Eps?|E|Parts?|Part)\s*[-_.]?\s*\d{1,3}\s*(?:to|-|–|—)\s*(?:(?:Episodes?|Eps?|E|Parts?|Part)\s*[-_.]?)?\d{1,3}\b/gi, '')
    .replace(/\bS\d{1,2}\s*E(?:p)?\d{1,3}\b/gi, '')
    .replace(/\b(?:Season|S|Part)\s*[-_]?\s*\d{1,2}\b/gi, '')
    .replace(/\b(?:Episode|Ep|E)\s*[-_.]?\s*\d{1,3}\b/gi, '')
    .replace(/\b(Complete\s*(?:Series|Anime|Season|All\s*Episodes)|All\s*Episodes|Full\s*Season|Zip\s*Pack|Zip)\b/gi, '')
    .replace(/\b(Hindi Dubbed|Dual Audio|Multi Audio|Hindi HQ Dubbed|Hindi ORG Dubbed|HQ Dubbed|HQ Fan Dubbed|Unofficial|Dubbed|Hindi Subs|Hindi)\b/gi, '')
    .replace(/\b(English|Bhojpuri|Punjabi|Tamil|Telugu|South Hindi|Bengali|Bangla|Marathi|Matahi|Gujarati|Malayalam|Kannada|Korean|Filipino|Japanese)\b/gi, '')
    .replace(/\b(Akkuott|CinePrime|ULLU|PrimeShots|MoodX|Dzyreplay|DyzrePlay|KahaniPlay|Kahaniplay|BulbulPlay|BulBulPlay|Chuski|NeonX|Mooviplay|Dugru|Triflicks|Funtyy|HotX|CineOn|Atrangii|Bongo|BabluTV|VivaMax|Moovie|Hotbul|Ratri|Makhan|Sigmaseries|Showx|Fugi|Cukkuboo|PrimeXtream|CRF Studioz|IBAMovies|Saathi|9Redmovies|Amazon|Netflix|Hulu|HBO|Marvel|Disney)\b/gi, '')
    .replace(/\b(Hot Web Series|Web Series|TV Series|Anime Series|Short Film|Hot Short Film|Uncut Short Film|UnCut Short Films|Full Episode|Complete Series|Complete Anime Series|K-Drama Series|Talks Series)\b/gi, '')
    .replace(/\b(Movie|Full Movie|Download|Original|HQ|HDRip|HDTVRip|WEBRip|BluRay|BRRip|HDTC|PreDVDRip|CAMRip|HDCAM|PDVDRip|UNCUT|UnRated|UNRATED|Extended|Extended Version|Remastered|Raw Undekha|ESubs?|x264|x265|HEVC|720p|480p|1080p|360p|240p|4k|HD)\b/gi, '')
    .replace(/[()[\]{}|]/g, ' ')
    .replace(/[:\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length < 2) {
    clean = text.replace(/^Download\s+/i, '').trim();
  }

  return {
    cleanTitle: clean,
    year,
    languageTags,
    isTvSeries,
    seasonNumber,
    episodeNumber,
    isCompleteSeason,
    episodeTitle,
    isEpisodeRange,
    startEpisode,
    endEpisode
  };
}
