/**
 * @fileOverview Firestore helper functions for content management
 */
import { db } from './firebase';
import { collection, doc, setDoc, addDoc, getDocs, deleteDoc, updateDoc, query, orderBy, limit, getDoc, where, increment } from 'firebase/firestore';
import type { Content, LiveChannel, Comment } from './definitions';

const CONTENT_COLLECTION = 'manually_added_content';
const LIVE_TV_COLLECTION = 'live_tv_channels';
const EXTERNAL_VIEWS_COLLECTION = 'external_item_views';
const COMMENTS_COLLECTION = 'user_comments';

function sanitizeForFirestore(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeForFirestore(item));
    }
    if (typeof obj === 'object' && !(obj instanceof Date)) {
        const clean: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (val !== undefined) {
                clean[key] = sanitizeForFirestore(val);
            }
        }
        return clean;
    }
    return obj;
}

// In-Memory High-Performance Caching
let cachedAllContent: Content[] | null = null;
let cachedAllContentTime = 0;
const CONTENT_CACHE_TTL = 60 * 1000; // 60 seconds

let cachedSiteConfig: SiteConfig | null = null;
let cachedSiteConfigTime = 0;
const CONFIG_CACHE_TTL = 120 * 1000; // 2 minutes

let cachedLiveChannels: LiveChannel[] | null = null;
let cachedLiveChannelsTime = 0;
const LIVE_TV_CACHE_TTL = 60 * 1000;

export function invalidateContentCache() {
    cachedAllContent = null;
    cachedAllContentTime = 0;
}

export function invalidateConfigCache() {
    cachedSiteConfig = null;
    cachedSiteConfigTime = 0;
}

export function invalidateLiveTvCache() {
    cachedLiveChannels = null;
    cachedLiveChannelsTime = 0;
}

/**
 * Add or update content in Firestore
 */
export async function addContentToFirestore(content: Content): Promise<{ success: boolean; error?: string }> {
    try {
        if (!content || !content.id) {
            return { success: false, error: 'Invalid content ID' };
        }
        const cleanTitle = (content.title || '').trim();
        if (!cleanTitle || cleanTitle.toLowerCase() === 'untitled') {
            console.warn(`[Firestore] Blocked attempt to save untitled content (ID: ${content.id}) to manually_added_content.`);
            return { success: false, error: 'Cannot save content without a valid title' };
        }

        const contentRef = doc(db, CONTENT_COLLECTION, String(content.id));
        // Fetch existing doc to preserve createdAt
        const docSnap = await import('firebase/firestore').then(mod => mod.getDoc(contentRef));

        let createdAt = new Date().toISOString();
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Use existing createdAt, or fallback to existing updatedAt, or fallback to current time (if really nothing)
            createdAt = data.createdAt || data.updatedAt || createdAt;
        }

        const dataToSave = sanitizeForFirestore({
            ...content,
            title: cleanTitle,
            createdAt: createdAt,
            updatedAt: new Date().toISOString(),
        });

        await setDoc(contentRef, dataToSave);
        invalidateContentCache();
        return { success: true };
    } catch (error) {
        console.error('Failed to add content to Firestore:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to add content' };
    }
}

/**
 * Get all manually added content from Firestore with in-memory caching
 */
export async function getContentFromFirestore(forceRefresh = false): Promise<Content[]> {
    const now = Date.now();
    if (!forceRefresh && cachedAllContent && (now - cachedAllContentTime < CONTENT_CACHE_TTL)) {
        return cachedAllContent;
    }

    try {
        const contentQuery = query(
            collection(db, CONTENT_COLLECTION)
        );
        const snapshot = await getDocs(contentQuery);

        const content: Content[] = [];
        const invalidDocIdsToDelete: string[] = [];

        snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Content;
            const title = (data?.title || '').trim();
            // Strictly exclude any unpopulated/untitled stub records
            if (title && title.toLowerCase() !== 'untitled') {
                content.push(data);
            } else {
                // Ghost/untitled stub found, mark for deletion to clean Firestore
                invalidDocIdsToDelete.push(docSnap.id);
            }
        });

        // Asynchronously clean up ghost/untitled stubs from Firestore
        if (invalidDocIdsToDelete.length > 0) {
            console.log(`[Firestore] Cleaning up ${invalidDocIdsToDelete.length} invalid/untitled content stubs...`);
            Promise.allSettled(
                invalidDocIdsToDelete.map(id => deleteDoc(doc(db, CONTENT_COLLECTION, id)))
            ).catch(err => console.error('Failed to clean up untitled content stubs:', err));
        }

        // Client-side sort to handle mixed data
        // Sort by releaseDate desc (newest first), fallback to createdAt
        const sorted = content.sort((a, b) => {
            const dateA = a.releaseDate || a.createdAt || '';
            const dateB = b.releaseDate || b.createdAt || '';
            if (dateA === dateB) return 0;
            return dateB.localeCompare(dateA);
        });

        cachedAllContent = sorted;
        cachedAllContentTime = now;
        return sorted;
    } catch (error) {
        console.error('Failed to fetch content from Firestore:', error);
        return cachedAllContent || [];
    }
}

/**
 * Fast lookup for a single content item by ID
 */
