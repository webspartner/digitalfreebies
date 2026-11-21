import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, isFullAdmin, hashPassword, verifyPassword } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT /api/users/[id] - Update staff username, email, role, and/or password (Admin only)
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const decoded = token ? verifyToken(token) : null;
    if (!token || !decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isFullAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Only Admins can edit staff accounts' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await prisma.admin.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { username, email, password, role, adminPassword } = body;

    if (!adminPassword || typeof adminPassword !== 'string') {
      return NextResponse.json(
        { error: 'Your current admin password is required to confirm editing a staff account' },
        { status: 400 }
      );
    }

    const actingAdmin = await prisma.admin.findUnique({ where: { id: decoded.id } });
    if (!actingAdmin || !verifyPassword(adminPassword, actingAdmin.passwordHash)) {
      return NextResponse.json(
        { error: 'Incorrect admin password confirmation' },
        { status: 401 }
      );
    }

    const dataToUpdate: {
      username?: string;
      email?: string | null;
      passwordHash?: string;
      role?: string;
    } = {};

    if (username && username.trim() !== user.username) {
      const cleanUsername = username.trim();
      if (cleanUsername.length < 3) {
        return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
      }

      const existing = await prisma.admin.findUnique({
        where: { username: cleanUsername },
      });

      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
      }

      dataToUpdate.username = cleanUsername;
    }

    if (email !== undefined) {
      const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
      if (cleanEmail !== (user.email || null)) {
        dataToUpdate.email = cleanEmail;
      }
    }

    if (role !== undefined) {
      const cleanRole = role === 'moderator' ? 'moderator' : 'admin';
      if (cleanRole !== user.role) {
        // Prevent demoting the last remaining full admin
        if (user.role === 'admin' && cleanRole === 'moderator') {
          const totalFullAdmins = await prisma.admin.count({ where: { role: 'admin' } });
          if (totalFullAdmins <= 1) {
            return NextResponse.json(
              { error: 'Cannot change role of the only remaining Admin account' },
              { status: 400 }
            );
          }
        }
        dataToUpdate.role = cleanRole;
      }
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      dataToUpdate.passwordHash = hashPassword(password);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const updatedUser = await prisma.admin.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
      },
    });

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: decoded.username,
      actorRole: 'admin',
      action: 'ADMIN_USER_UPDATED',
      category: 'users',
      summary: `Admin "${decoded.username}" updated ${updatedUser.role} account "${updatedUser.username}"`,
      request,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete an admin or moderator account (Admin only)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const decoded = token ? verifyToken(token) : null;
    if (!token || !decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isFullAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Only Admins can delete staff accounts' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    let adminPassword = '';
    try {
      const body = await request.json();
      adminPassword = body?.adminPassword || '';
    } catch {
      // ignore if body is empty
    }

    if (!adminPassword || typeof adminPassword !== 'string') {
      return NextResponse.json(
        { error: 'Your current admin password is required to confirm deleting a staff account' },
        { status: 400 }
      );
    }

    const actingAdmin = await prisma.admin.findUnique({ where: { id: decoded.id } });
    if (!actingAdmin || !verifyPassword(adminPassword, actingAdmin.passwordHash)) {
      return NextResponse.json(
        { error: 'Incorrect admin password confirmation' },
        { status: 401 }
      );
    }

    const user = await prisma.admin.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role === 'admin') {
      const totalAdmins = await prisma.admin.count({ where: { role: 'admin' } });
      if (totalAdmins <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the only remaining Admin account' },
          { status: 400 }
        );
      }
    }

    await prisma.admin.delete({
      where: { id: userId },
    });

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: decoded.username,
      actorRole: 'admin',
      action: 'ADMIN_USER_DELETED',
      category: 'users',
      summary: `Admin "${decoded.username}" deleted ${user.role} account "${user.username}"`,
      request,
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
