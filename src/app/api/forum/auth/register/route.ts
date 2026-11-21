import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  hashPassword,
  generateForumToken,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
} from '@/lib/auth';

const MAX_REGISTER_ATTEMPTS = 5;
const REGISTER_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateKey = `forum_register_ip:${ip}`;

    const rateCheck = checkRateLimit(rateKey, MAX_REGISTER_ATTEMPTS, REGISTER_WINDOW_MS);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many registration attempts. Please try again in ${Math.ceil(
            rateCheck.retryAfterSeconds / 60
          )} minutes.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfterSeconds),
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const body = await request.json();
    const { username, email, password, website, turnstileToken } = body;

    // Bot honeypot check
    if (website) {
      return NextResponse.json(
        { error: 'Registration failed. Please try again.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
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

    if (
      typeof username !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !email.trim() ||
      !password
    ) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Username validation: alphanumeric, dashes, underscores, length 3-30
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 30 characters' },
        { status: 400 }
      );
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(cleanUsername)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, hyphens, and underscores' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 150) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Password validation (8+ chars, max 72 bytes for bcrypt)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      return NextResponse.json(
        { error: 'Password cannot exceed 72 characters' },
        { status: 400 }
      );
    }

    // Count attempt against IP rate limit
    recordFailedAttempt(rateKey, MAX_REGISTER_ATTEMPTS, REGISTER_WINDOW_MS, REGISTER_WINDOW_MS);

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmail && existingEmail.emailVerified) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please sign in.' },
        { status: 409 }
      );
    }

    // Check if username already exists (belongs to a different user)
    const existingUsername = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existingUsername && (!existingEmail || existingUsername.id !== existingEmail.id)) {
      return NextResponse.json(
        { error: 'That username is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    // Generate 6-digit email verification code
    const {
      generateSixDigitCode,
      sendRegistrationVerificationEmail,
      sendRegistrationConfirmedEmail,
      getActiveSmtpConfig,
    } = await import('@/lib/mailer');
    const { code, codeHash } = generateSixDigitCode();
    const smtpConfig = await getActiveSmtpConfig();
    const shouldRequireVerification = smtpConfig.requireEmailVerification;

    const passwordHash = hashPassword(password);
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = existingEmail
      ? await prisma.user.update({
          where: { id: existingEmail.id },
          data: {
            username: cleanUsername,
            passwordHash,
            lastIp: ip,
            emailVerified: !shouldRequireVerification,
            verificationCodeHash: shouldRequireVerification ? codeHash : null,
            verificationExpiresAt: shouldRequireVerification ? verificationExpiry : null,
          },
          select: {
            id: true,
            username: true,
            email: true,
            emailVerified: true,
            createdAt: true,
          },
        })
      : await prisma.user.create({
          data: {
            username: cleanUsername,
            email: cleanEmail,
            passwordHash,
            lastIp: ip,
            emailVerified: !shouldRequireVerification,
            verificationCodeHash: shouldRequireVerification ? codeHash : null,
            verificationExpiresAt: shouldRequireVerification ? verificationExpiry : null,
          },
          select: {
            id: true,
            username: true,
            email: true,
            emailVerified: true,
            createdAt: true,
          },
        });

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.nextUrl.origin ||
      'http://localhost:3000';

    const emailResult = shouldRequireVerification
      ? await sendRegistrationVerificationEmail({
          toEmail: user.email,
          username: user.username,
          code,
          origin,
        })
      : await sendRegistrationConfirmedEmail({
          toEmail: user.email,
          username: user.username,
          origin,
        });

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: user.username,
      actorRole: 'user',
      action: 'USER_REGISTERED',
      category: 'users',
      summary: `User "${user.username}" (${user.email}) registered a community forum account${
        emailResult.sent
          ? ' (registration confirmation email sent via Amazon SES / SMTP)'
          : emailResult.error
            ? ` (SMTP error: ${emailResult.error})`
            : ' (SMTP pending configuration)'
      }`,
      request,
    });

    // If email verification is required before sign-in
    if (shouldRequireVerification) {
      return NextResponse.json(
        {
          requiresVerification: true,
          email: user.email,
          emailSent: emailResult.sent,
          message: emailResult.sent
            ? `We sent a 6-digit registration confirmation code to ${user.email}. Please enter it below to activate your account.`
            : `Your account was created for ${user.email}, but the confirmation email could not be delivered yet (${
                emailResult.error || 'SMTP credentials awaiting setup in Admin Settings'
              }). Once SMTP is active, click "Resend verification code".`,
        },
        {
          status: 201,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    const token = generateForumToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    const response = NextResponse.json(
      {
        message: 'Account created successfully! Welcome to the community.',
        user,
        token,
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );

    const isHttps =
      request.headers.get('x-forwarded-proto') === 'https' ||
      request.nextUrl.protocol === 'https:';

    // Set HttpOnly cookie for session persistence
    response.cookies.set({
      name: 'forum_token',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Error during community registration:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
