import { NextRequest, NextResponse } from 'next/server';
import { recordItemView } from '@/lib/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, type } = body || {};

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing item ID' }, { status: 400 });
    }

    // Extract IP address from request headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = (forwardedFor ? forwardedFor.split(',')[0] : realIp) || '127.0.0.1';

    const result = await recordItemView(String(id), type || 'movie', clientIp);

    return NextResponse.json(result);
  } catch (error) {
    console.error('API /api/views error:', error);
    return NextResponse.json({ success: false, viewsCount: 0, showPublicViews: true }, { status: 500 });
  }
}
