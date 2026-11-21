import Header from '@/components/Header/Header';
import OfferGrid from '@/components/OfferGrid/OfferGrid';
import Footer from '@/components/Footer/Footer';
import prisma from '@/lib/prisma';
import { REGION_LABELS } from '@/lib/regions';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ q?: string; region?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: "${q}" — DigitalFreebies.io` : 'Search — DigitalFreebies.io',
    description: `Search results for free digital offers${q ? ` matching "${q}"` : ''}.`,
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q, region } = await searchParams;
  const query = q?.trim() || '';

  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      ...(query && {
        OR: [
          { title: { contains: query } },
          { brand: { contains: query } },
          { shortDescription: { contains: query } },
          { category: { contains: query } },
        ],
      }),
    },
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'desc' }
    ],
  });

  // Remove tags (Hot, New, Popular) from search results while keeping regions for client/context filtering
  const offersWithoutTags = offers.map((offer) => ({
    ...offer,
    label: null,
  }));

  return (
    <>
      <Header />
      <OfferGrid
        offers={offersWithoutTags}
        title={query ? `Results for "${query}"` : 'All Freebies'}
        subtitle={
          region && region !== 'Global'
            ? `Showing freebies available in ${REGION_LABELS[region] || region}`
            : undefined
        }
        initialCount={12}
      />
      <Footer />
    </>
  );
}
