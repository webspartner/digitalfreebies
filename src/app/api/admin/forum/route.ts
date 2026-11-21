import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET /api/admin/forum - List all community submissions with counts
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const [posts, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { comments: true },
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              isBanned: true,
              banReason: true,
              lastIp: true,
            },
          },
        },
      }),
      prisma.forumPost.count({ where }),
      prisma.forumPost.count({ where: { status: 'pending' } }),
      prisma.forumPost.count({ where: { status: 'approved' } }),
      prisma.forumPost.count({ where: { status: 'rejected' } }),
    ]);

    return NextResponse.json({
      posts,
      total,
      pendingCount,
      approvedCount,
      rejectedCount,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching admin forum posts:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
