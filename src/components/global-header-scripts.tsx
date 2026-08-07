'use client';

import { useEffect } from 'react';
import { executeAdScript } from '@/components/ads/ad-container';

export default function GlobalHeaderScripts({ scripts }: { scripts?: string }) {
    useEffect(() => {
        if (scripts && typeof document !== 'undefined') {
            const containerId = 'global-header-scripts-container';
            let container = document.getElementById(containerId);
            if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                container.style.display = 'none';
                document.body.appendChild(container);
            }
            executeAdScript(container, scripts);
        }
    }, [scripts]);

    return null;
}
