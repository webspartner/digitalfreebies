import { cache } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import prisma from '@/lib/prisma';
import { slugifyBrand } from '@/lib/brands';
import { isOfferExpired, getNotExpiredWhere } from '@/lib/utils';
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

  const expired = isOfferExpired(offer.expiresAt);
  const notExpiredWhere = getNotExpiredWhere();

  const [trendingOffers, latestOffers] = await Promise.all([
    // Get trending freebies (excluding current offer and expired offers)
    prisma.offer.findMany({
      where: {
        slug: { not: offer.slug },
        isActive: true,
        isTrending: true,
        ...notExpiredWhere,
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
    // Get latest freebies (excluding current offer and expired offers)
    prisma.offer.findMany({
      where: {
        slug: { not: offer.slug },
        isActive: true,
        ...notExpiredWhere,
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
            {/* Offer Hero Image with overlapping bottom-left Brand Logo Circle */}
            {offer.imageUrl && (
              <div className={styles.heroBannerContainer}>
                <div
                  className={styles.heroImageWrapper}
                  style={expired ? { filter: 'grayscale(100%)', opacity: 0.78 } : undefined}
                >
                  <Image
                    src={offer.imageUrl}
                    alt={offer.title}
                    fill
                    className={styles.heroImage}
                    sizes="(max-width: 768px) 100vw, 800px"
                    priority
                    unoptimized
                  />
                  {expired && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '14px',
                        left: '14px',
                        zIndex: 4,
                        background: 'rgba(31, 41, 55, 0.9)',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        padding: '5px 12px',
                        borderRadius: '9999px',
                      }}
                    >
                      Expired
                    </span>
                  )}
                </div>

                <div className={styles.heroLogoCircle}>
                  {offer.logoUrl ? (
                    <img
                      src={offer.logoUrl}
                      alt={offer.brand}
                      className={styles.heroLogoImg}
                    />
                  ) : (
                    <span className={styles.heroLogoLetter}>{offer.brand.charAt(0)}</span>
                  )}
                </div>
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

            {/* Meta info / Expired notice */}
            {expired ? (
              <div
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  color: '#4b5563',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                This freebie expired on {new Date(offer.expiresAt!).toLocaleDateString()} — we hope it comes back again soon!
              </div>
            ) : offer.expiresAt ? (
              <div className={styles.metaRow}>
                <span className={styles.expiry}>
                  Expires: {new Date(offer.expiresAt).toLocaleDateString()}
                </span>
              </div>
            ) : null}

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
                style={
                  expired
                    ? {
                        color: '#6b7280',
                        borderColor: '#d1d5db',
                        background: '#f3f4f6',
                      }
                    : undefined
                }
              >
                {expired ? 'Offer Expired — Check Link →' : 'Go to Freebie →'}
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
