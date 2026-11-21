'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../admin.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';

type MarketingProvider =
  | 'smtp'
  | 'mailchimp'
  | 'convertkit'
  | 'brevo'
  | 'mailerlite'
  | 'klaviyo'
  | 'custom_webhook';

interface NewsletterSubscriber {
  id: string;
  email: string;
  status: 'subscribed' | 'unsubscribed';
  source: string;
  syncedToPlatform: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailMarketingPlatformConfig {
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

interface NewsletterCampaignLog {
  id: string;
  subject: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  method: string;
  sentBy: string;
  sentAt: string;
}

const PROVIDER_LABELS: Record<MarketingProvider, string> = {
  smtp: 'Built-in SMTP Server',
  mailchimp: 'Mailchimp',
  convertkit: 'ConvertKit (Kit)',
  brevo: 'Brevo (Sendinblue)',
  mailerlite: 'MailerLite',
  klaviyo: 'Klaviyo',
  custom_webhook: 'Custom Webhook (Zapier / Make / n8n)',
};

export default function AdminNewsletterPage() {
  const { confirm } = useDialog();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'subscribers' | 'campaign' | 'platform'>('subscribers');
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [campaigns, setCampaigns] = useState<NewsletterCampaignLog[]>([]);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');

  const [platform, setPlatform] = useState<EmailMarketingPlatformConfig>({
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
    updatedAt: '',
  });

  // Feedback message
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Subscribers tab states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [newEmailsInput, setNewEmailsInput] = useState('');
  const [addingEmails, setAddingEmails] = useState(false);
  const [sortField, setSortField] = useState<'email' | 'status' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Campaign tab states
  const [recipientMode, setRecipientMode] = useState<'all' | 'custom'>('all');
  const [customRecipients, setCustomRecipients] = useState('');
  const [emailFormat, setEmailFormat] = useState<'template' | 'custom_html'>('template');
  const [subject, setSubject] = useState('');
  const [headline, setHeadline] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [customHtml, setCustomHtml] = useState(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DigitalFreebies Newsletter</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f3f4f6; font-family: 'Montserrat', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e5e7eb;">
    <tr>
      <td style="background: linear-gradient(135deg, #560981 0%, #6a0b9e 100%); padding: 28px 32px; color: #ffffff; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">DigitalFreebies.io</h1>
        <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Handpicked Digital Freebies, Trials &amp; Exclusive Deals</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px; color: #1f2937;">
        <h2 style="margin: 0 0 14px; font-size: 20px; color: #111827;">🔥 Top New Freebies This Week</h2>
        <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.65; color: #374151;">
          Check out our latest verified digital freebies and exclusive free trials below!
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://digitalfreebies.io/freebies" target="_blank" style="display: inline-block; padding: 13px 32px; font-size: 14px; font-weight: 700; color: #ffffff; background: #560981; border-radius: 9999px; text-decoration: none;">
            Claim Freebies Now →
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 16px;" />
        <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
          You are receiving this email because you subscribed on <strong>DigitalFreebies.io</strong>.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [ctaLabel, setCtaLabel] = useState('Explore Freebies');
  const [ctaUrl, setCtaUrl] = useState('https://digitalfreebies.io/freebies');
  const [testEmail, setTestEmail] = useState('');
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Platform tab states
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [syncingPlatform, setSyncingPlatform] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/df-admin77/login');
      return;
    }
    fetchNewsletterData(token);
  }, [router]);

