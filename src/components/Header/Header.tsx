'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useRegion } from '@/context/RegionContext';
import { ALL_REGIONS, REGION_LABELS, isValidRegion } from '@/lib/regions';
import styles from './Header.module.css';

interface OfferSuggestion {
  id: number;
  title: string;
  slug: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  logoUrl: string | null;
}

const REGIONS = ALL_REGIONS;

function RegionFlag({ region }: { region: string }) {
  switch (region) {
    case 'North America':
      return (
        <svg className={styles.regionFlag} viewBox="0 0 24 16" aria-hidden="true">
          <rect width="24" height="16" rx="2" fill="#B22234" />
          <path d="M0 2.46h24M0 4.92h24M0 7.38h24M0 9.85h24M0 12.31h24M0 14.77h24" stroke="#fff" strokeWidth="1.23" />
          <rect width="10.5" height="8.62" rx="1" fill="#3C3B6E" />
          <g fill="#fff">
            <circle cx="2.2" cy="2.1" r="0.65" />
            <circle cx="5.2" cy="2.1" r="0.65" />
            <circle cx="8.2" cy="2.1" r="0.65" />
            <circle cx="3.7" cy="4.3" r="0.65" />
            <circle cx="6.7" cy="4.3" r="0.65" />
            <circle cx="2.2" cy="6.5" r="0.65" />
            <circle cx="5.2" cy="6.5" r="0.65" />
            <circle cx="8.2" cy="6.5" r="0.65" />
          </g>
        </svg>
      );
    case 'Latin America':
      return (
        <svg className={styles.regionFlag} viewBox="0 0 24 16" aria-hidden="true">
          <rect width="24" height="16" rx="2" fill="#009B3A" />
          <polygon points="12,2.2 21.5,8 12,13.8 2.5,8" fill="#FEDF00" />
          <circle cx="12" cy="8" r="3.3" fill="#002776" />
          <path d="M8.9 7.4c2.1-.6 4.3-.4 6.2.6" stroke="#fff" strokeWidth="0.85" fill="none" />
        </svg>
      );
    case 'UK':
      return (
        <svg className={styles.regionFlag} viewBox="0 0 24 16" aria-hidden="true">
          <rect width="24" height="16" rx="2" fill="#012169" />
          <path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="2.8" />
          <path d="M0 0l24 16M24 0L0 16" stroke="#C8102E" strokeWidth="1.4" />
          <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="4.4" />
          <path d="M12 0v16M0 8h24" stroke="#C8102E" strokeWidth="2.6" />
        </svg>
      );
    case 'Europe':
      return (
        <svg className={styles.regionFlag} viewBox="0 0 24 16" aria-hidden="true">
          <rect width="24" height="16" rx="2" fill="#003399" />
          <g fill="#FFCC00">
            <circle cx="12" cy="3.2" r="0.75" />
            <circle cx="14.4" cy="3.8" r="0.75" />
            <circle cx="16.2" cy="5.6" r="0.75" />
            <circle cx="16.8" cy="8" r="0.75" />
            <circle cx="16.2" cy="10.4" r="0.75" />
            <circle cx="14.4" cy="12.2" r="0.75" />
            <circle cx="12" cy="12.8" r="0.75" />
            <circle cx="9.6" cy="12.2" r="0.75" />
            <circle cx="7.8" cy="10.4" r="0.75" />
            <circle cx="7.2" cy="8" r="0.75" />
            <circle cx="7.8" cy="5.6" r="0.75" />
            <circle cx="9.6" cy="3.8" r="0.75" />
          </g>
        </svg>
      );
    case 'Pacific Asia':
      return (
        <svg className={styles.regionFlag} viewBox="0 0 24 16" aria-hidden="true">
          <rect width="24" height="16" rx="2" fill="#ffffff" stroke="#e0e0e0" strokeWidth="1" />
          <circle cx="12" cy="8" r="4.2" fill="#BC002D" />
        </svg>
      );
    case 'Global':
    default:
      return (
        <img
          src="/images/assets/global-icon.png"
          alt="Global"
          className={styles.regionGlobeIcon}
        />
      );
  }
}

const CATEGORIES = [
  { name: 'Streaming', slug: 'streaming' },
  { name: 'Subscription', slug: 'subscription' },
  { name: 'VPNs', slug: 'vpns' },
  { name: 'Gaming', slug: 'gaming' },
  { name: 'Education', slug: 'education' },
  { name: 'Software', slug: 'software' },
  { name: 'Hardware', slug: 'hardware' },
  { name: 'Events', slug: 'events' },
];

