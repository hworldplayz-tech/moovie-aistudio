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
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60 shadow-2xl py-1 px-2">
                    <div className="max-w-7xl mx-auto relative flex flex-col items-center justify-center">
                        <div className="flex items-center justify-between w-full max-w-4xl px-2 mb-0.5">
                            <span className="text-[9px] font-medium text-muted-foreground/80 uppercase tracking-wider">
                                Advertisement
                            </span>
                            <button
                                onClick={() => setIsStickyVisible(false)}
                                className="p-1 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Close advertisement"
                                title="Close ad"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="w-full flex justify-center items-center overflow-hidden">
                            <AdContainer html={stickyScript} className="w-full flex justify-center items-center" />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
