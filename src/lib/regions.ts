export const SPECIFIC_REGIONS = [
  'North America',
  'Latin America',
  'UK',
  'Europe',
  'Pacific Asia',
] as const;

export type SpecificRegion = (typeof SPECIFIC_REGIONS)[number];

export const ALL_REGIONS = ['Global', ...SPECIFIC_REGIONS] as const;

export type RegionOption = (typeof ALL_REGIONS)[number];

export const REGION_LABELS: Record<string, string> = {
  Global: 'Global',
  'North America': 'N. America',
  'Latin America': 'S. America',
  UK: 'UK',
  Europe: 'Europe',
  'Pacific Asia': 'Asia',
};

export const REGION_COOKIE_NAME = 'df_region';

export function isValidRegion(region?: string | null): region is RegionOption {
  if (!region) return false;
  return (ALL_REGIONS as readonly string[]).includes(region);
}

/**
 * Parses an offer's regions (JSON string or array) into canonical specific regions.
 * If the stored array is empty or only contains 'Global', returns all specific regions.
 */
export function parseOfferRegions(raw?: string | string[] | null): string[] {
  let list: unknown[] = [];

  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    } catch {
      list = [];
    }
  }

  const validSpecific = list.filter(
    (item): item is string =>
      typeof item === 'string' &&
      (SPECIFIC_REGIONS as readonly string[]).includes(item)
  );

  // Deduplicate while preserving canonical order
  const uniqueSpecific = SPECIFIC_REGIONS.filter((r) => validSpecific.includes(r));

  if (uniqueSpecific.length === 0) {
    return [...SPECIFIC_REGIONS];
  }

  return uniqueSpecific;
}

/**
 * Normalizes regions array before saving to database.
 */
export function normalizeRegionsForSave(raw?: string | string[] | null): string[] {
  return parseOfferRegions(raw);
}

/**
 * Returns true if the offer is available in all specific regions.
 */
export function isOfferGlobal(raw?: string | string[] | null): boolean {
  const parsed = parseOfferRegions(raw);
  return SPECIFIC_REGIONS.every((r) => parsed.includes(r));
}

/**
 * Checks whether an offer matches the currently selected region.
 */
export function offerMatchesRegion(
  offerRegions: string | string[] | null | undefined,
  selectedRegion: string | null | undefined
): boolean {
  if (!selectedRegion || selectedRegion === 'Global' || !isValidRegion(selectedRegion)) {
    return true;
  }
  const parsed = parseOfferRegions(offerRegions);
  return parsed.includes(selectedRegion);
}
