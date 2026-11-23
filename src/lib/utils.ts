import slugify from 'slugify';

export function createSlug(text: string): string {
  return slugify(text, { lower: true, strict: true, trim: true });
}

/**
 * Returns true if the offer's expiresAt date has passed.
 * Date-only values stored at 00:00:00.000Z remain valid through the end of that UTC day.
 */
export function isOfferExpired(expiresAt?: Date | string | null): boolean {
  if (!expiresAt) return false;
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (isNaN(date.getTime())) return false;

  const isMidnightUtc =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (isMidnightUtc) {
    const endOfDayUtc = new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);
    return Date.now() > endOfDayUtc.getTime();
  }

  return Date.now() > date.getTime();
}

/**
 * Prisma where filter that excludes expired offers (used on Homepage & sidebars).
 */
export function getNotExpiredWhere() {
  const now = new Date();
  const startOfTodayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return {
    OR: [
      { expiresAt: null },
      { expiresAt: { gte: startOfTodayUtc } },
    ],
  };
}

/**
 * Stable-sorts offers so active (non-expired) offers come first and expired offers appear at the end.
 */
export function sortExpiredLast<T extends { expiresAt?: Date | string | null }>(
  offers: T[]
): T[] {
  const active: T[] = [];
  const expired: T[] = [];
  for (const offer of offers) {
    if (isOfferExpired(offer.expiresAt)) {
      expired.push(offer);
    } else {
      active.push(offer);
    }
  }
  return [...active, ...expired];
}
