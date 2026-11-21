'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../admin.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';

interface CustomApiEntry {
  id: string;
  name: string;
  envKey: string;
  value: string;
  description: string;
  updatedAt: string;
}

type SettingsTab =
  | 'all'
  | 'gemini'
  | 'seo'
  | 'server'
  | 'smtp'
  | 'cloudflare'
  | 'google'
  | 'apis'
  | 'backup';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { confirm, promptPassword } = useDialog();

  const [activeTab, setActiveTab] = useState<SettingsTab>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // --- 1. Homepage SEO & Meta State ---
  const [homepageTitle, setHomepageTitle] = useState(
    'DigitalFreebies.io — Discover Free Digital Offers, Trials & Promotions'
  );
  const [homepageDescription, setHomepageDescription] = useState(
    'Find the best free digital offers, trials, and promotions. Free streaming, VPN trials, gaming deals, educational resources, and software freebies — all in one place.'
  );
  const [homepageKeywords, setHomepageKeywords] = useState(
    'free trials, free offers, digital freebies, free streaming, free VPN, free games, free software, promotions'
  );
  const [ogTitle, setOgTitle] = useState('DigitalFreebies.io — Discover Free Digital Offers');
  const [ogDescription, setOgDescription] = useState(
    'Find the best free digital offers, trials, and promotions. Free streaming, VPN trials, gaming deals, educational resources, and software freebies.'
  );
  const [canonicalUrl, setCanonicalUrl] = useState('https://digitalfreebies.io');
  const [robotsMeta, setRobotsMeta] = useState('index, follow');
  const [customHeadHtml, setCustomHeadHtml] = useState('');
  const [savingSeo, setSavingSeo] = useState(false);

  // --- 2. Server & Crawler Files (.htaccess, robots.txt, ads.txt) ---
  const [htaccessContent, setHtaccessContent] = useState('');
  const [robotsTxtContent, setRobotsTxtContent] = useState('');
  const [adsTxtContent, setAdsTxtContent] = useState('');
  const [activeServerFile, setActiveServerFile] = useState<'htaccess' | 'robots' | 'ads'>('htaccess');
  const [savingServerFiles, setSavingServerFiles] = useState(false);

  // --- 3. SMTP Email Server State ---
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpHasPassword, setSmtpHasPassword] = useState(false);
  const [smtpFromName, setSmtpFromName] = useState('DigitalFreebies.io');
  const [smtpFromEmail, setSmtpFromEmail] = useState('noreply@digitalfreebies.io');
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);

  // --- 4. Google Analytics (GA4) State ---
  const [gaMeasurementId, setGaMeasurementId] = useState('');
  const [gaPropertyId, setGaPropertyId] = useState('');
  const [gaServiceAccountJson, setGaServiceAccountJson] = useState('');
  const [gaHasServiceAccount, setGaHasServiceAccount] = useState(false);
  const [gaClientEmail, setGaClientEmail] = useState('');
  const [gaConfigured, setGaConfigured] = useState(false);
  const [savingGa, setSavingGa] = useState(false);
  const gaFileInputRef = useRef<HTMLInputElement>(null);

  // --- 5. Cloudflare Tunnel & Turnstile State ---
  const [cfEnabled, setCfEnabled] = useState(false);
  const [cfTunnelName, setCfTunnelName] = useState('digitalfreebies-tunnel');
  const [cfTunnelToken, setCfTunnelToken] = useState('');
  const [showCfToken, setShowCfToken] = useState(false);
  const [cfPublicHostname, setCfPublicHostname] = useState('https://digitalfreebies.io');
  const [cfLocalServiceUrl, setCfLocalServiceUrl] = useState('http://localhost:3000');
  const [cfTurnstileSiteKey, setCfTurnstileSiteKey] = useState('');
  const [cfTurnstileSecretKey, setCfTurnstileSecretKey] = useState('');
  const [showCfTurnstileSecret, setShowCfTurnstileSecret] = useState(false);
  const [savingCf, setSavingCf] = useState(false);
  const [savingTurnstile, setSavingTurnstile] = useState(false);
  const [copiedCfCmd, setCopiedCfCmd] = useState(false);

  // --- 6. Google Services (Search Console, Tag Manager, AdSense, OAuth, Gemini AI) ---
  const [googleSiteVerification, setGoogleSiteVerification] = useState('');
  const [googleTagManagerId, setGoogleTagManagerId] = useState('');
  const [googleAdsenseClientId, setGoogleAdsenseClientId] = useState('');
  const [googleOauthClientId, setGoogleOauthClientId] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [savingGoogleServices, setSavingGoogleServices] = useState(false);

  // --- 7. Custom APIs & Keys State ---
  const [customApis, setCustomApis] = useState<CustomApiEntry[]>([]);
  const [newApiName, setNewApiName] = useState('');
  const [newApiEnvKey, setNewApiEnvKey] = useState('');
  const [newApiValue, setNewApiValue] = useState('');
  const [showNewApiValue, setShowNewApiValue] = useState(false);
  const [newApiDesc, setNewApiDesc] = useState('');
  const [visibleApiIds, setVisibleApiIds] = useState<Record<string, boolean>>({});
  const [savingApis, setSavingApis] = useState(false);

  // --- 8. Database & Full Backup Download (Password + 2FA) State ---
  const [backupType, setBackupType] = useState<'full' | 'database'>('full');
  const [backupPassword, setBackupPassword] = useState('');
  const [showBackupPassword, setShowBackupPassword] = useState(false);
  const [backupTotpCode, setBackupTotpCode] = useState('');
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/df-admin77/login');
      return;
    }
    loadAllSettings(token);
  }, [router]);

  const loadAllSettings = async (token: string) => {
    setLoading(true);
    try {
      const [smtpRes, gaRes, techRes] = await Promise.all([
        fetch('/api/admin/smtp', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/analytics?days=7', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (smtpRes.status === 401 || gaRes.status === 401 || techRes.status === 401) {
        router.push('/df-admin77/login');
        return;
      }

      if (smtpRes.ok) {
        const s = await smtpRes.json();
        const cfg = s.settings || s;
        setSmtpHost(cfg.host || '');
        setSmtpPort(String(cfg.port || 587));
        setSmtpSecure(Boolean(cfg.secure));
        setSmtpUsername(cfg.username || '');
        setSmtpHasPassword(Boolean(cfg.hasPassword));
        setSmtpFromName(cfg.fromName || 'DigitalFreebies.io');
        setSmtpFromEmail(cfg.fromEmail || 'noreply@digitalfreebies.io');
        setRequireEmailVerification(cfg.requireEmailVerification !== false);
        setSmtpConfigured(Boolean(cfg.configured ?? cfg.isConfigured));
      }

      if (gaRes.ok) {
        const g = await gaRes.json();
        setGaMeasurementId(g.measurementId || '');
        setGaPropertyId(g.propertyId || '');
        setGaHasServiceAccount(Boolean(g.hasServiceAccount));
        setGaClientEmail(g.clientEmail || '');
        setGaConfigured(Boolean(g.configured || g.measurementId));
      }

      if (techRes.ok) {
        const t = await techRes.json();
        if (t.seo) {
          setHomepageTitle(t.seo.homepageTitle || '');
          setHomepageDescription(t.seo.homepageDescription || '');
          setHomepageKeywords(t.seo.homepageKeywords || '');
          setOgTitle(t.seo.ogTitle || '');
          setOgDescription(t.seo.ogDescription || '');
          setCanonicalUrl(t.seo.canonicalUrl || 'https://digitalfreebies.io');
          setRobotsMeta(t.seo.robotsMeta || 'index, follow');
          setCustomHeadHtml(t.seo.customHeadHtml || '');
        }
        if (t.serverFiles) {
          setHtaccessContent(t.serverFiles.htaccess || '');
          setRobotsTxtContent(t.serverFiles.robotsTxt || '');
          setAdsTxtContent(t.serverFiles.adsTxt || '');
        }
        if (t.cloudflare) {
          setCfEnabled(Boolean(t.cloudflare.enabled));
          setCfTunnelName(t.cloudflare.tunnelName || 'digitalfreebies-tunnel');
          setCfTunnelToken(t.cloudflare.tunnelToken || '');
          setCfPublicHostname(t.cloudflare.publicHostname || 'https://digitalfreebies.io');
          setCfLocalServiceUrl(t.cloudflare.localServiceUrl || 'http://localhost:3000');
          setCfTurnstileSiteKey(t.cloudflare.turnstileSiteKey || '');
          setCfTurnstileSecretKey(t.cloudflare.turnstileSecretKey || '');
        }
        if (t.google) {
          setGoogleSiteVerification(t.google.siteVerification || '');
          setGoogleTagManagerId(t.google.tagManagerId || '');
          setGoogleAdsenseClientId(t.google.adsenseClientId || '');
          setGoogleOauthClientId(t.google.oauthClientId || '');
          setGeminiApiKey(t.google.geminiApiKey || '');
        }
        if (Array.isArray(t.customApis)) {
          setCustomApis(t.customApis);
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load some technical settings.');
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers: Homepage SEO & Meta ---
  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const adminPassword = await promptPassword(
      'Enter your current admin password to confirm saving Homepage SEO & Meta settings.'
    );
    if (!adminPassword) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSavingSeo(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminPassword,
          seo: {
            homepageTitle: homepageTitle.trim(),
            homepageDescription: homepageDescription.trim(),
            homepageKeywords: homepageKeywords.trim(),
            ogTitle: ogTitle.trim(),
            ogDescription: ogDescription.trim(),
            canonicalUrl: canonicalUrl.trim(),
            robotsMeta: robotsMeta.trim(),
            customHeadHtml,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save Homepage SEO & Meta settings');
        return;
      }
      setSuccess('Homepage Title, Meta Description & SEO settings saved successfully.');
    } catch {
      setError('Network error saving Homepage SEO settings');
    } finally {
      setSavingSeo(false);
    }
  };

  // --- Handlers: Server & Crawler Files (.htaccess, robots.txt, ads.txt) ---
  const handleSaveServerFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const adminPassword = await promptPassword(
      'Enter your current admin password to confirm saving .htaccess, robots.txt & ads.txt files.'
    );
    if (!adminPassword) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSavingServerFiles(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminPassword,
          serverFiles: {
            htaccess: htaccessContent,
            robotsTxt: robotsTxtContent,
            adsTxt: adsTxtContent,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save server configuration files');
        return;
      }
      setSuccess('Server files (.htaccess, robots.txt & ads.txt) saved and synced.');
    } catch {
      setError('Network error saving server configuration files');
    } finally {
      setSavingServerFiles(false);
    }
  };

  const handleInsertHtaccessSnippet = (snippetType: 'https' | 'redirect' | 'gzip' | 'headers') => {
    const snippets: Record<typeof snippetType, string> = {
      https: `\n# Force HTTPS Redirect\n<IfModule mod_rewrite.c>\n  RewriteEngine On\n  RewriteCond %{HTTPS} off\n  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n</IfModule>\n`,
      redirect: `\n# Custom 301 Permanent Redirect\nRedirect 301 /old-freebie-slug /freebie/new-freebie-slug\n`,
      gzip: `\n# Enable GZIP Compression\n<IfModule mod_deflate.c>\n  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json\n</IfModule>\n`,
      headers: `\n# Extra Security Headers\n<IfModule mod_headers.c>\n  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"\n  Header set X-XSS-Protection "1; mode=block"\n</IfModule>\n`,
    };
    setHtaccessContent((prev) => `${prev.trimEnd()}\n${snippets[snippetType]}`);
  };

  // --- Handlers: SMTP ---
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const adminPassword = await promptPassword(
      'Enter your current admin password to confirm saving SMTP Email Server settings.'
    );
    if (!adminPassword) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSavingSmtp(true);
    try {
      const res = await fetch('/api/admin/smtp', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminPassword,
          host: smtpHost.trim(),
          port: Number(smtpPort) || 587,
          secure: smtpSecure,
          username: smtpUsername.trim(),
          password: smtpPassword || undefined,
          fromName: smtpFromName.trim(),
          fromEmail: smtpFromEmail.trim(),
          requireEmailVerification,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save SMTP settings');
        return;
      }
      if (smtpPassword) setSmtpHasPassword(true);
      setSmtpPassword('');
      setSmtpConfigured(Boolean(data.configured));
      setSuccess(data.message || 'SMTP email settings saved.');
    } catch {
      setError('Network error saving SMTP settings');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const targetEmail = testRecipientEmail.trim();
    if (!targetEmail) {
      setError('Enter a recipient email address to send the test email.');
      return;
    }

    setTestingSmtp(true);
    try {
      const res = await fetch('/api/admin/smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ testEmail: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'SMTP test email failed');
        return;
      }
      setSuccess(data.message || `Test email sent to ${targetEmail}`);
    } catch {
      setError('Network error while sending test email');
    } finally {
      setTestingSmtp(false);
    }
  };

  // --- Handlers: Google Analytics (GA4) ---
  const handleGaJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setGaServiceAccountJson(reader.result);
      }
    };
    reader.readAsText(file);
    if (gaFileInputRef.current) gaFileInputRef.current.value = '';
  };

  const handleSaveGa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const adminPassword = await promptPassword(
      'Enter your current admin password to confirm saving Google Analytics (GA4) settings.'
    );
    if (!adminPassword) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSavingGa(true);
    try {
      const res = await fetch('/api/admin/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminPassword,
          measurementId: gaMeasurementId.trim(),
          propertyId: gaPropertyId.trim(),
          serviceAccountJson: gaServiceAccountJson.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save Google Analytics settings');
        return;
      }
      setGaServiceAccountJson('');
      setSuccess('Google Analytics (GA4) settings saved successfully.');
      loadAllSettings(token);
    } catch {
      setError('Network error saving Google Analytics settings');
    } finally {
      setSavingGa(false);
    }
  };

  const handleDisconnectGa = async () => {
    const adminPassword = await promptPassword(
      'Disconnect Google Analytics and clear saved GA4 credentials? Enter your current admin password to confirm.',
      { title: 'Confirm Disconnect GA4', confirmText: 'Disconnect', danger: true }
    );
    if (!adminPassword) return;
    setError('');
    setSuccess('');
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch('/api/admin/analytics', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adminPassword }),
      });
      if (res.ok) {
        setGaMeasurementId('');
        setGaPropertyId('');
        setGaServiceAccountJson('');
        setGaHasServiceAccount(false);
        setGaClientEmail('');
        setGaConfigured(false);
        setSuccess('Google Analytics credentials disconnected.');
      }
    } catch {
      setError('Failed to disconnect Google Analytics');
    }
  };

  // --- Handlers: Cloudflare Tunnel & Turnstile ---
  const handleSaveTurnstile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const adminPassword = await promptPassword(
      'Enter your current admin password to confirm saving Cloudflare Turnstile keys.'
    );
    if (!adminPassword) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSavingTurnstile(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminPassword,
          cloudflare: {
            enabled: cfEnabled,
            tunnelName: cfTunnelName.trim(),
            tunnelToken: cfTunnelToken.trim(),
            publicHostname: cfPublicHostname.trim(),
            localServiceUrl: cfLocalServiceUrl.trim(),
            turnstileSiteKey: cfTurnstileSiteKey.trim(),
            turnstileSecretKey: cfTurnstileSecretKey.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save Cloudflare Turnstile settings');
        return;
      }
      const isTurnstileActive = Boolean(cfTurnstileSiteKey.trim() && cfTurnstileSecretKey.trim());
      setSuccess(
        isTurnstileActive
          ? 'Cloudflare Turnstile keys saved. Turnstile is now active on Registration, Forum Login, and Admin Login.'
          : 'Cloudflare Turnstile keys cleared. Turnstile is now hidden on all login and registration pages.'
      );
    } catch {
      setError('Network error saving Cloudflare Turnstile settings');
    } finally {
      setSavingTurnstile(false);
    }
  };

  const handleSaveCloudflare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const adminPassword = await promptPassword(
      'Enter your current admin password to confirm saving Cloudflare Tunnel settings.'
    );
    if (!adminPassword) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSavingCf(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminPassword,
          cloudflare: {
            enabled: cfEnabled,
            tunnelName: cfTunnelName.trim(),
            tunnelToken: cfTunnelToken.trim(),
            publicHostname: cfPublicHostname.trim(),
            localServiceUrl: cfLocalServiceUrl.trim(),
            turnstileSiteKey: cfTurnstileSiteKey.trim(),
            turnstileSecretKey: cfTurnstileSecretKey.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save Cloudflare Tunnel settings');
        return;
      }
      setSuccess('Cloudflare Tunnel configuration saved.');
    } catch {
      setError('Network error saving Cloudflare Tunnel settings');
    } finally {
      setSavingCf(false);
    }
  };

  const handleCopyCfCommand = () => {
    const cmd = `cloudflared tunnel run --token ${cfTunnelToken.trim() || '<YOUR_TUNNEL_TOKEN>'}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(cmd).catch(() => {});
    } else if (typeof document !== 'undefined') {
      const ta = document.createElement('textarea');
      ta.value = cmd;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        // ignore
      }
      document.body.removeChild(ta);
    }
    setCopiedCfCmd(true);
    setTimeout(() => setCopiedCfCmd(false), 2000);
  };

  // --- Handlers: Gemini API Key ---
  const handleSaveGeminiApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSavingGemini(true);
    try {
      const res = await fetch('/api/admin/gemini-freebie', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey: geminiApiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save Gemini API Key');
        return;
      }
      setSuccess(data.message || 'Google Gemini API Key saved successfully.');
    } catch {
      setError('Network error saving Gemini API Key');
    } finally {
      setSavingGemini(false);
    }
  };

  // --- Handlers: Google Services ---
  const handleSaveGoogleServices = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const adminPassword = await promptPassword(
      'Enter your current admin password to confirm saving Google integration settings.'
    );
    if (!adminPassword) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSavingGoogleServices(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminPassword,
          google: {
            siteVerification: googleSiteVerification.trim(),
            tagManagerId: googleTagManagerId.trim(),
            adsenseClientId: googleAdsenseClientId.trim(),
            oauthClientId: googleOauthClientId.trim(),
            geminiApiKey: geminiApiKey.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save Google integration settings');
        return;
      }
      setSuccess('Google integration settings saved.');
    } catch {
      setError('Network error saving Google integration settings');
    } finally {
      setSavingGoogleServices(false);
    }
  };

  // --- Handlers: Custom API Keys ---
  const handleAddCustomApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiName.trim() || !newApiEnvKey.trim() || !newApiValue.trim()) {
      setError('Please fill in the Service Name, Key Name, and API Key / Secret Value.');
      return;
    }

    setError('');
    setSuccess('');
    const adminPassword = await promptPassword(
      `Enter your current admin password to confirm adding API key "${newApiName.trim()}".`
    );
    if (!adminPassword) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const entry: CustomApiEntry = {
      id: `${Date.now()}`,
      name: newApiName.trim(),
      envKey: newApiEnvKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      value: newApiValue.trim(),
      description: newApiDesc.trim(),
      updatedAt: new Date().toISOString(),
    };

    const nextList = [...customApis, entry];
    setSavingApis(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adminPassword, customApis: nextList }),
      });
      const data = await res.json();
      if (res.ok) {
        setCustomApis(nextList);
        setNewApiName('');
        setNewApiEnvKey('');
        setNewApiValue('');
        setNewApiDesc('');
        setSuccess(`Added API configuration "${entry.name}".`);
      } else {
        setError(data.error || 'Failed to save API entry');
      }
    } catch {
      setError('Network error saving API entry');
    } finally {
      setSavingApis(false);
    }
  };

  const handleDeleteCustomApi = async (entry: CustomApiEntry) => {
    const adminPassword = await promptPassword(
      `Remove API key "${entry.name}" (${entry.envKey}) from Settings? Enter your current admin password to confirm.`,
      { title: 'Confirm Remove API Key', confirmText: 'Remove Key', danger: true }
    );
    if (!adminPassword) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const nextList = customApis.filter((item) => item.id !== entry.id);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adminPassword, customApis: nextList }),
      });
      const data = await res.json();
      if (res.ok) {
        setCustomApis(nextList);
        setSuccess(`Removed API key "${entry.name}".`);
      } else {
        setError(data.error || 'Failed to remove API key');
      }
    } catch {
      setError('Failed to remove API key');
    }
  };

  // --- Handlers: Database & Full Backup Download (Requires Password + 2FA) ---
  const handleDownloadBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!backupPassword) {
      setError('Please enter your current admin password to download a backup.');
      return;
    }

    if (backupTotpCode.trim().length !== 6) {
      setError('Please enter your 6-digit 2FA authenticator code to download a backup.');
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/df-admin77/login');
      return;
    }

    setDownloadingBackup(true);
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminPassword: backupPassword,
          totpCode: backupTotpCode.trim(),
          backupType,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to verify credentials or generate backup.');
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const dateStamp = new Date().toISOString().slice(0, 10);
      const defaultName =
        backupType === 'database'
          ? `digitalfreebies-db-${dateStamp}.sqlite`
          : `digitalfreebies-full-backup-${dateStamp}.tar.gz`;
      const filename = filenameMatch?.[1] || defaultName;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setBackupPassword('');
      setBackupTotpCode('');
      setSuccess(`Backup "${filename}" verified with Password + 2FA and downloaded to your computer.`);
    } catch {
      setError('Network error while generating or downloading backup.');
    } finally {
      setDownloadingBackup(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.adminLayout}>
        <AdminNav />
        <div className={styles.adminMain} style={{ textAlign: 'center', paddingTop: '100px' }}>
          <p>Loading technical settings &amp; integrations...</p>
        </div>
      </div>
    );
  }

  const cfIsConfigured = Boolean(cfTunnelToken.trim());
  const turnstileIsConfigured = Boolean(cfTurnstileSiteKey.trim() && cfTurnstileSecretKey.trim());

  return (
    <div className={styles.adminLayout}>
      <AdminNav />

      <main className={styles.adminMain}>
        <div className={styles.tableHeader} style={{ marginBottom: '20px', border: 'none', padding: 0 }}>
          <div>
            <h1 className={styles.pageTitle}>Technical Settings &amp; SEO</h1>
            <p className={styles.pageSubtitle}>
              Configure Homepage Title &amp; Meta Description, `.htaccess` &amp; server files, SMTP Email Server, Cloudflare Tunnel, Google Analytics (GA4), and API keys.
            </p>
          </div>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}
        {success && <div className={styles.successMsg}>{success}</div>}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {(
            [
              { id: 'all', label: 'All Settings' },
              { id: 'gemini', label: 'Gemini AI API' },
              { id: 'seo', label: 'Homepage SEO & Meta' },
              { id: 'server', label: '.htaccess & Server Files' },
              { id: 'smtp', label: 'SMTP Email' },
              { id: 'cloudflare', label: 'Cloudflare & Turnstile' },
              { id: 'google', label: 'Google & Analytics' },
              { id: 'apis', label: 'Custom APIs & Keys' },
              { id: 'backup', label: 'Database & Backups' },
            ] as { id: SettingsTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={styles.actionBtn}
              style={{
                padding: '10px 18px',
                fontWeight: 700,
                fontSize: '13px',
                background: activeTab === t.id ? 'var(--color-primary)' : 'var(--color-white)',
                color: activeTab === t.id ? '#ffffff' : 'var(--color-gray-700)',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '8px',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ==================== 1. HOMEPAGE SEO & META SETTINGS ==================== */}
        {(activeTab === 'all' || activeTab === 'seo') && (
          <div className={styles.formCard} style={{ maxWidth: '100%', marginBottom: '28px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <h2 className={styles.tableTitle}>Homepage Title, Meta Description &amp; SEO</h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(106, 11, 158, 0.1)',
                  color: 'var(--color-primary)',
                }}
              >
                Live Metadata
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '20px', lineHeight: 1.5 }}>
              Control the <code>&lt;title&gt;</code>, <code>&lt;meta name=&quot;description&quot;&gt;</code>, keywords, Open Graph social preview, canonical URL, and crawler indexing tags rendered on the DigitalFreebies.io homepage.
            </p>

            <form onSubmit={handleSaveSeo}>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={styles.formLabel}>Homepage Title (`&lt;title&gt;`) *</label>
                    <span style={{ fontSize: '12px', color: homepageTitle.length > 65 ? '#b45309' : 'var(--color-gray-500)' }}>
                      {homepageTitle.length} chars (recommended: 50–60)
                    </span>
                  </div>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={homepageTitle}
                    onChange={(e) => setHomepageTitle(e.target.value)}
                    placeholder="DigitalFreebies.io — Discover Free Digital Offers, Trials & Promotions"
                    required
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={styles.formLabel}>Homepage Meta Description (`&lt;meta name=&quot;description&quot;&gt;`) *</label>
                    <span style={{ fontSize: '12px', color: homepageDescription.length > 165 ? '#b45309' : 'var(--color-gray-500)' }}>
                      {homepageDescription.length} chars (recommended: 140–160)
                    </span>
                  </div>
                  <textarea
                    className={`${styles.formInput} ${styles.formTextarea}`}
                    rows={3}
                    value={homepageDescription}
                    onChange={(e) => setHomepageDescription(e.target.value)}
                    placeholder="Find the best free digital offers, trials, and promotions..."
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Meta Keywords (Comma-separated)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={homepageKeywords}
                    onChange={(e) => setHomepageKeywords(e.target.value)}
                    placeholder="free trials, digital freebies, free streaming, free VPN..."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Canonical Site URL</label>
                  <input
                    type="url"
                    className={styles.formInput}
                    value={canonicalUrl}
                    onChange={(e) => setCanonicalUrl(e.target.value)}
                    placeholder="https://digitalfreebies.io"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Open Graph (Social Share) Title</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={ogTitle}
                    onChange={(e) => setOgTitle(e.target.value)}
                    placeholder="Defaults to Homepage Title if left blank"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Robots Meta Tag Directive</label>
                  <select
                    className={styles.formSelect}
                    value={robotsMeta}
                    onChange={(e) => setRobotsMeta(e.target.value)}
                  >
                    <option value="index, follow">index, follow (Recommended — Allow Search Indexing)</option>
                    <option value="noindex, follow">noindex, follow (Hide Homepage from Search Results)</option>
                    <option value="index, nofollow">index, nofollow</option>
                    <option value="noindex, nofollow">noindex, nofollow (Block All Indexing)</option>
                  </select>
                </div>

                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.formLabel}>Open Graph (Social Share) Description</label>
                  <textarea
                    className={`${styles.formInput} ${styles.formTextarea}`}
                    rows={2}
                    value={ogDescription}
                    onChange={(e) => setOgDescription(e.target.value)}
                    placeholder="Defaults to Homepage Meta Description if left blank"
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.formLabel}>
                    Custom `&lt;head&gt;` HTML / Verification Scripts / Schema JSON-LD (Optional)
                  </label>
                  <textarea
                    className={`${styles.formInput} ${styles.formTextarea}`}
                    rows={3}
                    value={customHeadHtml}
                    onChange={(e) => setCustomHeadHtml(e.target.value)}
                    placeholder="<!-- Paste custom <meta>, <link>, or <script> tags to include in <head> -->"
                    style={{ fontFamily: 'monospace', fontSize: '12.5px' }}
                  />
                </div>
              </div>

              {/* Google Search SERP Live Preview */}
              <div
                style={{
                  marginTop: '18px',
                  background: 'var(--color-gray-50, #f8f9fa)',
                  border: '1px solid var(--color-gray-200, #eeeeee)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--color-gray-500)',
                    marginBottom: '6px',
                  }}
                >
                  Google Search Result Preview
                </div>
                <div style={{ fontSize: '12px', color: '#202124', marginBottom: '2px' }}>
                  {canonicalUrl || 'https://digitalfreebies.io'}
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#1a0dab',
                    marginBottom: '4px',
                    lineHeight: 1.3,
                  }}
                >
                  {homepageTitle || 'DigitalFreebies.io'}
                </div>
                <div style={{ fontSize: '13px', color: '#4d5156', lineHeight: 1.45 }}>
                  {homepageDescription || 'No meta description set.'}
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.formSubmitBtn} disabled={savingSeo}>
                  {savingSeo ? 'Saving SEO & Meta...' : 'Save Homepage SEO & Meta'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================== 2. .HTACCESS & SERVER CONFIGURATION FILES ==================== */}
        {(activeTab === 'all' || activeTab === 'server') && (
          <div className={styles.formCard} style={{ maxWidth: '100%', marginBottom: '28px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <h2 className={styles.tableTitle}>
                `.htaccess`, `robots.txt` &amp; `ads.txt` File Editor
              </h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#15803d',
                }}
              >
                Synced to /public
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '16px', lineHeight: 1.5 }}>
              Edit your `.htaccess` server rules (redirects, HTTPS forcing, caching, security headers), `robots.txt` crawler rules, and `ads.txt` publisher declarations directly from the dashboard.
            </p>

            {/* File Switcher Sub-Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'htaccess', label: '.htaccess (Apache / Server Rules)' },
                  { id: 'robots', label: 'robots.txt (Search Crawlers)' },
                  { id: 'ads', label: 'ads.txt (AdSense / Authorized Sellers)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveServerFile(tab.id)}
                  className={styles.actionBtn}
                  style={{
                    padding: '8px 14px',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    background: activeServerFile === tab.id ? 'rgba(106, 11, 158, 0.12)' : 'var(--color-gray-50)',
                    color: activeServerFile === tab.id ? 'var(--color-primary)' : 'var(--color-gray-700)',
                    border:
                      activeServerFile === tab.id
                        ? '1px solid var(--color-primary)'
                        : '1px solid var(--color-gray-300)',
                    borderRadius: '6px',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveServerFiles}>
              {activeServerFile === 'htaccess' && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <label className={styles.formLabel}>`public/.htaccess` Contents</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleInsertHtaccessSnippet('https')}
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        style={{ fontSize: '11.5px', padding: '4px 10px' }}
                      >
                        + Force HTTPS
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertHtaccessSnippet('redirect')}
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        style={{ fontSize: '11.5px', padding: '4px 10px' }}
                      >
                        + 301 Redirect Rule
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertHtaccessSnippet('gzip')}
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        style={{ fontSize: '11.5px', padding: '4px 10px' }}
                      >
                        + GZIP Compression
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertHtaccessSnippet('headers')}
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        style={{ fontSize: '11.5px', padding: '4px 10px' }}
                      >
                        + Security Headers
                      </button>
                    </div>
                  </div>
                  <textarea
                    className={`${styles.formInput} ${styles.formTextarea}`}
                    rows={14}
                    value={htaccessContent}
                    onChange={(e) => setHtaccessContent(e.target.value)}
                    placeholder="# .htaccess rules..."
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      lineHeight: 1.55,
                      background: '#1e1e2e',
                      color: '#f8f8f2',
                      padding: '14px',
                      borderRadius: '8px',
                    }}
                  />
                </div>
              )}

              {activeServerFile === 'robots' && (
                <div>
                  <label className={styles.formLabel} style={{ display: 'block', marginBottom: '8px' }}>
                    `robots.txt` Crawler Directives
                  </label>
                  <textarea
                    className={`${styles.formInput} ${styles.formTextarea}`}
                    rows={10}
                    value={robotsTxtContent}
                    onChange={(e) => setRobotsTxtContent(e.target.value)}
                    placeholder="User-agent: *&#10;Allow: /"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      lineHeight: 1.55,
                      background: '#1e1e2e',
                      color: '#f8f8f2',
                      padding: '14px',
                      borderRadius: '8px',
                    }}
                  />
                </div>
              )}

              {activeServerFile === 'ads' && (
                <div>
                  <label className={styles.formLabel} style={{ display: 'block', marginBottom: '8px' }}>
                    `public/ads.txt` (Google AdSense &amp; Ad Network Authorized Digital Sellers)
                  </label>
                  <textarea
                    className={`${styles.formInput} ${styles.formTextarea}`}
                    rows={8}
                    value={adsTxtContent}
                    onChange={(e) => setAdsTxtContent(e.target.value)}
                    placeholder="google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      lineHeight: 1.55,
                      background: '#1e1e2e',
                      color: '#f8f8f2',
                      padding: '14px',
                      borderRadius: '8px',
                    }}
                  />
                </div>
              )}

              <div className={styles.formActions}>
                <button type="submit" className={styles.formSubmitBtn} disabled={savingServerFiles}>
                  {savingServerFiles ? 'Saving Server Files...' : 'Save .htaccess & Server Files'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================== GOOGLE GEMINI AI API KEY ==================== */}
        {(activeTab === 'all' ||
          activeTab === 'smtp' ||
          activeTab === 'gemini' ||
          activeTab === 'apis' ||
          activeTab === 'google') && (
          <div className={styles.formCard} style={{ maxWidth: '100%', marginBottom: '28px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <h2 className={styles.tableTitle}>Google Gemini AI API</h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: geminiApiKey.trim()
                    ? 'rgba(34, 197, 94, 0.14)'
                    : 'rgba(245, 158, 11, 0.14)',
                  color: geminiApiKey.trim() ? '#15803d' : '#b45309',
                }}
              >
                {geminiApiKey.trim() ? 'API Key Configured' : 'Not Configured'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '18px', lineHeight: 1.5 }}>
              Enter your Google Gemini API Key to automatically generate Brand, Short Description, Full Description, Meta Title, Meta Description, and Title suggestions when adding or editing a Freebie.
            </p>

            <form onSubmit={handleSaveGeminiApiKey}>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.formLabel}>Google Gemini API Key</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showGeminiApiKey ? 'text' : 'password'}
                      className={styles.formInput}
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="Paste your Gemini API Key (e.g. AIzaSy...)"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggleBtn}
                      onClick={() => setShowGeminiApiKey((prev) => !prev)}
                    >
                      {showGeminiApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.formSubmitBtn} disabled={savingGemini}>
                  {savingGemini ? 'Saving...' : 'Save Gemini API Key'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================== 3. SMTP EMAIL SERVER ==================== */}
        {(activeTab === 'all' || activeTab === 'smtp') && (
          <div className={styles.formCard} style={{ maxWidth: '100%', marginBottom: '28px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <h2 className={styles.tableTitle}>
                SMTP Email Server — Amazon SES (Registration &amp; Forgot Password)
              </h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: smtpConfigured
                    ? 'rgba(34, 197, 94, 0.12)'
                    : 'rgba(245, 158, 11, 0.14)',
                  color: smtpConfigured ? '#15803d' : '#b45309',
                }}
              >
                {smtpConfigured ? 'SMTP Active (Saved in DB)' : 'Awaiting SES SMTP Credentials'}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '16px', lineHeight: 1.5 }}>
              Configured for <strong>Amazon SES</strong> (saved directly in the SQLite database). Sends 6-digit registration confirmation codes, registration welcome emails, and password reset emails.
            </p>

            {/* Amazon SES Quick Preset & Guide */}
            <div
              style={{
                background: 'rgba(106, 11, 158, 0.04)',
                border: '1px solid rgba(106, 11, 158, 0.16)',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                  ☁️ Amazon SES Region &amp; Endpoint Preset
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <select
                    className={styles.formInput}
                    style={{ width: 'auto', minWidth: '250px', padding: '7px 12px', fontSize: '13px' }}
                    value={
                      smtpHost.startsWith('email-smtp.') && smtpHost.endsWith('.amazonaws.com')
                        ? smtpHost
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) {
                        setSmtpHost(e.target.value);
                        if (smtpPort !== '587' && smtpPort !== '465' && smtpPort !== '2587' && smtpPort !== '2465') {
                          setSmtpPort('587');
                          setSmtpSecure(false);
                        }
                      }
                    }}
                  >
                    <option value="">Custom SMTP Host...</option>
                    <option value="email-smtp.us-east-1.amazonaws.com">US East (N. Virginia) — us-east-1</option>
                    <option value="email-smtp.us-east-2.amazonaws.com">US East (Ohio) — us-east-2</option>
                    <option value="email-smtp.us-west-1.amazonaws.com">US West (N. California) — us-west-1</option>
                    <option value="email-smtp.us-west-2.amazonaws.com">US West (Oregon) — us-west-2</option>
                    <option value="email-smtp.eu-west-1.amazonaws.com">Europe (Ireland) — eu-west-1</option>
                    <option value="email-smtp.eu-west-2.amazonaws.com">Europe (London) — eu-west-2</option>
                    <option value="email-smtp.eu-west-3.amazonaws.com">Europe (Paris) — eu-west-3</option>
                    <option value="email-smtp.eu-central-1.amazonaws.com">Europe (Frankfurt) — eu-central-1</option>
                    <option value="email-smtp.eu-north-1.amazonaws.com">Europe (Stockholm) — eu-north-1</option>
                    <option value="email-smtp.ca-central-1.amazonaws.com">Canada (Central) — ca-central-1</option>
                    <option value="email-smtp.ap-south-1.amazonaws.com">Asia Pacific (Mumbai) — ap-south-1</option>
                    <option value="email-smtp.ap-southeast-1.amazonaws.com">Asia Pacific (Singapore) — ap-southeast-1</option>
                    <option value="email-smtp.ap-southeast-2.amazonaws.com">Asia Pacific (Sydney) — ap-southeast-2</option>
                    <option value="email-smtp.ap-northeast-1.amazonaws.com">Asia Pacific (Tokyo) — ap-northeast-1</option>
                    <option value="email-smtp.sa-east-1.amazonaws.com">South America (São Paulo) — sa-east-1</option>
                  </select>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.editBtn}`}
                    style={{ padding: '7px 12px', fontSize: '12px', fontWeight: 700 }}
                    onClick={() => {
                      setSmtpPort('587');
                      setSmtpSecure(false);
                    }}
                  >
                    Port 587 (STARTTLS)
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.editBtn}`}
                    style={{ padding: '7px 12px', fontSize: '12px', fontWeight: 700 }}
                    onClick={() => {
                      setSmtpPort('465');
                      setSmtpSecure(true);
                    }}
                  >
                    Port 465 (TLS Wrapper)
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-gray-600)', lineHeight: 1.55 }}>
                <strong>Amazon SES Checklist:</strong> In AWS Console → <em>Amazon SES → SMTP settings → Create SMTP credentials</em>, copy your <strong>SMTP Username</strong> (starts with <code>AKIA...</code>) and <strong>SMTP Password</strong> below. Make sure your <strong>Sender Email (From Address)</strong> is a verified identity/domain in SES.
              </div>
            </div>

            <form onSubmit={handleSaveSmtp}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>SMTP Host (Amazon SES Endpoint)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="email-smtp.us-east-1.amazonaws.com"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>SMTP Port</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={smtpPort}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSmtpPort(val);
                      if (val === '465' || val === '2465') setSmtpSecure(true);
                      if (val === '587' || val === '2587') setSmtpSecure(false);
                    }}
                    placeholder="587 (STARTTLS) or 465 (SSL/TLS)"
                    min={1}
                    max={65535}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>SES SMTP Username</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    placeholder="e.g. AKIAIOSFODNN7EXAMPLE (SES SMTP Username)"
                    autoComplete="off"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    SES SMTP Password {smtpHasPassword ? '(Saved in DB — leave blank to keep current)' : ''}
                  </label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showSmtpPassword ? 'text' : 'password'}
                      className={styles.formInput}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder={smtpHasPassword ? '•••••••••••• (saved)' : 'Enter Amazon SES SMTP password'}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggleBtn}
                      onClick={() => setShowSmtpPassword((prev) => !prev)}
                    >
                      {showSmtpPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Sender Name (From Name)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="DigitalFreebies.io"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Verified Sender Email (SES From Address)</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="noreply@digitalfreebies.io"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      checked={smtpSecure}
                      onChange={(e) => setSmtpSecure(e.target.checked)}
                    />
                    <span className={styles.checkboxLabel}>
                      Use implicit TLS Wrapper (Port 465 / 2465). Uncheck for STARTTLS (Port 587 / 2587).
                    </span>
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      checked={requireEmailVerification}
                      onChange={(e) => setRequireEmailVerification(e.target.checked)}
                    />
                    <span className={styles.checkboxLabel}>
                      Require 6-digit email confirmation when new forum users register
                    </span>
                  </label>
                </div>
              </div>

              <div
                className={styles.formActions}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <button type="submit" className={styles.formSubmitBtn} disabled={savingSmtp}>
                  {savingSmtp ? 'Saving SMTP Settings...' : 'Save SMTP Settings'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    className={styles.formInput}
                    value={testRecipientEmail}
                    onChange={(e) => setTestRecipientEmail(e.target.value)}
                    placeholder="test-recipient@yourdomain.com"
                    style={{ width: '250px', padding: '9px 12px' }}
                  />
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    className={`${styles.actionBtn} ${styles.editBtn}`}
                    style={{ padding: '10px 16px', fontWeight: 700 }}
                    disabled={testingSmtp}
                  >
                    {testingSmtp ? 'Sending Test...' : 'Send Test Email'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ==================== 4. CLOUDFLARE TURNSTILE & TUNNEL ==================== */}
        {(activeTab === 'all' || activeTab === 'cloudflare') && (
          <>
            {/* Cloudflare Turnstile Card */}
            <div className={styles.formCard} style={{ maxWidth: '100%', marginBottom: '28px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <h2 className={styles.tableTitle}>Cloudflare Turnstile (Bot &amp; Spam Protection)</h2>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: turnstileIsConfigured
                      ? 'rgba(34, 197, 94, 0.12)'
                      : 'rgba(107, 114, 128, 0.12)',
                    color: turnstileIsConfigured ? '#15803d' : 'var(--color-gray-600)',
                  }}
                >
                  {turnstileIsConfigured
                    ? 'Active (Registration, Login & Admin Login)'
                    : 'Disabled (Hidden — Keys Empty)'}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '20px', lineHeight: 1.5 }}>
                Enter your Cloudflare Turnstile <strong>Site Key</strong> and <strong>Secret Key</strong>. When both keys are set, the Turnstile challenge is shown and verified on <strong>Forum Registration</strong>, <strong>Forum Login</strong>, <strong>Forgot Password</strong>, and <strong>Admin Login</strong>. Leave either field empty to hide Turnstile completely.
              </p>

              <form onSubmit={handleSaveTurnstile}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Turnstile Site Key</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={cfTurnstileSiteKey}
                      onChange={(e) => setCfTurnstileSiteKey(e.target.value)}
                      placeholder="0x4AAAAAA... (Leave empty to disable Turnstile)"
                      autoComplete="off"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Turnstile Secret Key</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        type={showCfTurnstileSecret ? 'text' : 'password'}
                        className={styles.formInput}
                        value={cfTurnstileSecretKey}
                        onChange={(e) => setCfTurnstileSecretKey(e.target.value)}
                        placeholder="0x4AAAAAA... (Leave empty to disable Turnstile)"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggleBtn}
                        onClick={() => setShowCfTurnstileSecret((prev) => !prev)}
                      >
                        {showCfTurnstileSecret ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.formSubmitBtn} disabled={savingTurnstile}>
                    {savingTurnstile ? 'Saving Turnstile Keys...' : 'Save Cloudflare Turnstile'}
                  </button>
                </div>
              </form>
            </div>

            {/* Cloudflare Tunnel Card */}
            <div className={styles.formCard} style={{ maxWidth: '100%', marginBottom: '28px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <h2 className={styles.tableTitle}>Cloudflare Tunnel (Zero Trust Connector)</h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: cfIsConfigured
                    ? 'rgba(34, 197, 94, 0.12)'
                    : 'rgba(245, 158, 11, 0.14)',
                  color: cfIsConfigured ? '#15803d' : '#b45309',
                }}
              >
                {cfIsConfigured ? (cfEnabled ? 'Tunnel Active' : 'Token Configured') : 'Not Configured'}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '20px', lineHeight: 1.5 }}>
              Store your Cloudflare Zero Trust Tunnel connector token (`cloudflared`), public domain hostname, and local origin service URL.
            </p>

            <form onSubmit={handleSaveCloudflare}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tunnel Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={cfTunnelName}
                    onChange={(e) => setCfTunnelName(e.target.value)}
                    placeholder="digitalfreebies-tunnel"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Public Hostname / Domain</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={cfPublicHostname}
                    onChange={(e) => setCfPublicHostname(e.target.value)}
                    placeholder="https://digitalfreebies.io"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Local Service Origin URL</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={cfLocalServiceUrl}
                    onChange={(e) => setCfLocalServiceUrl(e.target.value)}
                    placeholder="http://localhost:3000"
                  />
                </div>

                <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
                  <label className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      checked={cfEnabled}
                      onChange={(e) => setCfEnabled(e.target.checked)}
                    />
                    <span className={styles.checkboxLabel}>
                      Mark Cloudflare Tunnel as Active in Production
                    </span>
                  </label>
                </div>

                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.formLabel}>
                    Cloudflare Tunnel Connector Token (`TUNNEL_TOKEN`)
                  </label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showCfToken ? 'text' : 'password'}
                      className={styles.formInput}
                      value={cfTunnelToken}
                      onChange={(e) => setCfTunnelToken(e.target.value)}
                      placeholder="eyJhIjoi... (Paste token from Cloudflare Zero Trust > Networks > Tunnels)"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggleBtn}
                      onClick={() => setShowCfToken((prev) => !prev)}
                    >
                      {showCfToken ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Ready-to-run cloudflared CLI snippet */}
              <div
                style={{
                  marginTop: '16px',
                  background: 'var(--color-gray-50, #f8f9fa)',
                  border: '1px solid var(--color-gray-200, #eeeeee)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--color-gray-500)',
                      marginBottom: '4px',
                    }}
                  >
                    Cloudflared Run Command
                  </div>
                  <code style={{ fontSize: '12.5px', color: 'var(--color-gray-800)', wordBreak: 'break-all' }}>
                    cloudflared tunnel run --token{' '}
                    {cfTunnelToken
                      ? showCfToken
                        ? cfTunnelToken
                        : '••••••••••••••••••••••••'
                      : '<YOUR_TUNNEL_TOKEN>'}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCfCommand}
                  className={`${styles.actionBtn} ${styles.editBtn}`}
                >
                  {copiedCfCmd ? 'Copied!' : 'Copy Command'}
                </button>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.formSubmitBtn} disabled={savingCf}>
                  {savingCf ? 'Saving Tunnel Settings...' : 'Save Cloudflare Tunnel'}
                </button>
              </div>
            </form>
          </div>
          </>
        )}

        {/* ==================== 5. GOOGLE ANALYTICS & GOOGLE SERVICES ==================== */}
        {(activeTab === 'all' || activeTab === 'google') && (
          <>
            {/* Google Analytics (GA4) Card */}
            <div className={styles.formCard} style={{ maxWidth: '100%', marginBottom: '28px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <h2 className={styles.tableTitle}>Google Analytics 4 (GA4 Tracking &amp; Dashboard API)</h2>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: gaConfigured
                      ? 'rgba(34, 197, 94, 0.12)'
                      : 'rgba(245, 158, 11, 0.14)',
                    color: gaConfigured ? '#15803d' : '#b45309',
                  }}
                >
                  {gaConfigured ? 'GA4 Connected' : 'Not Connected'}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '20px', lineHeight: 1.5 }}>
                Enter your GA4 Measurement ID (`G-XXXXXXXXXX`) to automatically inject the tracking tag across the site, and attach your Google Cloud Service Account JSON + Property ID to power the live traffic chart on the Admin Dashboard.
              </p>

              <form onSubmit={handleSaveGa}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>GA4 Measurement ID (Frontend Tag)</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={gaMeasurementId}
                      onChange={(e) => setGaMeasurementId(e.target.value)}
                      placeholder="G-XXXXXXXXXX"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>GA4 Property ID (Numeric, for Dashboard Graph)</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={gaPropertyId}
                      onChange={(e) => setGaPropertyId(e.target.value)}
                      placeholder="e.g. 123456789"
                    />
                  </div>

                  <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <label className={styles.formLabel}>
                        Google Cloud Service Account JSON{' '}
                        {gaHasServiceAccount
                          ? `(Connected: ${gaClientEmail || 'Service Account Saved'})`
                          : '(Required for Dashboard Graph)'}
                      </label>
                      <div>
                        <input
                          ref={gaFileInputRef}
                          type="file"
                          accept=".json,application/json"
                          onChange={handleGaJsonUpload}
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => gaFileInputRef.current?.click()}
                          className={`${styles.actionBtn} ${styles.editBtn}`}
                        >
                          Upload .json Key File
                        </button>
                      </div>
                    </div>
                    <textarea
                      className={`${styles.formInput} ${styles.formTextarea}`}
                      rows={4}
                      value={gaServiceAccountJson}
                      onChange={(e) => setGaServiceAccountJson(e.target.value)}
                      placeholder={
                        gaHasServiceAccount
                          ? 'Service Account JSON is already saved. Paste a new JSON file here only if you want to replace it.'
                          : '{"type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..."}'
                      }
                      style={{ fontFamily: 'monospace', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.formSubmitBtn} disabled={savingGa}>
                    {savingGa ? 'Saving GA4...' : 'Save Google Analytics'}
                  </button>
                  {(gaMeasurementId || gaPropertyId || gaHasServiceAccount) && (
                    <button
                      type="button"
                      onClick={handleDisconnectGa}
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      style={{ padding: '12px 18px', fontSize: '14px' }}
                    >
                      Disconnect GA4
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Google Search Console, Tag Manager, AdSense & OAuth Card */}
            <div className={styles.formCard} style={{ maxWidth: '100%', marginBottom: '28px' }}>
              <h2 className={styles.tableTitle} style={{ marginBottom: '6px' }}>
                Google Services (Search Console, Tag Manager, AdSense &amp; OAuth)
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '20px', lineHeight: 1.5 }}>
                Add verification codes and client IDs for Google Search Console, Google Tag Manager, Google AdSense, or Google OAuth.
              </p>

              <form onSubmit={handleSaveGoogleServices}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Google Search Console Verification (`google-site-verification`)
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={googleSiteVerification}
                      onChange={(e) => setGoogleSiteVerification(e.target.value)}
                      placeholder="Paste verification token string"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Google Tag Manager Container ID</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={googleTagManagerId}
                      onChange={(e) => setGoogleTagManagerId(e.target.value)}
                      placeholder="GTM-XXXXXXX"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Google AdSense Publisher ID</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={googleAdsenseClientId}
                      onChange={(e) => setGoogleAdsenseClientId(e.target.value)}
                      placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Google OAuth Client ID</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={googleOauthClientId}
                      onChange={(e) => setGoogleOauthClientId(e.target.value)}
                      placeholder="xxxxxxxx.apps.googleusercontent.com"
                    />
                  </div>

                  <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                    <label className={styles.formLabel}>
                      Google Gemini API Key (Auto-fill Brand, Descriptions &amp; SEO when adding Freebies)
                    </label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        type={showGeminiApiKey ? 'text' : 'password'}
                        className={styles.formInput}
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                      />
                      <button
                        type="button"
                        className={styles.passwordToggleBtn}
                        onClick={() => setShowGeminiApiKey((prev) => !prev)}
                      >
                        {showGeminiApiKey ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.formSubmitBtn} disabled={savingGoogleServices}>
                    {savingGoogleServices ? 'Saving...' : 'Save Google Services'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* ==================== 6. CUSTOM API KEYS & INTEGRATIONS ==================== */}
        {(activeTab === 'all' || activeTab === 'apis') && (
          <div className={styles.formCard} style={{ maxWidth: '100%', marginBottom: '28px' }}>
            <h2 className={styles.tableTitle} style={{ marginBottom: '6px' }}>
              Custom API Keys &amp; Technical Integrations
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '20px', lineHeight: 1.5 }}>
              Add and manage additional API keys, webhooks, or third-party credentials in one place.
            </p>

            <form onSubmit={handleAddCustomApi} style={{ marginBottom: '24px' }}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Service / Integration Name *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={newApiName}
                    onChange={(e) => setNewApiName(e.target.value)}
                    placeholder="e.g. Cloudflare Turnstile, Stripe, Resend, OpenAI"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Key Identifier / Env Name *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={newApiEnvKey}
                    onChange={(e) => setNewApiEnvKey(e.target.value)}
                    placeholder="e.g. TURNSTILE_SECRET_KEY"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>API Key / Secret Value *</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showNewApiValue ? 'text' : 'password'}
                      className={styles.formInput}
                      value={newApiValue}
                      onChange={(e) => setNewApiValue(e.target.value)}
                      placeholder="Paste API key, token, or webhook URL"
                      required
                    />
                    <button
                      type="button"
                      className={styles.passwordToggleBtn}
                      onClick={() => setShowNewApiValue((prev) => !prev)}
                    >
                      {showNewApiValue ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Notes / Purpose (Optional)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={newApiDesc}
                    onChange={(e) => setNewApiDesc(e.target.value)}
                    placeholder="e.g. Used for bot protection"
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.formSubmitBtn} disabled={savingApis}>
                  {savingApis ? 'Adding...' : '+ Add API Key / Setting'}
                </button>
              </div>
            </form>

            {customApis.length > 0 && (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Key Name</th>
                      <th>Value</th>
                      <th>Notes</th>
                      <th style={{ width: '160px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customApis.map((api) => {
                      const isShown = Boolean(visibleApiIds[api.id]);
                      return (
                        <tr key={api.id}>
                          <td style={{ fontWeight: 700, color: 'var(--color-gray-900)' }}>{api.name}</td>
                          <td>
                            <code
                              style={{
                                fontSize: '12px',
                                background: 'rgba(106, 11, 158, 0.08)',
                                color: 'var(--color-primary)',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}
                            >
                              {api.envKey}
                            </code>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                            {isShown ? api.value : '••••••••••••••••'}
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--color-gray-600)' }}>
                            {api.description || '—'}
                          </td>
                          <td>
                            <div className={styles.tableActions}>
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.editBtn}`}
                                onClick={() =>
                                  setVisibleApiIds((prev) => ({
                                    ...prev,
                                    [api.id]: !prev[api.id],
                                  }))
                                }
                              >
                                {isShown ? 'Hide' : 'Show'}
                              </button>
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                onClick={() => handleDeleteCustomApi(api)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================== 7. DATABASE & FULL BACKUP DOWNLOAD (PASSWORD + 2FA) ==================== */}
        {(activeTab === 'all' || activeTab === 'backup') && (
          <div className={styles.formCard} style={{ maxWidth: '100%', marginBottom: '28px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <h2 className={styles.tableTitle}>Database &amp; Full Backup Download</h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(106, 11, 158, 0.1)',
                  color: 'var(--color-primary)',
                }}
              >
                Protected by Password + 2FA
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '20px', lineHeight: 1.5 }}>
              Download a full backup of your database (<code>prisma/dev.db</code>), technical settings (<code>prisma/technical-settings.json</code>), and uploaded images (<code>public/images/</code>). For security, both your <strong>Current Admin Password</strong> and a valid <strong>6-digit 2FA Authenticator Code</strong> are required for every download.
            </p>

            <form onSubmit={handleDownloadBackup} autoComplete="off">
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.formLabel}>Backup Package Type</label>
                  <select
                    className={styles.formSelect}
                    value={backupType}
                    onChange={(e) => setBackupType(e.target.value as 'full' | 'database')}
                  >
                    <option value="full">
                      Full Backup Archive (.tar.gz — SQLite Database + Technical Settings + Uploaded Images)
                    </option>
                    <option value="database">
                      Database Only (.sqlite — prisma/dev.db SQLite file)
                    </option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Current Admin Password *</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showBackupPassword ? 'text' : 'password'}
                      className={styles.formInput}
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      placeholder="Enter your admin password"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggleBtn}
                      onClick={() => setShowBackupPassword((prev) => !prev)}
                    >
                      {showBackupPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>6-Digit 2FA Authenticator Code *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={styles.formInput}
                    value={backupTotpCode}
                    onChange={(e) =>
                      setBackupTotpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                    }
                    placeholder="000000"
                    required
                    maxLength={6}
                    autoComplete="one-time-code"
                    style={{
                      letterSpacing: '4px',
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.formSubmitBtn} disabled={downloadingBackup}>
                  {downloadingBackup
                    ? 'Verifying Password & 2FA...'
                    : 'Verify & Download Backup'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
