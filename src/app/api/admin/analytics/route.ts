import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { verifyToken, verifyPassword } from '@/lib/auth';
import { logActivity } from '@/lib/audit';
import { getTrafficSummary, getTodayIso } from '@/lib/trafficStats';

interface DailyPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Oct 17"
  users: number;
  pageViews: number;
  sessions: number;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`;

  const formattedKey = privateKey.replace(/\\n/g, '\n');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = base64UrlEncode(signer.sign(formattedKey));
  const jwt = `${unsignedToken}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(
      tokenData.error_description || tokenData.error || 'Failed to authenticate with Google OAuth2'
    );
  }

  return tokenData.access_token as string;
}

function buildDateRangePoints(
  days: number,
  rows: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>
): DailyPoint[] {
  const rowMap = new Map<string, { users: number; pageViews: number; sessions: number }>();

  for (const row of rows) {
    const rawDate = row.dimensionValues?.[0]?.value || ''; // YYYYMMDD
    if (rawDate.length === 8) {
      const iso = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      rowMap.set(iso, {
        users: Number(row.metricValues?.[0]?.value || 0),
        pageViews: Number(row.metricValues?.[1]?.value || 0),
        sessions: Number(row.metricValues?.[2]?.value || 0),
      });
    }
  }

  const points: DailyPoint[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const metrics = rowMap.get(iso) || { users: 0, pageViews: 0, sessions: 0 };

    points.push({
      date: iso,
      label,
      users: metrics.users,
      pageViews: metrics.pageViews,
      sessions: metrics.sessions,
    });
  }

  return points;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const daysParam = parseInt(searchParams.get('days') || '14', 10);
    const days = [7, 14, 30].includes(daysParam) ? daysParam : 14;

    const settings = await prisma.analyticsSettings.findUnique({ where: { id: 1 } });

    const measurementId = settings?.measurementId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
    const propertyId = settings?.propertyId || process.env.GA_PROPERTY_ID || '';
    const serviceAccountJson = settings?.serviceAccountJson || process.env.GA_SERVICE_ACCOUNT_JSON || '';

    let clientEmail = '';
    let privateKey = '';

    if (serviceAccountJson) {
      try {
        const parsed = JSON.parse(serviceAccountJson);
        clientEmail = parsed.client_email || '';
        privateKey = parsed.private_key || '';
      } catch {
        // Invalid JSON stored
      }
    }

    const isGraphConfigured = Boolean(propertyId && clientEmail && privateKey);
    const localTraffic = await getTrafficSummary();

    if (!isGraphConfigured) {
      return NextResponse.json({
        configured: false,
        measurementId,
        propertyId,
        hasServiceAccount: Boolean(clientEmail && privateKey),
        clientEmail,
        points: [],
        totals: { users: 0, pageViews: 0, sessions: 0 },
        summary: {
          visitsToday: localTraffic.visitsToday,
          visitsThisMonth: localTraffic.visitsThisMonth,
          pageviewsThisMonth: localTraffic.pageviewsThisMonth,
        },
      });
    }

    try {
      const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
      const cleanPropId = propertyId.replace(/^properties\//i, '').trim();

      const reportRes = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropId}:runReport`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'date' }],
            metrics: [
              { name: 'activeUsers' },
              { name: 'screenPageViews' },
              { name: 'sessions' },
            ],
            orderBys: [{ dimension: { dimensionName: 'date' } }],
          }),
        }
      );

      const reportData = await reportRes.json();

      if (!reportRes.ok) {
        const apiErr =
          reportData?.error?.message || 'Google Analytics Data API returned an error';
        return NextResponse.json({
          configured: true,
          measurementId,
          propertyId: cleanPropId,
          hasServiceAccount: true,
          clientEmail,
          apiError: apiErr,
          points: buildDateRangePoints(days, []),
          totals: { users: 0, pageViews: 0, sessions: 0 },
          summary: {
            visitsToday: localTraffic.visitsToday,
            visitsThisMonth: localTraffic.visitsThisMonth,
            pageviewsThisMonth: localTraffic.pageviewsThisMonth,
          },
        });
      }

      const points30 = buildDateRangePoints(30, reportData.rows || []);
      const points = points30.slice(30 - days);
      const totals = points.reduce(
        (acc, p) => ({
          users: acc.users + p.users,
          pageViews: acc.pageViews + p.pageViews,
          sessions: acc.sessions + p.sessions,
        }),
        { users: 0, pageViews: 0, sessions: 0 }
      );

      const todayIso = getTodayIso();
      const monthPrefix = todayIso.slice(0, 7);
      const todayPoint = points30.find((p) => p.date === todayIso);
      const gaVisitsToday = todayPoint ? Math.max(todayPoint.sessions, todayPoint.users) : 0;

      let gaVisitsMonth = 0;
      let gaPageviewsMonth = 0;
      for (const p of points30) {
        if (p.date.startsWith(monthPrefix)) {
          gaVisitsMonth += Math.max(p.sessions, p.users);
          gaPageviewsMonth += p.pageViews;
        }
      }

      return NextResponse.json({
        configured: true,
        measurementId,
        propertyId: cleanPropId,
        hasServiceAccount: true,
        clientEmail,
        points,
        totals,
        summary: {
          visitsToday: Math.max(gaVisitsToday, localTraffic.visitsToday),
          visitsThisMonth: Math.max(gaVisitsMonth, localTraffic.visitsThisMonth),
          pageviewsThisMonth: Math.max(gaPageviewsMonth, localTraffic.pageviewsThisMonth),
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch Google Analytics data';
      return NextResponse.json({
        configured: true,
        measurementId,
        propertyId,
        hasServiceAccount: true,
        clientEmail,
        apiError: message,
        points: buildDateRangePoints(days, []),
        totals: { users: 0, pageViews: 0, sessions: 0 },
        summary: {
          visitsToday: localTraffic.visitsToday,
          visitsThisMonth: localTraffic.visitsThisMonth,
          pageviewsThisMonth: localTraffic.pageviewsThisMonth,
        },
      });
    }
  } catch (error) {
    console.error('Error in GET /api/admin/analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { adminPassword } = body;

    if (!adminPassword || typeof adminPassword !== 'string') {
      return NextResponse.json(
        { error: 'Your current admin password is required to confirm changes to Google Analytics settings' },
        { status: 400 }
      );
    }

    const actingAdmin = await prisma.admin.findUnique({ where: { id: admin.id } });
    if (!actingAdmin || !verifyPassword(adminPassword, actingAdmin.passwordHash)) {
      return NextResponse.json(
        { error: 'Incorrect admin password confirmation' },
        { status: 401 }
      );
    }

    const measurementId = (body.measurementId || '').trim();
    const propertyId = (body.propertyId || '').replace(/^properties\//i, '').trim();
    const rawServiceAccountJson = (body.serviceAccountJson || '').trim();

    const existing = await prisma.analyticsSettings.findUnique({ where: { id: 1 } });

    let finalServiceAccountJson = existing?.serviceAccountJson || '';
    if (rawServiceAccountJson) {
      try {
        const parsed = JSON.parse(rawServiceAccountJson);
        if (!parsed.client_email || !parsed.private_key) {
          return NextResponse.json(
            {
              error:
                'Service Account JSON must contain "client_email" and "private_key" fields from Google Cloud.',
            },
            { status: 400 }
          );
        }
        finalServiceAccountJson = rawServiceAccountJson;
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON format. Paste the full Service Account JSON file contents.' },
          { status: 400 }
        );
      }
    }

    await prisma.analyticsSettings.upsert({
      where: { id: 1 },
      update: {
        measurementId,
        propertyId,
        serviceAccountJson: finalServiceAccountJson,
      },
      create: {
        id: 1,
        measurementId,
        propertyId,
        serviceAccountJson: finalServiceAccountJson,
      },
    });

    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'SETTINGS_UPDATED',
      category: 'settings',
      summary: `Admin "${admin.username}" updated Google Analytics settings (${measurementId || 'no tag'}, property ${propertyId || 'none'})`,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving analytics settings:', error);
    return NextResponse.json({ error: 'Failed to save analytics settings' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.analyticsSettings.upsert({
      where: { id: 1 },
      update: {
        measurementId: '',
        propertyId: '',
        serviceAccountJson: '',
      },
      create: {
        id: 1,
        measurementId: '',
        propertyId: '',
        serviceAccountJson: '',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting analytics:', error);
    return NextResponse.json({ error: 'Failed to disconnect analytics' }, { status: 500 });
  }
}
