'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { shouldShowAd, getAdSettings, getAdScriptsByType, selectRandomScript } from '@/lib/ad-utils';
import { AdContainer, executeAdScript } from './ad-container';

export default function SocialBarAd() {
    const [socialScript, setSocialScript] = useState<string | null>(null);
    const [stickyScript, setStickyScript] = useState<string | null>(null);
    const [isStickyVisible, setIsStickyVisible] = useState(true);

    // 1. Pure Social Bar Injection (auto-floating script managed by ad network)
    useEffect(() => {
        const loadSocialBar = async () => {
            try {
                const settings = await getAdSettings();
                const canShow = await shouldShowAd('social_bar', undefined, settings.testMode, settings.masterEnabled);
                if (!canShow) return;

                const scripts = await getAdScriptsByType('social_bar');
                const selected = selectRandomScript(scripts);
                if (selected?.script) {
                    setSocialScript(selected.script);
                }
            } catch (error) {
                console.error('Error loading social bar ad:', error);
            }
        };

        loadSocialBar();
    }, []);

    // Execute social bar script in DOM
    useEffect(() => {
        if (!socialScript) return;
        const container = document.createElement('div');
        container.id = 'social-bar-ad-pure-container';
        document.body.appendChild(container);
        executeAdScript(container, socialScript);

        return () => {
            if (document.body.contains(container)) {
                document.body.removeChild(container);
            }
        };
    }, [socialScript]);

    // 2. Dedicated Bottom Sticky Overlay Banner
    useEffect(() => {
        const loadBottomSticky = async () => {
            try {
                const settings = await getAdSettings();
                const canShow = await shouldShowAd('bottom_sticky', undefined, settings.testMode, settings.masterEnabled);
                if (!canShow) return;

                let scripts = await getAdScriptsByType('bottom_sticky');
                if (scripts.length === 0) {
                    scripts = await getAdScriptsByType('banner_728x90');
                }
                if (scripts.length === 0) {
                    scripts = await getAdScriptsByType('banner_468x60');
                }

                const selected = selectRandomScript(scripts);
                if (selected?.script) {
                    setStickyScript(selected.script);
                }
            } catch (error) {
                console.error('Error loading bottom sticky ad:', error);
            }
        };

        loadBottomSticky();
    }, []);

    return (
        <>
            {/* Bottom Sticky Overlay Banner */}
            {stickyScript && isStickyVisible && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t shadow-xl">
                    <div className="container mx-auto px-2 py-1.5 relative flex flex-col items-center justify-center min-h-[70px] sm:min-h-[105px]">
                        <button
                            onClick={() => setIsStickyVisible(false)}
                            className="absolute top-1 right-2 p-1.5 rounded-full bg-muted/80 hover:bg-muted text-foreground transition-colors z-10"
                            aria-label="Close advertisement"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Advertisement</div>
                        <AdContainer html={stickyScript} className="bottom-sticky-ad-content flex justify-center items-center w-full min-h-[60px] sm:min-h-[90px] overflow-hidden" />
                    </div>
                </div>
            )}
        </>
    );
}
