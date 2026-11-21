import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getClientIp } from '@/lib/auth';

export interface BanCheckResult {
  banned: boolean;
  reason: string | null;
  ip: string;
}

/**
 * Checks whether a forum user (by login userId) OR their client IP address is banned.
 * Also keeps the user's `lastIp` updated on activity and syncs banned user IPs.
 */
export async function checkForumBan(
  request: NextRequest,
  userId?: number | null
): Promise<BanCheckResult> {
  const ip = getClientIp(request);

  try {
    const [user, bannedIp] = await Promise.all([
      userId
        ? prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              username: true,
              isBanned: true,
              banReason: true,
              lastIp: true,
            },
          })
        : Promise.resolve(null),
      ip
        ? prisma.bannedIp.findUnique({
            where: { ipAddress: ip },
          })
        : Promise.resolve(null),
    ]);

    // Update user's lastIp if changed
    if (user && ip && user.lastIp !== ip) {
      await prisma.user
        .update({
          where: { id: user.id },
          data: { lastIp: ip },
        })
        .catch(() => {});
    }

    // 1. Check if the user account itself is banned
    if (user?.isBanned) {
      // Automatically record their current IP in BannedIp if not already banned
      if (ip && !bannedIp) {
        await prisma.bannedIp
          .upsert({
            where: { ipAddress: ip },
            update: {
              userId: user.id,
              username: user.username,
              reason: user.banReason || 'Banned forum user account',
            },
            create: {
              ipAddress: ip,
              userId: user.id,
              username: user.username,
              reason: user.banReason || 'Banned forum user account',
              bannedBy: 'system',
            },
          })
          .catch(() => {});
      }

      return {
        banned: true,
        reason:
          user.banReason ||
          'Your account has been banned from posting or commenting in the community forum.',
        ip,
      };
    }

    // 2. Check if the client's IP address is banned
    if (bannedIp) {
      return {
        banned: true,
        reason:
          bannedIp.reason ||
          'Your account or IP address has been banned from posting or commenting in the community forum.',
        ip,
      };
    }

    return { banned: false, reason: null, ip };
  } catch (err) {
    console.error('Error checking forum ban status:', err);
    return { banned: false, reason: null, ip };
  }
}
