'use client';

import { useEffect, useState } from 'react';
import { getLiveChannels } from '@/lib/firestore';
import type { LiveChannel } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tv, Play, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';

export default function LiveTvPage() {
    const [channels, setChannels] = useState<LiveChannel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
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
        <div className="container mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex items-center gap-2">
                        <Tv className="h-7 w-7 md:h-8 md:w-8 text-primary" /> Live TV Channels
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Watch live TV channels from around the world.</p>
                </div>

                <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50 self-start sm:self-auto">
                    <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="h-8 px-3 text-xs gap-1.5 rounded-md"
                        title="Grid View"
                    >
                        <LayoutGrid className="h-4 w-4" />
                        <span>Grid</span>
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="h-8 px-3 text-xs gap-1.5 rounded-md"
                        title="List View"
                    >
                        <List className="h-4 w-4" />
                        <span>List</span>
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <GridSkeleton />
            ) : channels.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
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
                                                <Tv className="h-10 w-10 text-primary/50 group-hover:text-primary transition-colors duration-300" />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                            <div className="bg-primary text-primary-foreground rounded-full p-2.5 sm:p-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                                <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
                                            </div>
                                        </div>

                                        <Badge className="absolute top-2 right-2 shadow-sm text-[10px] sm:text-xs px-1.5 py-0" variant="secondary">{channel.country}</Badge>
                                    </div>

                                    <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
                                        <CardTitle className="line-clamp-1 text-sm sm:text-base">{channel.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 sm:p-4 pt-0">
                                        <p className="text-xs text-muted-foreground line-clamp-2">{channel.description || 'No description available.'}</p>
                                        <div className="flex flex-wrap gap-1 mt-2 sm:mt-3">
                                            {channel.tags.slice(0, 3).map((tag, tIdx) => (
                                                <Badge key={`${tag}-${tIdx}`} variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 sm:h-5">{tag}</Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 max-w-4xl">
                        {channels.map((channel) => (
                            <Link key={channel.id} href={`/live-tv/${channel.id}`} className="group">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-card hover:border-primary/50 transition-all gap-3 sm:gap-4">
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto flex-1">
                                        <div className="relative w-28 sm:w-36 aspect-video rounded-lg overflow-hidden bg-black flex-shrink-0 border border-border/40">
                                            {channel.posterUrl ? (
                                                <img
                                                    src={channel.posterUrl}
                                                    alt={channel.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                                    <Tv className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                            )}
                                            <Badge variant="default" className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] px-1 py-0 h-4">
                                                Live
                                            </Badge>
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-base sm:text-lg line-clamp-1 group-hover:text-primary transition-colors">{channel.title}</h3>
                                                <Badge variant="outline" className="text-xs px-2 py-0 h-5 shrink-0">
                                                    {channel.country}
                                                </Badge>
                                            </div>
                                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                                                {channel.description || 'Watch live channel stream.'}
                                            </p>
                                            <div className="flex flex-wrap gap-1 pt-1">
                                                {(channel.tags || []).slice(0, 4).map((tag, tIdx) => (
                                                    <Badge key={`${tag}-${tIdx}`} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <Button size="sm" className="w-full sm:w-auto text-xs shrink-0 gap-1.5 h-9 px-4">
                                        <Play className="h-3.5 w-3.5 fill-current" />
                                        Watch Channel
                                    </Button>
                                </div>
                            </Link>
                        ))}
                    </div>
                )
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
