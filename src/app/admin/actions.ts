
'use server';

import { getContentFromFirestore, addContentToFirestore, getSiteConfigFromFirestore, saveSiteConfigToFirestore, createPartnerRequest, getSystemUser, DEFAULT_LINK_PRESETS, DEFAULT_SITE_LANGUAGES } from '@/lib/firestore';
import { getContentById } from '@/lib/tmdb';
import type { PartnerRequest, SystemUser } from '@/lib/definitions';

export async function getLogoText(): Promise<string> {
  const config = await getSiteConfigFromFirestore();
  return config.logoText || 'Moovie';
}

export async function updateLogoText(newLogoText: string): Promise<{ success: boolean; error?: string }> {
  if (!newLogoText || typeof newLogoText !== 'string' || newLogoText.trim().length === 0) {
    return { success: false, error: 'Logo text cannot be empty.' };
  }

  try {
    await saveSiteConfigToFirestore({ logoText: newLogoText.trim() });
    return { success: true };
  } catch (error) {
    console.error('Failed to update logo text:', error);
    return { success: false, error: 'Failed to save to database.' };
  }
}



export async function getPaginationLimit(): Promise<number> {
  const config = await getSiteConfigFromFirestore();
  return typeof config.paginationLimit === 'number' ? config.paginationLimit : 20;
}

export async function updatePaginationLimit(newLimit: number): Promise<{ success: boolean; error?: string }> {
  if (typeof newLimit !== 'number' || newLimit < 1) {
    return { success: false, error: 'Limit must be a positive number.' };
  }

  try {
    await saveSiteConfigToFirestore({ paginationLimit: newLimit });
    return { success: true };
  } catch (error) {
    console.error('Failed to update pagination limit:', error);
    return { success: false, error: 'Failed to save to database.' };
  }
}



export async function getRelatedSettings(): Promise<{
  relatedItemsCount: number;
  relatedLayout: 'grid' | 'slider';
}> {
  const config = await getSiteConfigFromFirestore();
  return {
    relatedItemsCount: typeof config.relatedItemsCount === 'number' && config.relatedItemsCount > 0 ? config.relatedItemsCount : 6,
    relatedLayout: config.relatedLayout || 'grid',
  };
}

export async function getSecureDownloadSettings(): Promise<{
  enabled: boolean;
  delay: number;
  globalEnabled: boolean;
  filmyzillaLinksEnabled: boolean;
  mp4moviezLinksEnabled: boolean;
  showLiveTvCarousel: boolean;
  showFeaturedSection?: boolean;
  featuredLayout?: 'slider' | 'grid' | 'list';
  downloadSmartLink?: string;
}> {
  const [config, adSettings] = await Promise.all([
    getSiteConfigFromFirestore(),
    import('@/lib/firestore').then(mod => mod.getAdSettings())
  ]);

  return {
    enabled: !!config.secureDownloadsEnabled,
    delay: typeof config.downloadButtonDelay === 'number' ? config.downloadButtonDelay : 5,
    globalEnabled: config.globalDownloadsEnabled !== undefined ? config.globalDownloadsEnabled : true,
    filmyzillaLinksEnabled: config.filmyzillaLinksEnabled !== undefined ? config.filmyzillaLinksEnabled : true,
    mp4moviezLinksEnabled: config.mp4moviezLinksEnabled !== undefined ? config.mp4moviezLinksEnabled : true,
    showLiveTvCarousel: config.showLiveTvCarousel !== undefined ? config.showLiveTvCarousel : true,
    showFeaturedSection: config.showFeaturedSection,
    featuredLayout: config.featuredLayout,
    downloadSmartLink: adSettings.downloadSmartLink
  };
}

