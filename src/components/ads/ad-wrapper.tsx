'use client';

import { useEffect, useState, useRef } from 'react';
import { shouldShowAd, getAdSettings, getAdScriptsByType, selectRandomScript, getZoneConfig } from '@/lib/ad-utils';

interface AdWrapperProps {
    adType: string;
    position?: string;
    className?: string;
    lazyLoad?: boolean;
    children?: React.ReactNode;
}

export default function AdWrapper({ adType, position, className = '', lazyLoad = true, children }: AdWrapperProps) {
    const [adScript, setAdScript] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(!lazyLoad);
    const [shouldDisplay, setShouldDisplay] = useState(false);
    const adRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Lazy loading with Intersection Observer
        if (lazyLoad && adRef.current) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            setIsVisible(true);
                            observer.disconnect();
                        }
                    });
                },
                { threshold: 0.1 }
            );

            observer.observe(adRef.current);

            return () => observer.disconnect();
        }
    }, [lazyLoad]);

    useEffect(() => {
        if (!isVisible) return;

        const loadAd = async () => {
            try {
                // Get global settings
                const settings = await getAdSettings();

                let effectiveAdType = adType;
                let specificScriptId = null;

                // Check zone configuration if position is provided
                if (position) {
                    const zone = await getZoneConfig(position);
                    if (zone) {
                        // If zone exists but is disabled, don't show
                        if (!zone.isEnabled) {
                            setShouldDisplay(false);
                            return;
                        }

                        // Override ad type and handle script assignment
                        effectiveAdType = zone.adType;

                        // If specific script assigned and rotation disabled (or specific script selected)
                        if (zone.scriptId && zone.scriptId !== 'none' && !zone.rotation) {
                            specificScriptId = zone.scriptId;
                        }
                    }
                }

                // Check if ad should be shown (global master switch, etc)
                const canShow = await shouldShowAd(
                    effectiveAdType,
                    settings.popupFrequencyCap,
                    settings.testMode,
                    settings.masterEnabled
                );

                if (!canShow) {
                    setShouldDisplay(false);
                    return;
                }

                // Get ad scripts
                const scripts = await getAdScriptsByType(effectiveAdType);

                if (scripts.length === 0) {
                    setShouldDisplay(false);
                    return;
                }

                let selectedScript = null;

                // Use specific script if configured in zone
                if (specificScriptId) {
                    selectedScript = scripts.find((s: any) => s.id === specificScriptId);
                }

                // Fallback to random selection if specific script not found or not set
                if (!selectedScript) {
                    selectedScript = selectRandomScript(scripts);
                }

                if (selectedScript) {
                    setAdScript(selectedScript.script);
                    setShouldDisplay(true);
                }
            } catch (error) {
                console.error('Error loading ad:', error);
                setShouldDisplay(false);
            }
        };

        loadAd();
    }, [isVisible, adType, position]);

    if (!shouldDisplay || !adScript) {
        return null;
    }

    return (
        <div
            ref={adRef}
            className={`ad-container ${className}`}
            data-ad-type={adType}
            data-ad-position={position}
        >
            {children}
            <div
                className="ad-content"
                dangerouslySetInnerHTML={{ __html: adScript }}
            />
        </div>
    );
}