export async function getContentByIdFromFirestore(id: string): Promise<Content | null> {
    if (cachedAllContent && (Date.now() - cachedAllContentTime < CONTENT_CACHE_TTL)) {
        const found = cachedAllContent.find(c => String(c.id) === String(id));
        if (found && found.title && found.title.trim().toLowerCase() !== 'untitled') return found;
    }
    try {
        const docRef = doc(db, CONTENT_COLLECTION, String(id));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as Content;
            const title = (data?.title || '').trim();
            if (title && title.toLowerCase() !== 'untitled') {
                return data;
            }
        }
    } catch (error) {
        console.error(`Failed to get content ${id} from Firestore:`, error);
    }
    return null;
}

/**
 * Delete content from Firestore by IDs
 */
export async function deleteContentFromFirestore(ids: string[]): Promise<{ success: boolean }> {
    try {
        const deletePromises = ids.map(id =>
            deleteDoc(doc(db, CONTENT_COLLECTION, id))
        );
        await Promise.all(deletePromises);
        invalidateContentCache();
        return { success: true };
    } catch (error) {
        console.error('Failed to delete content from Firestore:', error);
        return { success: false };
    }
}

const CONFIG_COLLECTION = 'settings';
const CONFIG_DOC = 'site_config';

export const DEFAULT_LINK_PRESETS = [
    '480p SD [400MB]',
    '720p HD [900MB]',
    '1080p Full HD [2GB]',
    '4K Ultra HD [5GB]',
    'Hindi Dubbed 480p',
    'Hindi Dubbed 720p',
    'Dual Audio (Hindi + Eng) 720p',
    'Dual Audio (Hindi + Eng) 1080p',
    'Season 1 Complete 720p',
    'Download HD (Fast Server)',
];

export const DEFAULT_SITE_LANGUAGES = [
    'Hindi Dubbed',
    'English',
    'Urdu Dubbed',
    'Multi Audio',
    'Punjabi',
    'Tamil',
    'Telugu',
    'Malayalam',
    'Kannada',
    'Bengali',
    'Marathi',
    'Korean',
    'Chinese',
    'Japanese',
    'Turkish',
    'Thai',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Russian',
    'Arabic',
    'Portuguese',
];

export type SiteConfig = {
    logoText?: string;
    paginationLimit?: number;
    secureDownloadsEnabled?: boolean;
    downloadButtonDelay?: number;
    globalDownloadsEnabled?: boolean;
    filmyzillaLinksEnabled?: boolean;
    mp4moviezLinksEnabled?: boolean;
    showLiveTvCarousel?: boolean;
    siteTitle?: string;
    titleSuffix?: string;
    showFeaturedSection?: boolean;
    featuredLayout?: 'slider' | 'grid' | 'list';
    relatedItemsCount?: number;
    relatedLayout?: 'grid' | 'slider';
    downloadLinkPresets?: string[];
    customLanguages?: string[];
    showPublicViewsCount?: boolean;
    headerScripts?: string;
    activeMp4MoviezDomain?: string;
}

/**
 * Dynamically resolves download URLs with the global active domain.
 * If Mp4Moviez domain changes in future, this dynamically remaps all links instantly.
 */
export function resolveDownloadUrl(rawUrl?: string, activeDomain?: string): string {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const cleanUrl = rawUrl.trim();
    if (!cleanUrl) return '';

    const domain = (activeDomain || 'mp4moviez.trading').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');

    // 1. Relative path format (e.g., /dl.php?id=58280&q=720...)
    if (cleanUrl.startsWith('/dl.php') || cleanUrl.startsWith('dl.php')) {
        const path = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
        return `https://${domain}${path}`;
    }

    // 2. Full Mp4Moviez URL format (e.g., https://www.mp4moviez.trading/dl.php?id=58280...)
    const isMp4MoviezUrl = cleanUrl.includes('mp4moviez') || (cleanUrl.includes('dl.php') && (cleanUrl.includes('id=') || cleanUrl.includes('jio=')));
    if (isMp4MoviezUrl) {
        try {
            const parsed = new URL(cleanUrl);
            parsed.protocol = 'https:';
            parsed.host = domain;
            return parsed.toString();
        } catch {
            // Regex fallback for non-standard URLs
            return cleanUrl.replace(/https?:\/\/[^\/]+/i, `https://${domain}`);
        }
    }

    return cleanUrl;
}

export async function getSiteConfigFromFirestore(): Promise<SiteConfig> {
    const now = Date.now();
    if (cachedSiteConfig && (now - cachedSiteConfigTime < CONFIG_CACHE_TTL)) {
        return cachedSiteConfig;
    }

    try {
        const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC);
        const docSnap = await import('firebase/firestore').then(mod => mod.getDoc(docRef));

        if (docSnap.exists()) {
            const configData = docSnap.data() as SiteConfig;
            cachedSiteConfig = configData;
            cachedSiteConfigTime = now;
            return configData;
        }
        return {};
    } catch (error) {
        console.error('Failed to fetch config from Firestore:', error);
        return cachedSiteConfig || {};
    }
}

export async function saveSiteConfigToFirestore(config: SiteConfig): Promise<{ success: boolean }> {
    try {
        const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC);
        await setDoc(docRef, config, { merge: true });
        invalidateConfigCache();
        return { success: true };
    } catch (error) {
        console.error('Failed to save config to Firestore:', error);
        return { success: false };
    }
}

