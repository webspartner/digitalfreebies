import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  hashPassword,
  generateForumToken,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/auth';
import { verifyEmailCodeConstantTime } from '@/lib/mailer';
import { logActivity } from '@/lib/audit';

const MAX_RESET_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

// POST /api/forum/auth/reset-password - Verify 6-digit reset code and set a new password
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const { email, code, newPassword } = body;

    if (
      !email ||
      typeof email !== 'string' ||
      !code ||
      typeof code !== 'string' ||
      !newPassword ||
      typeof newPassword !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Email, 6-digit reset code, and new password are required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      return NextResponse.json(
        { error: 'Password cannot exceed 72 characters' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const rateKey = `forum_reset_pwd:${ip}:${cleanEmail}`;

    const rateCheck = checkRateLimit(rateKey, MAX_RESET_ATTEMPTS, WINDOW_MS);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed reset attempts. Please wait ${Math.ceil(
            rateCheck.retryAfterSeconds / 60
          )} minutes or request a new reset code.`,
        },
        { status: 429, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    const isCodeValid =
      user &&
      user.resetTokenHash &&
      user.resetTokenExpiresAt &&
      user.resetTokenExpiresAt > new Date() &&
      verifyEmailCodeConstantTime(cleanCode, user.resetTokenHash);

    if (!user || !isCodeValid) {
      recordFailedAttempt(rateKey, MAX_RESET_ATTEMPTS, WINDOW_MS, LOCKOUT_MS);
      await logActivity({
        actor: cleanEmail,
        actorRole: 'user',
        action: 'USER_PASSWORD_RESET_FAILED',
        category: 'security',
        summary: `Failed password reset code attempt for "${cleanEmail}"`,
        request,
      });

      return NextResponse.json(
        { error: 'Invalid or expired 6-digit reset code. Please check the code or request a new one.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    clearFailedAttempts(rateKey);

    const passwordHash = hashPassword(newPassword);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerified: true,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
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
      action: 'USER_PASSWORD_RESET_COMPLETED',
      category: 'security',
      summary: `User "${updatedUser.username}" (${updatedUser.email}) reset their password via email code`,
      request,
    });

    const token = generateForumToken({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
    });

    const response = NextResponse.json(
      {
        message: 'Your password has been reset successfully!',
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
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
