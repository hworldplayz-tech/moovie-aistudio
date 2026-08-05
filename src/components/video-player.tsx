'use client';

interface VideoPlayerProps {
    src: string;
}

export function VideoPlayer({ src }: VideoPlayerProps) {
    // Check if the src is an iframe embed code
    if (src.trim().startsWith('<iframe')) {
        // To make the iframe responsive, we'll wrap it.
        // The iframe's width and height will be set to 100% and the parent will control the aspect ratio.
        const responsiveIframe = src
            .replace(/width="[^"]*"/, 'width="100%"')
            .replace(/height="[^"]*"/, 'height="100%"');

        return (
            <div className="w-full aspect-video relative">
                <div 
                    className="absolute top-0 left-0 w-full h-full"
                    dangerouslySetInnerHTML={{ __html: responsiveIframe }} 
                />
            </div>
        );
    }

    const isYoutubeUrl = src.includes('youtube.com') || src.includes('youtu.be');

    if (isYoutubeUrl) {
        // Attempt to extract video ID from various YouTube URL formats
        let videoId = null;
        try {
            const url = new URL(src);
            if (url.hostname === 'youtu.be') {
                videoId = url.pathname.slice(1);
            } else {
                videoId = url.searchParams.get('v');
            }
        } catch (e) {
            // Handle cases where URL constructor fails for invalid URLs
            console.error("Invalid video URL", e);
            return <p>Invalid video URL provided.</p>;
        }
        
        if (!videoId) {
            return <p>Could not extract YouTube video ID.</p>;
        }

        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`;
        return (
            <iframe
                className="w-full h-full"
                src={embedUrl}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
            ></iframe>
        );
    }
    
    // Default to HTML5 video player for direct links
    return (
        <video
            id="player"
            className="w-full h-full"
            controls
            autoPlay
            muted // Muted to allow autoplay in most browsers
            playsInline
        >
            <source src={src} type="video/mp4" />
            Your browser does not support the video tag.
        </video>
    );
}
