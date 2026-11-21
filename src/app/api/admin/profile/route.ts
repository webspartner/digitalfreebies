import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getAdminFromRequest,
  hashPassword,
  verifyPassword,
  generateAdminToken,
} from '@/lib/auth';
import { logActivity } from '@/lib/audit';

// GET /api/admin/profile - Get the currently authenticated admin's profile & recent activity
export async function GET(request: NextRequest) {
  try {
    const authAdmin = getAdminFromRequest(request);
    if (!authAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: authAdmin.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    const recentLogs = await prisma.auditLog.findMany({
      where: { actor: admin.username, actorRole: { in: ['admin', 'moderator'] } },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    const cookieToken = request.cookies.get('admin_token')?.value;

    return NextResponse.json(
      { profile: admin, recentLogs, token: cookieToken || undefined },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/profile - Update current admin's username, email, and/or password
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
    const { username, email, currentPassword, newPassword } = body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Please enter your current password to confirm changes to your account' },
        { status: 400 }
      );
    }

    const validCurrent = verifyPassword(currentPassword, admin.passwordHash);
    if (!validCurrent) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    const dataToUpdate: {
      username?: string;
      email?: string | null;
      passwordHash?: string;
    } = {};
    const changedFields: string[] = [];

    // Username change
    if (typeof username === 'string' && username.trim() !== admin.username) {
      const cleanUsername = username.trim();
      if (cleanUsername.length < 3 || cleanUsername.length > 40) {
        return NextResponse.json(
          { error: 'Username must be between 3 and 40 characters' },
          { status: 400 }
        );
      }

      const existing = await prisma.admin.findUnique({
        where: { username: cleanUsername },
      });

      if (existing && existing.id !== admin.id) {
        return NextResponse.json(
          { error: 'Username is already taken by another admin' },
          { status: 409 }
        );
      }

      dataToUpdate.username = cleanUsername;
      changedFields.push(`username ("${admin.username}" -> "${cleanUsername}")`);
    }

    // Email change
    if (email !== undefined) {
      const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return NextResponse.json(
          { error: 'Please enter a valid email address' },
          { status: 400 }
        );
      }
      const nextEmail = cleanEmail || null;
      if (nextEmail !== (admin.email || null)) {
        dataToUpdate.email = nextEmail;
        changedFields.push('email');
      }
    }

    // Password change
    if (newPassword && typeof newPassword === 'string' && newPassword.trim()) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      dataToUpdate.passwordHash = hashPassword(newPassword);
      changedFields.push('password');
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { error: 'No changes were made to your profile' },
        { status: 400 }
      );
    }

    const updatedAdmin = await prisma.admin.update({
      where: { id: admin.id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
      },
    });

    await logActivity({
      actor: updatedAdmin.username,
      actorRole: updatedAdmin.role === 'moderator' ? 'moderator' : 'admin',
      action: 'ADMIN_PROFILE_UPDATED',
      category: 'security',
      summary: `${updatedAdmin.role === 'moderator' ? 'Moderator' : 'Admin'} "${updatedAdmin.username}" updated their personal profile (${changedFields.join(', ')})`,
      request,
    });

    // Issue a fresh JWT token in case username changed
    const newToken = generateAdminToken({
      id: updatedAdmin.id,
      username: updatedAdmin.username,
      role: updatedAdmin.role,
    });

    const response = NextResponse.json(
      {
        profile: updatedAdmin,
        token: newToken,
        message: 'Profile updated successfully',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );

    response.cookies.set({
      name: 'admin_token',
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
