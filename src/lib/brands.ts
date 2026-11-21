import prisma from '@/lib/prisma';

export interface BrandTag {
  name: string;
  slug: string;
  count: number;
}

/**
 * Converts a brand name into a URL-friendly slug.
 * e.g. "Adobe" -> "adobe", "Disney+" -> "disney-plus", "Booking.com" -> "booking-com"
 */
export function slugifyBrand(brand: string): string {
  return brand
    .trim()
    .toLowerCase()
    .replace(/\+/g, '-plus-')
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Aggregates active offers by brand, sorted by highest post count first (then alphabetically),
 * limited to `limit` brands (default 30).
 */
export async function getPopularBrands(limit = 30): Promise<BrandTag[]> {
  const offers = await prisma.offer.findMany({
    where: { isActive: true },
    select: { brand: true },
  });

  const brandMap = new Map<string, { name: string; slug: string; count: number }>();

  for (const offer of offers) {
    const rawName = offer.brand?.trim();
    if (!rawName) continue;
    const slug = slugifyBrand(rawName);
    if (!slug) continue;

    const existing = brandMap.get(slug);
    if (existing) {
      existing.count += 1;
    } else {
      brandMap.set(slug, {
        name: rawName,
        slug,
        count: 1,
      });
    }
  }

  return Array.from(brandMap.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
