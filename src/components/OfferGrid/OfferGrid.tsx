'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import OfferCard from '../OfferCard/OfferCard';
import { useRegion } from '@/context/RegionContext';
import { offerMatchesRegion, REGION_LABELS } from '@/lib/regions';
import styles from './OfferGrid.module.css';

interface Offer {
  id: number;
  title: string;
  slug: string;
  brand: string;
  shortDescription: string;
  imageUrl: string | null;
  logoUrl: string | null;
  label: string | null;
  category: string;
  specialCategory?: string | null;
  regions?: string | null;
}

interface OfferGridProps {
  offers: Offer[];
  title?: string;
  subtitle?: string;
  initialCount?: number;
  variant?: 'default' | 'compact';
}

const BRAND_COLORS: Record<string, string> = {
  'YouTube': 'linear-gradient(135deg, #FF0000 0%, #cc0000 100%)',
  'NordVPN': 'linear-gradient(135deg, #4687FF 0%, #305cc5 100%)',
  'Spotify': 'linear-gradient(135deg, #1DB954 0%, #158f3f 100%)',
  'Coursera': 'linear-gradient(135deg, #0056D2 0%, #003d94 100%)',
  'Epic Games': 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
  'Xbox': 'linear-gradient(135deg, #107C10 0%, #0b5e0b 100%)',
  'Canva': 'linear-gradient(135deg, #00C4CC 0%, #7B2FF7 100%)',
  'Amazon': 'linear-gradient(135deg, #FF9900 0%, #cc7a00 100%)',
  'Duolingo': 'linear-gradient(135deg, #58CC02 0%, #46a302 100%)',
  'Disney+': 'linear-gradient(135deg, #113CCF 0%, #0c2b94 100%)',
  'GitHub': 'linear-gradient(135deg, #24292e 0%, #1a1e22 100%)',
  'Adobe': 'linear-gradient(135deg, #FF0000 0%, #cc0000 100%)',
  'Notion': 'linear-gradient(135deg, #191919 0%, #2d2d2d 100%)',
  'Google': 'linear-gradient(135deg, #4285F4 0%, #34a853 50%, #fbbc05 75%, #ea4335 100%)',
  'CuriosityStream': 'linear-gradient(135deg, #1a3a5c 0%, #0e2236 100%)',
  'Twitch': 'linear-gradient(135deg, #9146FF 0%, #6441a5 100%)',
  'Apple TV+': 'linear-gradient(135deg, #1d1d1f 0%, #000000 100%)',
  'Audible': 'linear-gradient(135deg, #F8991D 0%, #d47a00 100%)',
  'ExpressVPN': 'linear-gradient(135deg, #DA3940 0%, #a81c22 100%)',
  'Grammarly': 'linear-gradient(135deg, #15C39A 0%, #0d9676 100%)',
  'Skillshare': 'linear-gradient(135deg, #002333 0%, #00FF84 100%)',
  'Paramount+': 'linear-gradient(135deg, #0064FF 0%, #003799 100%)',
  'LinkedIn Learning': 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',
  'Surfshark': 'linear-gradient(135deg, #178BF1 0%, #0b5fb0 100%)',
  'Dropbox': 'linear-gradient(135deg, #0061FF 0%, #0043b8 100%)',
  'Figma': 'linear-gradient(135deg, #F24E1E 0%, #A259FF 50%, #1ABCFE 100%)',
};

