'use client';

import { useEffect, useRef } from 'react';
import { executeAdScript } from '@/components/ads/ad-container';

export default function GlobalHeaderScripts({ scripts }: { scripts?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !scripts) return;
        try {
            executeAdScript(containerRef.current, scripts);
        } catch (err) {
            console.error('Error executing global header scripts:', err);
        }
    }, [scripts]);

    if (!scripts) return null;

    return (
        <div
            ref={containerRef}
            id="global-header-scripts-container"
            style={{ display: 'none' }}
            aria-hidden="true"
        />
    );
}

