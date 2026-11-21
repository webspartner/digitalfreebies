import type { Metadata } from 'next';
import Header from '@/components/Header/Header';
import OfferGrid from '@/components/OfferGrid/OfferGrid';
import Footer from '@/components/Footer/Footer';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'All Freebies, Free Trials & Digital Offers — DigitalFreebies.io',
  description:
    'Browse all verified free digital offers, trials, student deals, and promotions across streaming, VPNs, software, gaming, and education.',
  openGraph: {
    title: 'All Freebies, Free Trials & Digital Offers — DigitalFreebies.io',
    description:
      'Browse all verified free digital offers, trials, student deals, and promotions across streaming, VPNs, software, gaming, and education.',
  },
};

export default async function AllFreebiesPage() {
  const offers = await prisma.offer.findMany({
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
    },
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return (
    <>
      <Header />
      <OfferGrid
        offers={offers}
        title="All Freebies"
        subtitle="Browse all our verified digital freebies, trials, and promotions."
        initialCount={16}
      />
      <Footer />
    </>
  );
}
