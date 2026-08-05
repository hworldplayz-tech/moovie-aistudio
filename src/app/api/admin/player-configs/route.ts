import { NextRequest, NextResponse } from 'next/server';
import { createPlayerConfig, getPlayerConfigs, updatePlayerConfig, deletePlayerConfig } from '../../../admin/actions';

export async function GET(request: NextRequest) {
    try {
        const players = await getPlayerConfigs();
        return NextResponse.json(players);
    } catch (error) {
        console.error('Error fetching player configs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch player configurations' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, type, content } = body;

        if (!name || !type || !content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const result = await createPlayerConfig({ name, type, content });

        if (result.success) {
            return NextResponse.json({ success: true, id: result.id });
        } else {
            return NextResponse.json(
                { error: result.error || 'Failed to create player' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error creating player config:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Player ID is required' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const result = await updatePlayerConfig(id, body);

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { error: 'Failed to update player' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error updating player config:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Player ID is required' },
                { status: 400 }
            );
        }

        const result = await deletePlayerConfig(id);

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { error: 'Failed to delete player' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error deleting player config:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
