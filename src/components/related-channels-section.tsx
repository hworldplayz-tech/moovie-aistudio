'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { LiveChannel } from '@/lib/definitions';
import { getLiveChannels, getSiteConfigFromFirestore } from '@/lib/firestore';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tv, PlayCircle, RefreshCw, ChevronDown } from 'lucide-react';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import { Skeleton } from './ui/skeleton';

interface RelatedChannelsSectionProps {
    currentChannel: LiveChannel;
    initialLimit?: number;
    layoutMode?: 'grid' | 'slider';
}

function computeChannelRelevance(candidate: LiveChannel, target: LiveChannel): number {
    let score = 0;

    // Same country match
    if (candidate.country && target.country && candidate.country.toLowerCase() === target.country.toLowerCase()) {
        score += 10;
    }

    // Matching tags
    const targetTags = new Set((target.tags || []).map(t => t.toLowerCase()));
    (candidate.tags || []).forEach(tag => {
        if (targetTags.has(tag.toLowerCase())) {
            score += 6;
        }
    });

    return score;
}

export function RelatedChannelsSection({
    currentChannel,
    initialLimit: propLimit,
    layoutMode: propLayout
}: RelatedChannelsSectionProps) {
    const [allRelated, setAllRelated] = useState<LiveChannel[]>([]);
    const [visibleCount, setVisibleCount] = useState<number>(6);
    const [stepSize, setStepSize] = useState<number>(6);
    const [layout, setLayout] = useState<'grid' | 'slider'>('grid');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function fetchRelatedChannels() {
            setLoading(true);
            try {
                const [channels, siteConfig] = await Promise.all([
                    getLiveChannels(),
                    getSiteConfigFromFirestore()
                ]);

                if (!isMounted) return;

                const limitCount = propLimit || siteConfig.relatedItemsCount || 6;
                const layoutStyle = propLayout || siteConfig.relatedLayout || 'grid';

                setVisibleCount(limitCount);
                setStepSize(limitCount);
                setLayout(layoutStyle);

                // Strictly filter to live channels only, excluding the current channel
                const candidates = channels.filter(ch => String(ch.id) !== String(currentChannel.id));

                // Score candidates
                const scored = candidates.map(ch => ({
                    channel: ch,
                    score: computeChannelRelevance(ch, currentChannel)
                }));

                scored.sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return (b.channel.createdAt || '').localeCompare(a.channel.createdAt || '');
                });

                setAllRelated(scored.map(s => s.channel));
            } catch (err) {
                console.error('Failed to load related channels:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchRelatedChannels();

        return () => {
            isMounted = false;
        };
    }, [currentChannel.id, propLimit, propLayout]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + stepSize);
    };

    if (loading) {
        return (
            <div className="space-y-4 pt-4">
                <Skeleton className="h-7 w-48" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="aspect-video w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (allRelated.length === 0) {
        return null; // No other channels to recommend
    }

    const displayedChannels = allRelated.slice(0, visibleCount);
    const hasMore = visibleCount < allRelated.length;

    return (
        <div className="space-y-6 pt-6 border-t">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Tv className="h-6 w-6 text-primary" />
                    More Live TV Channels
                </h2>
                {hasMore && (
                    <span className="text-xs text-muted-foreground">
                        Showing {displayedChannels.length} of {allRelated.length}
                    </span>
                )}
            </div>

            {layout === 'grid' ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                        {displayedChannels.map((channel) => {
                            const poster = channel.posterUrl || channel.posterPath;
                            return (
                                <div
                                    key={channel.id}
                                    className="relative aspect-video rounded-xl overflow-hidden group border border-border/50 shadow-md bg-black"
                                >
                                    {poster ? (
                                        <img
                                            src={poster}
                                            alt={channel.title}
                                            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90" />

                                    <div className="absolute inset-0 flex flex-col justify-end p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant="default" className="bg-primary/90 text-primary-foreground text-xs px-1.5 py-0 h-5">
                                                Live
                                            </Badge>
                                            <Badge variant="outline" className="text-white border-white/20 text-xs px-1.5 py-0 h-5">
                                                {channel.country}
                                            </Badge>
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{channel.title}</h3>
                                        <p className="text-xs text-gray-300 line-clamp-1 mb-3">
                                            {channel.description || 'Watch live channel stream.'}
                                        </p>

                                        <Button asChild size="sm" className="w-full text-xs h-8">
                                            <Link href={`/live-tv/${channel.id}`}>
                                                <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                                                Watch Channel
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {hasMore && (
                        <div className="flex justify-center pt-2">
                            <Button
                                onClick={handleLoadMore}
                                variant="outline"
                                size="lg"
                                className="gap-2 rounded-full px-6 shadow-sm hover:border-primary transition-all"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Load More TV Channels
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <Carousel
                        opts={{
                            align: 'start',
                            loop: allRelated.length > 3,
                        }}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-3 sm:-ml-4">
                            {displayedChannels.map((channel) => {
                                const poster = channel.posterUrl || channel.posterPath;
                                return (
                                    <CarouselItem key={channel.id} className="pl-3 sm:pl-4 basis-full sm:basis-1/2 md:basis-1/3">
                                        <div className="relative aspect-video rounded-xl overflow-hidden group border border-border/50 shadow-md bg-black">
                                            {poster ? (
                                                <img
                                                    src={poster}
                                                    alt={channel.title}
                                                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800" />
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90" />

                                            <div className="absolute inset-0 flex flex-col justify-end p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge variant="default" className="bg-primary/90 text-primary-foreground text-xs px-1.5 py-0 h-5">
                                                        Live
                                                    </Badge>
                                                    <Badge variant="outline" className="text-white border-white/20 text-xs px-1.5 py-0 h-5">
                                                        {channel.country}
                                                    </Badge>
                                                </div>

                                                <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{channel.title}</h3>
                                                <p className="text-xs text-gray-300 line-clamp-1 mb-3">
                                                    {channel.description || 'Watch live channel stream.'}
                                                </p>

                                                <Button asChild size="sm" className="w-full text-xs h-8">
                                                    <Link href={`/live-tv/${channel.id}`}>
                                                        <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                                                        Watch Channel
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </CarouselItem>
                                );
                            })}
                        </CarouselContent>
                        <CarouselPrevious className="hidden md:flex -left-4" />
                        <CarouselNext className="hidden md:flex -right-4" />
                    </Carousel>

                    {hasMore && (
                        <div className="flex justify-center pt-2">
                            <Button
                                onClick={handleLoadMore}
                                variant="outline"
                                size="lg"
                                className="gap-2 rounded-full px-6 shadow-sm hover:border-primary transition-all"
                            >
                                <ChevronDown className="h-4 w-4" />
                                Load More TV Channels
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
