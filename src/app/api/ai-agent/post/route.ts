import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { createSlug } from '@/lib/utils';
import { normalizeRegionsForSave } from '@/lib/regions';
import { getTechnicalSettings } from '@/lib/technicalSettings';
import { logActivity } from '@/lib/audit';

const DEFAULT_TEMP_API_KEY = process.env.AI_AGENT_API_KEY || 'df-ai-agent-temp-2026';

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
};

const ALLOWED_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.ico']);

async function isValidAgentKey(providedKey: string | null): Promise<boolean> {
  if (!providedKey) return false;
  const trimmed = providedKey.trim();
  if (trimmed === DEFAULT_TEMP_API_KEY) return true;

  try {
    const settings = await getTechnicalSettings();
    const customEntry = settings.customApis?.find(
      (item) => item.envKey === 'AI_AGENT_API_KEY' && item.value.trim().length > 0
    );
    if (customEntry && trimmed === customEntry.value.trim()) {
      return true;
    }
  } catch {
    // ignore settings read errors
  }

  return false;
}

function extractApiKey(request: NextRequest, bodyKey?: string): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  const headerKey =
    request.headers.get('x-api-key') || request.headers.get('x-agent-key');
  if (headerKey) return headerKey.trim();

  const urlKey = request.nextUrl.searchParams.get('key') || request.nextUrl.searchParams.get('apiKey');
  if (urlKey) return urlKey.trim();

  if (bodyKey && typeof bodyKey === 'string') return bodyKey.trim();
  return null;
}

/**
 * Saves an image from a File object, a base64 string / data URL, or a remote http(s) URL
 * into /public/images/<folder>/ and returns the public path (e.g. "/images/offers/foo-123.png").
 */
async function resolveAndSaveImage(
  input: unknown,
  folder: 'offers' | 'brands',
  prefix: string,
  downloadRemote = true
): Promise<string | null> {
  if (!input) return null;

  const baseImagesDir = path.resolve(process.cwd(), 'public', 'images');
  const uploadDir = path.resolve(baseImagesDir, folder);
  await fs.mkdir(uploadDir, { recursive: true });

  const safePrefix =
    prefix
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'freebie';
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

  // 1. Multipart File instance
  if (typeof File !== 'undefined' && input instanceof File && input.size > 0) {
    const origExt = path.extname(input.name || '').toLowerCase();
    const ext = ALLOWED_EXTS.has(origExt)
      ? origExt
      : MIME_TO_EXT[input.type?.toLowerCase()] || '.png';
    const filename = `${safePrefix}-${uniqueSuffix}${ext}`;
    const filepath = path.resolve(uploadDir, filename);
    const buffer = Buffer.from(await input.arrayBuffer());
    await fs.writeFile(filepath, buffer);
    return `/images/${folder}/${filename}`;
  }

  if (typeof input !== 'string') return null;
  const str = input.trim();
  if (!str) return null;

  // 2. Already a local path (e.g. "/images/offers/...")
  if (str.startsWith('/images/')) {
    return str;
  }

  // 3. Data URL: data:image/png;base64,iVBOR...
  const dataUrlMatch = str.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const mime = dataUrlMatch[1].toLowerCase();
    const base64Data = dataUrlMatch[2];
    const ext = MIME_TO_EXT[mime] || '.png';
    const filename = `${safePrefix}-${uniqueSuffix}${ext}`;
    const filepath = path.resolve(uploadDir, filename);
    await fs.writeFile(filepath, Buffer.from(base64Data, 'base64'));
    return `/images/${folder}/${filename}`;
  }

  // 4. Remote HTTP/HTTPS URL
  if (/^https?:\/\//i.test(str)) {
    if (!downloadRemote) return str;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(str, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DigitalFreebiesBot/1.0)',
        },
      });
      clearTimeout(timeout);

      if (!res.ok) return str;

      const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      const urlPath = new URL(str).pathname;
      const urlExt = path.extname(urlPath).toLowerCase();
      const ext =
        MIME_TO_EXT[contentType] ||
        (ALLOWED_EXTS.has(urlExt) ? urlExt : '.png');

      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength <= 0 || arrayBuffer.byteLength > 10 * 1024 * 1024) {
        return str;
      }

      const filename = `${safePrefix}-${uniqueSuffix}${ext}`;
      const filepath = path.resolve(uploadDir, filename);
      await fs.writeFile(filepath, Buffer.from(arrayBuffer));
      return `/images/${folder}/${filename}`;
    } catch {
      // Fallback to using the external URL directly if download fails
      return str;
    }
  }

  // 5. Raw base64 string (without data:... prefix)
  if (str.length > 100 && /^[A-Za-z0-9+/=\r\n]+$/.test(str)) {
    try {
      const buffer = Buffer.from(str, 'base64');
      if (buffer.length > 32) {
        const filename = `${safePrefix}-${uniqueSuffix}.png`;
        const filepath = path.resolve(uploadDir, filename);
        await fs.writeFile(filepath, buffer);
        return `/images/${folder}/${filename}`;
      }
    } catch {
      // ignore
    }
  }

  return str;
}

