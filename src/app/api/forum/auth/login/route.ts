import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  verifyPasswordTimingSafe,
  generateForumToken,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/auth';

const MAX_FORUM_LOGIN_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipRateKey = `forum_login_ip:${ip}`;

    const ipCheck = checkRateLimit(ipRateKey, MAX_FORUM_LOGIN_ATTEMPTS * 2, WINDOW_MS);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many sign-in attempts from your network. Please wait ${Math.ceil(
            ipCheck.retryAfterSeconds / 60
          )} minutes and try again.`,
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
    const { login, password, rememberMe, website, turnstileToken } = body; // login can be username or email
    const isRememberMe = Boolean(rememberMe);

    // Bot honeypot check
    if (website) {
      return NextResponse.json(
        { error: 'Invalid username/email or password' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
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

    if (typeof login !== 'string' || typeof password !== 'string' || !login.trim() || !password) {
      return NextResponse.json(
        { error: 'Username/Email and password are required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const cleanLogin = login.trim().slice(0, 120);
    const userRateKey = `forum_login_user:${ip}:${cleanLogin.toLowerCase()}`;

    const userCheck = checkRateLimit(userRateKey, MAX_FORUM_LOGIN_ATTEMPTS, WINDOW_MS);
    if (!userCheck.allowed) {
      return NextResponse.json(
        {
          error: `Account temporarily locked due to repeated failed attempts. Try again in ${Math.ceil(
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

    // Find by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanLogin.toLowerCase() }, { username: cleanLogin }],
      },
    });

    // Constant-time bcrypt check to prevent user/email enumeration via timing attacks
    const isValid = verifyPasswordTimingSafe(password, user?.passwordHash);

    if (!user || !isValid) {
      recordFailedAttempt(ipRateKey, MAX_FORUM_LOGIN_ATTEMPTS * 2, WINDOW_MS, LOCKOUT_MS);
      const attemptStatus = recordFailedAttempt(
        userRateKey,
        MAX_FORUM_LOGIN_ATTEMPTS,
        WINDOW_MS,
        LOCKOUT_MS
      );

      const { logActivity } = await import('@/lib/audit');
      await logActivity({
        actor: cleanLogin,
        actorRole: 'user',
        action: 'USER_LOGIN_FAILED',
        category: 'security',
        summary: `Failed forum login attempt for "${cleanLogin}"`,
        request,
      });

      if (attemptStatus.locked) {
        return NextResponse.json(
          {
            error: `Too many failed sign-in attempts. Locked for ${Math.ceil(
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
        { error: 'Invalid username/email or password' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    clearFailedAttempts(ipRateKey);
    clearFailedAttempts(userRateKey);

    // Require email verification if user has not confirmed their registration yet
    if (!user.emailVerified) {
      const {
        getActiveSmtpConfig,
        generateSixDigitCode,
        sendRegistrationVerificationEmail,
      } = await import('@/lib/mailer');
      const smtpConfig = await getActiveSmtpConfig();

      if (smtpConfig.requireEmailVerification) {
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

        return NextResponse.json(
          {
            error: emailResult.sent
              ? `Please confirm your registration first. We sent a 6-digit verification code to ${user.email}.`
              : `Your email (${user.email}) is not verified yet. Please verify your email address to sign in.`,
            requiresVerification: true,
            email: user.email,
          },
          { status: 403, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    // Record lastIp and check ban status
    const { checkForumBan } = await import('@/lib/forumBan');
    const banStatus = await checkForumBan(request, user.id);

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: user.username,
      actorRole: 'user',
      action: 'USER_LOGIN',
      category: 'security',
      summary: `User "${user.username}" signed in to community forum`,
      request,
    });

    const token = generateForumToken({
      id: user.id,
      username: user.username,
      email: user.email,
      rememberMe: isRememberMe,
    });

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      isBanned: banStatus.banned,
      banReason: banStatus.reason,
      createdAt: user.createdAt,
    };

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: safeUser,
        rememberMe: isRememberMe,
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

    // Set HttpOnly, SameSite=Lax cookie (30 days if Remember Me is checked, otherwise session cookie)
    response.cookies.set({
      name: 'forum_token',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      ...(isRememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
    });

    return response;
  } catch (error) {
    console.error('Error during community login:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
