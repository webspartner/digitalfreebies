import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import {
  getGeminiApiKey,
  getTechnicalSettings,
  saveTechnicalSettings,
} from '@/lib/technicalSettings';

interface ScrapedPageContext {
  pageTitle: string;
  metaDescription: string;
  ogSiteName: string;
  headings: string[];
  domainBrand: string;
  hostname: string;
}

const KNOWN_BRANDS: Record<string, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  netflix: 'Netflix',
  amazon: 'Amazon',
  primevideo: 'Prime Video',
  audible: 'Audible',
  apple: 'Apple',
  disneyplus: 'Disney+',
  hulu: 'Hulu',
  max: 'Max',
  paramountplus: 'Paramount+',
  peacocktv: 'Peacock',
  crunchyroll: 'Crunchyroll',
  nordvpn: 'NordVPN',
  expressvpn: 'ExpressVPN',
  surfshark: 'Surfshark',
  protonvpn: 'Proton VPN',
  proton: 'Proton',
  cyberghostvpn: 'CyberGhost VPN',
  canva: 'Canva',
  adobe: 'Adobe',
  figma: 'Figma',
  notion: 'Notion',
  grammarly: 'Grammarly',
  coursera: 'Coursera',
  udemy: 'Udemy',
  skillshare: 'Skillshare',
  duolingo: 'Duolingo',
  linkedin: 'LinkedIn',
  microsoft: 'Microsoft',
  xbox: 'Xbox',
  playstation: 'PlayStation',
  epicgames: 'Epic Games',
  steam: 'Steam',
  discordapp: 'Discord',
  discord: 'Discord',
  dropbox: 'Dropbox',
  google: 'Google',
  openai: 'OpenAI',
  perplexity: 'Perplexity',
  github: 'GitHub',
  shopify: 'Shopify',
  semrush: 'Semrush',
  ahrefs: 'Ahrefs',
  headspace: 'Headspace',
  calm: 'Calm',
  strava: 'Strava',
  uber: 'Uber',
  doordash: 'DoorDash',
  instacart: 'Instacart',
};

function inferBrandFromInput(title: string, offerUrl: string): string {
  // 1. Check URL hostname
  if (offerUrl) {
    try {
      const parsed = new URL(offerUrl.startsWith('http') ? offerUrl : `https://${offerUrl}`);
      const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
      const parts = host.split('.');
      const mainPart = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
      if (KNOWN_BRANDS[mainPart]) return KNOWN_BRANDS[mainPart];
      if (mainPart && mainPart.length > 1) {
        return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
      }
    } catch {
      // ignore invalid URL
    }
  }

  // 2. Check known brand names in title
  const lowerTitle = title.toLowerCase();
  for (const [key, brandName] of Object.entries(KNOWN_BRANDS)) {
    if (lowerTitle.includes(key) || lowerTitle.includes(brandName.toLowerCase())) {
      return brandName;
    }
  }

  // 3. Extract before separator (—, -, :, |)
  if (title.trim()) {
    const splitMatch = title.split(/\s*(?:—|–|-|:|\|)\s*/);
    if (splitMatch.length > 1 && splitMatch[0].trim().split(/\s+/).length <= 3) {
      return splitMatch[0].trim();
    }
    const words = title
      .trim()
      .replace(/^(free|get|claim|exclusive)\s+/i, '')
      .split(/\s+/);
    if (words[0]) {
      return words[0].charAt(0).toUpperCase() + words[0].slice(1);
    }
  }

  return 'Digital Offer';
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function scrapeOfferUrl(offerUrl: string): Promise<ScrapedPageContext> {
  const empty: ScrapedPageContext = {
    pageTitle: '',
    metaDescription: '',
    ogSiteName: '',
    headings: [],
    domainBrand: inferBrandFromInput('', offerUrl),
    hostname: '',
  };

  if (!offerUrl || !offerUrl.trim()) return empty;

  let normalizedUrl = offerUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    empty.hostname = parsedUrl.hostname.replace(/^www\./i, '');
  } catch {
    return empty;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timer);

    if (!res.ok) return empty;
    const html = (await res.text()).slice(0, 120000);

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const ogTitleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    const siteNameMatch =
      html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);

    const headingMatches = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
      .map((m) => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ' ')))
      .filter((t) => t.length > 3 && t.length < 140)
      .slice(0, 5);

    return {
      pageTitle: decodeHtmlEntities((ogTitleMatch?.[1] || titleMatch?.[1] || '').trim()),
      metaDescription: decodeHtmlEntities((descMatch?.[1] || '').trim()),
      ogSiteName: decodeHtmlEntities((siteNameMatch?.[1] || '').trim()),
      headings: headingMatches,
      domainBrand: empty.domainBrand,
      hostname: empty.hostname,
    };
  } catch {
    return empty;
  }
}

const SEO_BRAND_SUFFIX = ' | DigitalFreebies.io';
const MAX_META_TITLE_LENGTH = 60;