// --- PARTNER SYSTEM ---
import type { SystemUser, PartnerRequest } from './definitions';

const USERS_COLLECTION = 'users';
const REQUESTS_COLLECTION = 'partner_requests';

// USERS
export async function getSystemUser(username: string): Promise<SystemUser | null> {
    try {
        const q = query(collection(db, USERS_COLLECTION), where("username", "==", username));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() } as SystemUser;
        }
        return null;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

export async function createSystemUser(user: SystemUser): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if exists
        const existing = await getSystemUser(user.username);
        if (existing) return { success: false, error: 'Username already taken' };

        await setDoc(doc(db, USERS_COLLECTION, user.username), user); // Use username as Doc ID for uniqueness
        return { success: true };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, error: 'Database error' };
    }
}

export async function getAllPartners(): Promise<SystemUser[]> {
    try {
        const q = query(collection(db, USERS_COLLECTION), where("role", "==", "partner"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemUser));
    } catch (error) {
        console.error('Error fetching partners:', error);
        return [];
    }
}

export async function deleteSystemUser(username: string): Promise<{ success: boolean }> {
    try {
        await deleteDoc(doc(db, USERS_COLLECTION, username));
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { success: false };
    }
}

export async function updateSystemUserPassword(username: string, newPassword: string): Promise<{ success: boolean }> {
    try {
        await setDoc(doc(db, USERS_COLLECTION, username), { password: newPassword }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error updating password:', error);
        return { success: false };
    }
}

// REQUESTS
export async function createPartnerRequest(req: PartnerRequest): Promise<{ success: boolean }> {
    try {
        const newRef = doc(collection(db, REQUESTS_COLLECTION));
        await setDoc(newRef, { ...req, id: newRef.id });
        return { success: true };
    } catch (error) {
        console.error('Error creating request:', error);
        return { success: false };
    }
}

export async function getPartnerRequests(): Promise<PartnerRequest[]> {
    try {
        const q = query(collection(db, REQUESTS_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as PartnerRequest);
    } catch (error) {
        console.error('Error fetching requests:', error);
        return [];
    }
}

export async function updatePartnerRequestStatus(id: string, status: 'approved' | 'rejected', credentials?: { username: string; password: string }): Promise<{ success: boolean }> {
    try {
        const updateData: any = { status };

        // If credentials are provided, save them to the request
        if (credentials) {
            updateData.username = credentials.username;
            updateData.password = credentials.password;
        }

        await setDoc(doc(db, REQUESTS_COLLECTION, id), updateData, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error updating request:', error);
        return { success: false };
    }
}

export async function updatePartnerCredentials(requestId: string, oldUsername: string, newUsername: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Update the partner request document
        await setDoc(doc(db, REQUESTS_COLLECTION, requestId), {
            username: newUsername,
            password: newPassword
        }, { merge: true });

        // 2. If username changed, we need to create a new user doc and delete the old one
        if (oldUsername !== newUsername) {
            // Get the old user data
            const oldUserRef = doc(db, USERS_COLLECTION, oldUsername);
            const oldUserSnap = await import('firebase/firestore').then(mod => mod.getDoc(oldUserRef));

            if (oldUserSnap.exists()) {
                const userData = oldUserSnap.data();

                // Create new user doc with new username
                await setDoc(doc(db, USERS_COLLECTION, newUsername), {
                    ...userData,
                    username: newUsername,
                    password: newPassword
                });

                // Delete old user doc
                await deleteDoc(oldUserRef);
            }
        } else {
            // Just update the password in the existing user doc
            await setDoc(doc(db, USERS_COLLECTION, oldUsername), {
                password: newPassword
            }, { merge: true });
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating partner credentials:', error);
        return { success: false, error: 'Failed to update credentials' };
    }
}
// --- LIVE TV SYSTEM ---

export async function addLiveChannel(channel: LiveChannel): Promise<{ success: boolean }> {
    try {
        const docRef = doc(collection(db, LIVE_TV_COLLECTION));
        const finalChannel = { ...channel, id: docRef.id, createdAt: new Date().toISOString() };
        await setDoc(docRef, finalChannel);
        invalidateLiveTvCache();
        return { success: true };
    } catch (error) {
        console.error('Error adding live channel:', error);
        return { success: false };
    }
}

export async function getLiveChannels(limitCount?: number): Promise<LiveChannel[]> {
    const now = Date.now();
    if (cachedLiveChannels && (now - cachedLiveChannelsTime < LIVE_TV_CACHE_TTL)) {
        return limitCount ? cachedLiveChannels.slice(0, limitCount) : cachedLiveChannels;
    }

    try {
        let q = query(collection(db, LIVE_TV_COLLECTION), orderBy('createdAt', 'desc'));
        if (limitCount) {
            q = query(q, limit(limitCount));
        }
        const snapshot = await getDocs(q);
        const channels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveChannel));
        if (!limitCount || limitCount >= 10) {
            cachedLiveChannels = channels;
            cachedLiveChannelsTime = now;
        }
        return channels;
    } catch (error) {
        console.error('Error fetching live channels:', error);
        return cachedLiveChannels || [];
    }
}

export async function getLiveChannelById(id: string): Promise<LiveChannel | null> {
    if (cachedLiveChannels && (Date.now() - cachedLiveChannelsTime < LIVE_TV_CACHE_TTL)) {
        const found = cachedLiveChannels.find(c => c.id === id);
        if (found) return found;
    }
    try {
        const docRef = doc(db, LIVE_TV_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as LiveChannel;
        }
        return null;
    } catch (error) {
        console.error('Error fetching live channel:', error);
        return null;
    }
}

export async function updateLiveChannel(id: string, data: Partial<LiveChannel>): Promise<{ success: boolean }> {
    try {
        const docRef = doc(db, LIVE_TV_COLLECTION, id);
        // Remove undefined fields
        const updateData = Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== undefined)
        );
        await updateDoc(docRef, updateData);
        invalidateLiveTvCache();
        return { success: true };
    } catch (error) {
        console.error('Error updating live channel:', error);
        return { success: false };
    }
}

