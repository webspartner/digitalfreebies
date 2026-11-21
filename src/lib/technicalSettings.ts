import { promises as fs } from 'fs';
import path from 'path';

export interface CustomApiEntry {
  id: string;
  name: string;
  envKey: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface TechnicalSettingsData {
  seo: {
    homepageTitle: string;
    homepageDescription: string;
    homepageKeywords: string;
    ogTitle: string;
    ogDescription: string;
    canonicalUrl: string;
    robotsMeta: string;
    customHeadHtml: string;
  };
  serverFiles: {
    htaccess: string;
    robotsTxt: string;
    adsTxt: string;
  };
  cloudflare: {
    enabled: boolean;
    tunnelName: string;
    tunnelToken: string;
    publicHostname: string;
    localServiceUrl: string;
    turnstileSiteKey?: string;
    turnstileSecretKey?: string;
  };
  google: {
    siteVerification: string;
    tagManagerId: string;
    adsenseClientId: string;
    oauthClientId: string;
    geminiApiKey?: string;
  };
  customApis: CustomApiEntry[];
  updatedAt: string;
}

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'prisma', 'technical-settings.json');
const PUBLIC_HTACCESS_PATH = path.join(process.cwd(), 'public', '.htaccess');
const PUBLIC_ADS_TXT_PATH = path.join(process.cwd(), 'public', 'ads.txt');

const DEFAULT_HTACCESS = `# DigitalFreebies.io - .htaccess Configuration
<IfModule mod_rewrite.c>
  RewriteEngine On

  # Force HTTPS
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # Block direct access to sensitive files
  RewriteRule ^(\\.env|prisma/|\\.git) - [F,L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Browser Caching for Static Assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/avif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>`;

const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /admin/
Disallow: /wp-admin
Disallow: /wp-admin/

Sitemap: https://digitalfreebies.io/sitemap.xml`;

const DEFAULT_SETTINGS: TechnicalSettingsData = {
  seo: {
    homepageTitle: 'DigitalFreebies.io — Discover Free Digital Offers, Trials & Promotions',
    homepageDescription:
      'Find the best free digital offers, trials, and promotions. Free streaming, VPN trials, gaming deals, educational resources, and software freebies — all in one place.',
    homepageKeywords:
      'free trials, free offers, digital freebies, free streaming, free VPN, free games, free software, promotions',
    ogTitle: 'DigitalFreebies.io — Discover Free Digital Offers',
    ogDescription:
      'Find the best free digital offers, trials, and promotions. Free streaming, VPN trials, gaming deals, educational resources, and software freebies.',
    canonicalUrl: 'https://digitalfreebies.io',
    robotsMeta: 'index, follow',
    customHeadHtml: '',
  },
  serverFiles: {
    htaccess: DEFAULT_HTACCESS,
    robotsTxt: DEFAULT_ROBOTS_TXT,
    adsTxt: '',
  },
  cloudflare: {
    enabled: false,
    tunnelName: 'digitalfreebies-tunnel',
    tunnelToken: process.env.CLOUDFLARE_TUNNEL_TOKEN || '',
    publicHostname: 'https://digitalfreebies.io',
    localServiceUrl: 'http://localhost:3000',
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '',
  },
  google: {
    siteVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
    tagManagerId: process.env.NEXT_PUBLIC_GTM_ID || '',
    adsenseClientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '',
    oauthClientId: process.env.GOOGLE_CLIENT_ID || '',
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '',
  },
  customApis: [],
  updatedAt: new Date().toISOString(),
};

export async function getTechnicalSettings(): Promise<TechnicalSettingsData> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      seo: {
        ...DEFAULT_SETTINGS.seo,
        ...(parsed.seo || {}),
      },
      serverFiles: {
        ...DEFAULT_SETTINGS.serverFiles,
        ...(parsed.serverFiles || {}),
      },
      cloudflare: {
        ...DEFAULT_SETTINGS.cloudflare,
        ...(parsed.cloudflare || {}),
      },
      google: {
        ...DEFAULT_SETTINGS.google,
        ...(parsed.google || {}),
      },
      customApis: Array.isArray(parsed.customApis) ? parsed.customApis : [],
      updatedAt: parsed.updatedAt || DEFAULT_SETTINGS.updatedAt,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveTechnicalSettings(
  next: Partial<TechnicalSettingsData>
): Promise<TechnicalSettingsData> {
  const current = await getTechnicalSettings();
  const merged: TechnicalSettingsData = {
    seo: {
      ...current.seo,
      ...(next.seo || {}),
    },
    serverFiles: {
      ...current.serverFiles,
      ...(next.serverFiles || {}),
    },
    cloudflare: {
      ...current.cloudflare,
      ...(next.cloudflare || {}),
    },
    google: {
      ...current.google,
      ...(next.google || {}),
    },
    customApis: next.customApis !== undefined ? next.customApis : current.customApis,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(SETTINGS_FILE_PATH), { recursive: true });
  await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(merged, null, 2), 'utf8');

  // Sync .htaccess and ads.txt to public/ when serverFiles are updated
  if (next.serverFiles) {
    try {
      await fs.mkdir(path.dirname(PUBLIC_HTACCESS_PATH), { recursive: true });
      await fs.writeFile(PUBLIC_HTACCESS_PATH, merged.serverFiles.htaccess, 'utf8');
      if (merged.serverFiles.adsTxt.trim()) {
        await fs.writeFile(PUBLIC_ADS_TXT_PATH, merged.serverFiles.adsTxt, 'utf8');
      }
    } catch (err) {
      console.error('Failed to sync server files to public directory:', err);
    }
  }

  return merged;
}

export async function getGeminiApiKey(): Promise<string> {
  const settings = await getTechnicalSettings();
  if (settings.google?.geminiApiKey?.trim()) {
    return settings.google.geminiApiKey.trim();
  }
  const fromCustom = settings.customApis.find(
    (api) =>
      /gemini|google_ai|generative/i.test(api.envKey) ||
      /gemini|google ai/i.test(api.name)
  );
  if (fromCustom?.value?.trim()) {
    return fromCustom.value.trim();
  }
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  ).trim();
}

export async function getTurnstileConfig(): Promise<{
  enabled: boolean;
  siteKey: string;
  secretKey: string;
}> {
  const settings = await getTechnicalSettings();
  const siteKey = (
    settings.cloudflare?.turnstileSiteKey ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    ''
  ).trim();
  const secretKey = (
    settings.cloudflare?.turnstileSecretKey ||
    process.env.TURNSTILE_SECRET_KEY ||
    ''
  ).trim();
  const enabled = Boolean(siteKey && secretKey);
  return {
    enabled,
    siteKey: enabled ? siteKey : '',
    secretKey: enabled ? secretKey : '',
  };
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const { enabled, secretKey } = await getTurnstileConfig();
  if (!enabled) {
    return { success: true };
  }

  if (!token || typeof token !== 'string' || !token.trim()) {
    return {
      success: false,
      error: 'Please complete the Cloudflare Turnstile security check.',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    if (remoteIp && remoteIp !== 'unknown') {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = await res.json();
    if (data && data.success) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Cloudflare security verification failed or expired. Please try again.',
    };
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return {
      success: false,
      error: 'Unable to verify Cloudflare security check. Please try again.',
    };
  }
}

