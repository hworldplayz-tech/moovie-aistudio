
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Script from 'next/script';
import { getSecureDownloadSettings, getDownloadUrl } from '@/app/admin/actions';

import AdWrapper from '@/components/ads/ad-wrapper';

export default function DownloadPage() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const index = searchParams.get('index');
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(5);
    const [maxTime, setMaxTime] = useState(5);
    const [isReady, setIsReady] = useState(false);
    const [contentTitle, setContentTitle] = useState('');
    const [smartLink, setSmartLink] = useState<string | null>(null);

    useEffect(() => {
        async function init() {
            if (!id) return;

            try {
                // Fetch settings and download URL in parallel using Server Actions
                const [settings, downloadData] = await Promise.all([
                    getSecureDownloadSettings(),
                    getDownloadUrl(Number(id), index ? parseInt(index) : undefined)
                ]);

                setTimeLeft(settings.delay);
                setMaxTime(settings.delay);
                if (settings.downloadSmartLink) {
                    setSmartLink(settings.downloadSmartLink);
                }

                if (downloadData) {
                    setContentTitle(downloadData.title);
                    setDownloadUrl(downloadData.url);
                }
            } catch (e) {
                console.error(e);
            }
        }
        init();
    }, [id, index]);

    useEffect(() => {
        if (!downloadUrl) return;

        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setIsReady(true);

            // Handle Download & Smart Link Redirect
            if (smartLink) {
                // 1. Start Download via invisible iframe (continues in background)
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = downloadUrl;
                document.body.appendChild(iframe);

                // 2. Redirect User to Smart Link after short delay
                setTimeout(() => {
                    window.location.href = smartLink;
                }, 1500);
            } else {
                // Standard Direct Download
                window.location.href = downloadUrl;
            }
        }
    }, [timeLeft, downloadUrl, smartLink]);

    const progress = maxTime > 0 ? ((maxTime - timeLeft) / maxTime) * 100 : 100;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">

            {/* Top Ad Zone */}
            <div className="w-full max-w-[970px] mb-8 flex items-center justify-center">
                <AdWrapper position="download_top" adType="banner_728x90" />
            </div>

            <div className="text-center space-y-8 z-10 max-w-md w-full">
                <h1 className="text-3xl font-bold tracking-tight">Downloading...</h1>
                <p className="text-muted-foreground">Please wait while we prepare your download for <span className="font-semibold text-foreground">{contentTitle}</span>.</p>

                <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                    {/* SVG Circle Progress */}
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="58"
                            className="stroke-muted"
                            strokeWidth="8"
                            fill="none"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r="58"
                            className="stroke-primary transition-all duration-1000 ease-linear"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray="364"
                            strokeDashoffset={364 - (364 * progress) / 100}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold">
                        {timeLeft}
                    </div>
                </div>

                {isReady && downloadUrl ? (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground border border-border/50">
                            <p>Your download should start automatically.</p>
                            <p className="mt-2">If it doesn't start or you see an error, please <strong>refresh the page</strong>.</p>
                            <p className="mt-1">If the issue persists, go back and try clicking the download button again.</p>
                        </div>
                    </div>
                ) : (
                    <Button disabled size="lg" className="w-full opacity-80">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                    </Button>
                )}
            </div>

            {/* Bottom Ad Zone */}
            <div className="w-full max-w-[970px] mt-12 flex items-center justify-center">
                <AdWrapper position="download_bottom" adType="banner_728x90" />
            </div>

        </div>
    );
}
