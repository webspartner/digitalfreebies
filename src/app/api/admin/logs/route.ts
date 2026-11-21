import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest, isFullAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/audit';

// GET /api/admin/logs - List audit & security logs (Admin only)
export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isFullAdmin(admin)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const role = searchParams.get('role') || 'all';
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50')));

    const where: Record<string, unknown> = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (role && role !== 'all') {
      where.actorRole = role;
    }

    if (search) {
      where.OR = [
        { actor: { contains: search } },
        { action: { contains: search } },
        { summary: { contains: search } },
        { ipAddress: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json(
      {
        logs,
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

// DELETE /api/admin/logs - Clear old or all logs (Admin only, records self-audit entry)
export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isFullAdmin(admin)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'older';

    if (mode === 'all') {
      await prisma.auditLog.deleteMany({});
      await logActivity({
        actor: admin.username,
        actorRole: 'admin',
        action: 'LOGS_CLEARED',
        category: 'security',
        summary: `Admin "${admin.username}" cleared all activity logs`,
        request,
      });
    } else {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const deleted = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: thirtyDaysAgo } },
      });
      await logActivity({
        actor: admin.username,
        actorRole: 'admin',
        action: 'LOGS_PRUNED',
        category: 'security',
        summary: `Admin "${admin.username}" pruned ${deleted.count} logs older than 30 days`,
        request,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing audit logs:', error);
    return NextResponse.json({ error: 'Failed to clear logs' }, { status: 500 });
  }
}
