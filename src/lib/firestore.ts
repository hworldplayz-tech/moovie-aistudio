'use server';
/**
 * @fileOverview Firestore helper functions for content management
 */
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, orderBy, limit, getDoc, where } from 'firebase/firestore';
import type { Content, LiveChannel } from './definitions';

const CONTENT_COLLECTION = 'manually_added_content';
const LIVE_TV_COLLECTION = 'live_tv_channels';

/**
 * Add or update content in Firestore
 */
export async function addContentToFirestore(content: Content): Promise<{ success: boolean }> {
    try {
        const contentRef = doc(db, CONTENT_COLLECTION, String(content.id));
        // Fetch existing doc to preserve createdAt
        const docSnap = await import('firebase/firestore').then(mod => mod.getDoc(contentRef));

        let createdAt = new Date().toISOString();
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Use existing createdAt, or fallback to existing updatedAt, or fallback to current time (if really nothing)
            createdAt = data.createdAt || data.updatedAt || createdAt;
        }

        await setDoc(contentRef, {
            ...content,
            createdAt: createdAt,
            updatedAt: new Date().toISOString(),
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to add content to Firestore:', error);
        return { success: false };
    }
}

/**
 * Get all manually added content from Firestore
 */
export async function getContentFromFirestore(): Promise<Content[]> {
    try {
        const contentQuery = query(
            collection(db, CONTENT_COLLECTION)
        );
        const snapshot = await getDocs(contentQuery);

        const content: Content[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            content.push(data as Content);
        });

        // Client-side sort to handle mixed data
        // Sort by releaseDate desc (newest first), fallback to createdAt
        return content.sort((a, b) => {
            const dateA = a.releaseDate || a.createdAt || '';
            const dateB = b.releaseDate || b.createdAt || '';
            // Compare as strings works for ISO dates (YYYY-MM-DD), but releaseDate might be just YYYY or YYYY-MM-DD.
            // Let's safe guard it.
            if (dateA === dateB) return 0;
            return dateB.localeCompare(dateA);
        });
    } catch (error) {
        console.error('Failed to fetch content from Firestore:', error);
        return [];
    }
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
        return { success: true };
    } catch (error) {
        console.error('Failed to delete content from Firestore:', error);
        return { success: false };
    }
}

const CONFIG_COLLECTION = 'settings';
const CONFIG_DOC = 'site_config';

export type SiteConfig = {
    logoText?: string;
    paginationLimit?: number;
    secureDownloadsEnabled?: boolean;
    downloadButtonDelay?: number;
    globalDownloadsEnabled?: boolean;
    showLiveTvCarousel?: boolean;
    siteTitle?: string;
    titleSuffix?: string;
    showFeaturedSection?: boolean;
    featuredLayout?: 'slider' | 'grid' | 'list';
}

export async function getSiteConfigFromFirestore(): Promise<SiteConfig> {
    try {
        const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC);
        const docSnap = await import('firebase/firestore').then(mod => mod.getDoc(docRef));

        if (docSnap.exists()) {
            return docSnap.data() as SiteConfig;
        }
        return {};
    } catch (error) {
        console.error('Failed to fetch config from Firestore:', error);
        return {};
    }
}

export async function saveSiteConfigToFirestore(config: SiteConfig): Promise<{ success: boolean }> {
    try {
        const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC);
        await setDoc(docRef, config, { merge: true });
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
        return { success: true };
    } catch (error) {
        console.error('Error adding live channel:', error);
        return { success: false };
    }
}

export async function getLiveChannels(limitCount?: number): Promise<LiveChannel[]> {
    try {
        let q = query(collection(db, LIVE_TV_COLLECTION), orderBy('createdAt', 'desc'));
        if (limitCount) {
            q = query(q, limit(limitCount));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveChannel));
    } catch (error) {
        console.error('Error fetching live channels:', error);
        return [];
    }
}

export async function getLiveChannelById(id: string): Promise<LiveChannel | null> {
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
        return { success: true };
    } catch (error) {
        console.error('Error updating live channel:', error);
        return { success: false };
    }
}

export async function deleteLiveChannel(id: string): Promise<{ success: boolean }> {
    try {
        await deleteDoc(doc(db, LIVE_TV_COLLECTION, id));
        return { success: true };
    } catch (error) {
        console.error('Error deleting live channel:', error);
        return { success: false };
    }
}

/**
 * Get content by slug (for SEO-friendly URLs)
 */
export async function getContentBySlug(slug: string): Promise<Content | null> {
    try {
        const contentCollectionRef = collection(db, CONTENT_COLLECTION);
        const q = query(contentCollectionRef, where('slug', '==', slug));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

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
            languages: docData.languages,
            quality: docData.quality,
            createdAt: docData.createdAt,
            updatedAt: docData.updatedAt,
            lastAirDate: docData.lastAirDate,
            uploadedBy: docData.uploadedBy,
            country: docData.country,
            isFeatured: docData.isFeatured,
            slug: docData.slug,
        } as Content;
    } catch (error) {
        console.error('Error getting content by slug:', error);
        return null;
    }
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
        let q;
        if (networkId) {
            q = query(
                collection(db, AD_SCRIPTS_COLLECTION),
                where('networkId', '==', networkId),
                orderBy('createdAt', 'desc')
            );
        } else {
            q = query(collection(db, AD_SCRIPTS_COLLECTION), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as AdScript);
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
        let q;
        if (page) {
            q = query(
                collection(db, AD_ZONES_COLLECTION),
                where('page', 'in', [page, 'all']),
                orderBy('createdAt', 'desc')
            );
        } else {
            q = query(collection(db, AD_ZONES_COLLECTION), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as AdZone);
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
    } catch (error) {
        console.error('Error fetching ad settings:', error);
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