  const fetchNewsletterData = async (tokenOverride?: string) => {
    const token = tokenOverride || localStorage.getItem('admin_token');
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/newsletter', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        router.push('/df-admin77/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data.subscribers || []);
        if (data.platform) setPlatform(data.platform);
        setCampaigns(data.campaigns || []);
        setSmtpConfigured(Boolean(data.smtpConfigured));
        setSmtpHost(data.smtpHost || '');
        setSmtpFromEmail(data.smtpFromEmail || '');
      }
    } catch (err) {
      console.error('Failed to load newsletter data:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeSubscribers = useMemo(
    () => subscribers.filter((s) => s.status === 'subscribed'),
    [subscribers]
  );
  const unsubscribedCount = useMemo(
    () => subscribers.filter((s) => s.status === 'unsubscribed').length,
    [subscribers]
  );

  const filteredSubscribers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = subscribers.filter((sub) => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (q && !sub.email.toLowerCase().includes(q) && !sub.source.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortField === 'email') return a.email.localeCompare(b.email) * dir;
      if (sortField === 'status') return a.status.localeCompare(b.status) * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });
  }, [subscribers, searchQuery, statusFilter, sortField, sortDir]);

  const handleSort = (field: 'email' | 'status' | 'createdAt') => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const rows = [
      ['Email', 'Status', 'Source', 'SyncedToPlatform', 'SubscribedAt'],
      ...filteredSubscribers.map((s) => [
        `"${s.email.replace(/"/g, '""')}"`,
        s.status,
        s.source,
        s.syncedToPlatform ? 'yes' : 'no',
        s.createdAt,
      ]),
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export TXT (only emails, one per line)
  const handleExportTxt = () => {
    const txtContent = filteredSubscribers.map((s) => s.email).join('\n');
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `newsletter-emails-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy active emails to clipboard
  const handleCopyEmails = async () => {
    const list = activeSubscribers.map((s) => s.email).join(', ');
    if (!list) {
      setFeedback({ text: 'No active subscriber emails to copy.', type: 'error' });
      return;
    }
    try {
      await navigator.clipboard.writeText(list);
      setFeedback({
        text: `Copied ${activeSubscribers.length} active subscriber email(s) to clipboard!`,
        type: 'success',
      });
    } catch {
      setFeedback({ text: 'Failed to copy to clipboard.', type: 'error' });
    }
  };

  // Add subscribers manually
  const handleAddSubscribers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailsInput.trim()) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setAddingEmails(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'add_subscribers',
          emails: newEmailsInput,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubscribers(data.subscribers || []);
        setNewEmailsInput('');
        setFeedback({ text: data.message || 'Subscribers added!', type: 'success' });
      } else {
        setFeedback({ text: data.error || 'Failed to add subscribers', type: 'error' });
      }
    } catch {
      setFeedback({ text: 'Network error adding subscribers', type: 'error' });
    } finally {
      setAddingEmails(false);
    }
  };

  // Toggle status
  const handleToggleStatus = async (id: string) => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'toggle_status', id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubscribers(data.subscribers || []);
      }
    } catch {
      // ignore
    }
  };

  // Delete subscriber
  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!(await confirm(`Remove "${email}" from the newsletter list?`))) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/newsletter?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSubscribers(data.subscribers || []);
        setFeedback({ text: `Removed ${email}.`, type: 'success' });
      }
    } catch {
      setFeedback({ text: 'Network error removing subscriber.', type: 'error' });
    }
  };

  // Upload .html file into Custom HTML editor
  const handleHtmlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setCustomHtml(content);
        setEmailFormat('custom_html');
        setFeedback({ text: `Loaded HTML file "${file.name}" into editor.`, type: 'success' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const insertHtmlSnippet = (snippet: string) => {
    setCustomHtml((prev) => `${prev}\n${snippet}`);
  };

  // Send Campaign or Test Email
  const handleSendCampaign = async (isTest: boolean) => {
    if (!subject.trim()) {
      setFeedback({ text: 'Please enter an Email Subject Line.', type: 'error' });
      return;
    }

    if (emailFormat === 'custom_html' && !customHtml.trim()) {
      setFeedback({ text: 'Please enter or paste your Custom HTML email code.', type: 'error' });
      return;
    }

    if (emailFormat === 'template' && !messageBody.trim()) {
      setFeedback({ text: 'Please fill in both the Email Subject and Message Body.', type: 'error' });
      return;
    }

    if (isTest && !testEmail.trim()) {
      setFeedback({ text: 'Please enter a recipient email address for the test email.', type: 'error' });
      return;
    }

    const customList = customRecipients
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (!isTest) {
      const count =
        recipientMode === 'custom' ? customList.length : activeSubscribers.length;
      if (count === 0) {
        setFeedback({
          text: 'There are no recipients to send this campaign to.',
          type: 'error',
        });
        return;
      }
      if (
        !(await confirm(
          `Send ${emailFormat === 'custom_html' ? 'Custom HTML ' : ''}newsletter "${subject.trim()}" to ${count} subscriber(s)?`,
          { title: 'Confirm Newsletter Broadcast' }
        ))
      ) {
        return;
      }
    }

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    if (isTest) setSendingTest(true);
    else setSendingCampaign(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'send_campaign',
          emailFormat,
          subject: subject.trim(),
          headline: headline.trim(),
          message: messageBody.trim(),
          customHtml: customHtml.trim(),
          ctaLabel: ctaLabel.trim(),
          ctaUrl: ctaUrl.trim(),
          ...(isTest
            ? { testEmail: testEmail.trim() }
            : recipientMode === 'custom'
            ? { targetEmails: customList }
            : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ text: data.message, type: 'success' });
        if (data.campaigns) setCampaigns(data.campaigns);
      } else {
        setFeedback({ text: data.error || 'Failed to send email', type: 'error' });
      }
    } catch {
      setFeedback({ text: 'Network error while sending email', type: 'error' });
    } finally {
      setSendingTest(false);
      setSendingCampaign(false);
    }
  };

  // Save Marketing Platform
  const handleSavePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSavingPlatform(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(platform),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.platform) setPlatform(data.platform);
        setFeedback({
          text: data.message || 'Marketing platform settings saved!',
          type: 'success',
        });
      } else {
        setFeedback({
          text: data.error || 'Failed to save platform settings',
          type: 'error',
        });
      }
    } catch {
      setFeedback({ text: 'Network error saving platform settings', type: 'error' });
    } finally {
      setSavingPlatform(false);
    }
  };

  // Sync All Subscribers to Platform
  const handleSyncAll = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSyncingPlatform(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'sync_all' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.subscribers) setSubscribers(data.subscribers);
        setFeedback({ text: data.message, type: 'success' });
      } else {
        setFeedback({ text: data.error || 'Sync failed', type: 'error' });
      }
    } catch {
      setFeedback({ text: 'Network error syncing subscribers', type: 'error' });
    } finally {
      setSyncingPlatform(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.adminLayout}>
        <AdminNav />
        <div className={styles.adminMain} style={{ textAlign: 'center', paddingTop: '100px' }}>
          <p>Loading newsletter management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <AdminNav />

      <main className={styles.adminMain}>
        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h1 className={styles.pageTitle}>Newsletter & Email Marketing</h1>
            <p className={styles.pageSubtitle} style={{ marginBottom: 0 }}>
              View and export newsletter subscribers, send email broadcasts to your audience, and configure your email marketing platform.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleExportCsv}
              className={styles.addBtn}
              disabled={filteredSubscribers.length === 0}
            >
              ⬇ Export CSV ({filteredSubscribers.length})
            </button>
            <button
              type="button"
              onClick={handleExportTxt}
              className={styles.addBtn}
              disabled={filteredSubscribers.length === 0}
            >
              ⬇ Export Emails (.txt)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('campaign')}
              className={styles.formSubmitBtn}
              style={{ padding: '10px 18px', fontSize: '14px' }}
            >
              ✉ Send Email to All
            </button>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className={styles.statsGrid} style={{ marginBottom: '24px' }}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{subscribers.length.toLocaleString()}</div>
            <div className={styles.statLabel}>Total Subscribers</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#16a34a' }}>
              {activeSubscribers.length.toLocaleString()}
            </div>
            <div className={styles.statLabel}>Active Subscribers</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: '#6b7280' }}>
              {unsubscribedCount.toLocaleString()}
            </div>
            <div className={styles.statLabel}>Unsubscribed</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ fontSize: '20px', lineHeight: 1.4 }}>
              {PROVIDER_LABELS[platform.provider] || platform.provider}
            </div>
            <div className={styles.statLabel}>
              Marketing Platform ({campaigns.length} Campaign{campaigns.length === 1 ? '' : 's'} Sent)
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={feedback.type === 'success' ? styles.successMsg : styles.errorMsg}
            style={{ marginBottom: '20px' }}
          >
            {feedback.text}
          </div>
        )}

        {/* Section Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {(
            [
              { id: 'subscribers', label: `Subscribers & Export (${subscribers.length})` },
              { id: 'campaign', label: 'Send Email Campaign' },
              { id: 'platform', label: 'Email Marketing Platform' },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setFeedback(null);
                }}
                className={styles.actionBtn}
                style={{
                  padding: '10px 18px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  background: active ? 'var(--color-primary)' : 'var(--color-white)',
                  color: active ? '#ffffff' : 'var(--color-gray-700)',
                  border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--color-gray-300)',
                  borderRadius: '8px',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ==================== TAB 1: SUBSCRIBERS & EXPORT ==================== */}
        {activeTab === 'subscribers' && (
          <>
            {/* Add / Import Subscribers & Search Toolbar */}
            <div
              className={styles.formCard}
              style={{
                maxWidth: '100%',
                padding: '18px 20px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <form
                onSubmit={handleAddSubscribers}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-end',
                  flexWrap: 'wrap',
                }}
              >
                <div className={styles.formGroup} style={{ flex: 1, minWidth: '240px' }}>
                  <label className={styles.formLabel}>
                    Add or Import Subscriber Emails (comma or space separated)
                  </label>
                  <input
                    type="text"
                    className={styles.formInput}
                    style={{ padding: '9px 12px', fontSize: '14px' }}
                    placeholder="e.g. user1@example.com, user2@example.com"
                    value={newEmailsInput}
                    onChange={(e) => setNewEmailsInput(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className={styles.formSubmitBtn}
                  style={{ padding: '10px 18px', fontSize: '13.5px' }}
                  disabled={addingEmails}
                >
                  {addingEmails ? 'Adding...' : '+ Add Subscriber(s)'}
                </button>
              </form>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  borderTop: '1px solid var(--color-gray-100)',
                  paddingTop: '14px',
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                  <input
                    type="text"
                    className={styles.formInput}
                    style={{ maxWidth: '300px', padding: '8px 12px', fontSize: '13.5px' }}
                    placeholder="Search email address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <select
                    className={styles.formSelect}
                    style={{ maxWidth: '180px', padding: '8px 12px', fontSize: '13.5px' }}
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as 'all' | 'subscribed' | 'unsubscribed')
                    }
                  >
                    <option value="all">All Statuses</option>
                    <option value="subscribed">Subscribed Only</option>
                    <option value="unsubscribed">Unsubscribed Only</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCopyEmails}
                    className={`${styles.actionBtn} ${styles.editBtn}`}
                    style={{ padding: '8px 14px', fontSize: '12.5px' }}
                  >
                    📋 Copy All Active Emails
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className={`${styles.actionBtn} ${styles.toggleBtn}`}
                    style={{ padding: '8px 14px', fontSize: '12.5px' }}
                    disabled={filteredSubscribers.length === 0}
                  >
                    ⬇ Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Subscribers Table */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h2 className={styles.tableTitle}>
                  Newsletter Subscribers ({filteredSubscribers.length})
                </h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th
                        onClick={() => handleSort('email')}
                        style={{
                          cursor: 'pointer',
                          userSelect: 'none',
                          color: sortField === 'email' ? 'var(--color-primary)' : undefined,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>Email Address</span>
                          <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 0.75, fontSize: '8.5px' }}>
                            <span style={{ opacity: sortField === 'email' ? (sortDir === 'asc' ? 1 : 0.25) : 0.45 }}>▲</span>
                            <span style={{ opacity: sortField === 'email' ? (sortDir === 'desc' ? 1 : 0.25) : 0.45 }}>▼</span>
                          </span>
                        </span>
                      </th>
                      <th
                        onClick={() => handleSort('status')}
                        style={{
                          cursor: 'pointer',
                          userSelect: 'none',
                          color: sortField === 'status' ? 'var(--color-primary)' : undefined,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>Status</span>
                          <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 0.75, fontSize: '8.5px' }}>
                            <span style={{ opacity: sortField === 'status' ? (sortDir === 'asc' ? 1 : 0.25) : 0.45 }}>▲</span>
                            <span style={{ opacity: sortField === 'status' ? (sortDir === 'desc' ? 1 : 0.25) : 0.45 }}>▼</span>
                          </span>
                        </span>
                      </th>
                      <th>Source</th>
                      <th>Platform Sync</th>
                      <th
                        onClick={() => handleSort('createdAt')}
                        style={{
                          cursor: 'pointer',
                          userSelect: 'none',
                          color: sortField === 'createdAt' ? 'var(--color-primary)' : undefined,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>Subscribed Date</span>
                          <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 0.75, fontSize: '8.5px' }}>
                            <span style={{ opacity: sortField === 'createdAt' ? (sortDir === 'asc' ? 1 : 0.25) : 0.45 }}>▲</span>
                            <span style={{ opacity: sortField === 'createdAt' ? (sortDir === 'desc' ? 1 : 0.25) : 0.45 }}>▼</span>
                          </span>
                        </span>
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscribers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: 'center',
                            padding: '36px 16px',
                            color: 'var(--color-gray-500)',
                          }}
                        >
                          No newsletter subscribers found yet.
                        </td>
                      </tr>
                    ) : (
                      filteredSubscribers.map((sub) => (
                        <tr key={sub.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>
                            {sub.email}
                          </td>
                          <td>
                            <span
                              className={
                                sub.status === 'subscribed'
                                  ? styles.statusActive
                                  : styles.statusInactive
                              }
                            >
                              {sub.status === 'subscribed' ? 'Subscribed' : 'Unsubscribed'}
                            </span>
                          </td>
                          <td style={{ textTransform: 'capitalize', fontSize: '12.5px' }}>
                            {sub.source || 'website'}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                background: sub.syncedToPlatform
                                  ? 'rgba(34, 197, 94, 0.12)'
                                  : 'var(--color-gray-100)',
                                color: sub.syncedToPlatform ? '#15803d' : 'var(--color-gray-600)',
                              }}
                            >
                              {sub.syncedToPlatform ? '✓ Synced' : 'Local'}
                            </span>
                          </td>
                          <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                            {new Date(sub.createdAt).toLocaleString()}
                          </td>
                          <td>
                            <div className={styles.tableActions}>
                              <button
                                type="button"
                                onClick={() => {
                                  setRecipientMode('custom');
                                  setCustomRecipients(sub.email);
                                  setActiveTab('campaign');
                                }}
                                className={`${styles.actionBtn} ${styles.editBtn}`}
                              >
                                Send Email
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(sub.id)}
                                className={`${styles.actionBtn} ${styles.toggleBtn}`}
                              >
                                {sub.status === 'subscribed' ? 'Unsubscribe' : 'Resubscribe'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 2: SEND EMAIL CAMPAIGN ==================== */}
        {activeTab === 'campaign' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '24px',
                alignItems: 'start',
              }}
            >
              {/* Left: Compose Form */}
              <div className={styles.formCard} style={{ maxWidth: '100%' }}>
                <h2 className={styles.tableTitle} style={{ marginBottom: '6px' }}>
                  Compose Newsletter Broadcast
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '18px' }}>
                  Send an email announcement or weekly freebie digest to all subscribed users.
                </p>

                <div className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                    <label className={styles.formLabel}>Recipients</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setRecipientMode('all')}
                        className={styles.actionBtn}
                        style={{
                          padding: '8px 14px',
                          background:
                            recipientMode === 'all' ? 'var(--color-primary)' : 'var(--color-gray-50)',
                          color: recipientMode === 'all' ? '#ffffff' : 'var(--color-gray-700)',
                          border: '1px solid var(--color-gray-300)',
                        }}
                      >
                        All Active Subscribers ({activeSubscribers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecipientMode('custom')}
                        className={styles.actionBtn}
                        style={{
                          padding: '8px 14px',
                          background:
                            recipientMode === 'custom' ? 'var(--color-primary)' : 'var(--color-gray-50)',
                          color: recipientMode === 'custom' ? '#ffffff' : 'var(--color-gray-700)',
                          border: '1px solid var(--color-gray-300)',
                        }}
                      >
                        Specific Email(s)
                      </button>
                    </div>
                  </div>

                  {recipientMode === 'custom' && (
                    <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                      <label className={styles.formLabel}>
                        Target Email Address(es) (comma separated) *
                      </label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={customRecipients}
                        onChange={(e) => setCustomRecipients(e.target.value)}
                        placeholder="user1@example.com, user2@example.com"
                      />
                    </div>
                  )}

                  <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                    <label className={styles.formLabel}>Email Format / Mode</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setEmailFormat('template')}
                        className={styles.actionBtn}
                        style={{
                          padding: '9px 16px',
                          fontWeight: 700,
                          background:
                            emailFormat === 'template' ? 'var(--color-primary)' : 'var(--color-gray-50)',
                          color: emailFormat === 'template' ? '#ffffff' : 'var(--color-gray-700)',
                          border:
                            emailFormat === 'template'
                              ? '1.5px solid var(--color-primary)'
                              : '1px solid var(--color-gray-300)',
                        }}
                      >
                        📝 Standard Template Builder
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailFormat('custom_html')}
                        className={styles.actionBtn}
                        style={{
                          padding: '9px 16px',
                          fontWeight: 700,
                          background:
                            emailFormat === 'custom_html'
                              ? 'var(--color-primary)'
                              : 'var(--color-gray-50)',
                          color: emailFormat === 'custom_html' ? '#ffffff' : 'var(--color-gray-700)',
                          border:
                            emailFormat === 'custom_html'
                              ? '1.5px solid var(--color-primary)'
                              : '1px solid var(--color-gray-300)',
                        }}
                      >
                        {'</>'} Custom HTML Email
                      </button>
                    </div>
                  </div>

                  <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                    <label className={styles.formLabel}>Email Subject Line *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., 🔥 5 New Verified Digital Freebies This Week!"
                    />
                  </div>

                  {emailFormat === 'template' ? (
                    <>
                      <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                        <label className={styles.formLabel}>Banner Headline (Optional)</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={headline}
                          onChange={(e) => setHeadline(e.target.value)}
                          placeholder="Defaults to Subject Line if left blank"
                        />
                      </div>

                      <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                        <label className={styles.formLabel}>Email Message Body *</label>
                        <textarea
                          className={`${styles.formInput} ${styles.formTextarea}`}
                          rows={7}
                          value={messageBody}
                          onChange={(e) => setMessageBody(e.target.value)}
                          placeholder="Write your newsletter message here... Each new line creates a clean paragraph."
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>CTA Button Text (Optional)</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={ctaLabel}
                          onChange={(e) => setCtaLabel(e.target.value)}
                          placeholder="e.g., Explore Freebies"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>CTA Button URL (Optional)</label>
                        <input
                          type="url"
                          className={styles.formInput}
                          value={ctaUrl}
                          onChange={(e) => setCtaUrl(e.target.value)}
                          placeholder="https://digitalfreebies.io/freebies"
                        />
                      </div>
                    </>
                  ) : (
                    <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginBottom: '6px',
                        }}
                      >
                        <label className={styles.formLabel} style={{ marginBottom: 0 }}>
                          Custom HTML Email Code *
                        </label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <label
                            className={`${styles.actionBtn} ${styles.editBtn}`}
                            style={{
                              padding: '5px 10px',
                              fontSize: '11.5px',
                              cursor: 'pointer',
                              margin: 0,
                            }}
                          >
                            📂 Upload .html File
                            <input
                              type="file"
                              accept=".html,.htm,text/html"
                              onChange={handleHtmlFileUpload}
                              style={{ display: 'none' }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              insertHtmlSnippet(
                                `<div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin: 16px 0; background: #fafafa;">
  <h3 style="margin: 0 0 6px; font-size: 16px; color: #111827;">🎁 Featured Freebie Title</h3>
  <p style="margin: 0 0 12px; font-size: 14px; color: #4b5563;">Short description of this freebie offer and why subscribers should claim it.</p>
  <a href="https://digitalfreebies.io/freebies" style="display: inline-block; padding: 8px 18px; background: #560981; color: #ffffff; border-radius: 9999px; font-size: 13px; font-weight: 700; text-decoration: none;">Get Freebie →</a>
</div>`
                              )
                            }
                            className={`${styles.actionBtn} ${styles.toggleBtn}`}
                            style={{ padding: '5px 10px', fontSize: '11.5px' }}
                          >
                            + Offer Card
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              insertHtmlSnippet(
                                `<div style="text-align: center; margin: 24px 0;">
  <a href="https://digitalfreebies.io" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 700; color: #ffffff; background: #560981; border-radius: 9999px; text-decoration: none;">Explore All Freebies →</a>
</div>`
                              )
                            }
                            className={`${styles.actionBtn} ${styles.toggleBtn}`}
                            style={{ padding: '5px 10px', fontSize: '11.5px' }}
                          >
                            + CTA Button
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomHtml('')}
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            style={{ padding: '5px 10px', fontSize: '11.5px' }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <textarea
                        className={`${styles.formInput} ${styles.formTextarea}`}
                        rows={15}
                        value={customHtml}
                        onChange={(e) => setCustomHtml(e.target.value)}
                        placeholder="Paste or write your custom HTML email code here (full <!DOCTYPE html><html>... or HTML blocks)..."
                        style={{
                          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                          fontSize: '12.5px',
                          lineHeight: 1.55,
                          background: '#111827',
                          color: '#f9fafb',
                          borderColor: '#374151',
                        }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                        Your exact HTML code will be sent to subscribers as-is without any wrapper overrides.
                      </span>
                    </div>
                  )}
                </div>

                {/* Test Email Row */}
                <div
                  style={{
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--color-gray-200)',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-end',
                    flexWrap: 'wrap',
                  }}
                >
                  <div className={styles.formGroup} style={{ flex: 1, minWidth: '200px' }}>
                    <label className={styles.formLabel}>Send Test Email First</label>
                    <input
                      type="email"
                      className={styles.formInput}
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="your-email@example.com"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendCampaign(true)}
                    className={styles.addBtn}
                    disabled={sendingTest || sendingCampaign}
                  >
                    {sendingTest ? 'Sending Test...' : 'Send Test'}
                  </button>
                </div>

                <div className={styles.formActions} style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => handleSendCampaign(false)}
                    className={styles.formSubmitBtn}
                    disabled={sendingCampaign || sendingTest}
                  >
                    {sendingCampaign
                      ? 'Sending Broadcast...'
                      : recipientMode === 'custom'
                      ? `✉ Send ${emailFormat === 'custom_html' ? 'Custom HTML ' : ''}Email Now`
                      : `✉ Send ${emailFormat === 'custom_html' ? 'Custom HTML ' : ''}to All Active Subscribers (${activeSubscribers.length})`}
                  </button>
                </div>
              </div>

              {/* Right: Live Email Preview */}
              <div className={styles.formCard} style={{ maxWidth: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <h2 className={styles.tableTitle} style={{ marginBottom: 0 }}>
                    Live Email Preview ({emailFormat === 'custom_html' ? 'Custom HTML' : 'Standard Template'})
                  </h2>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport('desktop')}
                      className={styles.actionBtn}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        background:
                          previewViewport === 'desktop'
                            ? 'var(--color-primary)'
                            : 'var(--color-gray-50)',
                        color: previewViewport === 'desktop' ? '#fff' : 'var(--color-gray-700)',
                        border: '1px solid var(--color-gray-300)',
                      }}
                    >
                      🖥 Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport('mobile')}
                      className={styles.actionBtn}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        background:
                          previewViewport === 'mobile'
                            ? 'var(--color-primary)'
                            : 'var(--color-gray-50)',
                        color: previewViewport === 'mobile' ? '#fff' : 'var(--color-gray-700)',
                        border: '1px solid var(--color-gray-300)',
                      }}
                    >
                      📱 Mobile
                    </button>
                  </div>
                </div>

                {emailFormat === 'custom_html' ? (
                  <div
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      background: '#f3f4f6',
                      display: 'flex',
                      justifyContent: 'center',
                      padding: previewViewport === 'mobile' ? '16px' : '0',
                    }}
                  >
                    <iframe
                      title="Custom HTML Email Preview"
                      srcDoc={
                        customHtml.trim() ||
                        '<div style="font-family:sans-serif;padding:24px;color:#6b7280;text-align:center;">Paste or write your custom HTML code on the left to preview it live here.</div>'
                      }
                      sandbox="allow-same-origin"
                      style={{
                        width: previewViewport === 'mobile' ? '375px' : '100%',
                        minHeight: '520px',
                        border: previewViewport === 'mobile' ? '1px solid #d1d5db' : 'none',
                        borderRadius: previewViewport === 'mobile' ? '12px' : '0',
                        background: '#ffffff',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      background: '#ffffff',
                      maxWidth: previewViewport === 'mobile' ? '375px' : '100%',
                      margin: '0 auto',
                    }}
                  >
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #560981 0%, #6a0b9e 100%)',
                        padding: '22px 26px',
                        color: '#ffffff',
                      }}
                    >
                      <div style={{ fontSize: '19px', fontWeight: 800 }}>
                        {platform.fromName || 'DigitalFreebies.io'}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '3px' }}>
                        Handpicked Digital Freebies, Trials &amp; Exclusive Deals
                      </div>
                    </div>
                    <div style={{ padding: '26px', color: '#1f2937' }}>
                      <h3
                        style={{
                          margin: '0 0 14px',
                          fontSize: '19px',
                          fontWeight: 800,
                          color: '#111827',
                        }}
                      >
                        {headline || subject || 'Your Newsletter Headline'}
                      </h3>
                      <div style={{ fontSize: '14px', lineHeight: 1.65, color: '#374151', whiteSpace: 'pre-line' }}>
                        {messageBody || 'Your newsletter message content will appear here...'}
                      </div>
                      {ctaLabel && ctaUrl && (
                        <div style={{ textAlign: 'center', margin: '24px 0 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '11px 28px',
                              fontSize: '13.5px',
                              fontWeight: 700,
                              color: '#ffffff',
                              background: 'linear-gradient(135deg, #560981 0%, #6a0b9e 100%)',
                              borderRadius: '9999px',
                            }}
                          >
                            {ctaLabel} →
                          </span>
                        </div>
                      )}
                      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '22px 0 12px' }} />
                      <p style={{ margin: 0, fontSize: '11.5px', color: '#6b7280', textAlign: 'center' }}>
                        You are receiving this email because you subscribed to freebie alerts on{' '}
                        <strong>DigitalFreebies.io</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sent Campaigns Log */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h2 className={styles.tableTitle}>Sent Campaigns History ({campaigns.length})</h2>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Recipients</th>
                      <th>Delivered</th>
                      <th>Method / Platform</th>
                      <th>Sent By</th>
                      <th>Date Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ textAlign: 'center', padding: '28px', color: 'var(--color-gray-500)' }}
                        >
                          No newsletter campaigns have been sent yet.
                        </td>
                      </tr>
                    ) : (
                      campaigns.map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{c.subject}</td>
                          <td>{c.recipientCount}</td>
                          <td>
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>{c.sentCount}</span>
                            {c.failedCount > 0 && (
                              <span style={{ color: '#dc2626', marginLeft: '6px', fontSize: '12px' }}>
                                ({c.failedCount} failed)
                              </span>
                            )}
                          </td>
                          <td>{c.method}</td>
                          <td>{c.sentBy}</td>
                          <td>{new Date(c.sentAt).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: EMAIL MARKETING PLATFORM ==================== */}
        {activeTab === 'platform' && (
          <div className={styles.formCard} style={{ maxWidth: '860px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '18px',
              }}
            >
              <div>
                <h2 className={styles.tableTitle} style={{ marginBottom: '4px' }}>
                  Email Marketing Platform Configuration
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', margin: 0 }}>
                  Choose and configure your email marketing provider (SMTP, Mailchimp, ConvertKit, Brevo, MailerLite, Klaviyo, or Custom Webhook).
                </p>
              </div>
              {platform.provider !== 'smtp' && (
                <button
                  type="button"
                  onClick={handleSyncAll}
                  className={styles.addBtn}
                  disabled={syncingPlatform || activeSubscribers.length === 0}
                >
                  {syncingPlatform
                    ? 'Syncing...'
                    : `↻ Sync All Active Subscribers (${activeSubscribers.length})`}
                </button>
              )}
            </div>

            <form onSubmit={handleSavePlatform}>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.formLabel}>Email Marketing Platform / Provider</label>
                  <select
                    className={styles.formSelect}
                    value={platform.provider}
                    onChange={(e) =>
                      setPlatform({
                        ...platform,
                        provider: e.target.value as MarketingProvider,
                      })
                    }
                  >
                    {(Object.keys(PROVIDER_LABELS) as MarketingProvider[]).map((key) => (
                      <option key={key} value={key}>
                        {PROVIDER_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>

                {platform.provider === 'smtp' && (
                  <div
                    className={`${styles.formGroup} ${styles.formGridFull}`}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: smtpConfigured
                        ? 'rgba(34, 197, 94, 0.08)'
                        : 'rgba(245, 158, 11, 0.1)',
                      border: smtpConfigured
                        ? '1px solid rgba(34, 197, 94, 0.25)'
                        : '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '4px' }}>
                      {smtpConfigured
                        ? `✓ SMTP Server Configured (${smtpHost})`
                        : '⚠ SMTP Server Not Configured Yet'}
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--color-gray-700)' }}>
                      {smtpConfigured ? (
                        <>
                          Outgoing newsletter broadcasts will be sent via <strong>{smtpHost}</strong> (
                          {smtpFromEmail}). You can update your SMTP server credentials in{' '}
                          <Link
                            href="/df-admin77/profile"
                            style={{ color: 'var(--color-primary)', fontWeight: 700 }}
                          >
                            My Account / SMTP Settings
                          </Link>
                          .
                        </>
                      ) : (
                        <>
                          To deliver live emails via SMTP, configure your SMTP Host, Username, and Password in{' '}
                          <Link
                            href="/df-admin77/profile"
                            style={{ color: 'var(--color-primary)', fontWeight: 700 }}
                          >
                            My Account / SMTP Settings
                          </Link>
                          .
                        </>
                      )}
                    </div>
                  </div>
                )}

                {platform.provider !== 'smtp' && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        {platform.provider === 'custom_webhook'
                          ? 'Bearer Token / Secret (Optional)'
                          : 'API Key / Token *'}
                      </label>
                      <input
                        type="password"
                        className={styles.formInput}
                        value={platform.apiKey}
                        onChange={(e) => setPlatform({ ...platform, apiKey: e.target.value })}
                        placeholder="Enter platform API key..."
                      />
                    </div>

                    {platform.provider !== 'custom_webhook' && (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                          {platform.provider === 'mailchimp'
                            ? 'Audience / List ID *'
                            : platform.provider === 'convertkit'
                            ? 'Form ID *'
                            : platform.provider === 'mailerlite'
                            ? 'Group ID (Optional)'
                            : 'List ID (Optional)'}
                        </label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={platform.audienceOrListId}
                          onChange={(e) =>
                            setPlatform({ ...platform, audienceOrListId: e.target.value })
                          }
                          placeholder="e.g., a1b2c3d4e5"
                        />
                      </div>
                    )}

                    {platform.provider === 'mailchimp' && (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                          Mailchimp Server Prefix (Datacenter)
                        </label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={platform.serverPrefix}
                          onChange={(e) =>
                            setPlatform({ ...platform, serverPrefix: e.target.value })
                          }
                          placeholder="e.g., us21"
                        />
                      </div>
                    )}

                    {platform.provider === 'custom_webhook' && (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Webhook URL *</label>
                        <input
                          type="url"
                          className={styles.formInput}
                          value={platform.webhookUrl}
                          onChange={(e) =>
                            setPlatform({ ...platform, webhookUrl: e.target.value })
                          }
                          placeholder="https://hooks.zapier.com/..."
                        />
                      </div>
                    )}
                  </>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Sender From Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={platform.fromName}
                    onChange={(e) => setPlatform({ ...platform, fromName: e.target.value })}
                    placeholder="DigitalFreebies.io"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Sender From Email</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    value={platform.fromEmail}
                    onChange={(e) => setPlatform({ ...platform, fromEmail: e.target.value })}
                    placeholder="noreply@digitalfreebies.io"
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.formLabel}>Reply-To Email (Optional)</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    value={platform.replyToEmail}
                    onChange={(e) => setPlatform({ ...platform, replyToEmail: e.target.value })}
                    placeholder="support@digitalfreebies.io"
                  />
                </div>

                <div className={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="platformEnabled"
                    checked={platform.enabled}
                    onChange={(e) => setPlatform({ ...platform, enabled: e.target.checked })}
                  />
                  <label htmlFor="platformEnabled" className={styles.checkboxLabel}>
                    Enable Email Marketing Platform Integration
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="autoSyncNewSubscribers"
                    checked={platform.autoSyncNewSubscribers}
                    onChange={(e) =>
                      setPlatform({ ...platform, autoSyncNewSubscribers: e.target.checked })
                    }
                  />
                  <label htmlFor="autoSyncNewSubscribers" className={styles.checkboxLabel}>
                    Auto-sync new website signups to this platform
                  </label>
                </div>
              </div>

              <div className={styles.formActions} style={{ marginTop: '20px' }}>
                <button
                  type="submit"
                  className={styles.formSubmitBtn}
                  disabled={savingPlatform}
                >
                  {savingPlatform ? 'Saving...' : 'Save Platform Settings'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
