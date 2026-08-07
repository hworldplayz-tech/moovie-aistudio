'use client';

import { useEffect, useState } from 'react';
import { shouldShowAd, getAdSettings, getAdScriptsByType, selectRandomScript, incrementAdCount, getZoneConfig } from '@/lib/ad-utils';
import { executeAdScript } from './ad-container';

interface PopupHandlerProps {
    trigger?: 'load' | 'time' | 'exit_intent';
    delay?: number; // seconds
    position?: string;
}

export default function PopupHandler({ trigger = 'time', delay = 30, position }: PopupHandlerProps) {
    const [hasShown, setHasShown] = useState(false);
    const [config, setConfig] = useState<{ trigger: string; delay: number; maxPerDay?: number }>({ trigger, delay });

    // Fetch zone config
    useEffect(() => {
        if (!position) return;

        const loadConfig = async () => {
            const zone = await getZoneConfig(position);
            if (zone && zone.isEnabled) {
                setConfig({
                    trigger: zone.trigger || trigger,
                    delay: zone.delay ?? delay,
                    maxPerDay: zone.frequency
                });
            }
        };
        loadConfig();
    }, [position, trigger, delay]);

    useEffect(() => {
        if (hasShown) return;

        const showPopup = async () => {
            try {
                // Get global settings
                const settings = await getAdSettings();

                // Check if popup can be shown
                const canShow = await shouldShowAd(
                    'popup',
                    config.maxPerDay || settings.popupFrequencyCap,
                    settings.testMode,
                    settings.masterEnabled
                );

                if (!canShow) return;

                const scripts = await getAdScriptsByType('popup');
                if (scripts.length === 0) return;

                // Select random script
                const selectedScript = selectRandomScript(scripts);
                if (!selectedScript) return;

                // Safely inject and execute script
                const scriptElement = document.createElement('div');
                scriptElement.className = 'popup-ad-script-container';
                scriptElement.style.display = 'none';
                document.body.appendChild(scriptElement);

                executeAdScript(scriptElement, selectedScript.script);

                // Increment count
                incrementAdCount('popup');
                setHasShown(true);
            } catch (error) {
                console.error('Error showing popup:', error);
            }
        };

        if (config.trigger === 'load') {
            // Show immediately on page load
            showPopup();
        } else if (config.trigger === 'time') {
            // Show after delay
            const timer = setTimeout(showPopup, (config.delay || 0) * 1000);
            return () => clearTimeout(timer);
        } else if (config.trigger === 'exit_intent') {
            // Show on exit intent
            const handleMouseLeave = (e: MouseEvent) => {
                if (e.clientY <= 0) {
                    showPopup();
                    document.removeEventListener('mouseleave', handleMouseLeave);
                }
            };
            document.addEventListener('mouseleave', handleMouseLeave);
            return () => document.removeEventListener('mouseleave', handleMouseLeave);
        }
    }, [config.trigger, config.delay, hasShown, config.maxPerDay]);

    return null; // This component doesn't render anything
}
