import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  verifyPasswordTimingSafe,
  generateAdminToken,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/auth';
import { verifyTotpToken } from '@/lib/totp';
import { logActivity } from '@/lib/audit';

const MAX_ADMIN_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipRateKey = `admin_login_ip:${ip}`;

    const ipCheck = checkRateLimit(ipRateKey, MAX_ADMIN_ATTEMPTS * 2, WINDOW_MS);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please try again in ${Math.ceil(
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
    const { username, password, totpCode, rememberMe, website, turnstileToken } = body;
    const isRememberMe = Boolean(rememberMe);

    // Bot honeypot check
    if (website) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Cloudflare Turnstile verification on initial password step (skipped when keys are empty)
    if (!totpCode) {
      const { verifyTurnstileToken } = await import('@/lib/technicalSettings');
      const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip);
      if (!turnstileCheck.success) {
        return NextResponse.json(
          { error: turnstileCheck.error || 'Please complete the Cloudflare security check' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password
    ) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const cleanUsername = username.trim().slice(0, 64);
    const userRateKey = `admin_login_user:${ip}:${cleanUsername.toLowerCase()}`;

    const userCheck = checkRateLimit(userRateKey, MAX_ADMIN_ATTEMPTS, WINDOW_MS);
    if (!userCheck.allowed) {
      return NextResponse.json(
        {
          error: `Account temporarily locked due to multiple failed attempts. Try again in ${Math.ceil(
            userCheck.retryAfterSeconds / 60
          )} minutes.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(userCheck.retryAfterSeconds),
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { username: cleanUsername },
    });

    // Constant-time bcrypt check (runs even if admin is null)
    const isValid = verifyPasswordTimingSafe(password, admin?.passwordHash);

    if (!admin || !isValid) {
      recordFailedAttempt(ipRateKey, MAX_ADMIN_ATTEMPTS * 2, WINDOW_MS, LOCKOUT_MS);
      const attemptStatus = recordFailedAttempt(
        userRateKey,
        MAX_ADMIN_ATTEMPTS,
        WINDOW_MS,
        LOCKOUT_MS
      );

      await logActivity({
        actor: cleanUsername,
        actorRole: 'admin',
        action: 'ADMIN_LOGIN_FAILED',
        category: 'security',
        summary: `Failed admin login attempt for username "${cleanUsername}"`,
        request,
      });

      if (attemptStatus.locked) {
        return NextResponse.json(
          {
            error: `Too many failed login attempts. Locked for ${Math.ceil(
              attemptStatus.retryAfterSeconds / 60
            )} minutes.`,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(attemptStatus.retryAfterSeconds),
              'Cache-Control': 'no-store',
            },
          }
        );
      }

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Two-Factor Authentication (TOTP) Check
    if (admin.twoFactorEnabled && admin.twoFactorSecret) {
      if (!totpCode || typeof totpCode !== 'string' || !totpCode.trim()) {
        return NextResponse.json(
          {
            requiresTwoFactor: true,
            message: 'Enter the 6-digit verification code from your authenticator app.',
          },
          { status: 200, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      const validTotp = verifyTotpToken(totpCode, admin.twoFactorSecret);
      if (!validTotp) {
        recordFailedAttempt(ipRateKey, MAX_ADMIN_ATTEMPTS * 2, WINDOW_MS, LOCKOUT_MS);
        recordFailedAttempt(userRateKey, MAX_ADMIN_ATTEMPTS, WINDOW_MS, LOCKOUT_MS);

        await logActivity({
          actor: admin.username,
          actorRole: 'admin',
          action: 'ADMIN_2FA_FAILED',
          category: 'security',
          summary: `Invalid 2FA verification code entered for admin "${admin.username}"`,
          request,
        });

        return NextResponse.json(
          { error: 'Invalid 6-digit authenticator verification code' },
          { status: 401, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(ipRateKey);
    clearFailedAttempts(userRateKey);

    const adminRole = admin.role === 'moderator' ? 'moderator' : 'admin';

    await logActivity({
      actor: admin.username,
      actorRole: adminRole,
      action: 'ADMIN_LOGIN',
      category: 'security',
      summary: `${adminRole === 'moderator' ? 'Moderator' : 'Admin'} "${admin.username}" signed in to dashboard${admin.twoFactorEnabled ? ' (with 2FA)' : ''}`,
      request,
    });

    const token = generateAdminToken({
      id: admin.id,
      username: admin.username,
      role: adminRole,
      rememberMe: isRememberMe,
    });

    const response = NextResponse.json(
      {
        token,
        rememberMe: isRememberMe,
        user: {
          id: admin.id,
          username: admin.username,
          email: admin.email || null,
          twoFactorEnabled: admin.twoFactorEnabled,
          role: adminRole,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );

    const isHttps =
      request.headers.get('x-forwarded-proto') === 'https' ||
      request.nextUrl.protocol === 'https:';

    // Set HttpOnly cookie (30 days when Remember Me is checked, 12 hours otherwise)
    response.cookies.set({
      name: 'admin_token',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'strict',
      path: '/',
      maxAge: isRememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
