'use client';

import AdWrapper from './ad-wrapper';

interface NativeAdProps {
    position?: string;
    className?: string;
    lazyLoad?: boolean;
}

export default function NativeAd({ position, className = '', lazyLoad = true }: NativeAdProps) {
    return (
        <AdWrapper
            adType="native"
            position={position}
            className={`native-ad w-full ${className}`}
            lazyLoad={lazyLoad}
        >
            <div className="text-xs text-muted-foreground mb-2">Sponsored Content</div>
        </AdWrapper>
    );
}
