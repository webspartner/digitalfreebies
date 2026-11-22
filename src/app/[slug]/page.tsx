import { cache } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import prisma from '@/lib/prisma';
import { slugifyBrand } from '@/lib/brands';
import styles from './offerDetail.module.css';
import ShareButton from './ShareButton';
import ReportOfferButton from './ReportOfferButton';
import { OfferDetailSidebar } from './OfferRegionInfo';

export const dynamic = 'force-dynamic';

const getOfferBySlug = cache(async (slug: string) => {
  return prisma.offer.findUnique({ where: { slug } });
});

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const offer = await getOfferBySlug(slug);
  if (!offer) return { title: 'Offer Not Found' };

  const metaTitle = offer.metaTitle || `${offer.title} — DigitalFreebies.io`;
  const metaDescription = offer.metaDescription || offer.shortDescription;

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: offer.metaTitle || offer.title,
      description: metaDescription,
      type: 'article',
    },
  };
}

export default async function OfferDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const offer = await getOfferBySlug(slug);

  if (!offer) notFound();

  const [trendingOffers, latestOffers] = await Promise.all([
    // Get trending freebies (excluding current offer)
    prisma.offer.findMany({
      where: {
        slug: { not: offer.slug },
        isActive: true,
        isTrending: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        brand: true,
        logoUrl: true,
        regions: true,
      },
      take: 25,
      orderBy: [
        { trendingOrder: 'asc' },
        { updatedAt: 'desc' },
      ],
    }),
    // Get latest freebies (excluding current offer)
    prisma.offer.findMany({
      where: {
        slug: { not: offer.slug },
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        brand: true,
        logoUrl: true,
        regions: true,
      },
      take: 25,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
    }),
  ]);

  return (
    <>
      <Header />

      <main className={styles.detailPage}>
        <div className={styles.container}>
          {/* Left content column */}
          <article className={styles.mainContent}>
            {/* Offer Hero Image */}
            {offer.imageUrl && (
              <div className={styles.heroImageWrapper}>
                <Image
                  src={offer.imageUrl}
                  alt={offer.title}
                  fill
                  className={styles.heroImage}
                  sizes="(max-width: 768px) 100vw, 800px"
                  priority
                  unoptimized
                />
              </div>
            )}

            {/* Breadcrumb / category & brand */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              {offer.specialCategory && (
                <Link
                  href={`/category/${offer.specialCategory.toLowerCase().replace(/\s+/g, '-')}`}
                  className={styles.categoryBadge}
                >
                  {offer.specialCategory}
                </Link>
              )}
              <Link href={`/category/${offer.category}`} className={styles.categoryBadge} style={{ opacity: 0.85 }}>
                {offer.category.charAt(0).toUpperCase() + offer.category.slice(1)}
              </Link>
              {offer.brand && (
                <Link
                  href={`/brand/${slugifyBrand(offer.brand)}`}
                  className={styles.categoryBadge}
                  style={{ opacity: 0.75 }}
                >
                  {offer.brand}
                </Link>
              )}
            </div>

            {/* Title */}
            <h1 className={styles.title}>{offer.title}</h1>

            {/* Meta info */}
            {offer.expiresAt && (
              <div className={styles.metaRow}>
                <span className={styles.expiry}>
                  ⏰ Expires: {new Date(offer.expiresAt).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Description */}
            <div className={styles.descriptionSection}>
              <p className={styles.shortDesc}>{offer.shortDescription}</p>

              {offer.fullDescription && (
                <div className={styles.fullDesc}>
                  {offer.fullDescription.split('\n').map((paragraph, i) => {
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      return <h3 key={i} className={styles.descHeading}>{paragraph.replace(/\*\*/g, '')}</h3>;
                    }
                    if (paragraph.startsWith('- ')) {
                      return <li key={i} className={styles.descListItem}>{paragraph.slice(2)}</li>;
                    }
                    if (paragraph.trim() === '') return <br key={i} />;
                    return <p key={i}>{paragraph}</p>;
                  })}
                </div>
              )}

              {offer.termsUrl && offer.termsUrl.trim() && (
                <div className={styles.termsWrapper}>
                  <a
                    href={offer.termsUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.termsLink}
                  >
                    Terms for using with Freebie
                  </a>
                </div>
              )}
            </div>

            {/* CTA buttons */}
            <div className={styles.ctaSection}>
              <a
                href={offer.offerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaButton}
                id="go-to-offer-btn"
              >
                Go to Freebie →
              </a>
              <ShareButton slug={offer.slug} />
            </div>

            {/* Not working link */}
            <div className={styles.feedbackRow}>
              <ReportOfferButton offerId={offer.id} />
            </div>
          </article>

          {/* Right sidebar */}
          <OfferDetailSidebar
            trendingOffers={trendingOffers}
            latestOffers={latestOffers}
          />
        </div>
      </main>

      <Footer />
    </>
  );
}
