'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRegion } from '@/context/RegionContext';
import { offerMatchesRegion } from '@/lib/regions';
import styles from './TrendingOffers.module.css';

interface TrendingOffer {
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
  trendingOrder?: number;
  regions?: string | null;
}

interface TrendingOffersProps {
  offers: TrendingOffer[];
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

export default function TrendingOffers({ offers: rawOffers }: TrendingOffersProps) {
  const { selectedRegion } = useRegion();
  const offers = useMemo(
    () =>
      (rawOffers || []).filter((offer) =>
        offerMatchesRegion(offer.regions, selectedRegion)
      ),
    [rawOffers, selectedRegion]
  );

  if (!offers || offers.length === 0) return null;

  return (
    <section className={styles.trendingSection}>
      <div className="container">
        <div className={styles.trendingHeader}>
          <div>
            <h2 className={styles.trendingTitle}>Trending Freebies</h2>
            <p className={styles.trendingSubtext}>
              Most popular freebies right now.
            </p>
          </div>
          <Link href="/freebies" className={styles.seeAllLink}>
            <span className={styles.seeAllText}>See all</span>
            <svg
              width="16"
              height="16"
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

        <div className={styles.trendingGrid}>
          {offers.slice(0, 12).map((offer) => {
            const bgGradient =
              BRAND_COLORS[offer.brand] || 'linear-gradient(135deg, #667eea, #764ba2)';

            return (
              <Link key={offer.id} href={`/${offer.slug}`} prefetch={false} className={styles.card}>
                {/* Image area with uploaded image or brand gradient + logo */}
                <div className={styles.cardImageWrapper}>
                  <div
                    className={styles.cardImageBg}
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
                    <div className={styles.logoCircle}>
                      {offer.logoUrl ? (
                        <img
                          src={offer.logoUrl}
                          alt={offer.brand}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        />
                      ) : (
                        <span className={styles.logoLetter}>{offer.brand.charAt(0)}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={styles.cardContent}>
                  <span className={styles.cardBrand}>
                    {offer.specialCategory || 'General Freebies'}
                  </span>
                  <h3 className={styles.cardTitle}>{offer.title}</h3>
                  <p className={styles.cardDescription}>{offer.shortDescription}</p>
                  <span className={styles.cardButton} aria-hidden="true">&nbsp;</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