const SPECIAL_CATEGORIES = [
  { name: 'General Freebies', slug: 'general-freebies' },
  { name: 'Student Freebies', slug: 'student-freebies' },
  { name: 'Purchase Freebies', slug: 'purchase-freebies' },
  { name: 'Signups Freebies', slug: 'signups-freebies' },
  { name: 'Trials Freebies', slug: 'trials-freebies' },
  { name: 'Referrals Freebies', slug: 'referrals-freebies' },
];

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

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className={styles.highlight}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}

let cachedStandardCategories: { name: string; slug: string }[] | null = null;
let cachedSpecialCategories: { name: string; slug: string }[] | null = null;

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedRegion, setSelectedRegion } = useRegion();
  const [regionOpen, setRegionOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<OfferSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(false);

  const regionRef = useRef<HTMLDivElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const [categoriesList, setCategoriesList] = useState<{ name: string; slug: string }[]>(
    () => cachedStandardCategories || CATEGORIES
  );
  const [specialCategoriesList, setSpecialCategoriesList] = useState<{ name: string; slug: string }[]>(
    () => cachedSpecialCategories || SPECIAL_CATEGORIES
  );

  useEffect(() => {
    if (cachedStandardCategories && cachedSpecialCategories) return;

    try {
      const stored = sessionStorage.getItem('df_categories_cache_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.ts && Date.now() - parsed.ts < 60_000) {
          if (Array.isArray(parsed.standard) && parsed.standard.length > 0) {
            cachedStandardCategories = parsed.standard;
            setCategoriesList((prev) =>
              prev.map((p) => p.slug).join(',') === parsed.standard.map((s: { slug: string }) => s.slug).join(',')
                ? prev
                : parsed.standard
            );
          }
          if (Array.isArray(parsed.special) && parsed.special.length > 0) {
            cachedSpecialCategories = parsed.special;
            setSpecialCategoriesList((prev) =>
              prev.map((p) => p.slug).join(',') === parsed.special.map((s: { slug: string }) => s.slug).join(',')
                ? prev
                : parsed.special
            );
          }
          return;
        }
      }
    } catch {
      // ignore storage errors
    }

    const timer = setTimeout(() => {
      fetch('/api/categories')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const standard = data.filter((c: { type: string }) => c.type !== 'special');
            const special = data.filter((c: { type: string }) => c.type === 'special');
            if (standard.length > 0) {
              cachedStandardCategories = standard;
              setCategoriesList((prev) =>
                prev.map((p) => p.slug).join(',') === standard.map((s: { slug: string }) => s.slug).join(',')
                  ? prev
                  : standard
              );
            }
            if (special.length > 0) {
              cachedSpecialCategories = special;
              setSpecialCategoriesList((prev) =>
                prev.map((p) => p.slug).join(',') === special.map((s: { slug: string }) => s.slug).join(',')
                ? prev
                : special
              );
            }
            try {
              sessionStorage.setItem(
                'df_categories_cache_v1',
                JSON.stringify({ ts: Date.now(), standard, special })
              );
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Sync region from URL query param when landing on /search?region=...
  useEffect(() => {
    if (pathname === '/search' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRegion = params.get('region');
      if (urlRegion && isValidRegion(urlRegion) && urlRegion !== selectedRegion) {
        setSelectedRegion(urlRegion);
      }
    }
  }, [pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (regionRef.current && !regionRef.current.contains(target)) {
        setRegionOpen(false);
      }
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(target)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch suggestions with debouncing and request cancellation
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setIsLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          region: selectedRegion,
        });
        const res = await fetch(`/api/search/suggestions?${params.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.offers || []);
          setSuggestionsOpen(true);
          setSelectedIndex(-1);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to load suggestions:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, selectedRegion]);

  const executeSearch = useCallback((queryToSearch: string) => {
    const trimmed = queryToSearch.trim();
    if (!trimmed) return;
    const params = new URLSearchParams({ q: trimmed });
    if (selectedRegion !== 'Global') {
      params.set('region', selectedRegion);
    }
    setSuggestionsOpen(false);
    router.push(`/search?${params.toString()}`);
  }, [selectedRegion, router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0) {
      handleItemSelect(selectedIndex);
    } else {
      executeSearch(searchQuery);
    }
  };

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region);
    setRegionOpen(false);
    if (pathname === '/search' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (region && region !== 'Global') {
        params.set('region', region);
      } else {
        params.delete('region');
      }
      const qs = params.toString();
      router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setSuggestionsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Keyboard navigation calculation
  // suggestions + 1 for "See all results"
  const totalItems = suggestions.length + (searchQuery.trim() ? 1 : 0);

  const handleItemSelect = (index: number) => {
    if (index < suggestions.length) {
      const offer = suggestions[index];
      setSuggestionsOpen(false);
      router.push(`/${offer.slug}`);
    } else {
      // See all results
      executeSearch(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestionsOpen) {
      if (e.key === 'ArrowDown' && searchQuery.trim()) {
        setSuggestionsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 >= totalItems ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? totalItems - 1 : prev - 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSuggestionsOpen(false);
    }
  };

  return (
    <header className={styles.header}>
      {/* Top announcement bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarContent}>
          <span className={styles.topBarDesktopText}>
            100% Verified Free Digital Offers, Trials &amp; Student Deals — Handpicked &amp; Updated Daily
          </span>
          <span className={styles.topBarMobileText}>
            100% Verified Free Digital Offers, Trials &amp; Student Deals
          </span>
        </div>
      </div>

      {/* Main header row */}
      <div className={styles.mainHeader}>
        <div className={styles.mainHeaderContent}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <Image 
              src="/images/assets/logo.png" 
              alt="DigitalFreebies.io" 
              width={192} 
              height={48} 
              priority 
              className={styles.logoImage}
            />
          </Link>

          {/* Search bar with autocomplete suggestions */}
          <div className={styles.searchWrapper} ref={searchWrapperRef}>
            <form onSubmit={handleSearchSubmit} role="search">
              <div className={styles.searchBar}>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search free offers, trials & deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0) {
                      setSuggestionsOpen(true);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  id="header-search"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={suggestionsOpen}
                  aria-controls="search-suggestions"
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                />

                {/* Clear button if text entered */}
                {searchQuery && (
                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}

                {/* Search submit button */}
                <button type="submit" className={styles.searchButton} aria-label="Search">
                  {isLoading ? (
                    <span className={styles.searchSpinner} />
                  ) : (
                    <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  )}
                </button>
              </div>
            </form>

            {/* Suggestions dropdown */}
            {suggestionsOpen && searchQuery.trim() && (
              <div className={styles.suggestionsDropdown} role="listbox" id="search-suggestions">
                {/* Offers */}
                {suggestions.length > 0 && (
                  <div className={styles.suggestionsSection}>
                    {suggestions.map((offer, idx) => {
                      const isSelected = selectedIndex === idx;
                      const bgGradient = BRAND_COLORS[offer.brand] || 'linear-gradient(135deg, #667eea, #764ba2)';

                      return (
                        <button
                          key={offer.id}
                          type="button"
                          className={`${styles.suggestionItem} ${isSelected ? styles.suggestionItemSelected : ''}`}
                          onClick={() => {
                            setSuggestionsOpen(false);
                            router.push(`/${offer.slug}`);
                          }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div
                            className={styles.suggestionAvatar}
                            style={{ background: offer.logoUrl ? '#ffffff' : bgGradient }}
                          >
                            {offer.logoUrl ? (
                              <img
                                src={offer.logoUrl}
                                alt={offer.brand}
                                className={styles.suggestionLogoImg}
                              />
                            ) : (
                              <span>{offer.brand.charAt(0)}</span>
                            )}
                          </div>
                          <div className={styles.suggestionTextWrapper}>
                            <div className={styles.suggestionTitleRow}>
                              <span className={styles.suggestionTitle}>
                                {highlightMatch(offer.title, searchQuery)}
                              </span>
                            </div>
                            <div className={styles.suggestionSubRow}>
                              <span className={styles.suggestionBrand}>
                                {highlightMatch(offer.brand, searchQuery)}
                              </span>
                              <span className={styles.suggestionDot}>•</span>
                              <span className={styles.suggestionCategory}>{offer.category}</span>
                            </div>
                          </div>
                          <span className={styles.suggestionArrow}>→</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Empty State */}
                {!isLoading && suggestions.length === 0 && (
                  <div className={styles.emptySuggestions}>
                    <span className={styles.emptyIcon}>🔍</span>
                    <p className={styles.emptyText}>
                      No offers matching <strong>&ldquo;{searchQuery}&rdquo;</strong>
                    </p>
                  </div>
                )}

                {/* Footer: See all results */}
                <div className={styles.suggestionsFooter}>
                  <button
                    type="button"
                    className={`${styles.seeAllButton} ${selectedIndex === totalItems - 1 ? styles.suggestionItemSelected : ''}`}
                    onClick={() => executeSearch(searchQuery)}
                    onMouseEnter={() => setSelectedIndex(totalItems - 1)}
                    role="option"
                    aria-selected={selectedIndex === totalItems - 1}
                  >
                    <svg className={styles.searchAllIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <span>
                      See all results for <strong>&ldquo;{searchQuery}&rdquo;</strong>
                      {selectedRegion !== 'Global' && ` in ${REGION_LABELS[selectedRegion] || selectedRegion}`}
                    </span>
                    <span className={styles.seeAllArrow}>↵</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Region selector */}
          <div className={`${styles.regionSelector} ${regionOpen ? styles.regionSelectorOpen : ''}`} ref={regionRef}>
            <button
              className={styles.regionButton}
              onClick={() => setRegionOpen(!regionOpen)}
              id="region-selector"
              aria-expanded={regionOpen}
            >
              <RegionFlag region={selectedRegion} />
              <span>{REGION_LABELS[selectedRegion] || selectedRegion}</span>
              <span className={`${styles.regionChevron} ${regionOpen ? styles.regionChevronOpen : ''}`}>▼</span>
            </button>

            {regionOpen && (
              <div className={styles.regionDropdown}>
                {REGIONS.map((region) => (
                  <button
                    key={region}
                    className={`${styles.regionOption} ${selectedRegion === region ? styles.regionOptionActive : ''}`}
                    onClick={() => handleRegionSelect(region)}
                  >
                    <RegionFlag region={region} />
                    <span>{REGION_LABELS[region] || region}</span>
                    {selectedRegion === region && <span className={styles.regionCheck}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categories navigation with left burger icon and vertical separator */}
      <nav className={styles.categoriesBar} aria-label="Categories">
        <div className={styles.categoriesContent}>
          {/* Left burger menu button */}
          <button
            type="button"
            className={`${styles.categoryBurgerBtn} ${menuOpen ? styles.burgerBtnOpen : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>

          {/* Separator line */}
          <div className={styles.categoryDivider} />

          {/* Categories links */}
          <div className={styles.categoryList}>
            {categoriesList.map((cat) => {
              const isCatActive = pathname === `/category/${cat.slug}` || pathname?.startsWith(`/category/${cat.slug}/`);
              return (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  prefetch={false}
                  className={`${styles.categoryLink} ${isCatActive ? styles.categoryLinkActive : ''}`}
                >
                  <span>{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Light Gray Announcement Strip Below Header */}
      <div className={styles.promoSubBar}>
        <div className={styles.promoSubContent}>
          <p className={styles.promoSubText}>
            Got a freebie to share? Share &amp; discover the latest{' '}
            <br className={styles.promoMobileBreak} />
            digital deals with our community —{' '}
            <Link href="/forum" className={styles.promoSubLink}>
              Share a Freebie
            </Link>
          </p>
        </div>
      </div>

      {/* Slide-out Navigation Drawer */}
      {menuOpen && (
        <div className={styles.drawerBackdrop} onClick={() => setMenuOpen(false)}>
          <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Navigation</span>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className={styles.drawerLinks}>
              <Link href="/" className={`${styles.drawerLink} ${pathname === '/' ? styles.drawerLinkActive : ''}`} onClick={() => setMenuOpen(false)}>
                <span>Home</span>
              </Link>
              <Link href="/freebies" className={`${styles.drawerLink} ${pathname === '/freebies' ? styles.drawerLinkActive : ''}`} onClick={() => setMenuOpen(false)}>
                <span>All Freebies</span>
              </Link>
              <Link href="/forum" className={`${styles.drawerLink} ${pathname?.startsWith('/forum') ? styles.drawerLinkActive : ''}`} onClick={() => setMenuOpen(false)}>
                <span>Community Forum</span>
              </Link>
              <Link href="/#faq" className={styles.drawerLink} onClick={() => setMenuOpen(false)}>
                <span>FAQ</span>
              </Link>

              <div className={styles.drawerDivider} />
              <span className={styles.drawerSectionLabel}>Categories</span>

              {categoriesList.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className={`${styles.drawerLink} ${pathname === `/category/${cat.slug}` ? styles.drawerLinkActive : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{cat.name}</span>
                </Link>
              ))}

              <div className={styles.drawerDivider} />
              <span className={styles.drawerSectionLabel}>Special Categories</span>

              {specialCategoriesList.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className={`${styles.drawerLink} ${pathname === `/category/${cat.slug}` ? styles.drawerLinkActive : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