function formatSeoMetaTitle(rawTitle: string): string {
  const maxPrefixLen = MAX_META_TITLE_LENGTH - SEO_BRAND_SUFFIX.length; // 39 chars

  // Strip any existing DigitalFreebies(.io) suffix and surrounding separators
  let prefix = rawTitle
    .replace(/\s*(?:\||—|–|-|:)?\s*digitalfreebies(?:\.io)?\s*$/i, '')
    .replace(/[\s|—–\-:,.;]+$/, '')
    .trim();

  if (!prefix) {
    return `Free Digital Offer & Trial${SEO_BRAND_SUFFIX}`;
  }

  if (prefix.length > maxPrefixLen) {
    const sliced = prefix.slice(0, maxPrefixLen);
    const lastSpace = sliced.lastIndexOf(' ');
    prefix = (lastSpace >= 18 ? sliced.slice(0, lastSpace) : sliced)
      .replace(/[\s|—–\-:,.;&]+$/, '')
      .replace(/\s+(?:for|with|and|to|on|in|at|by|of|the|a|an)$/i, '')
      .replace(/[\s|—–\-:,.;&]+$/, '')
      .trim();
  }

  return `${prefix}${SEO_BRAND_SUFFIX}`;
}

function buildFallbackSuggestion(params: {
  title: string;
  offerUrl: string;
  scraped: ScrapedPageContext;
}) {
  const { title, offerUrl, scraped } = params;
  const brand =
    scraped.ogSiteName ||
    inferBrandFromInput(title || scraped.pageTitle, offerUrl) ||
    'Digital Offer';

  const rawBaseTitle = title.trim() || scraped.pageTitle || `${brand} Free Trial & Offer`;

  // Create a polished suggested title
  let suggestedTitle = rawBaseTitle;
  if (!suggestedTitle.toLowerCase().includes(brand.toLowerCase())) {
    suggestedTitle = `${brand} — ${suggestedTitle}`;
  } else if (!/—|–|-/.test(suggestedTitle)) {
    const withoutBrand = suggestedTitle
      .replace(new RegExp(`^${brand}\\s*`, 'i'), '')
      .trim();
    if (withoutBrand) {
      suggestedTitle = `${brand} — ${
        withoutBrand.charAt(0).toUpperCase() + withoutBrand.slice(1)
      }`;
    } else {
      suggestedTitle = `${brand} — Exclusive Free Trial & Digital Offer`;
    }
  }
  // Normalize capitalization and ensure "Free" appeal
  if (!/free|trial|bonus|month|days|offer|gift|discount/i.test(suggestedTitle)) {
    suggestedTitle = `${suggestedTitle} — Free Trial Offer`;
  }

  const shortDescription = (
    scraped.metaDescription ||
    `Claim this verified ${brand} digital freebie! Get ${suggestedTitle.replace(
      /^[^—–-]+(?:—|–|-)\s*/,
      ''
    )} with instant online access.`
  ).slice(0, 180);

  const fullDescription = [
    `**About This ${brand} Freebie**`,
    scraped.metaDescription ||
      `Enjoy complimentary access to ${brand} with this verified promotional offer. Designed for users looking to experience ${brand}'s premium features at no initial cost.`,
    '',
    '**What You Get**',
    `- Full access to ${brand} features included in the promotional offer`,
    '- Instant digital activation directly on the official website',
    '- Cancel anytime before the promotional period ends to avoid charges',
    '',
    '**How to Claim This Freebie**',
    `- Click the "Go to Freebie" button to visit the official ${brand} offer page`,
    `- Sign in or create a new ${brand} account`,
    '- Complete the quick activation steps to unlock your freebie immediately',
  ].join('\n');

  const metaTitle = formatSeoMetaTitle(suggestedTitle);

  const rawMetaDesc = `Get ${suggestedTitle} on DigitalFreebies.io. ${
    scraped.metaDescription || `Claim your verified ${brand} free trial and digital offer today.`
  }`;
  const metaDescription =
    rawMetaDesc.length <= 158 ? rawMetaDesc : rawMetaDesc.slice(0, 155).trim() + '...';

  return {
    suggestedTitle,
    brand,
    shortDescription,
    fullDescription,
    metaTitle,
    metaDescription,
  };
}

// GET /api/admin/gemini-freebie - Check if Gemini API Key is configured
export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = await getGeminiApiKey();
  const maskedKey =
    key.length > 8 ? `${key.slice(0, 4)}••••••••${key.slice(-4)}` : key ? '••••••••' : '';

  return NextResponse.json({
    configured: Boolean(key),
    maskedKey,
  });
}

// PUT /api/admin/gemini-freebie - Save Gemini API Key directly
export async function PUT(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

    const current = await getTechnicalSettings();
    await saveTechnicalSettings({
      google: {
        ...current.google,
        geminiApiKey: apiKey,
      },
    });

    return NextResponse.json({
      configured: Boolean(apiKey),
      maskedKey:
        apiKey.length > 8
          ? `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}`
          : apiKey
          ? '••••••••'
          : '',
      message: apiKey
        ? 'Gemini API Key saved successfully!'
        : 'Gemini API Key cleared.',
    });
  } catch (error) {
    console.error('Error saving Gemini API key:', error);
    return NextResponse.json({ error: 'Failed to save Gemini API key' }, { status: 500 });
  }
}

