import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { offerMatchesRegion } from '@/lib/regions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const region = searchParams.get('region') || 'Global';

    if (!query) {
      return NextResponse.json({ offers: [] });
    }

    // Fetch matching active offers
    const offers = await prisma.offer.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: query } },
          { brand: { contains: query } },
          { shortDescription: { contains: query } },
          { category: { contains: query } },
        ],
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        slug: true,
        brand: true,
        category: true,
        regions: true,
        imageUrl: true,
        logoUrl: true,
      },
    });

    // Filter by region if specified
    const filteredOffers = offers.filter((offer) =>
      offerMatchesRegion(offer.regions, region)
    );

    // Limit to top 6 offers after regional filtering
    const topOffers = filteredOffers.slice(0, 6).map((offer) => ({
      id: offer.id,
      title: offer.title,
      slug: offer.slug,
      brand: offer.brand,
      category: offer.category,
      imageUrl: offer.imageUrl,
      logoUrl: offer.logoUrl,
    }));

    return NextResponse.json({
      offers: topOffers,
    });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return NextResponse.json({ offers: [] }, { status: 500 });
  }
}