export async function deleteLiveChannel(id: string): Promise<{ success: boolean }> {
    try {
        await deleteDoc(doc(db, LIVE_TV_COLLECTION, id));
        invalidateLiveTvCache();
        return { success: true };
    } catch (error) {
        console.error('Error deleting live channel:', error);
        return { success: false };
    }
}

/**
 * Get content by slug (for SEO-friendly URLs) with cache-first acceleration
 */
export async function getContentBySlug(slug: string): Promise<Content | null> {
    const cleanSlug = slug.toLowerCase().trim();
    if (!cleanSlug) return null;
    
    // 1. Fast in-memory check
    if (cachedAllContent && (Date.now() - cachedAllContentTime < CONTENT_CACHE_TTL)) {
        const found = cachedAllContent.find(c => {
            if (!c) return false;
            // Exact custom slug match
            if (c.slug && c.slug.toLowerCase().trim() === cleanSlug) return true;
            
            // Exact ID match
            const cId = String(c.id || '').toLowerCase().trim();
            if (cId && cId === cleanSlug) return true;
            
            // Clean ID match (e.g. stripped of movie-/tv- prefix)
            const cleanCId = cId.replace(/^(movie|tv)-/, '');
            if (cleanCId) {
                if (cleanSlug === cleanCId || cleanSlug === `movie-${cleanCId}` || cleanSlug === `tv-${cleanCId}`) return true;
                if (cleanSlug.startsWith(`${cleanCId}-`) || cleanSlug.startsWith(`movie-${cleanCId}-`) || cleanSlug.startsWith(`tv-${cleanCId}-`)) return true;
            }

            // Exact sanitized title slug match (strict equality only, min 2 chars, never substring includes)
            if (c.title) {
                const itemSlug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                if (itemSlug && itemSlug.length >= 2) {
                    if (cleanSlug === itemSlug || cleanSlug === `download-${itemSlug}` || cleanSlug === `watch-${itemSlug}`) return true;
                }
            }
            return false;
        });
        if (found) return found;
    }

    try {
        const contentCollectionRef = collection(db, CONTENT_COLLECTION);
        const q = query(contentCollectionRef, where('slug', '==', slug));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0].data();
            return {
                id: docData.id,
                title: docData.title,
                description: docData.description,
                posterPath: docData.posterPath,
                backdropPath: docData.backdropPath,
                genres: docData.genres || [],
                releaseDate: docData.releaseDate,
                rating: docData.rating,
                type: docData.type,
                trailerUrl: docData.trailerUrl,
                youtubeTrailerUrl: docData.youtubeTrailerUrl,
                downloadLink: docData.downloadLink,
                downloadLinks: docData.downloadLinks,
                isHindiDubbed: docData.isHindiDubbed,
                customTags: docData.customTags,
                cast: docData.cast,
                runtime: docData.runtime,
                numberOfSeasons: docData.numberOfSeasons,
                seasons: docData.seasons,
                languages: docData.languages,
                quality: docData.quality,
                createdAt: docData.createdAt,
                updatedAt: docData.updatedAt,
                lastAirDate: docData.lastAirDate,
                uploadedBy: docData.uploadedBy,
                country: docData.country,
                isFeatured: docData.isFeatured,
                slug: docData.slug,
                viewsCount: docData.viewsCount || 0,
            } as Content;
        }
    } catch (error) {
        console.error('Error getting content by slug:', error);
    }
    return null;
}

// --- CUSTOM PLAYER SYSTEM ---
import type { CustomPlayer } from './definitions';

const CUSTOM_PLAYERS_COLLECTION = 'custom_players';

export async function createCustomPlayer(player: Omit<CustomPlayer, 'id' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const docRef = doc(collection(db, CUSTOM_PLAYERS_COLLECTION));
        const finalPlayer: CustomPlayer = {
            ...player,
            id: docRef.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await setDoc(docRef, finalPlayer);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating custom player:', error);
        return { success: false, error: 'Failed to create player' };
    }
}

