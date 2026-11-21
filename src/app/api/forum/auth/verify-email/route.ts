import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  generateForumToken,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/auth';
import {
  generateSixDigitCode,
  verifyEmailCodeConstantTime,
  sendRegistrationVerificationEmail,
  sendRegistrationConfirmedEmail,
} from '@/lib/mailer';
import { logActivity } from '@/lib/audit';

const MAX_VERIFY_ATTEMPTS = 6;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

// POST /api/forum/auth/verify-email - Verify 6-digit registration code
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const { email, code } = body;

    if (!email || typeof email !== 'string' || !code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Email and 6-digit verification code are required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const rateKey = `forum_verify_email:${ip}:${cleanEmail}`;

    const rateCheck = checkRateLimit(rateKey, MAX_VERIFY_ATTEMPTS, WINDOW_MS);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many verification attempts. Please wait ${Math.ceil(
            rateCheck.retryAfterSeconds / 60
          )} minutes before trying again.`,
        },
        { status: 429, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    const isCodeValid =
      user &&
      user.verificationCodeHash &&
      user.verificationExpiresAt &&
      user.verificationExpiresAt > new Date() &&
      verifyEmailCodeConstantTime(cleanCode, user.verificationCodeHash);

    if (!user || !isCodeValid) {
      recordFailedAttempt(rateKey, MAX_VERIFY_ATTEMPTS, WINDOW_MS, LOCKOUT_MS);
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please check your email or request a new code.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    clearFailedAttempts(rateKey);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCodeHash: null,
        verificationExpiresAt: null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    await logActivity({
      actor: updatedUser.username,
      actorRole: 'user',
      action: 'USER_EMAIL_VERIFIED',
      category: 'users',
      summary: `User "${updatedUser.username}" verified their email address (${updatedUser.email})`,
      request,
    });

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.nextUrl.origin ||
      'http://localhost:3000';

    // Send registration confirmation welcome email after verification
    await sendRegistrationConfirmedEmail({
      toEmail: updatedUser.email,
      username: updatedUser.username,
      origin,
    }).catch(() => {});

    const token = generateForumToken({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
    });

    const response = NextResponse.json(
      {
        message: 'Registration confirmed and email verified! Welcome to the community.',
        user: updatedUser,
        token,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );

    response.cookies.set({
      name: 'forum_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

// PUT /api/forum/auth/verify-email - Resend 6-digit verification code
export async function PUT(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const resendKey = `forum_resend_verify:${ip}:${cleanEmail}`;

    const rateCheck = checkRateLimit(resendKey, 3, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Please wait a few minutes before requesting another verification code.' },
        { status: 429 }
      );
    }

    recordFailedAttempt(resendKey, 3, 10 * 60 * 1000, 10 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (user && !user.emailVerified) {
      const { code, codeHash } = generateSixDigitCode();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationCodeHash: codeHash,
          verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        request.nextUrl.origin ||
        'http://localhost:3000';

      const emailResult = await sendRegistrationVerificationEmail({
        toEmail: user.email,
        username: user.username,
        code,
        origin,
      });

      if (!emailResult.sent) {
        return NextResponse.json(
          {
            error: emailResult.smtpConfigured
              ? `Could not send verification email: ${emailResult.error || 'SMTP delivery failed'}`
              : 'SMTP email server is not configured yet in Admin Settings.',
          },
          { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    return NextResponse.json(
      { message: `A new 6-digit confirmation code has been sent to ${cleanEmail}.` },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error resending verification code:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification code' },
      { status: 500 }
    );
  }
}
