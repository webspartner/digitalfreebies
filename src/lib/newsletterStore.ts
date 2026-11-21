import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export type MarketingProvider =
  | 'smtp'
  | 'mailchimp'
  | 'convertkit'
  | 'brevo'
  | 'mailerlite'
  | 'klaviyo'
  | 'custom_webhook';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: 'subscribed' | 'unsubscribed';
  source: string;
  syncedToPlatform: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailMarketingPlatformConfig {
  provider: MarketingProvider;
  enabled: boolean;
  apiKey: string;
  audienceOrListId: string;
  serverPrefix: string;
  webhookUrl: string;
  autoSyncNewSubscribers: boolean;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  updatedAt: string;
}

export interface NewsletterCampaignLog {
  id: string;
  subject: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  method: string;
  sentBy: string;
  sentAt: string;
}

export interface NewsletterStoreData {
  subscribers: NewsletterSubscriber[];
  platform: EmailMarketingPlatformConfig;
  campaigns: NewsletterCampaignLog[];
}

const NEWSLETTER_FILE_PATH = path.join(process.cwd(), 'prisma', 'newsletter-data.json');

const DEFAULT_STORE: NewsletterStoreData = {
  subscribers: [],
  platform: {
    provider: 'smtp',
    enabled: true,
    apiKey: '',
    audienceOrListId: '',
    serverPrefix: '',
    webhookUrl: '',
    autoSyncNewSubscribers: true,
    fromName: 'DigitalFreebies.io',
    fromEmail: 'noreply@digitalfreebies.io',
    replyToEmail: '',
    updatedAt: new Date().toISOString(),
  },
  campaigns: [],
};

export async function getNewsletterStore(): Promise<NewsletterStoreData> {
  try {
    const raw = await fs.readFile(NEWSLETTER_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : [],
      platform: {
        ...DEFAULT_STORE.platform,
        ...(parsed.platform || {}),
      },
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
    };
  } catch {
    return {
      subscribers: [...DEFAULT_STORE.subscribers],
      platform: { ...DEFAULT_STORE.platform },
      campaigns: [...DEFAULT_STORE.campaigns],
    };
  }
}

export async function saveNewsletterStore(data: NewsletterStoreData): Promise<void> {
  await fs.mkdir(path.dirname(NEWSLETTER_FILE_PATH), { recursive: true });
  await fs.writeFile(NEWSLETTER_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export async function addNewsletterSubscriber(
  rawEmail: string,
  source = 'website'
): Promise<{ subscriber: NewsletterSubscriber; isNew: boolean }> {
  const email = rawEmail.trim().toLowerCase();
  const store = await getNewsletterStore();
  const now = new Date().toISOString();

  const existing = store.subscribers.find((s) => s.email.toLowerCase() === email);
  if (existing) {
    const wasUnsubscribed = existing.status === 'unsubscribed';
    existing.status = 'subscribed';
    existing.updatedAt = now;
    await saveNewsletterStore(store);
    return { subscriber: existing, isNew: wasUnsubscribed };
  }

  const newSub: NewsletterSubscriber = {
    id: crypto.randomUUID(),
    email,
    status: 'subscribed',
    source,
    syncedToPlatform: false,
    createdAt: now,
    updatedAt: now,
  };

  store.subscribers.unshift(newSub);
  await saveNewsletterStore(store);

  return { subscriber: newSub, isNew: true };
}

/**
 * Syncs a subscriber email to the external Email Marketing Platform if configured.
 */
export async function syncSubscriberToPlatform(
  email: string,
  platform: EmailMarketingPlatformConfig
): Promise<{ synced: boolean; error?: string }> {
  if (!platform.enabled || platform.provider === 'smtp') {
    return { synced: true };
  }

  try {
    switch (platform.provider) {
      case 'mailchimp': {
        if (!platform.apiKey || !platform.audienceOrListId) {
          return { synced: false, error: 'Missing Mailchimp API Key or Audience ID' };
        }
        const dc =
          platform.serverPrefix.trim() ||
          platform.apiKey.split('-')[1] ||
          'us1';
        const url = `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(
          platform.audienceOrListId.trim()
        )}/members`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`anystring:${platform.apiKey.trim()}`).toString('base64')}`,
          },
          body: JSON.stringify({
            email_address: email,
            status: 'subscribed',
          }),
        });
        if (!res.ok && res.status !== 400) {
          return { synced: false, error: `Mailchimp HTTP ${res.status}` };
        }
        return { synced: true };
      }

      case 'convertkit': {
        if (!platform.apiKey || !platform.audienceOrListId) {
          return { synced: false, error: 'Missing ConvertKit API Key or Form ID' };
        }
        const url = `https://api.convertkit.com/v3/forms/${encodeURIComponent(
          platform.audienceOrListId.trim()
        )}/subscribe`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: platform.apiKey.trim(),
            email,
          }),
        });
        if (!res.ok) {
          return { synced: false, error: `ConvertKit HTTP ${res.status}` };
        }
        return { synced: true };
      }

      case 'brevo': {
        if (!platform.apiKey) {
          return { synced: false, error: 'Missing Brevo API Key' };
        }
        const listIdNum = parseInt(platform.audienceOrListId.trim(), 10);
        const res = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': platform.apiKey.trim(),
          },
          body: JSON.stringify({
            email,
            updateEnabled: true,
            ...(listIdNum ? { listIds: [listIdNum] } : {}),
          }),
        });
        if (!res.ok && res.status !== 204) {
          return { synced: false, error: `Brevo HTTP ${res.status}` };
        }
        return { synced: true };
      }

      case 'mailerlite': {
        if (!platform.apiKey) {
          return { synced: false, error: 'Missing MailerLite API Token' };
        }
        const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${platform.apiKey.trim()}`,
          },
          body: JSON.stringify({
            email,
            ...(platform.audienceOrListId.trim()
              ? { groups: [platform.audienceOrListId.trim()] }
              : {}),
          }),
        });
        if (!res.ok) {
          return { synced: false, error: `MailerLite HTTP ${res.status}` };
        }
        return { synced: true };
      }

      case 'klaviyo': {
        if (!platform.apiKey) {
          return { synced: false, error: 'Missing Klaviyo Private API Key' };
        }
        const res = await fetch('https://a.klaviyo.com/api/profiles/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Klaviyo-API-Key ${platform.apiKey.trim()}`,
            revision: '2024-02-15',
          },
          body: JSON.stringify({
            data: {
              type: 'profile',
              attributes: { email },
            },
          }),
        });
        if (!res.ok && res.status !== 409) {
          return { synced: false, error: `Klaviyo HTTP ${res.status}` };
        }
        return { synced: true };
      }

      case 'custom_webhook': {
        if (!platform.webhookUrl.trim()) {
          return { synced: false, error: 'Missing Custom Webhook URL' };
        }
        const res = await fetch(platform.webhookUrl.trim(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(platform.apiKey.trim()
              ? { Authorization: `Bearer ${platform.apiKey.trim()}` }
              : {}),
          },
          body: JSON.stringify({
            event: 'newsletter.subscribed',
            email,
            source: 'DigitalFreebies.io',
            timestamp: new Date().toISOString(),
          }),
        });
        if (!res.ok) {
          return { synced: false, error: `Webhook HTTP ${res.status}` };
        }
        return { synced: true };
      }

      default:
        return { synced: true };
    }
  } catch (err) {
    return {
      synced: false,
      error: err instanceof Error ? err.message : 'Platform sync failed',
    };
  }
}
