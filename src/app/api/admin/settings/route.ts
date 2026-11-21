import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest, isFullAdmin, verifyPassword } from '@/lib/auth';
import { getTechnicalSettings, saveTechnicalSettings } from '@/lib/technicalSettings';
import { logActivity } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isFullAdmin(admin)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const settings = await getTechnicalSettings();
    return NextResponse.json(settings, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error loading technical settings:', error);
    return NextResponse.json({ error: 'Failed to load technical settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isFullAdmin(admin)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { adminPassword } = body;

    if (!adminPassword || typeof adminPassword !== 'string') {
      return NextResponse.json(
        { error: 'Your current admin password is required to confirm changes to settings' },
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

    const updated = await saveTechnicalSettings({
      seo: body.seo,
      serverFiles: body.serverFiles,
      cloudflare: body.cloudflare,
      google: body.google,
      customApis: body.customApis,
    });

    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'TECHNICAL_SETTINGS_UPDATED',
      category: 'security',
      summary: `Admin "${admin.username}" updated technical settings & API integrations`,
      request,
    });

    return NextResponse.json({
      message: 'Technical settings saved successfully.',
      settings: updated,
    });
  } catch (error) {
    console.error('Error saving technical settings:', error);
    return NextResponse.json({ error: 'Failed to save technical settings' }, { status: 500 });
  }
}
