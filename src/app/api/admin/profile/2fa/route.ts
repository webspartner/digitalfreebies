import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest, verifyPassword } from '@/lib/auth';
import {
  generateTotpSecret,
  verifyTotpToken,
  buildOtpAuthUri,
} from '@/lib/totp';
import { logActivity } from '@/lib/audit';

// POST /api/admin/profile/2fa - Generate a new TOTP secret & otpauth URI for setup
export async function POST(request: NextRequest) {
  try {
    const authAdmin = getAdminFromRequest(request);
    if (!authAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: authAdmin.id },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    const secret = generateTotpSecret(20);
    const otpauthUrl = buildOtpAuthUri(admin.username, secret, 'DigitalFreebies Admin');

    return NextResponse.json(
      { secret, otpauthUrl },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    return NextResponse.json(
      { error: 'Failed to initialize 2FA setup' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/profile/2fa - Verify 6-digit code and enable 2FA on current admin account
export async function PUT(request: NextRequest) {
  try {
    const authAdmin = getAdminFromRequest(request);
    if (!authAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: authAdmin.id },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    const body = await request.json();
    const { secret, code } = body;

    if (!secret || typeof secret !== 'string' || !code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Setup secret and 6-digit verification code are required' },
        { status: 400 }
      );
    }

    const isValid = verifyTotpToken(code, secret);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid 6-digit verification code. Make sure your device time is synced and try again.' },
        { status: 400 }
      );
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret.toUpperCase().replace(/[^A-Z2-7]/g, ''),
      },
    });

    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'ADMIN_2FA_ENABLED',
      category: 'security',
      summary: `Admin "${admin.username}" enabled Two-Factor Authentication (2FA) on their account`,
      request,
    });

    return NextResponse.json(
      { twoFactorEnabled: true, message: 'Two-Factor Authentication enabled successfully' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to enable Two-Factor Authentication' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/profile/2fa - Disable 2FA on current admin account
export async function DELETE(request: NextRequest) {
  try {
    const authAdmin = getAdminFromRequest(request);
    if (!authAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: authAdmin.id },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { password, code } = body;

    let verified = false;
    if (password && typeof password === 'string') {
      verified = verifyPassword(password, admin.passwordHash);
    }
    if (!verified && code && typeof code === 'string' && admin.twoFactorSecret) {
      verified = verifyTotpToken(code, admin.twoFactorSecret);
    }

    if (!verified) {
      return NextResponse.json(
        { error: 'Please provide your current password or 6-digit 2FA code to disable Two-Factor Authentication' },
        { status: 401 }
      );
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'ADMIN_2FA_DISABLED',
      category: 'security',
      summary: `Admin "${admin.username}" disabled Two-Factor Authentication (2FA) on their account`,
      request,
    });

    return NextResponse.json(
      { twoFactorEnabled: false, message: 'Two-Factor Authentication has been disabled' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to disable Two-Factor Authentication' },
      { status: 500 }
    );
  }
}
