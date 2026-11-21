import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { createSlug } from '@/lib/utils';
import { normalizeRegionsForSave, offerMatchesRegion } from '@/lib/regions';

// GET /api/offers - List offers with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const specialCategory = searchParams.get('specialCategory');
    const region = searchParams.get('region');
    const search = searchParams.get('search');
    const label = searchParams.get('label');
    const featured = searchParams.get('featured');
    const includeAll = searchParams.get('all') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = includeAll ? {} : { isActive: true };

    if (category) where.category = category;
    if (specialCategory) where.specialCategory = specialCategory;
    if (label) where.label = label;
    if (featured === 'true') where.isFeatured = true;
    const trending = searchParams.get('trending');
    if (trending === 'true') where.isTrending = true;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { brand: { contains: search } },
        { shortDescription: { contains: search } },
      ];
    }

    const orderBy =
      trending === 'true'
        ? [{ trendingOrder: 'asc' as const }, { updatedAt: 'desc' as const }]
        : [{ sortOrder: 'asc' as const }, { createdAt: 'desc' as const }];

    if (region && region !== 'Global') {
      const allMatching = await prisma.offer.findMany({
        where,
        include: {
          _count: {
            select: { reports: true },
          },
        },
        orderBy,
      });

      const filtered = allMatching.filter((offer) =>
        offerMatchesRegion(offer.regions, region)
      );
      const total = filtered.length;
      const paginated = filtered.slice((page - 1) * limit, page * limit);

      return NextResponse.json({
        offers: paginated,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        include: {
          _count: {
            select: { reports: true },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.offer.count({ where }),
    ]);

    return NextResponse.json({
      offers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
  }
}

// POST /api/offers - Create new offer (admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const admin = token ? verifyToken(token) : null;
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      brand,
      shortDescription,
      fullDescription,
      metaTitle,
      metaDescription,
      imageUrl,
      logoUrl,
      offerUrl,
      termsUrl,
      category,
      specialCategory,
      regions,
      label,
      isFeatured,
      isTrending,
      trendingOrder,
      isActive,
      isOnHomepage,
      sortOrder,
      expiresAt,
    } = body;

    if (!title || !brand || !shortDescription || !offerUrl || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slug = createSlug(title);
    const parsedTrendingOrder =
      trendingOrder !== undefined && !isNaN(Number(trendingOrder))
        ? Math.max(1, Number(trendingOrder))
        : 1;

    const offer = await prisma.offer.create({
      data: {
        title,
        slug,
        brand,
        shortDescription,
        fullDescription: fullDescription || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        imageUrl: imageUrl || null,
        logoUrl: logoUrl || null,
        offerUrl,
        termsUrl: termsUrl ? termsUrl.trim() : null,
        category,
        specialCategory: specialCategory || 'General Freebies',
        regions: JSON.stringify(normalizeRegionsForSave(regions)),
        label: label || null,
        isFeatured: isFeatured || false,
        isTrending: Boolean(isTrending),
        trendingOrder: parsedTrendingOrder,
        isActive: isActive !== undefined ? isActive : true,
        isOnHomepage: isOnHomepage !== undefined ? isOnHomepage : true,
        sortOrder: sortOrder || 0,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    const { logActivity } = await import('@/lib/audit');
    await logActivity({
      actor: admin.username,
      actorRole: 'admin',
      action: 'OFFER_CREATED',
      category: 'offers',
      summary: `Admin "${admin.username}" added offer "${offer.title}" (${offer.brand})`,
      request,
    });

    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
  }
}