export async function getCustomPlayers(): Promise<CustomPlayer[]> {
    try {
        const q = query(collection(db, CUSTOM_PLAYERS_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as CustomPlayer);
    } catch (error) {
        console.error('Error fetching custom players:', error);
        return [];
    }
}

export async function getCustomPlayerById(id: string): Promise<CustomPlayer | null> {
    try {
        const docRef = doc(db, CUSTOM_PLAYERS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as CustomPlayer;
        }
        return null;
    } catch (error) {
        console.error('Error fetching custom player:', error);
        return null;
    }
}

export async function updateCustomPlayer(id: string, data: Partial<CustomPlayer>): Promise<{ success: boolean }> {
    try {
        const docRef = doc(db, CUSTOM_PLAYERS_COLLECTION, id);
        const updateData = {
            ...data,
            updatedAt: new Date().toISOString(),
        };
        await updateDoc(docRef, updateData);
        return { success: true };
    } catch (error) {
        console.error('Error updating custom player:', error);
        return { success: false };
    }
}

export async function deleteCustomPlayer(id: string): Promise<{ success: boolean }> {
    try {
        await deleteDoc(doc(db, CUSTOM_PLAYERS_COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting custom player:', error);
        return { success: false };
    }
}

// --- ADS MANAGEMENT SYSTEM ---
import type { AdNetwork, AdScript, AdZone, AdSettings } from './definitions';

const AD_NETWORKS_COLLECTION = 'ad_networks';
const AD_SCRIPTS_COLLECTION = 'ad_scripts';
const AD_ZONES_COLLECTION = 'ad_zones';
const AD_SETTINGS_COLLECTION = 'ad_settings';
const AD_SETTINGS_DOC = 'global';

// AD NETWORKS
export async function createAdNetwork(network: Omit<AdNetwork, 'id' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const docRef = doc(collection(db, AD_NETWORKS_COLLECTION));
        const finalNetwork: AdNetwork = {
            ...network,
            id: docRef.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await setDoc(docRef, finalNetwork);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating ad network:', error);
        return { success: false, error: 'Failed to create ad network' };
    }
}

export async function getAdNetworks(): Promise<AdNetwork[]> {
    try {
        const q = query(collection(db, AD_NETWORKS_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as AdNetwork);
    } catch (error) {
        console.error('Error fetching ad networks:', error);
        return [];
    }
}

export async function updateAdNetwork(id: string, data: Partial<AdNetwork>): Promise<{ success: boolean }> {
    try {
        const docRef = doc(db, AD_NETWORKS_COLLECTION, id);
        const updateData = {
            ...data,
            updatedAt: new Date().toISOString(),
        };
        await updateDoc(docRef, updateData);
        return { success: true };
    } catch (error) {
        console.error('Error updating ad network:', error);
        return { success: false };
    }
}

export async function deleteAdNetwork(id: string): Promise<{ success: boolean }> {
    try {
        await deleteDoc(doc(db, AD_NETWORKS_COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting ad network:', error);
        return { success: false };
    }
}

// AD SCRIPTS
export async function createAdScript(script: Omit<AdScript, 'id' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const docRef = doc(collection(db, AD_SCRIPTS_COLLECTION));
        const finalScript: AdScript = {
            ...script,
            id: docRef.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await setDoc(docRef, finalScript);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating ad script:', error);
        return { success: false, error: 'Failed to create ad script' };
    }
}

export async function getAdScripts(networkId?: string): Promise<AdScript[]> {
    try {
        let snapshot;
        if (networkId) {
            const q = query(
                collection(db, AD_SCRIPTS_COLLECTION),
                where('networkId', '==', networkId)
            );
            snapshot = await getDocs(q);
        } else {
            snapshot = await getDocs(collection(db, AD_SCRIPTS_COLLECTION));
        }
        const scripts = snapshot.docs.map(doc => doc.data() as AdScript);
        return scripts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (error) {
        console.error('Error fetching ad scripts:', error);
        return [];
    }
}

export async function updateAdScript(id: string, data: Partial<AdScript>): Promise<{ success: boolean }> {
    try {
        const docRef = doc(db, AD_SCRIPTS_COLLECTION, id);
        const updateData = {
            ...data,
            updatedAt: new Date().toISOString(),
        };
        await updateDoc(docRef, updateData);
        return { success: true };
    } catch (error) {
        console.error('Error updating ad script:', error);
        return { success: false };
    }
}

export async function deleteAdScript(id: string): Promise<{ success: boolean }> {
    try {
        await deleteDoc(doc(db, AD_SCRIPTS_COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting ad script:', error);
        return { success: false };
    }
}

// AD ZONES
export async function createAdZone(zone: Omit<AdZone, 'id' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const docRef = doc(collection(db, AD_ZONES_COLLECTION));
        const finalZone: AdZone = {
            ...zone,
            id: docRef.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await setDoc(docRef, finalZone);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error creating ad zone:', error);
        return { success: false, error: 'Failed to create ad zone' };
    }
}

export async function getAdZones(page?: string): Promise<AdZone[]> {
    try {
        let snapshot;
        if (page) {
            const q = query(
                collection(db, AD_ZONES_COLLECTION),
                where('page', 'in', [page, 'all'])
            );
            snapshot = await getDocs(q);
        } else {
            snapshot = await getDocs(collection(db, AD_ZONES_COLLECTION));
        }
        const zones = snapshot.docs.map(doc => doc.data() as AdZone);
        return zones.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (error) {
        console.error('Error fetching ad zones:', error);
        return [];
    }
}

export async function updateAdZone(id: string, data: Partial<AdZone>): Promise<{ success: boolean }> {
    try {
        const docRef = doc(db, AD_ZONES_COLLECTION, id);
        const updateData = {
            ...data,
            updatedAt: new Date().toISOString(),
        };
        await updateDoc(docRef, updateData);
        return { success: true };
    } catch (error) {
        console.error('Error updating ad zone:', error);
        return { success: false };
    }
}

export async function deleteAdZone(id: string): Promise<{ success: boolean }> {
    try {
        await deleteDoc(doc(db, AD_ZONES_COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting ad zone:', error);
        return { success: false };
    }
}

// AD SETTINGS
export async function getAdSettings(): Promise<AdSettings> {
    try {
        const docRef = doc(db, AD_SETTINGS_COLLECTION, AD_SETTINGS_DOC);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as AdSettings;
        }

        // Return default settings if not found
        const defaultSettings: AdSettings = {
            id: 'global',
            masterEnabled: true,
            testMode: false,
            popupFrequencyCap: 2,
            updatedAt: new Date().toISOString(),
        };

        // Create default settings
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
    } catch {
        return {
            id: 'global',
            masterEnabled: true,
            testMode: false,
            popupFrequencyCap: 2,
            updatedAt: new Date().toISOString(),
        };
    }
}

export async function updateAdSettings(settings: Partial<AdSettings>): Promise<{ success: boolean }> {
    try {
        const docRef = doc(db, AD_SETTINGS_COLLECTION, AD_SETTINGS_DOC);
        const updateData = {
            ...settings,
            id: 'global',
            updatedAt: new Date().toISOString(),
        };
        await setDoc(docRef, updateData, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error updating ad settings:', error);
        return { success: false };
    }
}

// --- CONTENT REQUESTS SYSTEM ---
import type { ContentRequest } from './definitions';

const CONTENT_REQUESTS_COLLECTION = 'content_requests';

export async function createOrIncrementContentRequest(requestData: {
    tmdbId: string;
    title: string;
    posterPath: string;
    backdropPath: string;
    type: 'movie' | 'tv';
    releaseDate?: string;
}): Promise<{ success: boolean; requestCount: number; message?: string }> {
    try {
        const docRef = doc(db, CONTENT_REQUESTS_COLLECTION, String(requestData.tmdbId));
        const docSnap = await getDoc(docRef);

        let count = 1;
        if (docSnap.exists()) {
            const currentData = docSnap.data() as ContentRequest;
            count = (currentData.requestCount || 1) + 1;
            await updateDoc(docRef, {
                requestCount: count,
                updatedAt: new Date().toISOString(),
                // Reset status to pending if previously rejected or fulfilled when requested again
                status: currentData.status === 'rejected' ? 'pending' : currentData.status
            });
        } else {
            const newRequest: ContentRequest = {
                id: String(requestData.tmdbId),
                tmdbId: String(requestData.tmdbId),
                title: requestData.title,
                posterPath: requestData.posterPath || '',
                backdropPath: requestData.backdropPath || '',
                type: requestData.type,
                releaseDate: requestData.releaseDate || '',
                requestedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                requestCount: 1,
                status: 'pending'
            };
            await setDoc(docRef, newRequest);
        }
        return { success: true, requestCount: count };
    } catch (error) {
        console.error('Error creating content request:', error);
        return { success: false, requestCount: 0, message: 'Failed to submit request' };
    }
}

export async function getContentRequests(): Promise<ContentRequest[]> {
    try {
        const q = query(collection(db, CONTENT_REQUESTS_COLLECTION));
        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => doc.data() as ContentRequest);
        return requests.sort((a, b) => {
            if (b.requestCount !== a.requestCount) {
                return b.requestCount - a.requestCount;
            }
            return (b.updatedAt || b.requestedAt || '').localeCompare(a.updatedAt || a.requestedAt || '');
        });
    } catch (error) {
        console.error('Error fetching content requests:', error);
        return [];
    }
}

export async function getContentRequestByTmdbId(tmdbId: string): Promise<ContentRequest | null> {
    try {
        const docRef = doc(db, CONTENT_REQUESTS_COLLECTION, String(tmdbId));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as ContentRequest;
        }
        return null;
    } catch (error) {
        console.error('Error fetching content request:', error);
        return null;
    }
}

export async function updateContentRequestStatus(id: string, status: 'pending' | 'fulfilled' | 'rejected'): Promise<{ success: boolean }> {
    try {
        const docRef = doc(db, CONTENT_REQUESTS_COLLECTION, id);
        await updateDoc(docRef, {
            status,
            updatedAt: new Date().toISOString()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating content request status:', error);
        return { success: false };
    }
}

export async function deleteContentRequest(id: string): Promise<{ success: boolean }> {
    try {
        await deleteDoc(doc(db, CONTENT_REQUESTS_COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting content request:', error);
        return { success: false };
    }
}

// --- VIEWS TRACKING SYSTEM ---
const VIEW_LOGS_COLLECTION = 'view_logs';

export async function recordItemView(
    itemId: string,
    type: 'movie' | 'tv' | 'channel',
    ipAddress: string
): Promise<{ success: boolean; viewsCount: number; showPublicViews: boolean }> {
    const config = await getSiteConfigFromFirestore();
    const showPublicViews = config.showPublicViewsCount !== false;

    if (!itemId) {
        return { success: false, viewsCount: 0, showPublicViews };
    }

    const cleanIp = (ipAddress || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
    const cleanId = String(itemId).trim();
    const logDocId = `${cleanId}_${cleanIp}`;

    const viewLogRef = doc(db, VIEW_LOGS_COLLECTION, logDocId);
    const now = Date.now();
    const DEBOUNCE_MS = 15 * 60 * 1000; // 15 mins unique window per IP per item

    try {
        const logSnap = await getDoc(viewLogRef);
        if (logSnap.exists()) {
            const lastViewed = logSnap.data()?.lastViewedAt || 0;
            if (now - lastViewed < DEBOUNCE_MS) {
                // Return current views count without double counting
                let currentViews = 0;
                if (type === 'channel') {
                    const chanSnap = await getDoc(doc(db, LIVE_TV_COLLECTION, cleanId));
                    currentViews = chanSnap.exists() ? (chanSnap.data()?.viewsCount || 0) : 0;
                } else {
                    const contentSnap = await getDoc(doc(db, CONTENT_COLLECTION, cleanId));
                    if (contentSnap.exists()) {
                        currentViews = contentSnap.data()?.viewsCount || 0;
                    } else {
                        const extSnap = await getDoc(doc(db, EXTERNAL_VIEWS_COLLECTION, cleanId));
                        currentViews = extSnap.exists() ? (extSnap.data()?.viewsCount || 0) : 0;
                    }
                }
                return { success: true, viewsCount: currentViews, showPublicViews };
            }
        }

        // Save view log timestamp
        await setDoc(viewLogRef, {
            itemId: cleanId,
            ipHash: cleanIp,
            type,
            lastViewedAt: now
        }, { merge: true });

        // Increment item viewsCount in Firestore
        let newViewsCount = 1;

        if (type === 'channel') {
            const chanRef = doc(db, LIVE_TV_COLLECTION, cleanId);
            const chanSnap = await getDoc(chanRef);
            if (chanSnap.exists()) {
                await updateDoc(chanRef, { viewsCount: increment(1) });
                newViewsCount = (chanSnap.data()?.viewsCount || 0) + 1;
            }
        } else {
            const contentRef = doc(db, CONTENT_COLLECTION, cleanId);
            const contentSnap = await getDoc(contentRef);
            if (contentSnap.exists()) {
                await updateDoc(contentRef, { viewsCount: increment(1) });
                newViewsCount = (contentSnap.data()?.viewsCount || 0) + 1;
            } else {
                // External / TMDB item not yet imported into library: store view count in external collection
                const extRef = doc(db, EXTERNAL_VIEWS_COLLECTION, cleanId);
                const extSnap = await getDoc(extRef);
                if (extSnap.exists()) {
                    await updateDoc(extRef, { viewsCount: increment(1), updatedAt: new Date().toISOString() });
                    newViewsCount = (extSnap.data()?.viewsCount || 0) + 1;
                } else {
                    await setDoc(extRef, {
                        id: cleanId,
                        type: type || 'movie',
                        viewsCount: 1,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                    newViewsCount = 1;
                }
            }
        }

        return { success: true, viewsCount: newViewsCount, showPublicViews };
    } catch (error) {
        console.error('Error recording item view:', error);
        return { success: false, viewsCount: 0, showPublicViews };
    }
}

export async function getContentViewAnalytics(): Promise<{
    topMovies: Array<{ id: string; title: string; posterPath?: string; type: string; viewsCount: number }>;
    topChannels: Array<{ id: string; title: string; posterUrl?: string; country?: string; viewsCount: number }>;
    totalMovieViews: number;
    totalChannelViews: number;
    totalOverallViews: number;
    showPublicViews: boolean;
}> {
    try {
        const config = await getSiteConfigFromFirestore();
        const showPublicViews = config.showPublicViewsCount !== false;

        const [contentList, channelList] = await Promise.all([
            getContentFromFirestore(),
            getLiveChannels()
        ]);

        let totalMovieViews = 0;
        const moviesWithViews = contentList
            .map(c => {
                const count = c.viewsCount || 0;
                totalMovieViews += count;
                return {
                    id: String(c.id),
                    title: c.title || 'Untitled',
                    posterPath: c.posterPath || '',
                    type: c.type || 'movie',
                    viewsCount: count
                };
            })
            .filter(m => m.viewsCount > 0)
            .sort((a, b) => b.viewsCount - a.viewsCount);

        let totalChannelViews = 0;
        const channelsWithViews = channelList
            .map(ch => {
                const count = ch.viewsCount || 0;
                totalChannelViews += count;
                return {
                    id: String(ch.id),
                    title: ch.title || 'Untitled Channel',
                    posterUrl: ch.posterUrl || ch.posterPath || '',
                    country: ch.country || 'Global',
                    viewsCount: count
                };
            })
            .filter(c => c.viewsCount > 0)
            .sort((a, b) => b.viewsCount - a.viewsCount);

        return {
            topMovies: moviesWithViews.slice(0, 30),
            topChannels: channelsWithViews.slice(0, 30),
            totalMovieViews,
            totalChannelViews,
            totalOverallViews: totalMovieViews + totalChannelViews,
            showPublicViews
        };
    } catch (error) {
        console.error('Error fetching view analytics:', error);
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

/**
 * =========================================================================
 * COMMENTS SYSTEM (Firestore)
 * =========================================================================
 */

/**
 * Add a new comment to Firestore
 */
export async function addCommentToFirestore(params: {
    contentId: string;
    contentTitle?: string;
    contentType?: 'movie' | 'tv' | string;
    author: string;
    text: string;
    avatarUrl?: string;
}): Promise<{ success: boolean; comment?: Comment; error?: string }> {
    try {
        const cleanAuthor = (params.author || '').trim() || 'Anonymous';
        const cleanText = (params.text || '').trim();
        const contentId = String(params.contentId || '').trim();

        if (!cleanText) {
            return { success: false, error: 'Comment text cannot be empty' };
        }
        if (!contentId) {
            return { success: false, error: 'Missing content ID' };
        }

        const now = new Date().toISOString();
        const commentData = sanitizeForFirestore({
            contentId,
            contentTitle: (params.contentTitle || 'Untitled Movie/Show').trim(),
            contentType: params.contentType || 'movie',
            author: cleanAuthor,
            text: cleanText,
            avatarUrl: params.avatarUrl || '',
            timestamp: Date.now(),
            createdAt: now,
            updatedAt: now,
        });

        const docRef = await addDoc(collection(db, COMMENTS_COLLECTION), commentData);
        const newComment: Comment = {
            id: docRef.id,
            ...commentData,
        };

        return { success: true, comment: newComment };
    } catch (error) {
        console.error('Failed to add comment to Firestore:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to post comment' };
    }
}

/**
 * Get all comments for a specific content (movie / tv series)
 */
export async function getCommentsByContentId(contentId: string): Promise<Comment[]> {
    try {
        if (!contentId) return [];
        const strId = String(contentId).trim();
        
        // Fetch comments where contentId matches
        const q = query(
            collection(db, COMMENTS_COLLECTION),
            where('contentId', '==', strId)
        );
        const snapshot = await getDocs(q);
        const comments: Comment[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            comments.push({
                id: doc.id,
                contentId: data.contentId || strId,
                contentTitle: data.contentTitle || '',
                contentType: data.contentType || 'movie',
                author: data.author || 'Anonymous',
                text: data.text || '',
                avatarUrl: data.avatarUrl || '',
                timestamp: data.timestamp || (data.createdAt ? new Date(data.createdAt).getTime() : Date.now()),
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || undefined,
                replies: Array.isArray(data.replies) ? data.replies : [],
            });
        });

        // Sort newest first
        return comments.sort((a, b) => {
            const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.createdAt).getTime();
            const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.createdAt).getTime();
            return timeB - timeA;
        });
    } catch (error) {
        console.error(`Failed to fetch comments for content ${contentId}:`, error);
        return [];
    }
}

/**
 * Get ALL comments across all movies/shows for Admin Panel management
 */
export async function getAllCommentsFromFirestore(): Promise<Comment[]> {
    try {
        const snapshot = await getDocs(collection(db, COMMENTS_COLLECTION));
        const comments: Comment[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            comments.push({
                id: doc.id,
                contentId: data.contentId || '',
                contentTitle: data.contentTitle || 'Untitled Movie/Show',
                contentType: data.contentType || 'movie',
                author: data.author || 'Anonymous',
                text: data.text || '',
                avatarUrl: data.avatarUrl || '',
                timestamp: data.timestamp || (data.createdAt ? new Date(data.createdAt).getTime() : Date.now()),
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || undefined,
                replies: Array.isArray(data.replies) ? data.replies : [],
            });
        });

        // Sort newest first
        return comments.sort((a, b) => {
            const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.createdAt).getTime();
            const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.createdAt).getTime();
            return timeB - timeA;
        });
    } catch (error) {
        console.error('Failed to fetch all comments from Firestore:', error);
        return [];
    }
}

/**
 * Update an existing comment (e.g. edit text or author)
 */
export async function updateCommentInFirestore(
    commentId: string,
    updates: { text?: string; author?: string; contentTitle?: string }
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!commentId) {
            return { success: false, error: 'Invalid comment ID' };
        }
        const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
        const dataToUpdate: Record<string, any> = {
            updatedAt: new Date().toISOString(),
        };

        if (updates.text !== undefined) dataToUpdate.text = updates.text.trim();
        if (updates.author !== undefined) dataToUpdate.author = updates.author.trim();
        if (updates.contentTitle !== undefined) dataToUpdate.contentTitle = updates.contentTitle.trim();

        await updateDoc(commentRef, sanitizeForFirestore(dataToUpdate));
        return { success: true };
    } catch (error) {
        console.error(`Failed to update comment ${commentId}:`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update comment' };
    }
}

/**
 * Delete a comment from Firestore
 */
export async function deleteCommentFromFirestore(commentId: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!commentId) {
            return { success: false, error: 'Invalid comment ID' };
        }
        const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
        await deleteDoc(commentRef);
        return { success: true };
    } catch (error) {
        console.error(`Failed to delete comment ${commentId}:`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete comment' };
    }
}




