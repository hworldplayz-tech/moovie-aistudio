import { getLiveChannelById } from '@/lib/firestore';
import type { Metadata } from 'next';
import LiveTvContent from './live-tv-content';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const channel = await getLiveChannelById(id);

    if (!channel) {
        return {
            title: 'Channel Not Found',
        };
    }

    return {
        title: `${channel.title} - Live TV`,
        description: channel.description || `Watch ${channel.title} live online.`,
        openGraph: {
            title: `${channel.title} - Watch Live`,
            description: channel.description || `Watch ${channel.title} live streaming.`,
            images: channel.posterUrl ? [channel.posterUrl] : [],
        },
    };
}

export default async function LiveTvWatchPage({ params }: Props) {
    const { id } = await params;
    const channel = await getLiveChannelById(id);

    if (!channel) {
        return (
            <div className="container mx-auto p-8 text-center space-y-4">
                <h1 className="text-2xl font-bold">Channel Not Found</h1>
                <p className="text-muted-foreground">The channel you are looking for does not exist or has been removed.</p>
                <Button asChild>
                    <Link href="/live-tv">Back to Live TV</Link>
                </Button>
            </div>
        );
    }

    return <LiveTvContent channel={channel} />;
}
