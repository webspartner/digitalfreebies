import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSlug } from '@/lib/utils';
import { getUserFromRequest } from '@/lib/auth';
import { checkForumBan } from '@/lib/forumBan';

// GET /api/forum - List approved forum posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const where: Record<string, unknown> = {
      status: 'approved',
    };

    if (category && category !== 'All') {
      where.category = { equals: category };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { brand: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const orderBy = sort === 'top'
      ? [{ upvotes: 'desc' as const }, { createdAt: 'desc' as const }]
      : [{ createdAt: 'desc' as const }];

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { comments: true },
          },
        },
      }),
      prisma.forumPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    return NextResponse.json({ error: 'Failed to fetch forum posts' }, { status: 500 });
  }
}

// POST /api/forum - Submission of a community freebie (Requires registered user)
export async function POST(request: NextRequest) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'You must be registered and signed in to share a freebie. This helps keep our community free of spam.' },
        { status: 401 }
      );
    }

    // Check if user account or client IP is banned from the forum
    const banStatus = await checkForumBan(request, authUser.id);
    if (banStatus.banned) {
      return NextResponse.json(
        {
          error:
            banStatus.reason ||
            'Your account or IP address has been banned from posting in the community forum.',
        },
        { status: 403 }
      );
    }

    // Rate-limiting check: Prevent rapid submissions within 30 seconds
    const recentPost = await prisma.forumPost.findFirst({
      where: {
        userId: authUser.id,
        createdAt: {
          gte: new Date(Date.now() - 30 * 1000),
        },
      },
    });

    if (recentPost) {
      return NextResponse.json(
        { error: 'You are submitting deals too quickly. Please wait 30 seconds before submitting another freebie.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { title, dealUrl, brand, category, description } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!dealUrl || !dealUrl.trim()) {
      return NextResponse.json({ error: 'Deal URL is required' }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    // Generate unique slug
    const baseSlug = createSlug(title.trim());
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    const newPost = await prisma.forumPost.create({
      data: {
        title: title.trim(),
        slug,
        dealUrl: dealUrl.trim(),
        brand: brand?.trim() || null,
        category: category?.trim() || 'General',
        description: description.trim(),
        authorName: authUser.username,
        authorEmail: authUser.email || null,
        userId: authUser.id,
        ipAddress: banStatus.ip,
        status: 'pending', // Pending admin approval to maintain quality
      },
    });

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: authUser.username,
      actorRole: 'user',
      action: 'FORUM_POST_CREATED',
      category: 'forum',
      summary: `User "${authUser.username}" added forum post "${newPost.title}"`,
      request,
    });

    return NextResponse.json(
      {
        message: 'Thank you! Your freebie has been submitted and will appear on the forum once approved by an admin.',
        post: newPost,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting forum post:', error);
    return NextResponse.json({ error: 'Failed to submit freebie' }, { status: 500 });
  }
}
