'use client';

import { useEffect, useState } from 'react';
import { getLiveChannels } from '@/lib/firestore';
import type { LiveChannel } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tv, Play } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function LiveTvPage() {
    const [channels, setChannels] = useState<LiveChannel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchChannels = async () => {
            setIsLoading(true);
            const data = await getLiveChannels();
            setChannels(data);
            setIsLoading(false);
        };
        fetchChannels();
    }, []);

    const GridSkeleton = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
                <div key={i}>
                    <Skeleton className="aspect-video w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                    <Skeleton className="h-3 w-1/2 mt-1" />
                </div>
            ))}
        </div>
    );

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
                    <Tv className="h-8 w-8 text-primary" /> Live TV Channels
                </h1>
                <p className="text-muted-foreground text-lg">Watch live TV channels from around the world.</p>
            </div>

            {isLoading ? (
                <GridSkeleton />
            ) : channels.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {channels.map((channel) => (
                        <Link key={channel.id} href={`/live-tv/${channel.id}`} className="group">
                            <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 hover:bg-card hover:border-primary/50">
                                <div className="relative aspect-video w-full bg-muted flex items-center justify-center overflow-hidden group-hover:bg-black/5">
                                    {/* Poster Image or Placeholder */}
                                    {channel.posterUrl ? (
                                        <img
                                            src={channel.posterUrl}
                                            alt={channel.title}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 group-hover:scale-105 transition-transform duration-500">
                                            <Tv className="h-12 w-12 text-primary/50 group-hover:text-primary transition-colors duration-300" />
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <div className="bg-primary text-primary-foreground rounded-full p-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                            <Play className="h-6 w-6 fill-current" />
                                        </div>
                                    </div>

                                    <Badge className="absolute top-2 right-2 shadow-sm" variant="secondary">{channel.country}</Badge>
                                </div>

                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="line-clamp-1">{channel.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <p className="text-sm text-muted-foreground line-clamp-2">{channel.description || 'No description available.'}</p>
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {channel.tags.slice(0, 3).map(tag => (
                                            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-5">{tag}</Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <Tv className="h-16 w-16 text-muted-foreground/30" />
                    <h2 className="text-2xl font-semibold text-muted-foreground">No Live Channels Available</h2>
                    <p className="max-w-md text-muted-foreground/80">Check back later for new channels.</p>
                </div>
            )}
        </div>
    );
}
