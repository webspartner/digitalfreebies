import { NextResponse } from 'next/server';
import { getTurnstileConfig } from '@/lib/technicalSettings';

export const dynamic = 'force-dynamic';

// GET /api/turnstile - Returns public Cloudflare Turnstile site key if both Site Key & Secret Key are configured
export async function GET() {
  try {
    const { enabled, siteKey } = await getTurnstileConfig();
    return NextResponse.json(
      {
        enabled,
        siteKey: enabled ? siteKey : '',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { enabled: false, siteKey: '' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
