import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getClientIp } from '@/lib/auth';

export type AuditCategory =
  | 'offers'
  | 'forum'
  | 'users'
  | 'categories'
  | 'security'
  | 'settings'
  | 'media'
  | 'faq'
  | 'general';

export type AuditActorRole = 'admin' | 'moderator' | 'user' | 'visitor' | 'system';

interface LogActivityInput {
  actor: string;
  actorRole?: AuditActorRole;
  action: string;
  category?: AuditCategory;
  summary: string;
  request?: NextRequest;
  ipAddress?: string | null;
}

/**
 * Sanitize strings against CRLF/log injection and excessive length.
 */
function sanitizeLogText(value: string, maxLength = 300): string {
  return value
    .replace(/[\r\n\t\x00-\x1F\x7F]+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Security-friendly audit logger. Never throws so business logic is never interrupted.
 */
export async function logActivity({
  actor,
  actorRole = 'admin',
  action,
  category = 'general',
  summary,
  request,
  ipAddress,
}: LogActivityInput): Promise<void> {
  try {
    const resolvedIp = ipAddress ?? (request ? getClientIp(request) : null);

    await prisma.auditLog.create({
      data: {
        actor: sanitizeLogText(actor || 'unknown', 80),
        actorRole: sanitizeLogText(actorRole, 20),
        action: sanitizeLogText(action, 60),
        category: sanitizeLogText(category, 30),
        summary: sanitizeLogText(summary, 400),
        ipAddress: resolvedIp ? sanitizeLogText(resolvedIp, 64) : null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
