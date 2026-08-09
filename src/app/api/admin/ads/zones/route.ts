import { NextRequest, NextResponse } from 'next/server';
import {
    getAdZones,
    createAdZone,
    updateAdZone,
    deleteAdZone
} from '@/lib/firestore';

export async function GET(request: NextRequest) {
    try {
        const page = request.nextUrl.searchParams.get('page');
        const zones = await getAdZones(page || undefined);
        return NextResponse.json(zones);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await createAdZone(body);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create zone' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const body = await request.json();
        const result = await updateAdZone(id, body);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update zone' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const result = await deleteAdZone(id);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete zone' }, { status: 500 });
    }
}
