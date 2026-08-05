'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { shouldShowAd, getAdSettings, getAdScriptsByType, selectRandomScript } from '@/lib/ad-utils';

export default function SocialBarAd() {
    const [adScript, setAdScript] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(true);
    const [shouldDisplay, setShouldDisplay] = useState(false);

    useEffect(() => {
        const loadAd = async () => {
            try {
                const settings = await getAdSettings();
                const canShow = await shouldShowAd(
                    'social_bar',
                    undefined,
                    settings.testMode,
                    settings.masterEnabled
                );

                if (!canShow) {
                    setShouldDisplay(false);
                    return;
                }

                const scripts = await getAdScriptsByType('social_bar');
                if (scripts.length === 0) {
                    setShouldDisplay(false);
                    return;
                }

                const selectedScript = selectRandomScript(scripts);
                if (selectedScript) {
                    setAdScript(selectedScript.script);
                    setShouldDisplay(true);
                }
            } catch (error) {
                console.error('Error loading social bar ad:', error);
                setShouldDisplay(false);
            }
        };

        loadAd();
    }, []);

    if (!shouldDisplay || !adScript || !isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
            <div className="container mx-auto px-4 py-2 relative">
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
                    aria-label="Close ad"
                >
                    <X className="h-4 w-4" />
                </button>
                <div className="text-xs text-muted-foreground text-center mb-1">Advertisement</div>
                <div
                    className="social-bar-ad-content"
                    dangerouslySetInnerHTML={{ __html: adScript }}
                />
            </div>
        </div>
    );
}
