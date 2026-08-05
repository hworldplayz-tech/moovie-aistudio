import { NextRequest, NextResponse } from 'next/server';
import {
    createAdScriptAction,
    getAdScriptsAction,
    updateAdScriptAction,
    deleteAdScriptAction
} from '../../../../admin/actions';

export async function GET(request: NextRequest) {
    try {
        const networkId = request.nextUrl.searchParams.get('networkId');
        const scripts = await getAdScriptsAction(networkId || undefined);
        return NextResponse.json(scripts);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await createAdScriptAction(body);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create script' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const body = await request.json();
        const result = await updateAdScriptAction(id, body);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update script' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const result = await deleteAdScriptAction(id);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete script' }, { status: 500 });
    }
}
