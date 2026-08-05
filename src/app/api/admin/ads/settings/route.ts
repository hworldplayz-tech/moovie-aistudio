import { NextRequest, NextResponse } from 'next/server';
import { getAdSettingsAction, updateAdSettingsAction } from '../../../../admin/actions';

export async function GET() {
    try {
        const settings = await getAdSettingsAction();
        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await updateAdSettingsAction(body);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