export async function updateSecureDownloadSettings(
  enabled: boolean,
  delay: number,
  globalEnabled: boolean,
  filmyzillaLinksEnabled: boolean = true,
  mp4moviezLinksEnabled: boolean = true
): Promise<{ success: boolean; error?: string }> {
  if (typeof delay !== 'number' || delay < 0) {
    return { success: false, error: 'Delay must be a positive number.' };
  }

  try {
    await saveSiteConfigToFirestore({
      secureDownloadsEnabled: enabled,
      downloadButtonDelay: delay,
      globalDownloadsEnabled: globalEnabled,
      filmyzillaLinksEnabled: filmyzillaLinksEnabled,
      mp4moviezLinksEnabled: mp4moviezLinksEnabled
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to update secure download settings:', error);
    return { success: false, error: 'Failed to save to database.' };
  }
}

export async function toggleFilmyzillaLinksAction(enabled: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await saveSiteConfigToFirestore({
      filmyzillaLinksEnabled: enabled
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle Filmyzilla links kill switch:', error);
    return { success: false, error: 'Failed to save setting.' };
  }
}

export async function toggleMp4moviezLinksAction(enabled: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await saveSiteConfigToFirestore({
      mp4moviezLinksEnabled: enabled
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle Mp4Moviez links kill switch:', error);
    return { success: false, error: 'Failed to save setting.' };
  }
}

export async function getDownloadLinkPresets(): Promise<string[]> {
  try {
    const config = await getSiteConfigFromFirestore();
    if (config.downloadLinkPresets && Array.isArray(config.downloadLinkPresets) && config.downloadLinkPresets.length > 0) {
      return config.downloadLinkPresets;
    }
    return DEFAULT_LINK_PRESETS;
  } catch (error) {
    console.error('Failed to get download link presets:', error);
    return DEFAULT_LINK_PRESETS;
  }
}

export async function updateDownloadLinkPresets(presets: string[]): Promise<{ success: boolean; error?: string }> {
  if (!Array.isArray(presets)) {
    return { success: false, error: 'Presets must be an array.' };
  }
  try {
    // Clean presets
    const cleanPresets = presets
      .map(p => typeof p === 'string' ? p.trim() : '')
      .filter(p => p.length > 0);

    await saveSiteConfigToFirestore({ downloadLinkPresets: cleanPresets });
    return { success: true };
  } catch (error) {
    console.error('Failed to update download link presets:', error);
    return { success: false, error: 'Failed to save presets to database.' };
  }
}

export async function getSiteLanguages(): Promise<string[]> {
  try {
    const config = await getSiteConfigFromFirestore();
    if (config.customLanguages && Array.isArray(config.customLanguages) && config.customLanguages.length > 0) {
      return config.customLanguages;
    }
    return DEFAULT_SITE_LANGUAGES;
  } catch (error) {
    console.error('Failed to get site languages:', error);
    return DEFAULT_SITE_LANGUAGES;
  }
}

export async function updateSiteLanguages(languages: string[]): Promise<{ success: boolean; error?: string }> {
  if (!Array.isArray(languages)) {
    return { success: false, error: 'Languages must be an array.' };
  }
  try {
    const cleanLanguages = languages
      .map(l => typeof l === 'string' ? l.trim() : '')
      .filter(l => l.length > 0);

    // Deduplicate case-insensitively while preserving the casing
    const seen = new Set<string>();
    const uniqueLanguages: string[] = [];
    for (const lang of cleanLanguages) {
      const lower = lang.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueLanguages.push(lang);
      }
    }

    await saveSiteConfigToFirestore({ customLanguages: uniqueLanguages });
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update site languages:', error);
    return { success: false, error: error?.message || 'Failed to save languages to database.' };
  }
}

export async function resetSiteLanguages(): Promise<{ success: boolean }> {
  try {
    await saveSiteConfigToFirestore({ customLanguages: DEFAULT_SITE_LANGUAGES });
    return { success: true };
  } catch (error) {
    console.error('Failed to reset site languages:', error);
    return { success: false };
  }
}

export async function getManuallyAddedContent() {
  const { invalidateContentCache, getContentFromFirestore } = await import('@/lib/firestore');
  invalidateContentCache();
  return await getContentFromFirestore(true);
}

export async function addContent(tmdbId: string, contentType: 'movie' | 'tv') {
  try {
    const content = await getContentById(tmdbId, contentType);
    if (!content) {
      return { success: false, error: 'Content not found with the provided TMDB ID.' };
    }

    const result = await addContentToFirestore(content);
    return { ...result, content };
  } catch (error) {
    console.error('Failed to add content:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add content.' };
  }
}

export async function deleteContent(ids: string[]) {
  try {
    const { deleteContentFromFirestore } = await import('@/lib/firestore');
    const result = await deleteContentFromFirestore(ids);
    return result;
  } catch (error) {
    console.error('Failed to delete content:', error);
    return { success: false };
  }
}

export async function syncContentMetadata() {
  try {
    const allContent = await getContentFromFirestore();
    let updatedCount = 0;

    for (const item of allContent) {
      try {
        const freshData = await getContentById(item.id, item.type);
        if (freshData) {
          await addContentToFirestore({
            ...freshData,
            downloadLink: item.downloadLink,
            downloadLinks: item.downloadLinks,
            trailerUrl: item.trailerUrl,
            isHindiDubbed: item.isHindiDubbed,
            customTags: item.customTags,
            languages: item.languages,
            quality: item.quality,
            uploadedBy: item.uploadedBy,
            isFeatured: item.isFeatured
          });
          updatedCount++;
        }
      } catch (err) {
        console.error(`Failed to sync ${item.id}:`, err);
      }
    }

    return { success: true, updatedCount };
  } catch (error) {
    console.error('Sync failed:', error);
    return { success: false, error: 'Failed to sync metadata.' };
  }
}

export async function submitPartnerRequest(data: Omit<PartnerRequest, 'id' | 'status' | 'createdAt'>) {
  try {
    const requestData: PartnerRequest = {
      ...data,
      id: '', // Will be set by Firestore
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await createPartnerRequest(requestData);
    return { success: true };
  } catch (error) {
    console.error('Failed to create partner request:', error);
    return { success: false, error: 'Failed to submit request.' };
  }
}

export async function getPartnerRequests(): Promise<PartnerRequest[]> {
  try {
    const { getPartnerRequests: getPartnerRequestsFromFirestore } = await import('@/lib/firestore');
    return await getPartnerRequestsFromFirestore();
  } catch (error) {
    console.error('Failed to fetch partner requests:', error);
    return [];
  }
}

export async function getUserByUsername(username: string): Promise<SystemUser | null> {
  return await getSystemUser(username);
}

/**
 * Helper to apply migration replacements supporting:
 * - Multiple find terms separated by comma or newline
 * - Flex-matching singular & plural variations without leaving stray 's'
 * - Clean domain and path pattern replacements
 */
export type MigrationMode = 'domain' | 'path' | 'server' | 'custom';

function isMp4moviezUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('mp4moviez') ||
    (lower.includes('dl.php') && (lower.includes('id=') || lower.includes('jio=') || lower.includes('q=')))
  );
}

function isFilmyzillaUrl(url?: string): boolean {
  if (!url) return false;
  return url.toLowerCase().includes('filmyzilla');
}

function cleanDomainHost(d: string): string {
  return d.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '');
}

function replaceDomainOnly(url: string, findDomainsRaw: string, replaceDomainRaw: string): string {
  if (!url || !findDomainsRaw) return url;
  
  const targetHost = replaceDomainRaw ? cleanDomainHost(replaceDomainRaw) : '';
  const findDomains = findDomainsRaw.split(/[\n,]+/)
    .map(d => cleanDomainHost(d))
    .filter(Boolean);

  if (findDomains.length === 0) return url;

  let isPrefixed = false;
  let workUrl = url.trim();
  if (!/^https?:\/\//i.test(workUrl)) {
    workUrl = 'https://' + workUrl;
    isPrefixed = true;
  }

  try {
    const urlObj = new URL(workUrl);
    const hostLower = urlObj.hostname.toLowerCase();
    
    for (const target of findDomains) {
      if (hostLower === target || hostLower === `www.${target}` || hostLower.endsWith(`.${target}`)) {
        if (!targetHost) return url;
        urlObj.hostname = targetHost;
        const res = urlObj.toString();
        return isPrefixed && !url.trim().startsWith('http') ? res.replace(/^https?:\/\//i, '') : res;
      }
    }
  } catch {
    // Fallback if URL constructor fails
  }

  // Regex fallback
  for (const target of findDomains) {
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(https?:\\/\\/(?:[a-z0-9_.-]+\\.)?)${escaped}([:\\/\\?#]|$)`, 'i');
    if (regex.test(url)) {
      if (!targetHost) return url;
      return url.replace(regex, `$1${targetHost}$2`);
    }
  }

  return url;
}

function urlMatchesDomain(url: string, findDomainsRaw: string): boolean {
  if (!url || !findDomainsRaw) return false;
  const findDomains = findDomainsRaw.split(/[\n,]+/)
    .map(d => cleanDomainHost(d))
    .filter(Boolean);

  if (findDomains.length === 0) return false;

  let workUrl = url.trim();
  if (!/^https?:\/\//i.test(workUrl)) {
    workUrl = 'https://' + workUrl;
  }

  try {
    const urlObj = new URL(workUrl);
    const hostLower = urlObj.hostname.toLowerCase();
    for (const target of findDomains) {
      if (hostLower === target || hostLower === `www.${target}` || hostLower.includes(target)) {
        return true;
      }
    }
  } catch {
    // Fallback
  }

  const lowerUrl = url.toLowerCase();
  for (const target of findDomains) {
    if (lowerUrl.includes(target)) {
      return true;
    }
  }

  return false;
}

function urlMatchesPath(url: string, findPathsRaw: string, flexMatch: boolean = false): boolean {
  if (!url || !findPathsRaw) return false;
  const rawTerms = findPathsRaw.split(/[\n,]+/).map(s => s.trim().replace(/^\/+|\/+$/g, '')).filter(Boolean);
  if (rawTerms.length === 0) return false;

  const lowerUrl = url.toLowerCase();
  for (const term of rawTerms) {
    const lowerTerm = term.toLowerCase();
    if (lowerUrl.includes(lowerTerm)) return true;
    if (flexMatch) {
      if (lowerTerm === 'download' && lowerUrl.includes('downloads')) return true;
      if (lowerTerm === 'downloads' && lowerUrl.includes('download')) return true;
      if (lowerTerm === 'verified' && lowerUrl.includes('verifieds')) return true;
      if (lowerTerm === 'verifieds' && lowerUrl.includes('verified')) return true;
    }
  }
  return false;
}

function replacePathSegmentsOnly(
  url: string,
  findSegmentsRaw: string,
  replaceSegmentRaw: string,
  flexMatch: boolean = false
): string {
  if (!url || !findSegmentsRaw || !replaceSegmentRaw) return url;

  let target = replaceSegmentRaw.trim().replace(/^\/+|\/+$/g, '');
  const rawTerms = findSegmentsRaw.split(/[\n,]+/).map(s => s.trim().replace(/^\/+|\/+$/g, '')).filter(Boolean);

  // Separate protocol + host from path so host is NEVER touched
  let protocolAndHost = '';
  let pathAndQuery = url;

  const matchOrigin = url.match(/^(https?:\/\/[^\/]+)(\/.*)?$/i);
  if (matchOrigin) {
    protocolAndHost = matchOrigin[1];
    pathAndQuery = matchOrigin[2] || '';
  } else {
    const matchNoProto = url.match(/^([^\/]+)(\/.*)?$/i);
    if (matchNoProto && matchNoProto[1].includes('.')) {
      protocolAndHost = matchNoProto[1];
      pathAndQuery = matchNoProto[2] || '';
    }
  }

  let updatedPath = pathAndQuery;

  for (const term of rawTerms) {
    if (!term) continue;

    if (flexMatch) {
      const lower = term.toLowerCase();
      if (lower.startsWith('download')) {
        updatedPath = updatedPath.replace(/\/(downloads?)\b/gi, `/${target}`);
        continue;
      } else if (lower.startsWith('verified')) {
        updatedPath = updatedPath.replace(/\/(verifieds?)\b/gi, `/${target}`);
        continue;
      }
    }

    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const segmentRegex = new RegExp(`\\/${escaped}\\b`, 'gi');
    updatedPath = updatedPath.replace(segmentRegex, `/${target}`);
  }

  return protocolAndHost + updatedPath;
}

function replaceServerSuffixOnly(url: string, findSuffixRaw: string, replaceSuffixRaw: string): string {
  if (!url || !findSuffixRaw || !replaceSuffixRaw) return url;

  let target = replaceSuffixRaw.trim();
  if (!target.startsWith('/')) target = '/' + target;

  const rawTerms = findSuffixRaw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

  let currentUrl = url;
  for (let term of rawTerms) {
    if (!term) continue;
    if (!term.startsWith('/')) term = '/' + term;

    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escaped}(\\b|\\/|\\?|$)`, 'gi');
    currentUrl = currentUrl.replace(regex, `${target}$1`);
  }

  return currentUrl;
}

function applyMigrationReplacements(
  url: string,
  findText: string,
  replaceText: string,
  mode: MigrationMode = 'domain',
  flexMatch: boolean = false
): string {
  if (!url || !findText) return url;

  if (mode === 'domain') {
    return replaceDomainOnly(url, findText, replaceText);
  } else if (mode === 'path') {
    return replacePathSegmentsOnly(url, findText, replaceText, flexMatch);
  } else if (mode === 'server') {
    return replaceServerSuffixOnly(url, findText, replaceText);
  } else {
    const rawTerms = findText.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
    let currentUrl = url;
    for (const term of rawTerms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      currentUrl = currentUrl.replace(new RegExp(escaped, 'gi'), replaceText.trim());
    }
    return currentUrl;
  }
}

/**
 * Scans all content items in Firestore to extract all unique domains & path segments.
 * Used by the Admin Link Migration Scanner UI.
 */
export async function scanDatabaseDownloadLinks(): Promise<{
  success: boolean;
  domains: Array<{ domain: string; count: number }>;
  pathSegments: Array<{ segment: string; count: number }>;
  totalLinksCount: number;
  totalMoviesWithLinks: number;
  error?: string;
}> {
  try {
    const allContent = await getContentFromFirestore(true);
    const domainCounts: Record<string, number> = {};
    const segmentCounts: Record<string, number> = {};
    let totalLinks = 0;
    let moviesCount = 0;

    for (const item of allContent) {
      const urls: string[] = [];
      if (item.downloadLink && item.downloadLink.trim()) {
        urls.push(item.downloadLink.trim());
      }
      if (item.downloadLinks && Array.isArray(item.downloadLinks)) {
        for (const link of item.downloadLinks) {
          if (link.url && link.url.trim()) {
            urls.push(link.url.trim());
          }
        }
      }

      if (urls.length > 0) {
        moviesCount++;
        totalLinks += urls.length;
        for (const rawUrl of urls) {
          try {
            const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
            const host = urlObj.hostname;
            if (host) {
              domainCounts[host] = (domainCounts[host] || 0) + 1;
            }
            const parts = urlObj.pathname.split('/').filter(p => p && !/^\d+$/.test(p) && !/^server_\d+$/i.test(p));
            for (const part of parts) {
              segmentCounts[part] = (segmentCounts[part] || 0) + 1;
            }
          } catch {
            const matchDomain = rawUrl.match(/https?:\/\/([^\/]+)/i);
            if (matchDomain && matchDomain[1]) {
              domainCounts[matchDomain[1]] = (domainCounts[matchDomain[1]] || 0) + 1;
            }
          }
        }
      }
    }

    const sortedDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);

    const sortedSegments = Object.entries(segmentCounts)
      .map(([segment, count]) => ({ segment, count }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      domains: sortedDomains,
      pathSegments: sortedSegments,
      totalLinksCount: totalLinks,
      totalMoviesWithLinks: moviesCount
    };
  } catch (error) {
    console.error('Scan database download links failed:', error);
    return {
      success: false,
      domains: [],
      pathSegments: [],
      totalLinksCount: 0,
      totalMoviesWithLinks: 0,
      error: error instanceof Error ? error.message : 'Scan failed.'
    };
  }
}

function checkLinkMatchesCriteria(url: string, findText: string, mode: MigrationMode, flexMatch: boolean): boolean {
  if (!url || !findText) return false;
  if (mode === 'domain') {
    return urlMatchesDomain(url, findText);
  } else if (mode === 'path') {
    return urlMatchesPath(url, findText, flexMatch);
  } else if (mode === 'server') {
    const rawTerms = findText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    return rawTerms.some(term => url.toLowerCase().includes(term.toLowerCase()));
  } else {
    const rawTerms = findText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    return rawTerms.some(term => url.toLowerCase().includes(term.toLowerCase()));
  }
}

/**
 * Link Migration & Pattern Replacement Tool
 * Batch updates download links by replacing any target substring or pattern
 */
export async function previewLinkMigration(
  findText: string,
  replaceText: string,
  mode: MigrationMode = 'domain',
  flexMatch: boolean = false
): Promise<{
  success: boolean;
  matchCount: number;
  sampleMatches: Array<{ id: string | number; title: string; oldUrl: string; newUrlPreview: string }>;
  error?: string;
}> {
  if (!findText || findText.trim() === '') {
    return { success: false, matchCount: 0, sampleMatches: [], error: 'Find text must be provided.' };
  }

  try {
    const allContent = await getContentFromFirestore(true);
    const matches: Array<{ id: string | number; title: string; oldUrl: string; newUrlPreview: string }> = [];

    for (const item of allContent) {
      let matchedInItem = false;
      let sampleOld = '';
      let sampleNew = '';

      const testUrl = (rawUrl: string) => {
        if (!rawUrl) return;
        const matches = checkLinkMatchesCriteria(rawUrl, findText, mode, flexMatch);
        if (matches) {
          matchedInItem = true;
          if (!sampleOld) {
            sampleOld = rawUrl;
            if (replaceText && replaceText.trim() !== '') {
              const newUrl = applyMigrationReplacements(rawUrl, findText, replaceText, mode, flexMatch);
              sampleNew = newUrl;
            } else {
              sampleNew = `(Matched: ${rawUrl})`;
            }
          }
        }
      };

      if (item.downloadLink) {
        testUrl(item.downloadLink);
      }

      if (item.downloadLinks && Array.isArray(item.downloadLinks)) {
        for (const link of item.downloadLinks) {
          if (link.url) {
            testUrl(link.url);
          }
        }
      }

      if (matchedInItem) {
        matches.push({
          id: item.id,
          title: item.title,
          oldUrl: sampleOld,
          newUrlPreview: sampleNew
        });
      }
    }

    return {
      success: true,
      matchCount: matches.length,
      sampleMatches: matches.slice(0, 15)
    };
  } catch (error) {
    console.error('Link migration preview failed:', error);
    return {
      success: false,
      matchCount: 0,
      sampleMatches: [],
      error: error instanceof Error ? error.message : 'Preview failed.'
    };
  }
}

export async function migrateDownloadLinks(
  findText: string,
  replaceText: string,
  mode: MigrationMode = 'domain',
  flexMatch: boolean = false
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  if (!findText || findText.trim() === '') {
    return { success: false, updatedCount: 0, error: 'Find text must be provided.' };
  }

  try {
    const allContent = await getContentFromFirestore(true);
    let updatedCount = 0;

    for (const item of allContent) {
      let hasChanges = false;
      const updatedItem = { ...item };

      // Check legacy downloadLink
      if (updatedItem.downloadLink) {
        const newUrl = applyMigrationReplacements(updatedItem.downloadLink, findText, replaceText, mode, flexMatch);
        if (newUrl !== updatedItem.downloadLink) {
          updatedItem.downloadLink = newUrl;
          hasChanges = true;
        }
      }

      // Check downloadLinks array
      if (updatedItem.downloadLinks && Array.isArray(updatedItem.downloadLinks)) {
        updatedItem.downloadLinks = updatedItem.downloadLinks.map(link => {
          if (link.url) {
            const newUrl = applyMigrationReplacements(link.url, findText, replaceText, mode, flexMatch);
            if (newUrl !== link.url) {
              hasChanges = true;
              return {
                ...link,
                url: newUrl
              };
            }
          }
          return link;
        });
      }

      // Save if changes were made
      if (hasChanges) {
        await addContentToFirestore(updatedItem);
        updatedCount++;
      }
    }

    return { success: true, updatedCount };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, updatedCount: 0, error: error instanceof Error ? error.message : 'Migration failed.' };
  }
}

/* ==========================================================================
   🎬 DEDICATED MP4MOVIEZ ISOLATED MIGRATION SUITE
   Guarantees 100% isolation: Filmyzilla & other links are strictly untouched!
   ========================================================================== */

export type Mp4moviezMigrationMode = 'domain' | 'path' | 'full' | 'custom';

export interface Mp4moviezMigrationParams {
  mode: Mp4moviezMigrationMode;
  oldDomain?: string;
  newDomain?: string;
  oldPath?: string;
  newPath?: string;
  oldCustom?: string;
  newCustom?: string;
}

function applyMp4moviezReplacements(url: string, params: Mp4moviezMigrationParams): string {
  if (!url || !isMp4moviezUrl(url)) return url;

  let currentUrl = url;

  if (params.mode === 'domain' && params.oldDomain && params.newDomain) {
    currentUrl = replaceDomainOnly(currentUrl, params.oldDomain, params.newDomain);
  } else if (params.mode === 'path' && params.oldPath && params.newPath) {
    currentUrl = replacePathSegmentsOnly(currentUrl, params.oldPath, params.newPath, false);
  } else if (params.mode === 'full') {
    if (params.oldDomain && params.newDomain) {
      currentUrl = replaceDomainOnly(currentUrl, params.oldDomain, params.newDomain);
    }
    if (params.oldPath && params.newPath) {
      currentUrl = replacePathSegmentsOnly(currentUrl, params.oldPath, params.newPath, false);
    }
  } else if (params.mode === 'custom' && params.oldCustom && params.newCustom) {
    const rawTerms = params.oldCustom.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
    for (const term of rawTerms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      currentUrl = currentUrl.replace(new RegExp(escaped, 'gi'), params.newCustom.trim());
    }
  }

  return currentUrl;
}

function isMp4moviezMatch(url: string, params: Mp4moviezMigrationParams): boolean {
  if (!url || !isMp4moviezUrl(url)) return false;

  if (params.mode === 'domain' && params.oldDomain) {
    return urlMatchesDomain(url, params.oldDomain);
  } else if (params.mode === 'path' && params.oldPath) {
    return urlMatchesPath(url, params.oldPath, false);
  } else if (params.mode === 'full') {
    const domainMatch = params.oldDomain ? urlMatchesDomain(url, params.oldDomain) : false;
    const pathMatch = params.oldPath ? urlMatchesPath(url, params.oldPath, false) : false;
    return domainMatch || pathMatch;
  } else if (params.mode === 'custom' && params.oldCustom) {
    const terms = params.oldCustom.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
    return terms.some(t => url.toLowerCase().includes(t.toLowerCase()));
  }

  return false;
}

/**
 * Dedicated Scanner for Mp4Moviez Download Links
 */
export async function scanMp4moviezLinksAction(): Promise<{
  success: boolean;
  domains: Array<{ domain: string; count: number }>;
  pathSegments: Array<{ segment: string; count: number }>;
  totalLinksCount: number;
  totalMoviesCount: number;
  error?: string;
}> {
  try {
    const allContent = await getContentFromFirestore(true);
    const domainCounts: Record<string, number> = {};
    const segmentCounts: Record<string, number> = {};
    let totalLinks = 0;
    let moviesCount = 0;

    for (const item of allContent) {
      const mp4Urls: string[] = [];
      if (item.downloadLink && isMp4moviezUrl(item.downloadLink)) {
        mp4Urls.push(item.downloadLink.trim());
      }
      if (item.downloadLinks && Array.isArray(item.downloadLinks)) {
        for (const link of item.downloadLinks) {
          if (link.url && isMp4moviezUrl(link.url)) {
            mp4Urls.push(link.url.trim());
          }
        }
      }

      if (mp4Urls.length > 0) {
        moviesCount++;
        totalLinks += mp4Urls.length;
        for (const rawUrl of mp4Urls) {
          try {
            const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
            const host = urlObj.hostname;
            if (host) {
              domainCounts[host] = (domainCounts[host] || 0) + 1;
            }
            const parts = urlObj.pathname.split('/').filter(p => p && !/^\d+$/.test(p));
            for (const part of parts) {
              segmentCounts[part] = (segmentCounts[part] || 0) + 1;
            }
          } catch {
            const matchDomain = rawUrl.match(/https?:\/\/([^\/]+)/i);
            if (matchDomain && matchDomain[1]) {
              domainCounts[matchDomain[1]] = (domainCounts[matchDomain[1]] || 0) + 1;
            }
          }
        }
      }
    }

    const sortedDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);

    const sortedSegments = Object.entries(segmentCounts)
      .map(([segment, count]) => ({ segment, count }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      domains: sortedDomains,
      pathSegments: sortedSegments,
      totalLinksCount: totalLinks,
      totalMoviesCount: moviesCount
    };
  } catch (error) {
    console.error('Scan Mp4Moviez links failed:', error);
    return {
      success: false,
      domains: [],
      pathSegments: [],
      totalLinksCount: 0,
      totalMoviesCount: 0,
      error: error instanceof Error ? error.message : 'Scan failed.'
    };
  }
}

/**
 * Dedicated Preview for Mp4Moviez Link Migration
 */
export async function previewMp4moviezMigrationAction(params: Mp4moviezMigrationParams): Promise<{
  success: boolean;
  matchCount: number;
  sampleMatches: Array<{ id: string | number; title: string; oldUrl: string; newUrlPreview: string }>;
  error?: string;
}> {
  try {
    const allContent = await getContentFromFirestore(true);
    const matches: Array<{ id: string | number; title: string; oldUrl: string; newUrlPreview: string }> = [];

    for (const item of allContent) {
      let matchedInItem = false;
      let sampleOld = '';
      let sampleNew = '';

      const checkLink = (rawUrl: string) => {
        if (!rawUrl || !isMp4moviezUrl(rawUrl)) return;
        if (isMp4moviezMatch(rawUrl, params)) {
          matchedInItem = true;
          if (!sampleOld) {
            sampleOld = rawUrl;
            const replaced = applyMp4moviezReplacements(rawUrl, params);
            sampleNew = (replaced !== rawUrl) ? replaced : `(Matched: ${sampleOld})`;
          }
        }
      };

      if (item.downloadLink) {
        checkLink(item.downloadLink);
      }

      if (item.downloadLinks && Array.isArray(item.downloadLinks)) {
        for (const link of item.downloadLinks) {
          if (link.url) {
            checkLink(link.url);
          }
        }
      }

      if (matchedInItem) {
        matches.push({
          id: item.id,
          title: item.title,
          oldUrl: sampleOld,
          newUrlPreview: sampleNew
        });
      }
    }

    return {
      success: true,
      matchCount: matches.length,
      sampleMatches: matches.slice(0, 20)
    };
  } catch (error) {
    console.error('Mp4Moviez migration preview failed:', error);
    return {
      success: false,
      matchCount: 0,
      sampleMatches: [],
      error: error instanceof Error ? error.message : 'Preview failed.'
    };
  }
}

/**
 * Dedicated Batch Migrator for Mp4Moviez Download Links
 */
export async function migrateMp4moviezLinksAction(params: Mp4moviezMigrationParams): Promise<{
  success: boolean;
  updatedCount: number;
  error?: string;
}> {
  try {
    const allContent = await getContentFromFirestore(true);
    let updatedCount = 0;

    for (const item of allContent) {
      let hasChanges = false;
      const updatedItem = { ...item };

      if (updatedItem.downloadLink && isMp4moviezUrl(updatedItem.downloadLink)) {
        const newUrl = applyMp4moviezReplacements(updatedItem.downloadLink, params);
        if (newUrl !== updatedItem.downloadLink) {
          updatedItem.downloadLink = newUrl;
          hasChanges = true;
        }
      }

      if (updatedItem.downloadLinks && Array.isArray(updatedItem.downloadLinks)) {
        updatedItem.downloadLinks = updatedItem.downloadLinks.map(link => {
          if (link.url && isMp4moviezUrl(link.url)) {
            const newUrl = applyMp4moviezReplacements(link.url, params);
            if (newUrl !== link.url) {
              hasChanges = true;
              return {
                ...link,
                url: newUrl
              };
            }
          }
          return link;
        });
      }

      if (hasChanges) {
        await addContentToFirestore(updatedItem);
        updatedCount++;
      }
    }

    return { success: true, updatedCount };
  } catch (error) {
    console.error('Mp4Moviez migration failed:', error);
    return {
      success: false,
      updatedCount: 0,
      error: error instanceof Error ? error.message : 'Migration failed.'
    };
  }
}

export async function migrateDownloadDomains(
  oldDomain: string,
  newDomain: string
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  return await migrateDownloadLinks(oldDomain, newDomain);
}

/**
 * Get download URL for a content item
 * Used by the download interstitial page
 */
export async function getDownloadUrl(
  contentId: number | string,
  linkIndex?: number,
  seasonNum?: number,
  episodeNum?: number,
  isZip?: boolean
): Promise<{ title: string; url: string } | null> {
  try {
    const allContent = await getContentFromFirestore();
    const content = allContent.find(c => String(c.id) === String(contentId));

    if (!content) {
      return null;
    }

    let url = '';
    let resolvedTitle = content.title;

    // 1. If Season & Episode specific request
    if (seasonNum !== undefined && episodeNum !== undefined && content.seasons && content.seasons.length > 0) {
      const season = content.seasons.find(s => s.seasonNumber === seasonNum);
      if (season && season.episodes) {
        const episode = season.episodes.find(e => e.episodeNumber === episodeNum);
        if (episode) {
          resolvedTitle = `${content.title} - S${seasonNum}E${episodeNum} (${episode.episodeTitle || 'Episode'})`;
          if (linkIndex !== undefined && episode.downloadLinks && episode.downloadLinks[linkIndex]) {
            url = episode.downloadLinks[linkIndex].url;
          } else if (episode.downloadLinks && episode.downloadLinks.length > 0) {
            url = episode.downloadLinks[0].url;
          } else if (episode.downloadLink) {
            url = episode.downloadLink;
          }
        }
      }
    }
    // 2. If Full Season ZIP Pack request
    else if (isZip && seasonNum !== undefined && content.seasons && content.seasons.length > 0) {
      const season = content.seasons.find(s => s.seasonNumber === seasonNum);
      if (season && season.zipPackLinks && season.zipPackLinks.length > 0) {
        resolvedTitle = `${content.title} - Season ${seasonNum} Complete ZIP Pack`;
        if (linkIndex !== undefined && season.zipPackLinks[linkIndex]) {
          url = season.zipPackLinks[linkIndex].url;
        } else {
          url = season.zipPackLinks[0].url;
        }
      }
    }
    // 3. If linkIndex is provided for standard movie downloadLinks array
    else if (linkIndex !== undefined && content.downloadLinks && content.downloadLinks[linkIndex]) {
      url = content.downloadLinks[linkIndex].url;
    }
    // 4. Otherwise, fall back to legacy downloadLink
    else if (content.downloadLink) {
      url = content.downloadLink;
    }
    // 5. Or first item in downloadLinks if available
    else if (content.downloadLinks && content.downloadLinks.length > 0) {
      url = content.downloadLinks[0].url;
    }

    if (!url) {
      return null;
    }

    // Check Filmyzilla & Mp4Moviez kill switches
    const settings = await getSecureDownloadSettings();
    const isFilmyzillaLink = (u: string) => u.toLowerCase().includes('filmyzilla');
    const isMp4moviezLink = (u: string) => u.toLowerCase().includes('mp4moviez') || (u.toLowerCase().includes('dl.php') && (u.toLowerCase().includes('id=') || u.toLowerCase().includes('jio=')));

    if (!settings.filmyzillaLinksEnabled && isFilmyzillaLink(url)) {
      return null;
    }
    if (!settings.mp4moviezLinksEnabled && isMp4moviezLink(url)) {
      return null;
    }

    return {
      title: resolvedTitle,
      url
    };
  } catch (error) {
    console.error('Failed to get download URL:', error);
    return null;
  }
}

/**
 * Verify user login credentials
 * Used by admin login page
 */
export async function verifyUserLogin(
  username: string,
  password: string
): Promise<{ success: boolean; user?: SystemUser; error?: string }> {
  try {
    const user = await getSystemUser(username);

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Check password (in production, use proper password hashing)
    if (user.password !== password) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Don't return password in the response
    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword as SystemUser
    };
  } catch (error) {
    console.error('Error verifying login:', error);
    return {
      success: false,
      error: 'An error occurred during login'
    };
  }
}

// Player Configuration Management
export async function createPlayerConfig(data: { name: string; type: 'single' | 'playlist'; content: any[] }) {
  const { createCustomPlayer } = await import('@/lib/firestore');
  return createCustomPlayer(data);
}

export async function getPlayerConfigs() {
  const { getCustomPlayers } = await import('@/lib/firestore');
  return getCustomPlayers();
}

export async function updatePlayerConfig(id: string, data: any) {
  const { updateCustomPlayer } = await import('@/lib/firestore');
  return updateCustomPlayer(id, data);
}

export async function deletePlayerConfig(id: string) {
  const { deleteCustomPlayer } = await import('@/lib/firestore');
  return deleteCustomPlayer(id);
}

// Ads Management
export async function createAdNetworkAction(data: { name: string; isEnabled: boolean }) {
  const { createAdNetwork } = await import('@/lib/firestore');
  return createAdNetwork(data);
}

export async function getAdNetworksAction() {
  const { getAdNetworks } = await import('@/lib/firestore');
  return getAdNetworks();
}

export async function updateAdNetworkAction(id: string, data: any) {
  const { updateAdNetwork } = await import('@/lib/firestore');
  return updateAdNetwork(id, data);
}

export async function deleteAdNetworkAction(id: string) {
  const { deleteAdNetwork } = await import('@/lib/firestore');
  return deleteAdNetwork(id);
}

export async function createAdScriptAction(data: any) {
  const { createAdScript } = await import('@/lib/firestore');
  return createAdScript(data);
}

export async function getAdScriptsAction(networkId?: string) {
  const { getAdScripts } = await import('@/lib/firestore');
  return getAdScripts(networkId);
}

export async function updateAdScriptAction(id: string, data: any) {
  const { updateAdScript } = await import('@/lib/firestore');
  return updateAdScript(id, data);
}

export async function deleteAdScriptAction(id: string) {
  const { deleteAdScript } = await import('@/lib/firestore');
  return deleteAdScript(id);
}

export async function createAdZoneAction(data: any) {
  const { createAdZone } = await import('@/lib/firestore');
  return createAdZone(data);
}

export async function getAdZonesAction(page?: string) {
  const { getAdZones } = await import('@/lib/firestore');
  return getAdZones(page);
}

export async function updateAdZoneAction(id: string, data: any) {
  const { updateAdZone } = await import('@/lib/firestore');
  return updateAdZone(id, data);
}

export async function deleteAdZoneAction(id: string) {
  const { deleteAdZone } = await import('@/lib/firestore');
  return deleteAdZone(id);
}

export async function getAdSettingsAction() {
  const { getAdSettings } = await import('@/lib/firestore');
  return getAdSettings();
}

export async function updateAdSettingsAction(settings: any) {
  const { updateAdSettings } = await import('@/lib/firestore');
  return updateAdSettings(settings);
}

// Content Requests Actions
export async function submitContentRequestAction(data: {
  tmdbId: string;
  title: string;
  posterPath: string;
  backdropPath: string;
  type: 'movie' | 'tv';
  releaseDate?: string;
}) {
  try {
    const { createOrIncrementContentRequest } = await import('@/lib/firestore');
    return await createOrIncrementContentRequest(data);
  } catch (error) {
    console.error('submitContentRequestAction error:', error);
    return { success: false, requestCount: 0, message: 'Failed to submit request' };
  }
}

export async function getContentRequestsAction() {
  try {
    const { getContentRequests } = await import('@/lib/firestore');
    return await getContentRequests();
  } catch (error) {
    console.error('getContentRequestsAction error:', error);
    return [];
  }
}

export async function getContentRequestByTmdbIdAction(tmdbId: string) {
  try {
    if (!tmdbId) return null;
    const { getContentRequestByTmdbId } = await import('@/lib/firestore');
    return await getContentRequestByTmdbId(tmdbId);
  } catch (error) {
    console.error('getContentRequestByTmdbIdAction error:', error);
    return null;
  }
}

export async function updateContentRequestStatusAction(id: string, status: 'pending' | 'fulfilled' | 'rejected') {
  try {
    const { updateContentRequestStatus } = await import('@/lib/firestore');
    return await updateContentRequestStatus(id, status);
  } catch (error) {
    console.error('updateContentRequestStatusAction error:', error);
    return { success: false };
  }
}

export async function deleteContentRequestAction(id: string) {
  try {
    const { deleteContentRequest } = await import('@/lib/firestore');
    return await deleteContentRequest(id);
  } catch (error) {
    console.error('deleteContentRequestAction error:', error);
    return { success: false };
  }
}

// Views Analytics Actions
export async function getContentViewAnalyticsAction() {
  try {
    const { getContentViewAnalytics } = await import('@/lib/firestore');
    return await getContentViewAnalytics();
  } catch (error) {
    console.error('getContentViewAnalyticsAction error:', error);
    return {
      topMovies: [],
      topChannels: [],
      totalMovieViews: 0,
      totalChannelViews: 0,
      totalOverallViews: 0,
      showPublicViews: true
    };
  }
}

export async function updatePublicViewsSettingAction(enabled: boolean) {
  try {
    const { saveSiteConfigToFirestore } = await import('@/lib/firestore');
    return await saveSiteConfigToFirestore({ showPublicViewsCount: enabled });
  } catch (error) {
    console.error('updatePublicViewsSettingAction error:', error);
    return { success: false };
  }
}

export async function getHeaderScriptsAction(): Promise<string> {
  try {
    const { getSiteConfigFromFirestore, getAdSettings } = await import('@/lib/firestore');
    const [config, ads] = await Promise.all([
      getSiteConfigFromFirestore(),
      getAdSettings()
    ]);
    return config.headerScripts || ads.headerScripts || '';
  } catch (error) {
    console.error('getHeaderScriptsAction error:', error);
    return '';
  }
}

export async function updateHeaderScriptsAction(scripts: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { saveSiteConfigToFirestore, updateAdSettings, getAdSettings } = await import('@/lib/firestore');
    const currentAds = await getAdSettings();
    await Promise.all([
      saveSiteConfigToFirestore({ headerScripts: scripts }),
      updateAdSettings({ ...currentAds, headerScripts: scripts })
    ]);
    return { success: true };
  } catch (error: any) {
    console.error('updateHeaderScriptsAction error:', error);
    return { success: false, error: error?.message || 'Failed to save header scripts' };
  }
}




