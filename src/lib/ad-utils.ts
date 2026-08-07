// Ad utility functions for frequency capping, ad blocker detection, etc.

const AD_COUNT_KEY = 'moovie_ad_counts';
const AD_COUNT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface AdCount {
    [adType: string]: {
        count: number;
        timestamp: number;
    };
}

/**
 * Check if an ad can be shown based on frequency cap
 */
export function checkFrequencyCap(adType: string, maxPerDay: number): boolean {
    if (typeof window === 'undefined') return false;

    try {
        const stored = localStorage.getItem(AD_COUNT_KEY);
        if (!stored) return true;

        const adCounts: AdCount = JSON.parse(stored);
        const adData = adCounts[adType];

        if (!adData) return true;

        // Check if data is expired (older than 24 hours)
        const now = Date.now();
        if (now - adData.timestamp > AD_COUNT_EXPIRY) {
            // Reset count
            delete adCounts[adType];
            localStorage.setItem(AD_COUNT_KEY, JSON.stringify(adCounts));
            return true;
        }

        // Check if under limit
        return adData.count < maxPerDay;
    } catch (error) {
        console.error('Error checking frequency cap:', error);
        return true; // Allow ad on error
    }
}

/**
 * Increment ad count for frequency tracking
 */
export function incrementAdCount(adType: string): void {
    if (typeof window === 'undefined') return;

    try {
        const stored = localStorage.getItem(AD_COUNT_KEY);
        const adCounts: AdCount = stored ? JSON.parse(stored) : {};

        const now = Date.now();
        const adData = adCounts[adType];

        if (!adData || now - adData.timestamp > AD_COUNT_EXPIRY) {
            // Create new entry or reset expired one
            adCounts[adType] = {
                count: 1,
                timestamp: now
            };
        } else {
            // Increment existing count
            adCounts[adType].count += 1;
        }

        localStorage.setItem(AD_COUNT_KEY, JSON.stringify(adCounts));
    } catch (error) {
        console.error('Error incrementing ad count:', error);
    }
}

/**
 * Detect if ad blocker is active
 */
export function isAdBlockerActive(): boolean {
    if (typeof window === 'undefined') return false;

    try {
        // Create a test element that ad blockers typically block
        const testAd = document.createElement('div');
        testAd.innerHTML = '&nbsp;';
        testAd.className = 'adsbox ad-placement ad-placeholder adbanner';
        testAd.style.position = 'absolute';
        testAd.style.left = '-9999px';
        document.body.appendChild(testAd);

        // Check if it was blocked
        const isBlocked = testAd.offsetHeight === 0;
        document.body.removeChild(testAd);

        return isBlocked;
    } catch (error) {
        return false;
    }
}

/**
 * Check if user is admin (for test mode)
 */
export function isUserAdmin(): boolean {
    if (typeof window === 'undefined') return false;

    try {
        // Check if admin session exists
        const adminSession = document.cookie.includes('admin_session');
        return adminSession;
    } catch (error) {
        return false;
    }
}

/**
 * Master check function - determines if ad should be shown
 */
export async function shouldShowAd(
    adType: string,
    frequency?: number,
    testMode?: boolean,
    masterEnabled?: boolean
): Promise<boolean> {
    // Check master kill switch
    if (masterEnabled === false) return false;

    // Check test mode
    if (testMode && !isUserAdmin()) return false;

    // Check frequency cap for pop-ups
    if (adType === 'popup' && frequency) {
        if (!checkFrequencyCap(adType, frequency)) return false;
    }

    return true;
}

/**
 * Get ad settings from API
 */
export async function getAdSettings() {
    try {
        const response = await fetch('/api/admin/ads/settings');
        if (!response.ok) {
            return {
                masterEnabled: true,
                testMode: false,
                popupFrequencyCap: 2
            };
        }
        const data = await response.json();
        return data || {
            masterEnabled: true,
            testMode: false,
            popupFrequencyCap: 2
        };
    } catch {
        return {
            masterEnabled: true,
            testMode: false,
            popupFrequencyCap: 2
        };
    }
}

/**
 * Get ad scripts by type with flexible type matching
 */
export async function getAdScriptsByType(adType: string) {
    try {
        const response = await fetch('/api/admin/ads/scripts');
        if (!response.ok) return [];
        const scripts = await response.json();
        if (!Array.isArray(scripts)) return [];

        return scripts.filter((s: any) => {
            if (!s || !s.isEnabled) return false;
            if (s.adType === adType) return true;
            // Flexible matching for banners (e.g. 'banner' matching 'banner_728x90')
            if (adType.startsWith('banner') && (s.adType === 'banner' || s.adType.startsWith('banner'))) {
                return true;
            }
            // Flexible matching for popups/popunders
            if ((adType === 'popup' || adType === 'popunder') && (s.adType === 'popup' || s.adType === 'popunder')) {
                return true;
            }
            return false;
        });
    } catch {
        return [];
    }
}

/**
 * Select random script from available scripts (for rotation)
 */
export function selectRandomScript(scripts: any[]): any | null {
    if (scripts.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * scripts.length);
    return scripts[randomIndex];
}

// Simple in-memory cache for zones to prevent multiple requests
let zonesCache: any[] | null = null;
let zonesPromise: Promise<any> | null = null;

/**
 * Get configuration for a specific ad zone
 */
export async function getZoneConfig(positionId: string) {
    try {
        if (zonesCache) {
            return zonesCache.find((z: any) => z.position === positionId && z.isEnabled) || null;
        }

        if (!zonesPromise) {
            zonesPromise = fetch('/api/admin/ads/zones')
                .then(r => {
                    if (!r.ok) return [];
                    return r.json();
                })
                .then(data => {
                    const list = Array.isArray(data) ? data : [];
                    zonesCache = list;
                    return list;
                })
                .catch(err => {
                    zonesPromise = null; // Reset on error
                    return [];
                });
        }

        const zones = await zonesPromise;
        if (!Array.isArray(zones)) return null;
        return zones.find((z: any) => z && z.position === positionId && z.isEnabled) || null;
    } catch (error) {
        console.error('Error fetching zone config:', error);
        return null;
    }
}