async function generateUniqueSlug(baseTitle: string, requestedSlug?: string): Promise<string> {
  const base = createSlug(requestedSlug || baseTitle) || `freebie-${Date.now()}`;
  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.offer.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${counter}`;
    counter++;
  }
}

interface SingleOfferPayload {
  title?: string;
  slug?: string;
  brand?: string;
  shortDescription?: string;
  fullDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  offerUrl?: string;
  termsUrl?: string;
  category?: string;
  specialCategory?: string;
  regions?: string[] | string;
  imageUrl?: unknown;
  imageBase64?: unknown;
  image?: unknown;
  logoUrl?: unknown;
  logoBase64?: unknown;
  logo?: unknown;
  isFeatured?: boolean | string;
  isTrending?: boolean | string;
  trendingOrder?: number | string;
  isActive?: boolean | string;
  isOnHomepage?: boolean | string;
  sortOrder?: number | string;
  expiresAt?: string | null;
  upsert?: boolean | string;
  downloadImages?: boolean;
}

async function createOrUpdateSingleOffer(item: SingleOfferPayload) {
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  const offerUrl = typeof item.offerUrl === 'string' ? item.offerUrl.trim() : '';

  if (!title) {
    throw new Error('Missing required field: "title"');
  }
  if (!offerUrl) {
    throw new Error(`Missing required field: "offerUrl" for "${title}"`);
  }

  const brand =
    typeof item.brand === 'string' && item.brand.trim()
      ? item.brand.trim()
      : title.split(/[\s\-–—:]+/)[0] || 'DigitalFreebies';

  const fullDescription =
    typeof item.fullDescription === 'string' && item.fullDescription.trim()
      ? item.fullDescription.trim()
      : null;

  const shortDescription =
    typeof item.shortDescription === 'string' && item.shortDescription.trim()
      ? item.shortDescription.trim()
      : fullDescription
      ? fullDescription.replace(/\*\*/g, '').replace(/\s+/g, ' ').slice(0, 180)
      : `Claim ${title} from ${brand} on DigitalFreebies.io.`;

  const category =
    typeof item.category === 'string' && item.category.trim()
      ? item.category.trim().toLowerCase()
      : 'software';

  const specialCategory =
    typeof item.specialCategory === 'string' && item.specialCategory.trim()
      ? item.specialCategory.trim()
      : 'General Freebies';

  const downloadRemote = item.downloadImages !== false;

  const resolvedImageUrl = await resolveAndSaveImage(
    item.image || item.imageBase64 || item.imageUrl,
    'offers',
    title,
    downloadRemote
  );

  const resolvedLogoUrl = await resolveAndSaveImage(
    item.logo || item.logoBase64 || item.logoUrl,
    'brands',
    brand,
    downloadRemote
  );

  let rawRegions: string | string[] | null | undefined = item.regions;
  if (typeof rawRegions === 'string') {
    const trimmed = rawRegions.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        rawRegions = Array.isArray(parsed) ? parsed.map(String) : trimmed.split(',').map((s) => s.trim());
      } catch {
        rawRegions = trimmed.split(',').map((s) => s.trim());
      }
    } else if (trimmed.toLowerCase() === 'global' || trimmed === '') {
      rawRegions = [];
    } else {
      rawRegions = trimmed.split(',').map((s) => s.trim());
    }
  }
  const normalizedRegions = normalizeRegionsForSave(rawRegions);

  const parseBool = (val: unknown, defaultVal: boolean): boolean => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'true' || val === '1') return true;
      if (val.toLowerCase() === 'false' || val === '0') return false;
    }
    return defaultVal;
  };

  const isFeatured = parseBool(item.isFeatured, false);
  const isTrending = parseBool(item.isTrending, false);
  const isActive = parseBool(item.isActive, true);
  const isOnHomepage = parseBool(item.isOnHomepage, true);
  const upsert = parseBool(item.upsert, false);

  const trendingOrder =
    item.trendingOrder !== undefined && !isNaN(Number(item.trendingOrder))
      ? Math.max(1, Number(item.trendingOrder))
      : 1;
  const sortOrder =
    item.sortOrder !== undefined && !isNaN(Number(item.sortOrder))
      ? Number(item.sortOrder)
      : 0;

  const metaTitle =
    typeof item.metaTitle === 'string' && item.metaTitle.trim()
      ? item.metaTitle.trim()
      : `${title} — Free Offer from ${brand} | DigitalFreebies.io`;

  const metaDescription =
    typeof item.metaDescription === 'string' && item.metaDescription.trim()
      ? item.metaDescription.trim()
      : shortDescription.slice(0, 160);

  const termsUrl =
    typeof item.termsUrl === 'string' && item.termsUrl.trim()
      ? item.termsUrl.trim()
      : null;

  const expiresAt =
    item.expiresAt && !isNaN(Date.parse(String(item.expiresAt)))
      ? new Date(String(item.expiresAt))
      : null;

  const baseSlug = createSlug(item.slug || title) || `freebie-${Date.now()}`;

  if (upsert) {
    const existing = await prisma.offer.findUnique({ where: { slug: baseSlug } });
    if (existing) {
      return prisma.offer.update({
        where: { id: existing.id },
        data: {
          title,
          brand,
          shortDescription,
          fullDescription,
          metaTitle,
          metaDescription,
          imageUrl: resolvedImageUrl ?? existing.imageUrl,
          logoUrl: resolvedLogoUrl ?? existing.logoUrl,
          offerUrl,
          termsUrl,
          category,
          specialCategory,
          regions: JSON.stringify(normalizedRegions),
          isFeatured,
          isTrending,
          trendingOrder,
          isActive,
          isOnHomepage,
          sortOrder,
          expiresAt,
        },
      });
    }
  }

  const slug = await generateUniqueSlug(title, item.slug);

  return prisma.offer.create({
    data: {
      title,
      slug,
      brand,
      shortDescription,
      fullDescription,
      metaTitle,
      metaDescription,
      imageUrl: resolvedImageUrl,
      logoUrl: resolvedLogoUrl,
      offerUrl,
      termsUrl,
      category,
      specialCategory,
      regions: JSON.stringify(normalizedRegions),
      label: null,
      isFeatured,
      isTrending,
      trendingOrder,
      isActive,
      isOnHomepage,
      sortOrder,
      expiresAt,
    },
  });
}

// GET /api/ai-agent/post — Self-documenting instructions & schema for AI Agents
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/ai-agent/post',
    method: 'POST',
    description:
      'Temporary AI Agent Ingestion API for DigitalFreebies.io. Allows an AI agent to directly publish freebies (single offer or batch of offers) including title, brand, descriptions, categories, regions, and images (via URL, Base64 data URL, or multipart/form-data file upload).',
    authentication: {
      headers: ['Authorization: Bearer <API_KEY>', 'x-api-key: <API_KEY>'],
      queryParam: '?key=<API_KEY>',
      bodyField: 'apiKey',
    },
    acceptedContentTypes: ['application/json', 'multipart/form-data'],
    categories: [
      'streaming',
      'subscription',
      'vpns',
      'gaming',
      'education',
      'software',
      'hardware',
      'events',
    ],
    specialCategories: [
      'General Freebies',
      'Student Freebies',
      'Purchase Freebies',
      'Signups Freebies',
      'Trials Freebies',
      'Referrals Freebies',
    ],
    regions: [
      'North America',
      'Latin America',
      'UK',
      'Europe',
      'Pacific Asia',
    ],
    fields: {
      title: 'string (REQUIRED) — e.g. "YouTube Premium — 3 Months Free Trial"',
      brand: 'string (REQUIRED) — e.g. "YouTube"',
      offerUrl: 'string (REQUIRED) — External link to claim the freebie',
      shortDescription: 'string (REQUIRED) — 1-2 sentence summary shown on cards',
      fullDescription:
        'string (optional) — Detailed guide. Use "**Heading**" on its own line for headings and "- item" for bullet points.',
      category:
        'string (optional, default: "software") — One of the categories listed above',
      specialCategory:
        'string (optional, default: "General Freebies") — One of the specialCategories listed above',
      regions:
        'string[] | string (optional, default: all regions / Global) — e.g. ["North America", "UK", "Europe"]',
      imageUrl:
        'string (optional) — Remote https:// image URL (auto-downloaded to server), data:image/...;base64,... string, or /images/... path',
      imageBase64: 'string (optional) — Base64-encoded main offer banner image',
      logoUrl:
        'string (optional) — Remote https:// logo URL (auto-downloaded to server), data:image/...;base64,... string, or /images/... path',
      logoBase64: 'string (optional) — Base64-encoded brand logo image',
      termsUrl: 'string (optional) — Link to official offer terms',
      metaTitle: 'string (optional) — SEO title (auto-generated if omitted)',
      metaDescription: 'string (optional) — SEO meta description (auto-generated if omitted)',
      isFeatured: 'boolean (optional, default: false) — Show in top Featured slider',
      isTrending: 'boolean (optional, default: false) — Show in Trending Freebies section',
      isOnHomepage: 'boolean (optional, default: true) — Show in Latest Freebies on homepage',
      isActive: 'boolean (optional, default: true) — Publish immediately',
      expiresAt: 'ISO date string (optional) — e.g. "2027-01-31"',
      upsert: 'boolean (optional, default: false) — Update existing offer if slug matches',
    },
    exampleJsonPayload: {
      title: 'Spotify Premium — 3 Months Free for New Subscribers',
      brand: 'Spotify',
      shortDescription:
        'Listen to ad-free music with offline downloads for 3 months completely free.',
      fullDescription:
        'Enjoy 3 months of Spotify Premium at no cost.\n\n**How to Claim**\n- Click Go to Freebie below\n- Sign in or create a new Spotify account\n- Activate your 3-month free trial\n\n**Important Terms**\n- New Premium subscribers only\n- Cancel anytime before the trial ends to avoid charges',
      offerUrl: 'https://www.spotify.com/premium/',
      termsUrl: 'https://www.spotify.com/legal/premium-promotional-offer-terms/',
      category: 'streaming',
      specialCategory: 'Trials Freebies',
      regions: ['North America', 'UK', 'Europe'],
      imageUrl: 'https://example.com/spotify-banner.jpg',
      logoUrl: 'https://example.com/spotify-logo.png',
      isFeatured: false,
      isTrending: true,
      isOnHomepage: true,
    },
  });
}

// POST /api/ai-agent/post — Create offer(s) and upload images from an AI Agent
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // 1. Handle multipart/form-data (when agent uploads binary image files + fields)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const bodyKey = formData.get('apiKey') as string | null;
      const apiKey = extractApiKey(request, bodyKey || undefined);

      if (!(await isValidAgentKey(apiKey))) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid or missing AI Agent API key' },
          { status: 401 }
        );
      }

      const payload: SingleOfferPayload = {
        title: (formData.get('title') as string) || undefined,
        slug: (formData.get('slug') as string) || undefined,
        brand: (formData.get('brand') as string) || undefined,
        shortDescription: (formData.get('shortDescription') as string) || undefined,
        fullDescription: (formData.get('fullDescription') as string) || undefined,
        metaTitle: (formData.get('metaTitle') as string) || undefined,
        metaDescription: (formData.get('metaDescription') as string) || undefined,
        offerUrl: (formData.get('offerUrl') as string) || undefined,
        termsUrl: (formData.get('termsUrl') as string) || undefined,
        category: (formData.get('category') as string) || undefined,
        specialCategory: (formData.get('specialCategory') as string) || undefined,
        regions: (formData.get('regions') as string) || undefined,
        image: formData.get('image') || formData.get('imageFile') || formData.get('imageUrl'),
        logo: formData.get('logo') || formData.get('logoFile') || formData.get('logoUrl'),
        isFeatured: (formData.get('isFeatured') as string) || undefined,
        isTrending: (formData.get('isTrending') as string) || undefined,
        trendingOrder: (formData.get('trendingOrder') as string) || undefined,
        isActive: (formData.get('isActive') as string) || undefined,
        isOnHomepage: (formData.get('isOnHomepage') as string) || undefined,
        sortOrder: (formData.get('sortOrder') as string) || undefined,
        expiresAt: (formData.get('expiresAt') as string) || undefined,
        upsert: (formData.get('upsert') as string) || undefined,
      };

      const created = await createOrUpdateSingleOffer(payload);

      await logActivity({
        actor: 'ai-agent',
        actorRole: 'admin',
        action: 'AI_AGENT_OFFER_POSTED',
        category: 'offers',
        summary: `AI Agent published freebie "${created.title}" (${created.brand})`,
        request,
      });

      const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
      return NextResponse.json(
        {
          success: true,
          message: 'Offer published successfully by AI Agent',
          url: `${origin}/${created.slug}`,
          offer: created,
        },
        { status: 201 }
      );
    }

    // 2. Handle application/json (single offer object OR { offers: [...] } batch)
    const body = await request.json();
    const apiKey = extractApiKey(request, body?.apiKey);

    if (!(await isValidAgentKey(apiKey))) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing AI Agent API key' },
        { status: 401 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

    // Batch mode: { offers: [ ... ] } or top-level array
    const items: SingleOfferPayload[] | null = Array.isArray(body)
      ? body
      : Array.isArray(body?.offers)
      ? body.offers
      : null;

    if (items) {
      const results = [];
      const errors = [];

      for (let i = 0; i < items.length; i++) {
        try {
          const offer = await createOrUpdateSingleOffer(items[i]);
          results.push({
            id: offer.id,
            title: offer.title,
            slug: offer.slug,
            url: `${origin}/${offer.slug}`,
            imageUrl: offer.imageUrl,
            logoUrl: offer.logoUrl,
          });
        } catch (err: unknown) {
          errors.push({
            index: i,
            title: items[i]?.title || null,
            error: err instanceof Error ? err.message : 'Failed to create offer',
          });
        }
      }

      if (results.length > 0) {
        await logActivity({
          actor: 'ai-agent',
          actorRole: 'admin',
          action: 'AI_AGENT_BATCH_POSTED',
          category: 'offers',
          summary: `AI Agent batch-published ${results.length} freebie(s)`,
          request,
        });
      }

      return NextResponse.json(
        {
          success: errors.length === 0,
          createdCount: results.length,
          errorCount: errors.length,
          offers: results,
          errors: errors.length > 0 ? errors : undefined,
        },
        { status: results.length > 0 ? 201 : 400 }
      );
    }

    // Single offer JSON mode
    const created = await createOrUpdateSingleOffer(body);

    await logActivity({
      actor: 'ai-agent',
      actorRole: 'admin',
      action: 'AI_AGENT_OFFER_POSTED',
      category: 'offers',
      summary: `AI Agent published freebie "${created.title}" (${created.brand})`,
      request,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Offer published successfully by AI Agent',
        url: `${origin}/${created.slug}`,
        offer: created,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('AI Agent post error:', error);
    const message = error instanceof Error ? error.message : 'Failed to publish offer';
    const status = message.startsWith('Missing required') ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
