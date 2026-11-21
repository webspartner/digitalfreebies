'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useRegion } from '@/context/RegionContext';
import {
  isOfferGlobal,
  offerMatchesRegion,
  parseOfferRegions,
  REGION_LABELS,
} from '@/lib/regions';
import styles from './offerDetail.module.css';

export function OfferRegionBadge({ regions }: { regions?: string | null }) {
  const { selectedRegion } = useRegion();
  const isGlobal = isOfferGlobal(regions);
  const parsedRegions = parseOfferRegions(regions);
  const matchesCurrent = offerMatchesRegion(regions, selectedRegion);
  const currentRegionLabel = REGION_LABELS[selectedRegion] || selectedRegion;

  const regionText = isGlobal
    ? 'Global (All Regions)'
    : parsedRegions.map((r) => REGION_LABELS[r] || r).join(', ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-gray-700, #555555)',
            background: 'var(--color-gray-100, #f3f4f6)',
            padding: '4px 12px',
            borderRadius: '9999px',
          }}
        >
          <span>🌍</span>
          <span>Regions: {regionText}</span>
        </span>
      </div>

      {!matchesCurrent && selectedRegion !== 'Global' && (
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#b45309',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '8px 14px',
            borderRadius: '8px',
          }}
        >
          ⚠️ This freebie may not be available in <strong>{currentRegionLabel}</strong>. Available in:{' '}
          <strong>{regionText}</strong>.
        </div>
      )}
    </div>
  );
}

interface SidebarOffer {
  id: number;
  slug: string;
  title: string;
  brand: string;
  logoUrl: string | null;
  regions?: string | null;
}

export function OfferDetailSidebar({
  trendingOffers,
  latestOffers,
}: {
  trendingOffers: SidebarOffer[];
  latestOffers: SidebarOffer[];
}) {
  const { selectedRegion } = useRegion();

  const filteredTrending = useMemo(
    () =>
      trendingOffers
        .filter((o) => offerMatchesRegion(o.regions, selectedRegion))
        .slice(0, 5),
    [trendingOffers, selectedRegion]
  );

  const filteredLatest = useMemo(
    () =>
      latestOffers
        .filter((o) => offerMatchesRegion(o.regions, selectedRegion))
        .slice(0, 5),
    [latestOffers, selectedRegion]
  );

  return (
    <aside className={styles.sidebar}>
      {/* Trending Freebies (5) */}
      {filteredTrending.length > 0 && (
        <div className={styles.sidebarSection}>
          <div className={`${styles.sidebarHeader} ${styles.sidebarHeaderTrending}`}>
            <h3 className={styles.sidebarTitle}>Trending Freebies</h3>
          </div>
          <div className={styles.sidebarList}>
            {filteredTrending.map((trend) => (
              <Link key={trend.id} href={`/${trend.slug}`} prefetch={false} className={styles.sidebarItem}>
                <div className={styles.sidebarItemIcon} style={{ overflow: 'hidden' }}>
                  {trend.logoUrl ? (
                    <img
                      src={trend.logoUrl}
                      alt={trend.brand}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    trend.brand.charAt(0)
                  )}
                </div>
                <div className={styles.sidebarItemContent}>
                  <span className={styles.sidebarItemTitle}>{trend.title}</span>
                  <span className={styles.sidebarItemBrand}>{trend.brand}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Latest Freebies (5) */}
      {filteredLatest.length > 0 && (
        <div className={styles.sidebarSection}>
          <div className={styles.sidebarHeader}>
            <h3 className={styles.sidebarTitle}>Latest Freebies</h3>
          </div>
          <div className={styles.sidebarList}>
            {filteredLatest.map((latest) => (
              <Link key={latest.id} href={`/${latest.slug}`} prefetch={false} className={styles.sidebarItem}>
                <div className={styles.sidebarItemIcon} style={{ overflow: 'hidden' }}>
                  {latest.logoUrl ? (
                    <img
                      src={latest.logoUrl}
                      alt={latest.brand}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    latest.brand.charAt(0)
                  )}
                </div>
                <div className={styles.sidebarItemContent}>
                  <span className={styles.sidebarItemTitle}>{latest.title}</span>
                  <span className={styles.sidebarItemBrand}>{latest.brand}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ad slot */}
      <div className="ad-slot ad-slot--rectangle" id="ad-sidebar" />
    </aside>
  );
}
