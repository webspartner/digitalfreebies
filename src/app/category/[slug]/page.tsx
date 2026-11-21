import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header/Header';
import WeeklyFreebies from '@/components/WeeklyFreebies/WeeklyFreebies';
import OfferGrid from '@/components/OfferGrid/OfferGrid';
import Footer from '@/components/Footer/Footer';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const getCategoryBySlug = cache(async (slug: string) => {
  return prisma.category.findUnique({ where: { slug } });
});

const SPECIAL_CATEGORY_MAP: Record<string, string> = {
  'general-freebies': 'General Freebies',
  'student-freebies': 'Student Freebies',
  'purchase-freebies': 'Purchase Freebies',
  'signups-freebies': 'Signups Freebies',
  'trials-freebies': 'Trials Freebies',
  'referrals-freebies': 'Referrals Freebies',
};

const STANDARD_CATEGORY_MAP: Record<string, string> = {
  streaming: 'Streaming',
  subscription: 'Subscription',
  vpns: 'VPNs',
  gaming: 'Gaming',
  education: 'Education',
  software: 'Software',
  hardware: 'Hardware',
  events: 'Events',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const dbCat = await getCategoryBySlug(slug);

  if (dbCat) {
    const title = dbCat.metaTitle || `${dbCat.name} Offers & Deals — DigitalFreebies.io`;
    const description = dbCat.metaDescription || `Discover the best ${dbCat.name.toLowerCase()} offers, trials, and promotions. All verified and updated daily.`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
      },
    };
  }

  const name = SPECIAL_CATEGORY_MAP[slug] || STANDARD_CATEGORY_MAP[slug] || slug;
  return {
    title: `${name} Offers & Deals — DigitalFreebies.io`,
    description: `Discover the best ${name.toLowerCase()} offers, trials, and promotions. All verified and updated daily.`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const dbCat = await getCategoryBySlug(slug);

  const categoryName = dbCat?.name || SPECIAL_CATEGORY_MAP[slug] || STANDARD_CATEGORY_MAP[slug];
  const isSpecial = dbCat ? dbCat.type === 'special' : Boolean(SPECIAL_CATEGORY_MAP[slug]);

  if (!categoryName) notFound();

  const offers = await prisma.offer.findMany({
    where: isSpecial
      ? { specialCategory: categoryName, isActive: true }
      : { category: slug, isActive: true },
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
      { createdAt: 'desc' }
    ],
  });

  const isStudentFreebies =
    slug === 'student-freebies' || categoryName === 'Student Freebies';

  return (
    <>
      <Header />
      {isStudentFreebies && offers.length > 0 && (
        <WeeklyFreebies offers={offers} />
      )}
      <OfferGrid
        offers={offers}
        title={`${categoryName} Offers`}
        initialCount={12}
      />
      <Footer />
    </>
  );
}
