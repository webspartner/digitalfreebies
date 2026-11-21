import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getUserFromRequest,
  verifyPasswordTimingSafe,
  hashPassword,
  generateForumToken,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/auth';
import { logActivity } from '@/lib/audit';

const MAX_PROFILE_ATTEMPTS = 6;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

// GET /api/forum/profile - Get authenticated forum user's profile, posts, and recent comments
export async function GET(request: NextRequest) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const [posts, comments] = await Promise.all([
      prisma.forumPost.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { comments: true },
          },
        },
      }),
      prisma.forumComment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json(
      { user, posts, comments },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error fetching forum profile:', error);
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

// PUT /api/forum/profile - Update forum user's username, email, and/or password (requires currentPassword)
export async function PUT(request: NextRequest) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const ip = getClientIp(request);
    const rateKey = `forum_profile_update:${ip}:${authUser.id}`;
    const rateCheck = checkRateLimit(rateKey, MAX_PROFILE_ATTEMPTS, WINDOW_MS);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed verification attempts. Please wait ${Math.ceil(
            rateCheck.retryAfterSeconds / 60
          )} minutes before trying again.`,
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

    const userRecord = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!userRecord) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = await request.json();
    const { username, email, currentPassword, newPassword } = body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Please enter your current password to confirm account changes' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Constant-time password verification
    const isPasswordValid = verifyPasswordTimingSafe(
      currentPassword,
      userRecord.passwordHash
    );

    if (!isPasswordValid) {
      recordFailedAttempt(rateKey, MAX_PROFILE_ATTEMPTS, WINDOW_MS, LOCKOUT_MS);
      await logActivity({
        actor: userRecord.username,
        actorRole: 'user',
        action: 'FORUM_PROFILE_AUTH_FAILED',
        category: 'security',
        summary: `Failed password confirmation during profile update for forum user "${userRecord.username}"`,
        request,
      });

      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    clearFailedAttempts(rateKey);

    const dataToUpdate: {
      username?: string;
      email?: string;
      passwordHash?: string;
    } = {};
    const changedFields: string[] = [];

    // 1. Validate & check username change
    if (typeof username === 'string' && username.trim() !== userRecord.username) {
      const cleanUsername = username.trim();
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return NextResponse.json(
          { error: 'Username must be between 3 and 30 characters' },
          { status: 400 }
        );
      }

      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return NextResponse.json(
          { error: 'Username can only contain letters, numbers, and underscores' },
          { status: 400 }
        );
      }

      const existingUsername = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });

      if (existingUsername && existingUsername.id !== userRecord.id) {
        return NextResponse.json(
          { error: 'That username is already taken' },
          { status: 409 }
        );
      }

      dataToUpdate.username = cleanUsername;
      changedFields.push(`username ("${userRecord.username}" -> "${cleanUsername}")`);
    }

    // 2. Validate & check email change
    if (typeof email === 'string' && email.trim().toLowerCase() !== userRecord.email.toLowerCase()) {
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 120) {
        return NextResponse.json(
          { error: 'Please provide a valid email address' },
          { status: 400 }
        );
      }

      const existingEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existingEmail && existingEmail.id !== userRecord.id) {
        return NextResponse.json(
          { error: 'An account with this email address already exists' },
          { status: 409 }
        );
      }

      dataToUpdate.email = cleanEmail;
      changedFields.push('email');
    }

    // 3. Validate & check password change
    if (newPassword && typeof newPassword === 'string' && newPassword.trim()) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long' },
          { status: 400 }
        );
      }
      if (newPassword.length > 72) {
        return NextResponse.json(
          { error: 'New password cannot exceed 72 characters' },
          { status: 400 }
        );
      }

      dataToUpdate.passwordHash = hashPassword(newPassword);
      changedFields.push('password');
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { error: 'No changes were detected' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userRecord.id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
      },
    });

    // Keep authorName synchronized across user's posts and comments if username changed
    if (dataToUpdate.username) {
      await Promise.all([
        prisma.forumPost.updateMany({
          where: { userId: userRecord.id },
          data: { authorName: dataToUpdate.username },
        }),
        prisma.forumComment.updateMany({
          where: { userId: userRecord.id },
          data: { authorName: dataToUpdate.username },
        }),
      ]);
    }

    if (dataToUpdate.email) {
      await prisma.forumPost.updateMany({
        where: { userId: userRecord.id },
        data: { authorEmail: dataToUpdate.email },
      });
    }

    await logActivity({
      actor: updatedUser.username,
      actorRole: 'user',
      action: 'FORUM_USER_PROFILE_UPDATED',
      category: 'users',
      summary: `Forum user "${updatedUser.username}" updated their profile (${changedFields.join(', ')})`,
      request,
    });

    const newToken = generateForumToken({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
    });

    const response = NextResponse.json(
      {
        user: updatedUser,
        token: newToken,
        message: 'Your profile has been updated successfully.',
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );

    response.cookies.set({
      name: 'forum_token',
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Error updating forum profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
