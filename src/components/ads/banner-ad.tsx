'use client';

import AdWrapper from './ad-wrapper';

interface BannerAdProps {
    size: '728x90' | '468x60' | '300x250';
    position?: string;
    className?: string;
    lazyLoad?: boolean;
}

export default function BannerAd({ size, position, className = '', lazyLoad = true }: BannerAdProps) {
    const adType = `banner_${size}`;

    const sizeClasses = {
        '728x90': 'w-full max-w-full sm:max-w-[728px] h-auto',
        '468x60': 'w-full max-w-full sm:max-w-[468px] h-auto',
        '300x250': 'w-full max-w-[300px] h-auto'
    };

    return (
        <AdWrapper
            adType={adType}
            position={position}
            className={`banner-ad ${sizeClasses[size]} mx-auto ${className}`}
            lazyLoad={lazyLoad}
        >
            <div className="text-xs text-muted-foreground text-center mb-1">Advertisement</div>
        </AdWrapper>
    );
}
