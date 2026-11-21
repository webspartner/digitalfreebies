'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRegion } from '@/context/RegionContext';
import { offerMatchesRegion } from '@/lib/regions';
import styles from './FeaturedFreebies.module.css';

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

interface FeaturedFreebiesProps {
  offers: Offer[];
  title?: string;
  subtitle?: string;
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
};

export default function FeaturedFreebies({
  offers: rawOffers,
}: FeaturedFreebiesProps) {
  const { selectedRegion } = useRegion();
  const offers = useMemo(
    () => rawOffers.filter((offer) => offerMatchesRegion(offer.regions, selectedRegion)),
    [rawOffers, selectedRegion]
  );
  const total = offers.length;
  const deck = total > 1 ? [...offers, ...offers, ...offers] : offers;
  const [index, setIndex] = useState(total > 1 ? total : 0);
  const [animated, setAnimated] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const startXRef = useRef<number | null>(null);

  useEffect(() => {
    setAnimated(false);
    setIndex(total > 1 ? total : 0);
  }, [total, selectedRegion]);

  const next = useCallback(() => {
    if (total <= 1) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    setIndex((prev) => {
      if (prev >= total * 2 + total - 1) {
        setAnimated(false);
        return total + (((prev % total) + total) % total);
      }
      setAnimated(true);
      return prev + 1;
    });
  }, [total]);

  const prev = useCallback(() => {
    if (total <= 1) return;
    setIndex((prev) => {
      if (prev <= 0) {
        setAnimated(false);
        return total + (((prev % total) + total) % total);
      }
      setAnimated(true);
      return prev - 1;
    });
  }, [total]);

  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      // Ignore transitionend events bubbling up from child cards/buttons
      if (e.target !== e.currentTarget) return;
      if (!animated || total <= 1) return;
      if (index < total || index >= total * 2) {
        const normalized = total + (((index % total) + total) % total);
        setAnimated(false);
        setIndex(normalized);
      }
    },
    [index, total, animated]
  );

  // Normalize index when returning to the tab so slides never run out
  useEffect(() => {
    if (total <= 1) return;
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setIndex((prev) => {
          if (prev < total || prev >= total * 2) {
            setAnimated(false);
            return total + (((prev % total) + total) % total);
          }
          return prev;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [total]);

  useEffect(() => {
    if (!animated) {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setAnimated(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
  }, [animated]);

  useEffect(() => {
    if (isPaused || total <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isPaused, total, next]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const diff = startXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    }
    startXRef.current = null;
  };

  const goToDot = (dotIdx: number) => {
    if (total <= 1) return;
    const currentRel = ((index % total) + total) % total;
    const diff = dotIdx - currentRel;
    setAnimated(true);
    setIndex((prev) => prev + diff);
  };

  if (!offers.length) return null;

  const dotIndex = total > 0 ? ((index % total) + total) % total : 0;

  return (
    <section
      className={styles.gridSection}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Carousel Slider Container - Full Width */}
      <div className={styles.sliderOuter}>
        <div
          className={styles.trackClip}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className={styles.track}
            style={{
              transform: `translateX(calc(var(--peek) - ${index} * (var(--card-w) + var(--gap))))`,
              transition: animated ? 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {deck.map((offer, i) => {
              const isActive = i === index;
              const bgGradient = BRAND_COLORS[offer.brand] || 'linear-gradient(135deg, #667eea, #764ba2)';

              return (
                <Link
                  key={`${offer.id}-${i}`}
                  href={`/${offer.slug}`}
                  prefetch={false}
                  className={`${styles.card} ${isActive ? styles.cardActive : styles.cardInactive}`}
                  onClick={(e) => {
                    if (!isActive) {
                      e.preventDefault();
                      setAnimated(true);
                      setIndex(i);
                    }
                  }}
                  tabIndex={isActive ? 0 : -1}
                  aria-hidden={!isActive}
                >
                  {/* Image area with uploaded image or brand gradient + logo matching OfferCard */}
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

                  {/* Content area matching OfferCard */}
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{offer.title}</h3>
                    <p className={styles.cardDescription}>{offer.shortDescription}</p>
                    <span className={styles.cardButton} aria-hidden="true">&nbsp;</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dots Pagination */}
      {total > 1 && (
        <div className={styles.dots}>
          {offers.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${dotIndex === i ? styles.dotActive : ''}`}
              onClick={() => goToDot(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
