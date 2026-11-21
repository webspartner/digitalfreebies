import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, hashPassword } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT /api/admin/forum-users/[id] - Update a forum user's username, email, or password
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Forum user not found' }, { status: 404 });
    }

    const body = await request.json();
    const { username, email, password, isBanned, banReason } = body;

    const dataToUpdate: {
      username?: string;
      email?: string;
      passwordHash?: string;
      isBanned?: boolean;
      banReason?: string | null;
      bannedAt?: Date | null;
    } = {};

    if (typeof isBanned === 'boolean') {
      dataToUpdate.isBanned = isBanned;
      dataToUpdate.banReason = isBanned
        ? typeof banReason === 'string' && banReason.trim()
          ? banReason.trim()
          : 'Banned by moderator'
        : null;
      dataToUpdate.bannedAt = isBanned ? new Date() : null;
    }

    if (username && username.trim() !== existingUser.username) {
      const cleanUsername = username.trim();
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return NextResponse.json(
          { error: 'Username must be between 3 and 30 characters' },
          { status: 400 }
        );
      }

      const duplicateUser = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });

      if (duplicateUser && duplicateUser.id !== userId) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
      }

      dataToUpdate.username = cleanUsername;
    }

    if (email && email.trim().toLowerCase() !== existingUser.email) {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 });
      }

      const duplicateEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (duplicateEmail && duplicateEmail.id !== userId) {
        return NextResponse.json({ error: 'Email is already registered to another user' }, { status: 409 });
      }

      dataToUpdate.email = cleanEmail;
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      dataToUpdate.passwordHash = hashPassword(password);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        email: true,
        isBanned: true,
        banReason: true,
        bannedAt: true,
        lastIp: true,
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

    // Sync IP ban table when banning or unbanning a forum user
    if (typeof isBanned === 'boolean') {
      if (isBanned) {
        if (existingUser.lastIp) {
          await prisma.bannedIp
            .upsert({
              where: { ipAddress: existingUser.lastIp },
              update: {
                userId: existingUser.id,
                username: updatedUser.username,
                reason: dataToUpdate.banReason || 'Banned forum user',
                bannedBy: admin.username,
              },
              create: {
                ipAddress: existingUser.lastIp,
                userId: existingUser.id,
                username: updatedUser.username,
                reason: dataToUpdate.banReason || 'Banned forum user',
                bannedBy: admin.username,
              },
            })
            .catch(() => {});
        }
      } else {
        await prisma.bannedIp
          .deleteMany({
            where: {
              OR: [
                { userId: existingUser.id },
                ...(existingUser.lastIp ? [{ ipAddress: existingUser.lastIp }] : []),
              ],
            },
          })
          .catch(() => {});
      }
    }

    // Keep cached authorName / authorEmail on posts and comments in sync if changed
    if (dataToUpdate.username || dataToUpdate.email) {
      await prisma.forumPost.updateMany({
        where: { userId },
        data: {
          ...(dataToUpdate.username ? { authorName: dataToUpdate.username } : {}),
          ...(dataToUpdate.email ? { authorEmail: dataToUpdate.email } : {}),
        },
      });
      if (dataToUpdate.username) {
        await prisma.forumComment.updateMany({
          where: { userId },
          data: { authorName: dataToUpdate.username },
        });
      }
    }

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'FORUM_USER_UPDATED',
      category: 'users',
      summary: `Admin "${admin.username}" updated forum user "${updatedUser.username}"`,
      request,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating forum user:', error);
    return NextResponse.json({ error: 'Failed to update forum user' }, { status: 500 });
  }
}

// DELETE /api/admin/forum-users/[id] - Delete a forum user (and optionally their posts/comments)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Forum user not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const deleteContent = searchParams.get('deleteContent') === 'true';

    if (deleteContent) {
      await prisma.forumComment.deleteMany({ where: { userId } });
      await prisma.forumPost.deleteMany({ where: { userId } });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'FORUM_USER_DELETED',
      category: 'users',
      summary: `Admin "${admin.username}" deleted forum user "${existingUser.username}"${deleteContent ? ' and their posts/comments' : ''}`,
      request,
    });

    return NextResponse.json({ message: 'Forum user deleted successfully' });
  } catch (error) {
    console.error('Error deleting forum user:', error);
    return NextResponse.json({ error: 'Failed to delete forum user' }, { status: 500 });
  }
}