// POST /api/admin/gemini-freebie - Generate Brand, Short/Full Description, SEO Meta & Suggested Title
export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const offerUrl = typeof body.offerUrl === 'string' ? body.offerUrl.trim() : '';

    if (!title && !offerUrl) {
      return NextResponse.json(
        { error: 'Please provide either a Title or a Freebie URL first.' },
        { status: 400 }
      );
    }

    const scraped = await scrapeOfferUrl(offerUrl);
    const apiKey =
      (typeof body.apiKey === 'string' && body.apiKey.trim()) || (await getGeminiApiKey());

    const fallback = buildFallbackSuggestion({ title, offerUrl, scraped });

    if (!apiKey) {
      return NextResponse.json({
        ...fallback,
        source: 'smart_fallback',
        geminiConfigured: false,
      });
    }

    const prompt = `You are an expert SEO & Digital Freebies editor for "DigitalFreebies.io", a curated platform for verified digital freebies, free trials, student perks, software giveaways, and streaming deals.

The admin is adding a freebie and provided:
- Current Input Title: ${title ? JSON.stringify(title) : '(not provided yet)'}
- Freebie Link (URL): ${offerUrl ? JSON.stringify(offerUrl) : '(not provided yet)'}
- Webpage Scraped Title: ${scraped.pageTitle ? JSON.stringify(scraped.pageTitle) : '(unavailable)'}
- Webpage Meta Description: ${scraped.metaDescription ? JSON.stringify(scraped.metaDescription) : '(unavailable)'}
- Webpage Site Name / Brand Hint: ${scraped.ogSiteName || scraped.domainBrand || '(unavailable)'}
- Webpage Headings: ${scraped.headings.length > 0 ? JSON.stringify(scraped.headings) : '(none)'}

Generate a JSON object with these exact keys:
1. "suggestedTitle": A high-converting, clean, clear freebie title formatted like "Brand — Offer Value / Free Trial Duration" (for example: "YouTube Premium — 1 Month Free Trial" or "Canva Pro — 30-Day Free Trial for Creators"). Make it better and more appealing than the raw input title.
2. "brand": The exact official Brand name only (e.g., "YouTube", "Spotify", "NordVPN", "Adobe", "Canva").
3. "shortDescription": A compelling 1-2 sentence summary (between 90 and 155 characters) displayed on the offer card.
4. "fullDescription": A comprehensive, helpful description for the freebie detail page. Format section headers on their own line surrounded by double asterisks like "**What You Get**" and "**How to Claim This Freebie**", and format bullet points on their own lines starting with "- ". Do NOT use # markdown headers.
5. "metaTitle": An SEO-optimized meta title for Google Search, strictly 50 to 60 characters max, front-loading the brand, freebie offer, and high-intent keywords, and ending with " | DigitalFreebies.io" (for example: "YouTube Premium 1-Month Free Trial | DigitalFreebies.io").
6. "metaDescription": An SEO-optimized meta description for Google Search, strictly 130 to 158 characters max, persuasive with a clear call to action.

Return ONLY valid JSON matching those 6 keys.`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let geminiResult: Record<string, string> | null = null;
    let lastApiError = '';

    for (const modelName of modelsToTry) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
          apiKey
        )}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.4,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastApiError = errData?.error?.message || `HTTP ${res.status}`;
          continue;
        }

        const data = await res.json();
        const rawText =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!rawText) continue;

        const cleanedJson = rawText
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/, '')
          .trim();

        const parsed = JSON.parse(cleanedJson);
        if (parsed && typeof parsed === 'object') {
          geminiResult = parsed;
          break;
        }
      } catch (err) {
        lastApiError = err instanceof Error ? err.message : 'Gemini request failed';
      }
    }

    if (!geminiResult) {
      return NextResponse.json({
        ...fallback,
        source: 'smart_fallback',
        geminiConfigured: true,
        warning: lastApiError
          ? `Gemini API returned an issue (${lastApiError}); used smart fallback.`
          : undefined,
      });
    }

    const finalMetaTitle = formatSeoMetaTitle(
      String(geminiResult.metaTitle || fallback.metaTitle).trim()
    );
    const finalMetaDescription = String(
      geminiResult.metaDescription || fallback.metaDescription
    )
      .trim()
      .slice(0, 160);

    return NextResponse.json({
      suggestedTitle: String(geminiResult.suggestedTitle || fallback.suggestedTitle).trim(),
      brand: String(geminiResult.brand || fallback.brand).trim(),
      shortDescription: String(
        geminiResult.shortDescription || fallback.shortDescription
      ).trim(),
      fullDescription: String(
        geminiResult.fullDescription || fallback.fullDescription
      ).trim(),
      metaTitle: finalMetaTitle,
      metaDescription: finalMetaDescription,
      source: 'gemini',
      geminiConfigured: true,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/gemini-freebie:', error);
    return NextResponse.json(
      { error: 'Failed to generate freebie details' },
      { status: 500 }
    );
  }
}
