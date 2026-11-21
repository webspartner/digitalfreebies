import Header from '@/components/Header/Header';
import FeaturedFreebies from '@/components/FeaturedFreebies/FeaturedFreebies';
import WeeklyFreebies from '@/components/WeeklyFreebies/WeeklyFreebies';
import Newsletter from '@/components/Newsletter/Newsletter';
import TrendingOffers from '@/components/TrendingOffers/TrendingOffers';
import OfferGrid from '@/components/OfferGrid/OfferGrid';
import PopularBrands from '@/components/PopularBrands/PopularBrands';
import FAQ from '@/components/FAQ/FAQ';
import ForumCTA from '@/components/ForumCTA/ForumCTA';
import Footer from '@/components/Footer/Footer';
import prisma from '@/lib/prisma';
import { getPopularBrands } from '@/lib/brands';

export const dynamic = 'force-dynamic';

const CARD_OFFER_SELECT = {
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
  trendingOrder: true,
  regions: true,
} as const;

export default async function HomePage() {
  const [featuredOffers, trendingOffers, allOffers, faqItems, popularBrands] = await Promise.all([
    // Fetch featured offers for the slider
    prisma.offer.findMany({
      where: { isActive: true, isFeatured: true },
      select: CARD_OFFER_SELECT,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    }),
    // Fetch trending offers (ordered by trendingOrder 1..12)
    prisma.offer.findMany({
      where: { isActive: true, isTrending: true },
      select: CARD_OFFER_SELECT,
      orderBy: [
        { trendingOrder: 'asc' },
        { updatedAt: 'desc' },
      ],
    }),
    // Fetch all active offers for the grid
    prisma.offer.findMany({
      where: { isActive: true, isOnHomepage: true },
      select: CARD_OFFER_SELECT,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    }),
    // Fetch FAQ items
    prisma.faqItem.findMany({
      orderBy: { sortOrder: 'asc' },
    }),
    // Fetch top 30 brands ordered by most active offers first
    getPopularBrands(30),
  ]);

  const weeklyOffers = [...trendingOffers, ...featuredOffers, ...allOffers].filter(
    (offer, idx, arr) => arr.findIndex((o) => o.id === offer.id) === idx
  );

  return (
    <>
      <Header />

      {/* Ad slot: below header */}
      <div className="ad-slot ad-slot--leaderboard" id="ad-below-header" />

      {/* Featured Freebies Slider */}
      {featuredOffers.length > 0 && (
        <FeaturedFreebies offers={featuredOffers} />
      )}

      {/* 3 Best Weekly Freebies (below Featured) */}
      {weeklyOffers.length > 0 && (
        <WeeklyFreebies offers={weeklyOffers} />
      )}

      {/* Trending Offers Section */}
      {trendingOffers.length > 0 && (
        <TrendingOffers offers={trendingOffers} />
      )}

      {/* Community Forum Callout (above Newsletter) */}
      <ForumCTA />

      {/* Newsletter signup container */}
      <Newsletter />

      {/* Main offer grid (Latest Free Offers) */}
      <OfferGrid offers={allOffers} variant="compact" />

      {/* Ad slot: before FAQ */}
      <div className="ad-slot ad-slot--leaderboard" id="ad-before-faq" />

      {/* Popular Brands Tag Cloud (Top 30 by post count, above FAQ) */}
      <PopularBrands brands={popularBrands} />

      {/* FAQ Section */}
      <FAQ items={faqItems} />

      {/* Footer */}
      <Footer hideNewsletter />
    </>
  );
}
