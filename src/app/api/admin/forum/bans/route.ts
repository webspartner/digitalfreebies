import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { logActivity } from '@/lib/audit';

// GET /api/admin/forum/bans - List all banned IPs and banned forum users
export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [bannedIps, bannedUsers] = await Promise.all([
      prisma.bannedIp.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        where: { isBanned: true },
        select: {
          id: true,
          username: true,
          email: true,
          isBanned: true,
          banReason: true,
          bannedAt: true,
          lastIp: true,
        },
        orderBy: { bannedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({ bannedIps, bannedUsers });
  } catch (error) {
    console.error('Error fetching forum bans:', error);
    return NextResponse.json({ error: 'Failed to load forum bans' }, { status: 500 });
  }
}

// POST /api/admin/forum/bans - Ban a forum user (by userId/username) and/or an IP address
export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, username, ipAddress, reason } = body;
    const cleanReason =
      typeof reason === 'string' && reason.trim()
        ? reason.trim().slice(0, 250)
        : 'Banned from posting or commenting in the community forum';

    let targetUser = null;
    if (userId) {
      targetUser = await prisma.user.findUnique({ where: { id: Number(userId) } });
    } else if (typeof username === 'string' && username.trim()) {
      targetUser = await prisma.user.findUnique({ where: { username: username.trim() } });
    }

    const resolvedIp =
      (typeof ipAddress === 'string' && ipAddress.trim()) || targetUser?.lastIp || null;

    if (!targetUser && !resolvedIp) {
      return NextResponse.json(
        { error: 'Provide either a forum user or an IP address to ban.' },
        { status: 400 }
      );
    }

    if (targetUser) {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          isBanned: true,
          banReason: cleanReason,
          bannedAt: new Date(),
          ...(resolvedIp ? { lastIp: resolvedIp } : {}),
        },
      });
    }

    if (resolvedIp) {
      await prisma.bannedIp.upsert({
        where: { ipAddress: resolvedIp },
        update: {
          reason: cleanReason,
          bannedBy: admin.username,
          userId: targetUser?.id ?? null,
          username: targetUser?.username ?? (typeof username === 'string' ? username.trim() : null),
        },
        create: {
          ipAddress: resolvedIp,
          reason: cleanReason,
          bannedBy: admin.username,
          userId: targetUser?.id ?? null,
          username: targetUser?.username ?? (typeof username === 'string' ? username.trim() : null),
        },
      });
    }

    await logActivity({
      actor: admin.username,
      actorRole: admin.role === 'moderator' ? 'moderator' : 'admin',
      action: 'FORUM_USER_BANNED',
      category: 'forum',
      summary: `${admin.role === 'moderator' ? 'Moderator' : 'Admin'} "${admin.username}" banned ${
        targetUser ? `forum user "${targetUser.username}"` : 'visitor'
      }${resolvedIp ? ` (IP: ${resolvedIp})` : ''}`,
      request,
    });

    return NextResponse.json({
      message: `Banned ${targetUser ? `user "${targetUser.username}"` : ''}${
        targetUser && resolvedIp ? ' and ' : ''
      }${resolvedIp ? `IP ${resolvedIp}` : ''} from posting or commenting.`,
    });
  } catch (error) {
    console.error('Error banning forum user/IP:', error);
    return NextResponse.json({ error: 'Failed to apply forum ban' }, { status: 500 });
  }
}

// DELETE /api/admin/forum/bans - Unban a forum user and/or IP address
export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const ipParam = searchParams.get('ip');

    let unbannedUsername: string | null = null;
    let userLastIp: string | null = null;

    if (userIdParam) {
      const uid = Number(userIdParam);
      if (!isNaN(uid)) {
        const u = await prisma.user.findUnique({ where: { id: uid } });
        if (u) {
          unbannedUsername = u.username;
          userLastIp = u.lastIp;
          await prisma.user.update({
            where: { id: uid },
            data: {
              isBanned: false,
              banReason: null,
              bannedAt: null,
            },
          });
        }
        await prisma.bannedIp.deleteMany({
          where: {
            OR: [
              { userId: uid },
              ...(userLastIp ? [{ ipAddress: userLastIp }] : []),
            ],
          },
        });
      }
    }

    if (ipParam && ipParam.trim()) {
      await prisma.bannedIp.deleteMany({
        where: { ipAddress: ipParam.trim() },
      });
    }

    await logActivity({
      actor: admin.username,
      actorRole: admin.role === 'moderator' ? 'moderator' : 'admin',
      action: 'FORUM_USER_UNBANNED',
      category: 'forum',
      summary: `${admin.role === 'moderator' ? 'Moderator' : 'Admin'} "${admin.username}" unbanned ${
        unbannedUsername ? `forum user "${unbannedUsername}"` : `IP ${ipParam}`
      }`,
      request,
    });

    return NextResponse.json({ message: 'Ban removed successfully.' });
  } catch (error) {
    console.error('Error removing forum ban:', error);
    return NextResponse.json({ error: 'Failed to remove ban' }, { status: 500 });
  }
}
