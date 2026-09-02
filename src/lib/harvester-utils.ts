// Unicode small-caps character map for titles like "ɴᴀᴡᴀʙᴢᴀᴀᴅᴇ" or "ʙᴀᴊʀᴀɴɢ"
const UNICODE_SMALL_CAPS_MAP: Record<string, string> = {
  'ᴀ': 'A', 'ʙ': 'B', 'ᴄ': 'C', 'ᴅ': 'D', 'ᴇ': 'E', 'ꜰ': 'F', 'ɢ': 'G', 'ʜ': 'H',
  'ɪ': 'I', 'ᴊ': 'J', 'ᴋ': 'K', 'ʟ': 'L', 'ᴍ': 'M', 'ɴ': 'N', 'ᴏ': 'O', 'ᴘ': 'P',
  'ꞯ': 'Q', 'ʀ': 'R', 'ꜱ': 'S', 'ᴛ': 'T', 'ᴜ': 'U', 'ᴠ': 'V', 'ᴡ': 'W', 'x': 'X',
  'ʏ': 'Y', 'ᴢ': 'Z',
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h',
  'ｉ': 'i', 'ｊ': 'j', 'ᴋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p',
  'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ᴠ': 'v', 'ｗ': 'w', 'ｘ': 'x',
  'ｙ': 'y', 'ｚ': 'z'
};

export function normalizeUnicodeTitle(text: string): string {
  if (!text) return '';
  return text.split('').map(ch => UNICODE_SMALL_CAPS_MAP[ch] || ch).join('');
}

export function cleanHarvesterTitle(rawSlug: string): {
  cleanTitle: string;
  year?: string;
  languageTags: string[];
  isTvSeries: boolean;
} {
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

  // 3. Detect TV Series indicators
  const isTvSeries = /\b(Season|Episode|S\d{1,2}|E\d{1,2}|Series|Web Series|TV Series|Anime Series|K-Drama)\b/i.test(text);

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

  // 5. Clean out noise words for clean title matching
  let clean = text
    .replace(/^Download\s+/i, '')
    .replace(/\(\s*18[+＋]\s*\)/gi, '')
    .replace(/\[\s*18[+＋]\s*\]/gi, '')
    .replace(/\b18[+＋]\b/gi, '')
    .replace(/\(\s*(19\d\d|20\d\d)\s*\)/gi, '')
    .replace(/\b(19\d\d|20\d\d)\b/gi, '')
    .replace(/\b(Season\s*\d+|S\d{1,2}|Episode\s*\d+|E\d{1,2}|Part\s*\d+|Complete\s*(Series|Anime|Season))\b/gi, '')
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
    isTvSeries
  };
}
