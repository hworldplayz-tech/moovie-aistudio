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
import { RelatedChannelsSection } from '@/components/related-channels-section';

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

                <div className="space-y-6 w-full min-w-0">
                    {/* About Section with Poster */}
                    <Card className="bg-card border w-full">
                        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                            <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                <Info className="h-5 w-5 text-primary" /> About this Channel
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 pt-0">
                            <div className="flex flex-col sm:flex-row gap-6 items-start">
                                {displayPoster && (
                                    <div className="w-full sm:w-48 sm:max-w-[12rem] flex-shrink-0">
                                        <img
                                            src={displayPoster}
                                            alt={`${channel.title} Poster`}
                                            className="w-full h-auto rounded-lg shadow-md object-cover aspect-[2/3]"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 w-full space-y-2">
                                    <p className="text-sm sm:text-base md:text-lg leading-relaxed text-muted-foreground break-words overflow-wrap-anywhere whitespace-pre-line">
                                        {channel.description || 'No channel description provided.'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Disclaimer Section */}
                    <Card className="bg-amber-500/10 border-amber-500/50 w-full">
                        <CardHeader className="p-4 sm:p-6 pb-2">
                            <CardTitle className="flex items-center gap-2 text-amber-500 text-lg">
                                <AlertTriangle className="h-5 w-5" /> Disclaimer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 pt-0">
                            <p className="text-sm text-muted-foreground leading-relaxed break-words">
                                This content is not hosted or controlled by us. We simply provide links to streams that are already available on the public internet. All rights belong to their respective owners. If you are a copyright owner and wish to have this content removed, please contact us.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Related Channels Section */}
                    <RelatedChannelsSection currentChannel={channel} />
                </div>
            </div>
        </div>
    );
}
