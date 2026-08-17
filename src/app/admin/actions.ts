
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
  filmyzillaLinksEnabled: boolean = true
): Promise<{ success: boolean; error?: string }> {
  if (typeof delay !== 'number' || delay < 0) {
    return { success: false, error: 'Delay must be a positive number.' };
  }

  try {
    await saveSiteConfigToFirestore({
      secureDownloadsEnabled: enabled,
      downloadButtonDelay: delay,
      globalDownloadsEnabled: globalEnabled,
      filmyzillaLinksEnabled: filmyzillaLinksEnabled
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

function replaceDomainOnly(url: string, findDomainsRaw: string, replaceDomainRaw: string): string {
  if (!url || !findDomainsRaw || !replaceDomainRaw) return url;
  
  let targetDomain = replaceDomainRaw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (!targetDomain) return url;

  const findDomains = findDomainsRaw.split(/[\n,]+/)
    .map(d => d.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, ''))
    .filter(Boolean);

  let currentUrl = url;
  for (const domain of findDomains) {
    if (!domain) continue;
    const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Match http(s)://(subdomain.)domain.com
    const protoRegex = new RegExp(`^(https?:\\/\\/(?:[^\\/]+\\.)?)${escaped}(\\b|\\/|:|$)`, 'i');
    if (protoRegex.test(currentUrl)) {
      currentUrl = currentUrl.replace(protoRegex, `$1${targetDomain}$2`);
      continue;
    }

    // Match www.domain.com or domain.com at start of URL before path
    const startRegex = new RegExp(`^((?:www\\.)?)${escaped}(\\b|\\/|:|$)`, 'i');
    if (startRegex.test(currentUrl)) {
      currentUrl = currentUrl.replace(startRegex, `$1${targetDomain}$2`);
      continue;
    }

    // Fallback: replace domain in protocol host position
    const fallbackRegex = new RegExp(`(https?:\\/\\/)${escaped}(\\b|\\/|:|$)`, 'gi');
    currentUrl = currentUrl.replace(fallbackRegex, `$1${targetDomain}$2`);
  }

  return currentUrl;
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
    const allContent = await getContentFromFirestore();
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
    const allContent = await getContentFromFirestore();
    const matches: Array<{ id: string | number; title: string; oldUrl: string; newUrlPreview: string }> = [];

    for (const item of allContent) {
      let matchedInItem = false;
      let sampleOld = '';
      let sampleNew = '';

      if (item.downloadLink) {
        const newUrl = applyMigrationReplacements(item.downloadLink, findText, replaceText, mode, flexMatch);
        if (newUrl !== item.downloadLink) {
          matchedInItem = true;
          sampleOld = item.downloadLink;
          sampleNew = newUrl;
        }
      }

      if (item.downloadLinks && Array.isArray(item.downloadLinks)) {
        for (const link of item.downloadLinks) {
          if (link.url) {
            const newUrl = applyMigrationReplacements(link.url, findText, replaceText, mode, flexMatch);
            if (newUrl !== link.url) {
              matchedInItem = true;
              if (!sampleOld) {
                sampleOld = link.url;
                sampleNew = newUrl;
              }
            }
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
      sampleMatches: matches.slice(0, 10)
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
    const allContent = await getContentFromFirestore();
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
  contentId: number,
  linkIndex?: number
): Promise<{ title: string; url: string } | null> {
  try {
    const allContent = await getContentFromFirestore();
    const content = allContent.find(c => c.id === String(contentId));

    if (!content) {
      return null;
    }

    let url = '';

    // If linkIndex is provided, get specific link from downloadLinks array
    if (linkIndex !== undefined && content.downloadLinks && content.downloadLinks[linkIndex]) {
      url = content.downloadLinks[linkIndex].url;
    }
    // Otherwise, fall back to legacy downloadLink
    else if (content.downloadLink) {
      url = content.downloadLink;
    }
    // Or first item in downloadLinks if available
    else if (content.downloadLinks && content.downloadLinks.length > 0) {
      url = content.downloadLinks[0].url;
    }

    if (!url) {
      return null;
    }

    // Check Filmyzilla kill switch
    const settings = await getSecureDownloadSettings();
    if (!settings.filmyzillaLinksEnabled && url.toLowerCase().includes('filmyzilla')) {
      return null;
    }

    return {
      title: content.title,
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




