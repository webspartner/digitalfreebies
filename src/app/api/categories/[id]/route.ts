import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { createSlug } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/categories/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

// PUT /api/categories/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const categoryId = parseInt(id);

    const existing = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    let slug = body.slug;
    if (slug) {
      slug = slug.toLowerCase().trim();
      const clash = await prisma.category.findFirst({
        where: { slug, NOT: { id: categoryId } },
      });
      if (clash) {
        return NextResponse.json({ error: 'Slug already taken by another category' }, { status: 409 });
      }
    } else if (body.name && !body.slug) {
      slug = createSlug(body.name);
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(slug !== undefined && { slug }),
        ...(body.icon !== undefined && { icon: body.icon || '📦' }),
        ...(body.type !== undefined && { type: body.type === 'special' ? 'special' : 'standard' }),
        ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle?.trim() || null }),
        ...(body.metaDescription !== undefined && { metaDescription: body.metaDescription?.trim() || null }),
        ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) || 0 }),
      },
    });

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'CATEGORY_UPDATED',
      category: 'categories',
      summary: `Admin "${admin.username}" edited category "${updated.name}"`,
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE /api/categories/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const categoryId = parseInt(id);
    const existing = await prisma.category.findUnique({ where: { id: categoryId } });

    await prisma.category.delete({
      where: { id: categoryId },
    });

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'CATEGORY_DELETED',
      category: 'categories',
      summary: `Admin "${admin.username}" deleted category "${existing?.name || `#${categoryId}`}"`,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
