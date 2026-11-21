import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { logActivity } from '@/lib/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/forum/[id] - Update status (approve, reject) or edit submission
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id);
    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status, title, dealUrl, brand, category, description } = body;

    const dataToUpdate: Record<string, unknown> = {};
    if (status) dataToUpdate.status = status;
    if (title) dataToUpdate.title = title.trim();
    if (dealUrl) dataToUpdate.dealUrl = dealUrl.trim();
    if (brand !== undefined) dataToUpdate.brand = brand ? brand.trim() : null;
    if (category) dataToUpdate.category = category.trim();
    if (description) dataToUpdate.description = description.trim();

    const updated = await prisma.forumPost.update({
      where: { id: postId },
      data: dataToUpdate,
    });

    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: status ? `FORUM_POST_${String(status).toUpperCase()}` : 'FORUM_POST_EDITED',
      category: 'forum',
      summary: status
        ? `Admin "${admin.username}" marked forum post "${updated.title}" as ${status}`
        : `Admin "${admin.username}" edited forum post "${updated.title}"`,
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating forum post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE /api/admin/forum/[id] - Permanently delete forum post
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id);
    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const existing = await prisma.forumPost.findUnique({ where: { id: postId } });

    await prisma.forumPost.delete({
      where: { id: postId },
    });

    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'FORUM_POST_DELETED',
      category: 'forum',
      summary: `Admin "${admin.username}" deleted forum post "${existing?.title || `#${postId}`}"`,
      request,
    });

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting forum post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
