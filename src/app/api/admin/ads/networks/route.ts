import { NextRequest, NextResponse } from 'next/server';
import {
    createAdNetworkAction,
    getAdNetworksAction,
    updateAdNetworkAction,
    deleteAdNetworkAction
} from '../../../../admin/actions';

export async function GET() {
    try {
        const networks = await getAdNetworksAction();
        return NextResponse.json(networks);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch networks' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await createAdNetworkAction(body);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create network' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const body = await request.json();
        const result = await updateAdNetworkAction(id, body);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update network' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const result = await deleteAdNetworkAction(id);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete network' }, { status: 500 });
    }
}