export default function OfferGrid({
  offers: rawOffers,
  title = 'Latest Freebies',
  subtitle,
  initialCount,
  variant = 'default',
}: OfferGridProps) {
  const { selectedRegion, setSelectedRegion } = useRegion();
  const regionLabel = REGION_LABELS[selectedRegion] || selectedRegion;
  const isRegional = selectedRegion && selectedRegion !== 'Global';

  const offers = useMemo(
    () =>
      rawOffers.filter((offer) =>
        offerMatchesRegion(offer.regions, selectedRegion)
      ),
    [rawOffers, selectedRegion]
  );

  const defaultCount = initialCount ?? (variant === 'compact' ? 12 : 12);
  const [visibleCount, setVisibleCount] = useState(defaultCount);

  useEffect(() => {
    setVisibleCount(defaultCount);
  }, [selectedRegion, defaultCount]);

  const visibleOffers = offers.slice(0, visibleCount);
  const hasMore = visibleCount < offers.length;

  const loadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 8, offers.length));
  };

  if (!offers.length) {
    return (
      <section className={styles.gridSection}>
        <div className="container">
          <div className={styles.emptyCard}>
            <h2 className={styles.emptyTitle}>
              {title && title !== 'Latest Freebies'
                ? `No Active Freebies in ${title.replace(/\s+(Offers|Freebies)$/i, '')}${
                    isRegional ? ` (${regionLabel})` : ''
                  }`
                : isRegional
                ? `No Freebies Found in ${regionLabel}`
                : 'No Freebies Found'}
            </h2>
            <p className={styles.emptyDesc}>
              {isRegional
                ? `There are currently no active freebies available in ${regionLabel} for this section. Switch to Global to view all available freebies.`
                : 'There are currently no active freebies in this section. Check back soon or browse all available freebies.'}
            </p>
            <div className={styles.emptyActions} style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {isRegional && (
                <button
                  type="button"
                  onClick={() => setSelectedRegion('Global')}
                  className={styles.primaryActionBtn}
                  style={{ cursor: 'pointer', border: 'none' }}
                >
                  Show Global Freebies
                </button>
              )}
              <Link href="/freebies" className={styles.primaryActionBtn}>
                Browse All Freebies <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'compact') {
    return (
      <section className={styles.gridSection} id="latest-freebies">
        <div className="container">
          <div className={styles.gridHeader}>
            <h2 className={styles.gridTitle}>{title}</h2>
            <p className={styles.gridSubtext}>
              {subtitle ||
                (isRegional
                  ? `Newly added freebies available in ${regionLabel}, updated daily.`
                  : 'Newly added freebies, updated daily.')}
            </p>
          </div>

          <div className={styles.horizontalGrid}>
            {visibleOffers.map((offer) => {
              const bgGradient =
                BRAND_COLORS[offer.brand] || 'linear-gradient(135deg, #667eea, #764ba2)';

              return (
                <Link
                  key={offer.id}
                  href={`/${offer.slug}`}
                  prefetch={false}
                  className={styles.horizontalCard}
                >
                  {/* Image area with uploaded image or brand gradient + logo circle (Featured desktop style) */}
                  <div className={styles.horizontalImageWrapper}>
                    <div
                      className={styles.horizontalImageBg}
                      style={{ background: bgGradient }}
                    >
                      {offer.imageUrl && (
                        <img
                          src={offer.imageUrl}
                          alt={offer.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      )}
                    </div>
                    {(offer.logoUrl || !offer.imageUrl) && (
                      <div className={styles.horizontalLogoCircle}>
                        {offer.logoUrl ? (
                          <img
                            src={offer.logoUrl}
                            alt={offer.brand}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                          />
                        ) : (
                          <span className={styles.horizontalLogoLetter}>
                            {offer.brand.charAt(0)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content area matching Featured desktop style */}
                  <div className={styles.horizontalContent}>
                    <span className={styles.horizontalBrand}>
                      {offer.specialCategory || 'General Freebies'}
                    </span>
                    <h3 className={styles.horizontalTitle}>{offer.title}</h3>
                    <p className={styles.horizontalDescription}>
                      {offer.shortDescription}
                    </p>
                    <span className={styles.horizontalButton} aria-hidden="true">&nbsp;</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {hasMore && (
            <div className={styles.discoverMore}>
              <button
                className={styles.discoverBtn}
                onClick={loadMore}
                id="discover-more-btn"
              >
                Discover More <span className={styles.discoverArrow}>→</span>
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.gridSection}>
      <div className="container">
        <div className={styles.gridHeader}>
          <h2 className={styles.gridTitle}>{title}</h2>
          {subtitle && <p className={styles.gridSubtitle}>{subtitle}</p>}
        </div>

        <div className={styles.grid}>
          {visibleOffers.map((offer) => (
            <OfferCard key={offer.id} {...offer} />
          ))}
        </div>

        {hasMore && (
          <div className={styles.discoverMore}>
            <button
              className={styles.discoverBtn}
              onClick={loadMore}
              id="discover-more-btn"
            >
              Discover More <span className={styles.discoverArrow}>→</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
