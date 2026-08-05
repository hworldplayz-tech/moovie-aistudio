'use client';

import React from 'react';
import Link from 'next/link';
import type { LiveChannel } from '@/lib/definitions';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PlayCircle, Tv } from 'lucide-react';
import Autoplay from 'embla-carousel-autoplay';

interface LiveTvCarouselProps {
    channels: LiveChannel[];
}

export function LiveTvCarousel({ channels }: LiveTvCarouselProps) {
    const plugin = React.useRef(
        Autoplay({ delay: 4000, stopOnInteraction: true })
    );

    if (!channels || channels.length === 0) return null;

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Tv className="h-6 w-6 text-primary" /> Live TV
                </h2>
                <Button variant="ghost" className="text-sm text-muted-foreground" asChild>
                    <Link href="/live-tv">View All Channels</Link>
                </Button>
            </div>
            <Carousel
                plugins={[plugin.current]}
                className="w-full"
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
                opts={{
                    loop: true,
                    align: 'start',
                }}
            >
                <CarouselContent className="-ml-4">
                    {channels.map((channel, index) => (
                        <CarouselItem key={channel.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                            <div className="relative aspect-video rounded-xl overflow-hidden group border border-border/50 shadow-md">
                                {/* Background Gradient / Placeholder since we might not have images */}
                                {/* Poster Image or Placeholder */}
                                {channel.posterUrl ? (
                                    <img
                                        src={channel.posterUrl}
                                        alt={channel.title}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
                                )}

                                {/* Dynamic gradient overlay on hover */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />

                                <div className="absolute inset-0 flex flex-col justify-end p-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="default" className="bg-primary/80 backdrop-blur-sm text-primary-foreground">
                                            Live
                                        </Badge>
                                        <Badge variant="outline" className="text-white border-white/20 backdrop-blur-sm">
                                            {channel.country}
                                        </Badge>
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{channel.title}</h3>
                                    <p className="text-sm text-gray-300 line-clamp-2 mb-4">
                                        {channel.description || 'Watch live streaming now.'}
                                    </p>

                                    <Button asChild size="sm" className="w-full transition-transform duration-300 group-hover:scale-105">
                                        <Link href={`/live-tv/${channel.id}`}>
                                            <PlayCircle className="mr-2 h-4 w-4" />
                                            Watch Now
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex" />
            </Carousel>
        </div>
    );
}
