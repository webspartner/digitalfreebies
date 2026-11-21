'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ALL_REGIONS,
  REGION_COOKIE_NAME,
  REGION_LABELS,
  isValidRegion,
} from '@/lib/regions';

interface RegionContextValue {
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  regionLabel: string;
  regions: readonly string[];
}

const RegionContext = createContext<RegionContextValue>({
  selectedRegion: 'Global',
  setSelectedRegion: () => {},
  regionLabel: 'Global',
  regions: ALL_REGIONS,
});

function readClientSavedRegion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const cookieMatch = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${REGION_COOKIE_NAME}=`));
    if (cookieMatch) {
      const val = decodeURIComponent(cookieMatch.split('=')[1] || '');
      if (isValidRegion(val)) return val;
    }
    const stored = localStorage.getItem(REGION_COOKIE_NAME);
    if (isValidRegion(stored)) return stored;
  } catch {
    // ignore storage/cookie errors
  }
  return null;
}

function persistClientRegion(region: string) {
  if (typeof window === 'undefined') return;
  try {
    document.cookie = `${REGION_COOKIE_NAME}=${encodeURIComponent(
      region
    )}; path=/; max-age=31536000; SameSite=Lax`;
    localStorage.setItem(REGION_COOKIE_NAME, region);
  } catch {
    // ignore storage/cookie errors
  }
}

export function RegionProvider({
  children,
  initialRegion = 'Global',
}: {
  children: React.ReactNode;
  initialRegion?: string;
}) {
  const validInitial = isValidRegion(initialRegion) ? initialRegion : 'Global';
  const [selectedRegion, setSelectedRegionState] = useState<string>(validInitial);

  // Sync on mount if localStorage/cookie has a valid region
  useEffect(() => {
    const saved = readClientSavedRegion();
    if (saved && saved !== selectedRegion) {
      setSelectedRegionState(saved);
      persistClientRegion(saved);
    } else if (!saved && validInitial !== 'Global') {
      persistClientRegion(validInitial);
    }
  }, []);

  const setSelectedRegion = useCallback((region: string) => {
    const nextRegion = isValidRegion(region) ? region : 'Global';
    setSelectedRegionState(nextRegion);
    persistClientRegion(nextRegion);
  }, []);

  const regionLabel = REGION_LABELS[selectedRegion] || selectedRegion;

  return (
    <RegionContext.Provider
      value={{
        selectedRegion,
        setSelectedRegion,
        regionLabel,
        regions: ALL_REGIONS,
      }}
    >
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
