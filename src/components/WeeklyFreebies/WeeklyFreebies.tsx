'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRegion } from '@/context/RegionContext';
import { offerMatchesRegion } from '@/lib/regions';
import styles from './WeeklyFreebies.module.css';

interface WeeklyOffer {
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

interface WeeklyFreebiesProps {
  offers: WeeklyOffer[];
}

const BRAND_TILE_STYLES: Record<string, { bg: string; color: string; border?: string }> = {
  'YouTube': { bg: '#ffffff', color: '#FF0000', border: '#e5e7eb' },
  'NordVPN': { bg: '#0f56b3', color: '#ffffff' },
  'Spotify': { bg: '#1DB954', color: '#ffffff' },
  'Coursera': { bg: '#0056D2', color: '#ffffff' },
  'Epic Games': { bg: '#1a1a1a', color: '#ffffff' },
  'Xbox': { bg: '#107C10', color: '#ffffff' },
  'Canva': { bg: 'linear-gradient(135deg, #00C4CC 0%, #7B2FF7 100%)', color: '#ffffff' },
  'Amazon': { bg: '#ffffff', color: '#111111', border: '#e5e7eb' },
  'Duolingo': { bg: '#58CC02', color: '#ffffff' },
  'Disney+': { bg: '#113CCF', color: '#ffffff' },
  'GitHub': { bg: '#24292e', color: '#ffffff' },
  'Adobe': { bg: '#FF0000', color: '#ffffff' },
  'Notion': { bg: '#ffffff', color: '#191919', border: '#e5e7eb' },
  'Google': { bg: '#ffffff', color: '#4285F4', border: '#e5e7eb' },
  'CuriosityStream': { bg: '#1a3a5c', color: '#ffffff' },
  'Twitch': { bg: '#9146FF', color: '#ffffff' },
};

export default function WeeklyFreebies({ offers }: WeeklyFreebiesProps) {
  const { selectedRegion } = useRegion();
  const topFour = useMemo(
    () =>
      offers
        .filter((offer) => offerMatchesRegion(offer.regions, selectedRegion))
        .slice(0, 4),
    [offers, selectedRegion]
  );
  if (!topFour.length) return null;

  return (
    <section className={styles.weeklySection} aria-labelledby="weekly-freebies-heading">
      <div className={styles.banner}>
        <div className={styles.inner}>
          {/* Header Row */}
          <div className={styles.headerRow}>
            <h2 id="weekly-freebies-heading" className={styles.sectionTitle}>
              4 Best Weekly Freebies
            </h2>
            <Link href="#latest-freebies" className={styles.seeAllLink}>
              <span className={styles.seeAllText}>See Latest</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>

          {/* 4 Cards 2x2 Grid */}
          <div className={styles.cardsContainer}>
            {topFour.map((offer) => {
              const tile = BRAND_TILE_STYLES[offer.brand] || {
                bg: '#ffffff',
                color: 'var(--color-primary)',
                border: '#e5e7eb',
              };

              return (
                <Link
                  key={offer.id}
                  href={`/${offer.slug}`}
                  prefetch={false}
                  className={styles.weeklyCard}
                >
                  {/* Square Brand Logo Box */}
                  <div
                    className={styles.brandSquare}
                    style={{
                      background: tile.bg,
                      color: tile.color,
                      borderColor: tile.border || 'transparent',
                      padding: offer.logoUrl || offer.imageUrl ? 0 : undefined,
                    }}
                  >
                    {offer.logoUrl || offer.imageUrl ? (
                      <img
                        src={(offer.logoUrl || offer.imageUrl)!}
                        alt={offer.brand}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <span className={styles.brandSquareName}>{offer.brand}</span>
                    )}
                  </div>

                  {/* Offer Headline & Short Description */}
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardHeadline}>{offer.title}</h3>
                    {offer.shortDescription && (
                      <p className={styles.cardDesc}>{offer.shortDescription}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
