'use client';

import React, { useRef, useEffect } from 'react';
import 'plyr-react/plyr.css';
import Hls from 'hls.js';

interface PlyrPlayerProps {
    source: string;
    poster?: string;
    title?: string;
    isEmbed?: boolean;
}

export default function PlyrPlayer({ source, poster, title, isEmbed }: PlyrPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (isEmbed) return;

        const video = videoRef.current;
        if (!video) return;

        let hls: Hls | null = null;
        let player: any = null;

        // Initialize HLS if applicable
        if (source.endsWith('.m3u8') || source.includes('m3u8')) {
            if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(source);
                hls.attachMedia(video);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = source;
            }
        } else {
            video.src = source;
        }

        // Initialize Plyr dynamically to avoid SSR/Constructor issues
        import('plyr').then((PlyrModule) => {
            const Plyr = PlyrModule.default || PlyrModule;
            // Ensure video ref is still valid and we haven't unmounted
            if (!video) return;

            player = new Plyr(video, {
                title: title,
                controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
                settings: ['quality', 'speed', 'loop'],
                poster: poster,
            });
        }).catch(err => console.error("Failed to load Plyr", err));


        return () => {
            if (hls) hls.destroy();
            // Player might be null if promise hasn't resolved yet
            if (player) player.destroy();
        };
    }, [source, isEmbed, title, poster]);

    if (isEmbed) {
        // Cleaning width/height for responsive
        const responsiveIframe = source
            .replace(/width="[^"]*"/, 'width="100%"')
            .replace(/height="[^"]*"/, 'height="100%"');
        return (
            <div className="w-full aspect-video relative bg-black rounded-xl overflow-hidden shadow-lg border border-border/50">
                <div
                    className="absolute top-0 left-0 w-full h-full"
                    dangerouslySetInnerHTML={{ __html: responsiveIframe }}
                />
            </div>
        );
    }

    return (
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
            <video
                ref={videoRef}
                className="plyr-react plyr"
                playsInline
                controls
                // Removed crossOrigin="anonymous" to fix CORS issues with external images
                poster={poster}
            />
        </div>
    );
}
