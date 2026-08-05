'use client';

import { useState } from 'react';
import type { LiveChannel } from '@/lib/definitions';
import PlyrPlayer from '@/components/plyr-player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LiveTvContentProps {
    channel: LiveChannel;
}

export default function LiveTvContent({ channel }: LiveTvContentProps) {
    const { toast } = useToast();

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied', description: 'Channel link copied to clipboard' });
    };

    // Determine source for player
    const playerSrc = channel.embedCode || channel.streamUrl || '';

    // Poster display logic: Use channel poster or fallback
    const displayPoster = channel.posterUrl || channel.posterPath;

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/live-tv">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Channels
                    </Link>
                </Button>
            </div>

            <div className="space-y-4">
                <div className="items-center justify-between flex flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold">{channel.title}</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge>{channel.country}</Badge>
                            {channel.tags.map(tag => (
                                <Badge key={tag} variant="outline">{tag}</Badge>
                            ))}
                        </div>
                    </div>

                    <Button variant="outline" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                </div>

                <div className="rounded-xl overflow-hidden border bg-black shadow-2xl">
                    <PlyrPlayer
                        source={playerSrc}
                        poster={displayPoster}
                        title={channel.title}
                        isEmbed={!!channel.embedCode}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">

                        {/* About Section with Poster */}
                        <Card className="bg-card border h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5" /> About this Channel
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {displayPoster && (
                                        <div className="flex-shrink-0">
                                            <img
                                                src={displayPoster}
                                                alt={`${channel.title} Poster`}
                                                className="w-full md:w-48 h-auto rounded-lg shadow-md object-cover aspect-[2/3]"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-lg leading-relaxed text-muted-foreground">{channel.description}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Disclaimer Section */}
                        <Card className="bg-amber-500/10 border-amber-500/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-amber-500">
                                    <AlertTriangle className="h-5 w-5" /> Disclaimer
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    This content is not hosted or controlled by us. We simply provide links to streams that are already available on the public internet. All rights belong to their respective owners. If you are a copyright owner and wish to have this content removed, please contact us.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-1">
                        {/* Sidebar placeholder - could arguably just simple card for tags or something, 
                             but current layout puts tags in header. Keeping main layout simple. */}
                    </div>
                </div>
            </div>
        </div>
    );
}
