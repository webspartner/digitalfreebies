import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest, isFullAdmin, verifyPassword } from '@/lib/auth';
import { getActiveSmtpConfig, sendSmtpEmail } from '@/lib/mailer';
import { logActivity } from '@/lib/audit';

// GET /api/admin/smtp - Get current SMTP configuration (masks password)
export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isFullAdmin(admin)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const active = await getActiveSmtpConfig();
    return NextResponse.json(
      {
        host: active.host,
        port: active.port,
        secure: active.secure,
        username: active.username,
        hasPassword: Boolean(active.password),
        fromName: active.fromName,
        fromEmail: active.fromEmail,
        requireEmailVerification: active.requireEmailVerification,
        configured: active.configured,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error loading SMTP settings:', error);
    return NextResponse.json({ error: 'Failed to load SMTP settings' }, { status: 500 });
  }
}

// PUT /api/admin/smtp - Save SMTP settings in the database
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
    const {
      host,
      port,
      secure,
      username,
      password,
      fromName,
      fromEmail,
      requireEmailVerification,
      adminPassword,
    } = body;

    if (!adminPassword || typeof adminPassword !== 'string') {
      return NextResponse.json(
        { error: 'Your current admin password is required to confirm changes to SMTP settings' },
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

    const existing = await prisma.smtpSettings.findUnique({ where: { id: 1 } });

    const nextPassword =
      typeof password === 'string' && password.trim()
        ? password.trim()
        : existing?.password || process.env.SMTP_PASS || '';

    const cleanHost = typeof host === 'string' && host.trim() ? host.trim() : 'email-smtp.us-east-1.amazonaws.com';
    const cleanPort = Number(port) || 587;
    const cleanSecure =
      cleanPort === 465 || cleanPort === 2465
        ? true
        : cleanPort === 587 || cleanPort === 2587
          ? false
          : Boolean(secure);
    const cleanUsername = typeof username === 'string' ? username.trim() : '';
    const cleanFromName =
      typeof fromName === 'string' && fromName.trim() ? fromName.trim() : 'DigitalFreebies.io';
    const cleanFromEmail =
      typeof fromEmail === 'string' && fromEmail.trim()
        ? fromEmail.trim()
        : existing?.fromEmail || 'noreply@digitalfreebies.io';

    const saved = await prisma.smtpSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        host: cleanHost,
        port: cleanPort,
        secure: cleanSecure,
        username: cleanUsername,
        password: nextPassword,
        fromName: cleanFromName,
        fromEmail: cleanFromEmail,
        requireEmailVerification:
          requireEmailVerification !== undefined ? Boolean(requireEmailVerification) : true,
      },
      update: {
        host: cleanHost,
        port: cleanPort,
        secure: cleanSecure,
        username: cleanUsername,
        password: nextPassword,
        fromName: cleanFromName,
        fromEmail: cleanFromEmail,
        requireEmailVerification:
          requireEmailVerification !== undefined ? Boolean(requireEmailVerification) : true,
      },
    });

    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'SMTP_SETTINGS_UPDATED',
      category: 'security',
      summary: `Admin "${admin.username}" updated SMTP email server settings (${saved.host || 'unconfigured'}:${saved.port})`,
      request,
    });

    return NextResponse.json({
      message: 'SMTP email settings saved successfully',
      configured: Boolean(saved.host && saved.username && saved.password),
    });
  } catch (error) {
    console.error('Error saving SMTP settings:', error);
    return NextResponse.json({ error: 'Failed to save SMTP settings' }, { status: 500 });
  }
}

// POST /api/admin/smtp - Send a test email to verify SMTP connection
export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail || typeof testEmail !== 'string' || !testEmail.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid recipient email for the test' }, { status: 400 });
    }

    const result = await sendSmtpEmail({
      to: testEmail.trim(),
      subject: 'DigitalFreebies.io — SMTP Connection Test',
      text: `Hello ${admin.username},\n\nYour SMTP configuration on DigitalFreebies.io is working properly! User registration verification and forgot-password emails will be delivered through this server.`,
      html: `<div style="font-family: sans-serif; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 520px;">
        <h2 style="color: #6a0b9e; margin-top: 0;">SMTP Connection Successful</h2>
        <p>Hello <strong>${admin.username}</strong>,</p>
        <p>Your SMTP email server is configured and delivering messages for DigitalFreebies.io (User Registration &amp; Forgot Password).</p>
      </div>`,
    });

    if (!result.smtpConfigured) {
      return NextResponse.json(
        { error: 'SMTP credentials are not filled in yet. Save your SMTP Host, Username, and Password first.' },
        { status: 400 }
      );
    }

    if (!result.sent) {
      return NextResponse.json(
        { error: `SMTP connection failed: ${result.error || 'Unknown error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: `Test email sent successfully to ${testEmail.trim()}` });
  } catch (error) {
    console.error('Error testing SMTP:', error);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
