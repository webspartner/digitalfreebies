import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { checkForumBan } from '@/lib/forumBan';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

// GET /api/forum/[slug] - Get post details and comments
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const post = await prisma.forumPost.findUnique({
      where: { slug },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching forum post details:', error);
    return NextResponse.json({ error: 'Failed to fetch forum post' }, { status: 500 });
  }
}

// POST /api/forum/[slug] - Add a comment to the post (Requires registered user)
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'You must be registered and signed in to post a comment. This keeps our community discussions clean and spam-free.' },
        { status: 401 }
      );
    }

    // Check if user account or client IP is banned from commenting
    const banStatus = await checkForumBan(request, authUser.id);
    if (banStatus.banned) {
      return NextResponse.json(
        {
          error:
            banStatus.reason ||
            'Your account or IP address has been banned from commenting in the community forum.',
        },
        { status: 403 }
      );
    }

    const { slug } = await params;
    const post = await prisma.forumPost.findUnique({
      where: { slug },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    const cleanContent = content.trim();
    if (cleanContent.length > 2000) {
      return NextResponse.json({ error: 'Comment cannot exceed 2000 characters' }, { status: 400 });
    }

    // Anti-spam check: prevent rapid duplicate comments
    const recentComment = await prisma.forumComment.findFirst({
      where: {
        postId: post.id,
        userId: authUser.id,
        content: cleanContent,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // Within last 1 minute
        },
      },
    });

    if (recentComment) {
      return NextResponse.json(
        { error: 'Duplicate comment detected. Please avoid submitting the same comment repeatedly.' },
        { status: 429 }
      );
    }

    const newComment = await prisma.forumComment.create({
      data: {
        postId: post.id,
        authorName: authUser.username,
        userId: authUser.id,
        ipAddress: banStatus.ip,
        content: cleanContent,
      },
    });

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: authUser.username,
      actorRole: 'user',
      action: 'FORUM_COMMENT_CREATED',
      category: 'forum',
      summary: `User "${authUser.username}" commented on forum post "${post.title}"`,
      request,
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error('Error posting comment:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}

// PUT /api/forum/[slug] - Allow the post author to edit their own forum post
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'You must be signed in to edit your post.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const banStatus = await checkForumBan(request, authUser.id);
    if (banStatus.banned) {
      return NextResponse.json(
        {
          error:
            banStatus.reason ||
            'Your account or IP address has been banned from the community forum.',
        },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { slug } = await params;
    const post = await prisma.forumPost.findUnique({
      where: { slug },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Strict ownership verification (prevents horizontal privilege escalation / IDOR)
    if (!post.userId || post.userId !== authUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit posts that you created.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = await request.json();
    const { title, dealUrl, brand, category, description } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!dealUrl || typeof dealUrl !== 'string' || !dealUrl.trim()) {
      return NextResponse.json({ error: 'Deal URL is required' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    // Validate URL protocol to prevent javascript: or data: URI injection
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(dealUrl.trim());
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json(
          { error: 'Deal URL must start with http:// or https://' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Please enter a valid Deal URL (including https://)' },
        { status: 400 }
      );
    }

    const updatedPost = await prisma.forumPost.update({
      where: { id: post.id },
      data: {
        title: title.trim().slice(0, 160),
        dealUrl: parsedUrl.toString(),
        brand: typeof brand === 'string' && brand.trim() ? brand.trim().slice(0, 80) : null,
        category: typeof category === 'string' && category.trim() ? category.trim().slice(0, 40) : post.category,
        description: description.trim().slice(0, 5000),
      },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: authUser.username,
      actorRole: 'user',
      action: 'FORUM_POST_UPDATED',
      category: 'forum',
      summary: `User "${authUser.username}" edited their forum post "${updatedPost.title}"`,
      request,
    });

    return NextResponse.json(updatedPost, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error updating forum post:', error);
    return NextResponse.json({ error: 'Failed to update forum post' }, { status: 500 });
  }
}

// DELETE /api/forum/[slug] - Allow the post author to delete their own forum post
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { error: 'You must be signed in to delete your post.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { slug } = await params;
    const post = await prisma.forumPost.findUnique({
      where: { slug },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Strict ownership verification
    if (!post.userId || post.userId !== authUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete posts that you created.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    await prisma.forumPost.delete({
      where: { id: post.id },
    });

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: authUser.username,
      actorRole: 'user',
      action: 'FORUM_POST_DELETED',
      category: 'forum',
      summary: `User "${authUser.username}" deleted their forum post "${post.title}"`,
      request,
    });

    return NextResponse.json(
      { message: 'Your post has been deleted from the forum.' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error deleting forum post:', error);
    return NextResponse.json({ error: 'Failed to delete forum post' }, { status: 500 });
  }
}
