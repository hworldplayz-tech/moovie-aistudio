import { NextRequest, NextResponse } from 'next/server';
import { getAdSettings, updateAdSettings } from '@/lib/firestore';

export async function GET() {
    try {
        const settings = await getAdSettings();
        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await updateAdSettings(body);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
