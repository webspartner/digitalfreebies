import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
} from '@/lib/auth';
import {
  generateSixDigitCode,
  sendPasswordResetEmail,
  getActiveSmtpConfig,
} from '@/lib/mailer';
import { logActivity } from '@/lib/audit';

const MAX_FORGOT_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

// POST /api/forum/auth/forgot-password - Request a 6-digit password reset code via SMTP email
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipKey = `forum_forgot_ip:${ip}`;

    const ipCheck = checkRateLimit(ipKey, MAX_FORGOT_ATTEMPTS, WINDOW_MS);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many password reset requests. Please try again in ${Math.ceil(
            ipCheck.retryAfterSeconds / 60
          )} minutes.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(ipCheck.retryAfterSeconds),
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const body = await request.json();
    const { email, website, turnstileToken } = body;

    // Honeypot check
    if (website) {
      return NextResponse.json(
        {
          message: 'If an account with that email address exists, we have sent a 6-digit password reset code.',
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Cloudflare Turnstile verification (skipped when keys are empty)
    const { verifyTurnstileToken } = await import('@/lib/technicalSettings');
    const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { error: turnstileCheck.error || 'Please complete the Cloudflare security check' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Please enter your email address' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    recordFailedAttempt(ipKey, MAX_FORGOT_ATTEMPTS, WINDOW_MS, WINDOW_MS);

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    const smtpConfig = await getActiveSmtpConfig();

    if (user) {
      const { code, codeHash } = generateSixDigitCode();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash: codeHash,
          resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });

      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        request.nextUrl.origin ||
        'http://localhost:3000';

      const emailResult = await sendPasswordResetEmail({
        toEmail: user.email,
        username: user.username,
        code,
        origin,
      });

      await logActivity({
        actor: user.username,
        actorRole: 'user',
        action: 'USER_PASSWORD_RESET_REQUESTED',
        category: 'security',
        summary: `Password reset code requested for forum user "${user.username}" (${user.email})${
          emailResult.sent ? ' [Sent via SMTP]' : ' [SMTP pending configuration]'
        }`,
        request,
      });
    }

    return NextResponse.json(
      {
        message: 'If an account with that email address exists, we have sent a 6-digit password reset code.',
        smtpConfigured: smtpConfig.configured,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error in forgot-password route:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request. Please try again.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
