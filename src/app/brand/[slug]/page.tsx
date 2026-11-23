import { cache } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Header/Header';
import OfferGrid from '@/components/OfferGrid/OfferGrid';
import Footer from '@/components/Footer/Footer';
import prisma from '@/lib/prisma';
import { slugifyBrand } from '@/lib/brands';
import { sortExpiredLast } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function formatSlugToBrandName(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const getBrandOffers = cache(async (slug: string) => {
  const allActiveOffers = await prisma.offer.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      slug: true,
      brand: true,
      shortDescription: true,
      imageUrl: true,
      logoUrl: true,
      label: true,
      category: true,
      specialCategory: true,
      regions: true,
      expiresAt: true,
    },
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  const matchingOffers = sortExpiredLast(
    allActiveOffers.filter((offer) => slugifyBrand(offer.brand) === slug)
  );

  const brandName =
    matchingOffers[0]?.brand?.trim() || formatSlugToBrandName(slug);

  return { brandName, offers: matchingOffers };
});

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { brandName } = await getBrandOffers(slug);

  const title = `${brandName} Freebies, Trials & Deals — DigitalFreebies.io`;
  const description = `Discover all verified ${brandName} freebies, free trials, and digital promotions. Updated daily on DigitalFreebies.io.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { slug } = await params;
  const { brandName, offers } = await getBrandOffers(slug);

  return (
    <>
      <Header />
      <OfferGrid
        offers={offers}
        title={`${brandName} Freebies`}
        subtitle={`Browse all our verified ${brandName} freebies, trials, and promotions.`}
        initialCount={12}
      />
      <Footer />
    </>
  );
}
