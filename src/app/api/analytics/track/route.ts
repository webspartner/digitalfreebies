import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getClientIp } from '@/lib/auth';
import { recordPageView } from '@/lib/trafficStats';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const pathname = typeof body?.pathname === 'string' ? body.pathname : '/';

    // Do not count admin portal views as public site traffic
    if (pathname.startsWith('/df-admin77')) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const ip = getClientIp(request);
    const ua = request.headers.get('user-agent') || 'unknown';
    const visitorHash = crypto
      .createHash('sha256')
      .update(`${ip}|${ua}`)
      .digest('hex')
      .slice(0, 16);

    const isNewVisit = Boolean(body?.isNewSession);
    await recordPageView(visitorHash, isNewVisit);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error recording traffic:', error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
