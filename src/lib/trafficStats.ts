import fs from 'fs/promises';
import path from 'path';

export interface DailyTrafficRecord {
  date: string; // YYYY-MM-DD
  visits: number;
  pageViews: number;
  visitorHashes: string[];
}

interface TrafficStore {
  days: Record<string, DailyTrafficRecord>;
}

const TRAFFIC_FILE_PATH = path.join(process.cwd(), 'prisma', 'traffic-stats.json');

async function readStore(): Promise<TrafficStore> {
  try {
    const raw = await fs.readFile(TRAFFIC_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.days === 'object') {
      return parsed as TrafficStore;
    }
  } catch {
    // File does not exist yet
  }
  return { days: {} };
}

async function writeStore(store: TrafficStore): Promise<void> {
  try {
    await fs.writeFile(TRAFFIC_FILE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write traffic stats:', err);
  }
}

export function getTodayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function recordPageView(visitorHash: string, isNewVisitSession: boolean): Promise<void> {
  const store = await readStore();
  const today = getTodayIso();

  if (!store.days[today]) {
    store.days[today] = {
      date: today,
      visits: 0,
      pageViews: 0,
      visitorHashes: [],
    };
  }

  const dayRecord = store.days[today];
  dayRecord.pageViews += 1;

  if (isNewVisitSession || !dayRecord.visitorHashes.includes(visitorHash)) {
    dayRecord.visits += 1;
    if (!dayRecord.visitorHashes.includes(visitorHash)) {
      dayRecord.visitorHashes.push(visitorHash);
    }
  }

  // Prune records older than 65 days to keep file compact
  const allDates = Object.keys(store.days).sort();
  if (allDates.length > 65) {
    const toRemove = allDates.slice(0, allDates.length - 65);
    for (const d of toRemove) {
      delete store.days[d];
    }
  }

  await writeStore(store);
}

export async function getTrafficSummary(): Promise<{
  visitsToday: number;
  visitsThisMonth: number;
  pageviewsThisMonth: number;
  dailyRecords: Record<string, { visits: number; pageViews: number; uniqueVisitors: number }>;
}> {
  const store = await readStore();
  const today = getTodayIso();
  const currentMonthPrefix = today.slice(0, 7); // YYYY-MM

  const visitsToday = store.days[today]?.visits || 0;
  let visitsThisMonth = 0;
  let pageviewsThisMonth = 0;

  const dailyRecords: Record<string, { visits: number; pageViews: number; uniqueVisitors: number }> = {};

  for (const [dateStr, rec] of Object.entries(store.days)) {
    dailyRecords[dateStr] = {
      visits: rec.visits || 0,
      pageViews: rec.pageViews || 0,
      uniqueVisitors: Array.isArray(rec.visitorHashes) ? rec.visitorHashes.length : rec.visits || 0,
    };
    if (dateStr.startsWith(currentMonthPrefix)) {
      visitsThisMonth += rec.visits || 0;
      pageviewsThisMonth += rec.pageViews || 0;
    }
  }

  return {
    visitsToday,
    visitsThisMonth,
    pageviewsThisMonth,
    dailyRecords,
  };
}
