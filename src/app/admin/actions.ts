
'use server';

import { getContentFromFirestore, addContentToFirestore, getSiteConfigFromFirestore, saveSiteConfigToFirestore, createPartnerRequest, getSystemUser, DEFAULT_LINK_PRESETS } from '@/lib/firestore';
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
    showLiveTvCarousel: config.showLiveTvCarousel !== undefined ? config.showLiveTvCarousel : true,
    showFeaturedSection: config.showFeaturedSection,
    featuredLayout: config.featuredLayout,
    downloadSmartLink: adSettings.downloadSmartLink
  };
}

export async function updateSecureDownloadSettings(
  enabled: boolean,
  delay: number,
  globalEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  if (typeof delay !== 'number' || delay < 0) {
    return { success: false, error: 'Delay must be a positive number.' };
  }

  try {
    await saveSiteConfigToFirestore({
      secureDownloadsEnabled: enabled,
      downloadButtonDelay: delay,
      globalDownloadsEnabled: globalEnabled
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to update secure download settings:', error);
    return { success: false, error: 'Failed to save to database.' };
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

export async function getManuallyAddedContent() {
  return await getContentFromFirestore();
}

export async function addContent(tmdbId: string, contentType: 'movie' | 'tv') {
  try {
    const content = await getContentById(tmdbId, contentType);
    if (!content) {
      return { success: false, error: 'Content not found with the provided TMDB ID.' };
    }

    const result = await addContentToFirestore(content);
    return result;
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
 * Helper to build regex for link migration tool
 * Supports flexMatch to automatically match both /download/ and /downloads/ variations
 */
function buildMigrationRegex(findText: string, flexMatch: boolean = true): RegExp {
  const cleanFind = findText.trim();
  const isDownloadPattern = /downloads?/i.test(cleanFind);

  if (flexMatch || isDownloadPattern) {
    let escaped = cleanFind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    escaped = escaped.replace(/downloads/gi, 'downloads?');
    escaped = escaped.replace(/download(?!s\?)/gi, 'downloads?');
    return new RegExp(escaped, 'gi');
  } else {
    const escaped = cleanFind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, 'g');
  }
}

function testMatch(str: string, regex: RegExp): boolean {
  if (!str) return false;
  regex.lastIndex = 0;
  return regex.test(str);
}

function replaceMatch(str: string, regex: RegExp, replacement: string): string {
  if (!str) return str;
  regex.lastIndex = 0;
  return str.replace(regex, replacement);
}

/**
 * Link Migration & Pattern Replacement Tool
 * Batch updates download links by replacing any target substring or pattern
 * (Domain, path segment like /download/ -> /verified/, or server suffix like /server_1 -> /server_2)
 */
export async function previewLinkMigration(
  findText: string,
  replaceText: string,
  flexMatch: boolean = true
): Promise<{
  success: boolean;
  matchCount: number;
  sampleMatches: Array<{ id: string | number; title: string; oldUrl: string; newUrlPreview: string }>;
  error?: string;
}> {
  if (!findText || findText.trim() === '') {
    return { success: false, matchCount: 0, sampleMatches: [], error: 'Find text must be provided.' };
  }

  const cleanFind = findText.trim();
  const cleanReplace = replaceText !== undefined ? replaceText.trim() : '';

  try {
    const allContent = await getContentFromFirestore();
    const matches: Array<{ id: string | number; title: string; oldUrl: string; newUrlPreview: string }> = [];

    const regex = buildMigrationRegex(cleanFind, flexMatch);

    for (const item of allContent) {
      let matchedInItem = false;
      let sampleOld = '';
      let sampleNew = '';

      if (item.downloadLink && testMatch(item.downloadLink, regex)) {
        matchedInItem = true;
        sampleOld = item.downloadLink;
        sampleNew = replaceMatch(item.downloadLink, regex, cleanReplace);
      }

      if (item.downloadLinks && Array.isArray(item.downloadLinks)) {
        for (const link of item.downloadLinks) {
          if (link.url && testMatch(link.url, regex)) {
            matchedInItem = true;
            if (!sampleOld) {
              sampleOld = link.url;
              sampleNew = replaceMatch(link.url, regex, cleanReplace);
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
      sampleMatches: matches.slice(0, 10) // Top 10 sample previews
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
  flexMatch: boolean = true
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  if (!findText || findText.trim() === '') {
    return { success: false, updatedCount: 0, error: 'Find text must be provided.' };
  }

  const cleanFind = findText.trim();
  const cleanReplace = replaceText !== undefined ? replaceText.trim() : '';

  try {
    const allContent = await getContentFromFirestore();
    let updatedCount = 0;
    const regex = buildMigrationRegex(cleanFind, flexMatch);

    for (const item of allContent) {
      let hasChanges = false;
      const updatedItem = { ...item };

      // Check legacy downloadLink
      if (updatedItem.downloadLink && testMatch(updatedItem.downloadLink, regex)) {
        updatedItem.downloadLink = replaceMatch(updatedItem.downloadLink, regex, cleanReplace);
        hasChanges = true;
      }

      // Check downloadLinks array
      if (updatedItem.downloadLinks && Array.isArray(updatedItem.downloadLinks)) {
        updatedItem.downloadLinks = updatedItem.downloadLinks.map(link => {
          if (link.url && testMatch(link.url, regex)) {
            hasChanges = true;
            return {
              ...link,
              url: replaceMatch(link.url, regex, cleanReplace)
            };
          }
          return link;
        });
      }

      // Update if changes were made
      if (hasChanges) {
        await addContentToFirestore(updatedItem);
        updatedCount++;
      }
    }

    return { success: true, updatedCount };
  } catch (error) {
    console.error('Link migration failed:', error);
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

