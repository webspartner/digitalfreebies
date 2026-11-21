import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminFromRequest } from '@/lib/auth';
import { getActiveSmtpConfig, sendSmtpEmail } from '@/lib/mailer';
import { logActivity } from '@/lib/audit';
import {
  addNewsletterSubscriber,
  getNewsletterStore,
  saveNewsletterStore,
  syncSubscriberToPlatform,
  type MarketingProvider,
} from '@/lib/newsletterStore';

function buildNewsletterEmailHtml(params: {
  subject: string;
  headline: string;
  bodyText: string;
  ctaLabel?: string;
  ctaUrl?: string;
  fromName: string;
}) {
  const paragraphs = params.bodyText
    .split('\n')
    .map((line) => line.trim())
    .map((line) =>
      line
        ? `<p style="margin: 0 0 14px; font-size: 15px; line-height: 1.65; color: #374151;">${line}</p>`
        : '<br />'
    )
    .join('');

  const ctaSection =
    params.ctaLabel && params.ctaUrl
      ? `
        <div style="text-align: center; margin: 28px 0;">
          <a href="${params.ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 13px 32px; font-size: 14px; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #560981 0%, #6a0b9e 100%); border-radius: 9999px; text-decoration: none;">
            ${params.ctaLabel} →
          </a>
        </div>
      `
      : '';

  return `
    <div style="font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #560981 0%, #6a0b9e 100%); padding: 26px 32px; color: #ffffff;">
        <div style="font-size: 21px; font-weight: 800; letter-spacing: -0.3px;">${params.fromName || 'DigitalFreebies.io'}</div>
        <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Handpicked Digital Freebies, Trials & Exclusive Deals</div>
      </div>
      <div style="padding: 32px; color: #1f2937;">
        ${
          params.headline
            ? `<h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #111827; line-height: 1.3;">${params.headline}</h1>`
            : ''
        }
        ${paragraphs}
        ${ctaSection}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 16px;" />
        <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
          You are receiving this email because you subscribed to freebie alerts on <strong>DigitalFreebies.io</strong>.
        </p>
      </div>
    </div>
  `;
}

// GET /api/admin/newsletter
export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [store, smtpConfig] = await Promise.all([
      getNewsletterStore(),
      getActiveSmtpConfig(),
    ]);

    return NextResponse.json(
      {
        subscribers: store.subscribers,
        platform: store.platform,
        campaigns: store.campaigns,
        smtpConfigured: smtpConfig.configured,
        smtpHost: smtpConfig.host,
        smtpFromEmail: smtpConfig.fromEmail,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error loading admin newsletter data:', error);
    return NextResponse.json({ error: 'Failed to load newsletter data' }, { status: 500 });
  }
}

// POST /api/admin/newsletter
export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'add_subscribers') {
      const rawEmails: string = body.emails || '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const candidates = rawEmails
        .split(/[\n,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => emailRegex.test(e));

      if (candidates.length === 0) {
        return NextResponse.json(
          { error: 'Please enter at least one valid email address' },
          { status: 400 }
        );
      }

      let addedCount = 0;
      for (const email of candidates) {
        const { isNew } = await addNewsletterSubscriber(email, 'admin');
        if (isNew) addedCount++;
      }

      const store = await getNewsletterStore();
      await logActivity({
        actor: admin.username,
        actorRole: admin.role || 'admin',
        action: 'NEWSLETTER_SUBSCRIBERS_ADDED',
        category: 'general',
        summary: `Added ${candidates.length} email(s) to newsletter subscribers`,
        request,
      });

      return NextResponse.json({
        message: `Processed ${candidates.length} email(s) (${addedCount} newly added).`,
        subscribers: store.subscribers,
      });
    }

    if (action === 'toggle_status') {
      const { id } = body;
      const store = await getNewsletterStore();
      const target = store.subscribers.find((s) => s.id === id);
      if (!target) {
        return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
      }

      target.status = target.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
      target.updatedAt = new Date().toISOString();
      await saveNewsletterStore(store);

      return NextResponse.json({
        message: `Updated ${target.email} to ${target.status}.`,
        subscribers: store.subscribers,
      });
    }

    if (action === 'sync_all') {
      const store = await getNewsletterStore();
      const activeSubs = store.subscribers.filter((s) => s.status === 'subscribed');

      if (activeSubs.length === 0) {
        return NextResponse.json({ error: 'No active subscribers to sync' }, { status: 400 });
      }

      let syncedCount = 0;
      let lastError = '';

      for (const sub of activeSubs) {
        const result = await syncSubscriberToPlatform(sub.email, store.platform);
        if (result.synced) {
          sub.syncedToPlatform = true;
          syncedCount++;
        } else if (result.error) {
          lastError = result.error;
        }
      }

      await saveNewsletterStore(store);

      if (syncedCount === 0 && lastError) {
        return NextResponse.json(
          { error: `Sync failed: ${lastError}` },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: `Synced ${syncedCount} of ${activeSubs.length} active subscriber(s) to ${store.platform.provider.toUpperCase()}.`,
        subscribers: store.subscribers,
      });
    }

    if (action === 'send_campaign') {
      const emailFormat: 'template' | 'custom_html' =
        body.emailFormat === 'custom_html' ? 'custom_html' : 'template';
      const subject = (body.subject || '').trim();
      const headline = (body.headline || '').trim();
      const messageBody = (body.message || '').trim();
      const customHtml = (body.customHtml || '').trim();
      const ctaLabel = (body.ctaLabel || '').trim();
      const ctaUrl = (body.ctaUrl || '').trim();
      const testEmail = (body.testEmail || '').trim();
      const targetEmails: string[] | undefined = Array.isArray(body.targetEmails)
        ? body.targetEmails
        : undefined;

      if (!subject) {
        return NextResponse.json(
          { error: 'Email Subject is required' },
          { status: 400 }
        );
      }

      if (emailFormat === 'custom_html' && !customHtml) {
        return NextResponse.json(
          { error: 'Custom HTML content is required when Custom HTML mode is selected' },
          { status: 400 }
        );
      }

      if (emailFormat === 'template' && !messageBody) {
        return NextResponse.json(
          { error: 'Subject and email message body are required' },
          { status: 400 }
        );
      }

      const store = await getNewsletterStore();
      const recipients = testEmail
        ? [testEmail]
        : targetEmails && targetEmails.length > 0
        ? targetEmails
        : store.subscribers
            .filter((s) => s.status === 'subscribed')
            .map((s) => s.email);

      if (recipients.length === 0) {
        return NextResponse.json(
          { error: 'There are no active subscribers to send this email to' },
          { status: 400 }
        );
      }

      const html =
        emailFormat === 'custom_html'
          ? customHtml
          : buildNewsletterEmailHtml({
              subject,
              headline: headline || subject,
              bodyText: messageBody,
              ctaLabel: ctaLabel || undefined,
              ctaUrl: ctaUrl || undefined,
              fromName: store.platform.fromName || 'DigitalFreebies.io',
            });

      const plainText =
        emailFormat === 'custom_html'
          ? customHtml
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim() || subject
          : `${headline ? headline + '\n\n' : ''}${messageBody}${
              ctaLabel && ctaUrl ? `\n\n${ctaLabel}: ${ctaUrl}` : ''
            }`;

      let sentCount = 0;
      let failedCount = 0;
      let smtpConfigured = true;
      let lastError = '';

      // If custom webhook is selected and enabled, also trigger webhook broadcast
      if (
        store.platform.enabled &&
        store.platform.provider === 'custom_webhook' &&
        store.platform.webhookUrl.trim()
      ) {
        try {
          const whRes = await fetch(store.platform.webhookUrl.trim(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(store.platform.apiKey.trim()
                ? { Authorization: `Bearer ${store.platform.apiKey.trim()}` }
                : {}),
            },
            body: JSON.stringify({
              event: 'newsletter.campaign_send',
              subject,
              headline,
              message: messageBody,
              ctaLabel,
              ctaUrl,
              html,
              recipients,
              timestamp: new Date().toISOString(),
            }),
          });
          if (whRes.ok) {
            sentCount = recipients.length;
          } else {
            failedCount = recipients.length;
            lastError = `Webhook responded with HTTP ${whRes.status}`;
          }
        } catch (err) {
          failedCount = recipients.length;
          lastError = err instanceof Error ? err.message : 'Webhook request failed';
        }
      } else {
        for (const toEmail of recipients) {
          const res = await sendSmtpEmail({
            to: toEmail,
            subject,
            html,
            text: plainText,
          });
          if (!res.smtpConfigured) {
            smtpConfigured = false;
            // Count as queued/logged in dev mode so admin can test flow
            sentCount++;
          } else if (res.sent) {
            sentCount++;
          } else {
            failedCount++;
            if (res.error) lastError = res.error;
          }
        }
      }

      if (!testEmail) {
        store.campaigns.unshift({
          id: crypto.randomUUID(),
          subject,
          recipientCount: recipients.length,
          sentCount,
          failedCount,
          method: !smtpConfigured
            ? `${store.platform.provider.toUpperCase()} (Simulated / SMTP Unconfigured)`
            : store.platform.provider.toUpperCase(),
          sentBy: admin.username,
          sentAt: new Date().toISOString(),
        });
        store.campaigns = store.campaigns.slice(0, 50);
        await saveNewsletterStore(store);

        await logActivity({
          actor: admin.username,
          actorRole: admin.role || 'admin',
          action: 'NEWSLETTER_CAMPAIGN_SENT',
          category: 'general',
          summary: `Sent newsletter "${subject}" to ${recipients.length} subscriber(s)`,
          request,
        });
      }

      if (failedCount > 0 && sentCount === 0) {
        return NextResponse.json(
          { error: `Failed to send email: ${lastError || 'Check SMTP / Platform settings'}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: !smtpConfigured
          ? `Campaign "${subject}" queued & logged for ${sentCount} recipient(s) (Configure SMTP in Settings for live email delivery).`
          : testEmail
          ? `Test email sent to ${testEmail}!`
          : `Newsletter "${subject}" sent to ${sentCount} subscriber(s)${
              failedCount > 0 ? ` (${failedCount} failed)` : ''
            }!`,
        campaigns: store.campaigns,
        smtpConfigured,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/admin/newsletter:', error);
    return NextResponse.json({ error: 'Newsletter action failed' }, { status: 500 });
  }
}

