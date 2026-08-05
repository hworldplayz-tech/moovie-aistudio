import { NextRequest, NextResponse } from 'next/server';
import { getCustomPlayerById } from '@/lib/firestore';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Player ID is required' },
                { status: 400 }
            );
        }

        const player = await getCustomPlayerById(id);

        if (!player) {
            return NextResponse.json(
                { error: 'Player configuration not found' },
                { status: 404 }
            );
        }

        // Format the response based on player type
        if (player.type === 'single' && player.content.length > 0) {
            const video = player.content[0];
            return NextResponse.json({
                file: video.file,
                poster: video.poster,
                title: video.title,
            });
        } else if (player.type === 'playlist') {
            // For playlists, PlayerJS expects an array of objects
            const playlist = player.content.map(item => ({
                title: item.title || 'Untitled',
                file: item.file,
                poster: item.poster,
            }));
            return NextResponse.json({
                file: playlist,
            });
        }

        return NextResponse.json(
            { error: 'Invalid player configuration' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error fetching player config:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
