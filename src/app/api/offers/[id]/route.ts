import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { logActivity } from '@/lib/audit';
import { normalizeRegionsForSave } from '@/lib/regions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/offers/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const offer = await prisma.offer.findUnique({
      where: { id: parseInt(id) },
    });

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Error fetching offer:', error);
    return NextResponse.json({ error: 'Failed to fetch offer' }, { status: 500 });
  }
}

// PUT /api/offers/[id]
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

    const offer = await prisma.offer.update({
      where: { id: parseInt(id) },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.brand !== undefined && { brand: body.brand }),
        ...(body.shortDescription !== undefined && { shortDescription: body.shortDescription }),
        ...(body.fullDescription !== undefined && { fullDescription: body.fullDescription }),
        ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle || null }),
        ...(body.metaDescription !== undefined && { metaDescription: body.metaDescription || null }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.offerUrl !== undefined && { offerUrl: body.offerUrl }),
        ...(body.termsUrl !== undefined && { termsUrl: body.termsUrl ? body.termsUrl.trim() : null }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.specialCategory !== undefined && { specialCategory: body.specialCategory }),
        ...(body.regions !== undefined && { regions: JSON.stringify(normalizeRegionsForSave(body.regions)) }),
        ...(body.label !== undefined && { label: body.label || null }),
        ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
        ...(body.isTrending !== undefined && { isTrending: Boolean(body.isTrending) }),
        ...(body.trendingOrder !== undefined && {
          trendingOrder: Math.max(1, Number(body.trendingOrder) || 1),
        }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.isOnHomepage !== undefined && { isOnHomepage: body.isOnHomepage }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }),
      },
    });

    const isToggleOnly = Object.keys(body).length === 1 && body.isActive !== undefined;
    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: isToggleOnly
        ? offer.isActive
          ? 'OFFER_ACTIVATED'
          : 'OFFER_DEACTIVATED'
        : 'OFFER_UPDATED',
      category: 'offers',
      summary: isToggleOnly
        ? `Admin "${admin.username}" ${offer.isActive ? 'activated' : 'deactivated'} offer "${offer.title}"`
        : `Admin "${admin.username}" edited offer "${offer.title}"`,
      request,
    });

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Error updating offer:', error);
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 });
  }
}

// DELETE /api/offers/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const offerId = parseInt(id);
    const existing = await prisma.offer.findUnique({ where: { id: offerId } });

    await prisma.offer.delete({
      where: { id: offerId },
    });

    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'OFFER_DELETED',
      category: 'offers',
      summary: `Admin "${admin.username}" deleted offer "${existing?.title || `#${offerId}`}"`,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting offer:', error);
    return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 });
  }
}
