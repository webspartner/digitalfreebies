import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

// POST /api/forum/[slug]/upvote - Increment upvote counter
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const post = await prisma.forumPost.findUnique({
      where: { slug },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const updated = await prisma.forumPost.update({
      where: { slug },
      data: {
        upvotes: { increment: 1 },
      },
      select: {
        id: true,
        upvotes: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error upvoting forum post:', error);
    return NextResponse.json({ error: 'Failed to upvote' }, { status: 500 });
  }
}