// PUT /api/admin/newsletter - Update Email Marketing Platform settings
export async function PUT(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const store = await getNewsletterStore();

    const validProviders: MarketingProvider[] = [
      'smtp',
      'mailchimp',
      'convertkit',
      'brevo',
      'mailerlite',
      'klaviyo',
      'custom_webhook',
    ];

    const provider: MarketingProvider = validProviders.includes(body.provider)
      ? body.provider
      : store.platform.provider;

    store.platform = {
      provider,
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : store.platform.enabled,
      apiKey: typeof body.apiKey === 'string' ? body.apiKey.trim() : store.platform.apiKey,
      audienceOrListId:
        typeof body.audienceOrListId === 'string'
          ? body.audienceOrListId.trim()
          : store.platform.audienceOrListId,
      serverPrefix:
        typeof body.serverPrefix === 'string'
          ? body.serverPrefix.trim()
          : store.platform.serverPrefix,
      webhookUrl:
        typeof body.webhookUrl === 'string'
          ? body.webhookUrl.trim()
          : store.platform.webhookUrl,
      autoSyncNewSubscribers:
        body.autoSyncNewSubscribers !== undefined
          ? Boolean(body.autoSyncNewSubscribers)
          : store.platform.autoSyncNewSubscribers,
      fromName:
        typeof body.fromName === 'string' && body.fromName.trim()
          ? body.fromName.trim()
          : 'DigitalFreebies.io',
      fromEmail:
        typeof body.fromEmail === 'string'
          ? body.fromEmail.trim()
          : store.platform.fromEmail,
      replyToEmail:
        typeof body.replyToEmail === 'string'
          ? body.replyToEmail.trim()
          : store.platform.replyToEmail,
      updatedAt: new Date().toISOString(),
    };

    await saveNewsletterStore(store);

    await logActivity({
      actor: admin.username,
      actorRole: admin.role || 'admin',
      action: 'NEWSLETTER_PLATFORM_UPDATED',
      category: 'general',
      summary: `Updated email marketing platform settings (${store.platform.provider})`,
      request,
    });

    return NextResponse.json({
      message: 'Email marketing platform settings saved successfully!',
      platform: store.platform,
    });
  } catch (error) {
    console.error('Error saving marketing platform settings:', error);
    return NextResponse.json(
      { error: 'Failed to save email marketing platform settings' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/newsletter - Remove subscriber(s)
export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const store = await getNewsletterStore();
    if (id === 'unsubscribed') {
      const before = store.subscribers.length;
      store.subscribers = store.subscribers.filter((s) => s.status !== 'unsubscribed');
      const removed = before - store.subscribers.length;
      await saveNewsletterStore(store);
      return NextResponse.json({
        message: `Removed ${removed} unsubscribed email(s).`,
        subscribers: store.subscribers,
      });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing subscriber ID' }, { status: 400 });
    }

    const existing = store.subscribers.find((s) => s.id === id);
    store.subscribers = store.subscribers.filter((s) => s.id !== id);
    await saveNewsletterStore(store);

    if (existing) {
      await logActivity({
        actor: admin.username,
        actorRole: admin.role || 'admin',
        action: 'NEWSLETTER_SUBSCRIBER_DELETED',
        category: 'general',
        summary: `Removed ${existing.email} from newsletter subscribers`,
        request,
      });
    }

    return NextResponse.json({
      message: 'Subscriber removed successfully.',
      subscribers: store.subscribers,
    });
  } catch (error) {
    console.error('Error deleting newsletter subscriber:', error);
    return NextResponse.json({ error: 'Failed to delete subscriber' }, { status: 500 });
  }
}
