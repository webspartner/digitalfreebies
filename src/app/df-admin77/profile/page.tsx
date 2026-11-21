'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../admin.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';

interface AdminProfile {
  id: number;
  username: string;
  email: string | null;
  role?: string;
  twoFactorEnabled: boolean;
}

interface AuditLogEntry {
  id: number;
  actor: string;
  action: string;
  category: string;
  summary: string;
  ipAddress?: string | null;
  createdAt: string;
}

export default function AdminPersonalDashboardPage() {
  const router = useRouter();
  const { promptPassword } = useDialog();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Account Settings Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // 2FA Setup / Disable State
  const [setupSecret, setSetupSecret] = useState('');
  const [setupOtpAuthUrl, setSetupOtpAuthUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [processing2FA, setProcessing2FA] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Feedback Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/df-admin77/login');
      return;
    }
    fetchProfileData(token);
  }, [router]);

  const fetchProfileData = async (token?: string) => {
    const t = token || localStorage.getItem('admin_token');
    if (!t) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/profile', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) {
        router.push('/df-admin77/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setUsername(data.profile.username || '');
        setEmail(data.profile.email || '');
        setRecentLogs(data.recentLogs || []);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load your account profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword) {
      if (newPassword !== confirmNewPassword) {
        setError('New passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long');
        return;
      }
    }

    let confirmedCurrentPassword = currentPassword;
    if (!confirmedCurrentPassword) {
      const prompted = await promptPassword(
        'Please enter your current password to confirm saving changes to your account.'
      );
      if (!prompted) return;
      confirmedCurrentPassword = prompted;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSavingProfile(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          currentPassword: confirmedCurrentPassword,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      if (data.token) {
        localStorage.setItem('admin_token', data.token);
      }
      if (data.profile) {
        setProfile(data.profile);
        localStorage.setItem(
          'admin_user',
          JSON.stringify({
            id: data.profile.id,
            username: data.profile.username,
            email: data.profile.email,
            twoFactorEnabled: data.profile.twoFactorEnabled,
            role: data.profile.role || 'admin',
          })
        );
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccess(data.message || 'Your profile settings have been saved.');
      fetchProfileData(data.token || token);
    } catch {
      setError('Network error while saving profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleStart2FASetup = async () => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setProcessing2FA(true);
    try {
      const res = await fetch('/api/admin/profile/2fa', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to initialize 2FA setup');
        return;
      }
      setSetupSecret(data.secret);
      setSetupOtpAuthUrl(data.otpauthUrl);
      setVerificationCode('');
    } catch {
      setError('Network error initializing 2FA setup');
    } finally {
      setProcessing2FA(false);
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setProcessing2FA(true);
    try {
      const res = await fetch('/api/admin/profile/2fa', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          secret: setupSecret,
          code: verificationCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to verify 2FA code');
        return;
      }

      setSetupSecret('');
      setSetupOtpAuthUrl('');
      setVerificationCode('');
      setSuccess('Two-Factor Authentication (2FA) is now active on your account.');
      fetchProfileData(token);
    } catch {
      setError('Network error enabling 2FA');
    } finally {
      setProcessing2FA(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setProcessing2FA(true);
    try {
      const res = await fetch('/api/admin/profile/2fa', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: disablePassword || undefined,
          code: disableCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to disable 2FA');
        return;
      }

      setShowDisableModal(false);
      setDisablePassword('');
      setDisableCode('');
      setSuccess('Two-Factor Authentication (2FA) has been disabled on your account.');
      fetchProfileData(token);
    } catch {
      setError('Network error disabling 2FA');
    } finally {
      setProcessing2FA(false);
    }
  };

  const handleCopySecret = () => {
    if (!setupSecret) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(setupSecret).catch(() => {});
    } else if (typeof document !== 'undefined') {
      const ta = document.createElement('textarea');
      ta.value = setupSecret;
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
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const isModerator = profile?.role === 'moderator';

  if (loading) {
    return (
      <div className={styles.adminLayout}>
        <AdminNav />
        <div className={styles.adminMain} style={{ textAlign: 'center', paddingTop: '100px' }}>
          <p>Loading your account dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <AdminNav />

      <main className={styles.adminMain}>
        <div className={styles.tableHeader} style={{ marginBottom: '24px', border: 'none', padding: 0 }}>
          <div>
            <h1 className={styles.pageTitle}>My Account Profile</h1>
            <p className={styles.pageSubtitle} style={{ marginBottom: 0 }}>
              Manage your personal credentials, email address, Two-Factor Authentication (2FA), and recent account activity.
            </p>
          </div>
          {!isModerator && (
            <Link href="/df-admin77/logs" className={styles.addBtn}>
              View Full Audit Logs
            </Link>
          )}
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}
        {success && <div className={styles.successMsg}>{success}</div>}

        {/* Account Summary Overview Strip */}
        <div className={styles.statsGrid} style={{ marginBottom: '24px' }}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Signed In As</span>
            <span className={styles.statValue} style={{ fontSize: '20px', wordBreak: 'break-word' }}>
              {profile?.username}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Email Address</span>
            <span
              className={styles.statValue}
              style={{
                fontSize: '15px',
                color: profile?.email ? 'var(--color-gray-900)' : 'var(--color-gray-400)',
                wordBreak: 'break-all',
              }}
            >
              {profile?.email || 'Not configured'}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Two-Factor Auth (2FA)</span>
            <span
              className={styles.statValue}
              style={{
                fontSize: '17px',
                color: profile?.twoFactorEnabled ? '#15803d' : '#b45309',
              }}
            >
              {profile?.twoFactorEnabled ? 'Enabled (Protected)' : 'Disabled'}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Account Role</span>
            <span className={styles.statValue} style={{ fontSize: '17px', color: 'var(--color-primary)' }}>
              {isModerator ? 'Moderator' : 'Administrator'} (#{profile?.id})
            </span>
          </div>
        </div>

        <div className={styles.profileTwoColGrid}>
          {/* Left Card: Profile Credentials (Username, Email, Password) */}
          <div className={styles.formCard} style={{ maxWidth: '100%' }}>
            <h2 className={styles.tableTitle} style={{ marginBottom: '6px' }}>
              Account Credentials &amp; Email
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '20px' }}>
              Update your account username, recovery/notification email, or password.
            </p>

            <form onSubmit={handleSaveProfile}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Username *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    maxLength={40}
                    placeholder="Admin username"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email Address</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@digitalfreebies.io"
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--color-gray-200)', margin: '4px 0' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-gray-800)' }}>
                    Change Password (Optional)
                  </span>
                </div>

                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.formLabel}>
                    Current Password * (required to confirm any account change)
                  </label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className={styles.formInput}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggleBtn}
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrentPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>New Password (min 6 chars)</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className={styles.formInput}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggleBtn}
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Confirm New Password</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      className={styles.formInput}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.passwordToggleBtn}
                      onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                      aria-label={showConfirmNewPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmNewPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.formSubmitBtn} disabled={savingProfile}>
                  {savingProfile ? 'Saving Changes...' : 'Save Account Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Card: Two-Factor Authentication (2FA) */}
          <div className={styles.formCard} style={{ maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '12px', flexWrap: 'wrap' }}>
              <h2 className={styles.tableTitle}>Two-Factor Authentication (2FA)</h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: profile?.twoFactorEnabled
                    ? 'rgba(34, 197, 94, 0.12)'
                    : 'rgba(245, 158, 11, 0.14)',
                  color: profile?.twoFactorEnabled ? '#15803d' : '#b45309',
                }}
              >
                {profile?.twoFactorEnabled ? '2FA Active' : '2FA Inactive'}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '20px', lineHeight: 1.5 }}>
              Protect your account with a time-based 6-digit verification code (TOTP) compatible with Google Authenticator, Authy, 1Password, or Microsoft Authenticator.
            </p>

            {/* State 1: 2FA is currently disabled and setup not started */}
            {!profile?.twoFactorEnabled && !setupSecret && (
              <div
                style={{
                  background: 'var(--color-gray-50)',
                  border: '1px solid var(--color-gray-200)',
                  borderRadius: '10px',
                  padding: '20px',
                }}
              >
                <p style={{ fontSize: '13px', color: 'var(--color-gray-700)', marginBottom: '16px', lineHeight: 1.5 }}>
                  Two-Factor Authentication is currently turned off for your account. Enabling 2FA requires a 6-digit code from your phone whenever you sign in.
                </p>
                <div className={styles.formActions} style={{ marginTop: 0 }}>
                  <button
                    type="button"
                    onClick={handleStart2FASetup}
                    className={styles.formSubmitBtn}
                    disabled={processing2FA}
                  >
                    {processing2FA ? 'Generating Setup Key...' : 'Set Up Two-Factor Authentication'}
                  </button>
                </div>
              </div>
            )}

            {/* State 2: 2FA Setup in progress */}
            {!profile?.twoFactorEnabled && setupSecret && (
              <div
                style={{
                  background: 'var(--color-gray-50)',
                  border: '1px solid var(--color-gray-200)',
                  borderRadius: '10px',
                  padding: '20px',
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: '8px' }}>
                    Step 1: Scan QR Code or Enter Setup Key in Your Authenticator App
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-gray-600)', marginBottom: '14px' }}>
                    Open Google Authenticator, Authy, or your preferred authenticator app and scan the QR code below, or manually enter the secret key.
                  </p>

                  <div className={styles.qrSetupRow}>
                    <div
                      style={{
                        background: '#ffffff',
                        padding: '10px',
                        borderRadius: '10px',
                        border: '1px solid var(--color-gray-200)',
                        display: 'inline-flex',
                        alignSelf: 'flex-start',
                      }}
                    >
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          setupOtpAuthUrl
                        )}`}
                        alt="2FA QR Code"
                        width={150}
                        height={150}
                        style={{ display: 'block' }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-gray-500)', marginBottom: '6px' }}>
                        Manual Setup Key (Base32)
                      </div>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          fontWeight: 700,
                          background: '#ffffff',
                          border: '1px solid var(--color-gray-300)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          letterSpacing: '1.5px',
                          wordBreak: 'break-all',
                          marginBottom: '8px',
                          color: 'var(--color-gray-900)',
                        }}
                      >
                        {setupSecret}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        style={{ fontSize: '12px' }}
                      >
                        {copiedSecret ? 'Copied to Clipboard' : 'Copy Setup Key'}
                      </button>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleEnable2FA}>
                  <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                    <label className={styles.formLabel}>
                      Step 2: Enter 6-Digit Code from Your App to Confirm *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={styles.formInput}
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                      }
                      placeholder="000000"
                      required
                      maxLength={6}
                      style={{
                        maxWidth: '220px',
                        letterSpacing: '5px',
                        fontSize: '18px',
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    />
                  </div>

                  <div className={styles.formActions} style={{ marginTop: '12px' }}>
                    <button type="submit" className={styles.formSubmitBtn} disabled={processing2FA}>
                      {processing2FA ? 'Verifying...' : 'Verify & Enable 2FA'}
                    </button>
                    <button
                      type="button"
                      className={styles.formCancelBtn}
                      onClick={() => {
                        setSetupSecret('');
                        setSetupOtpAuthUrl('');
                        setVerificationCode('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* State 3: 2FA is currently enabled */}
            {profile?.twoFactorEnabled && (
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.06)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '10px',
                  padding: '20px',
                }}
              >
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#15803d', marginBottom: '8px' }}>
                  Two-Factor Authentication is active on your account.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-gray-700)', marginBottom: '16px', lineHeight: 1.5 }}>
                  Every sign-in to your account requires both your password and a valid 6-digit code from your authenticator app.
                </p>

                {!showDisableModal ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisableModal(true);
                      setError('');
                      setSuccess('');
                    }}
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 700 }}
                  >
                    Disable Two-Factor Authentication
                  </button>
                ) : (
                  <form
                    onSubmit={handleDisable2FA}
                    style={{
                      background: '#ffffff',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-gray-200)',
                      marginTop: '12px',
                    }}
                  >
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: '12px' }}>
                      Confirm Identity to Disable 2FA
                    </p>
                    <div className={styles.formGroup} style={{ marginBottom: '12px' }}>
                      <label className={styles.formLabel}>Current Password</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showDisablePassword ? 'text' : 'password'}
                          className={styles.formInput}
                          value={disablePassword}
                          onChange={(e) => setDisablePassword(e.target.value)}
                          placeholder="Enter your current password"
                        />
                        <button
                          type="button"
                          className={styles.passwordToggleBtn}
                          onClick={() => setShowDisablePassword((prev) => !prev)}
                          aria-label={showDisablePassword ? 'Hide password' : 'Show password'}
                        >
                          {showDisablePassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                      <label className={styles.formLabel}>Or 6-Digit Authenticator Code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={styles.formInput}
                        value={disableCode}
                        onChange={(e) =>
                          setDisableCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                        }
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>
                    <div className={styles.formActions} style={{ marginTop: '12px' }}>
                      <button
                        type="submit"
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        style={{ padding: '12px 18px', fontWeight: 700, fontSize: '14px' }}
                        disabled={processing2FA}
                      >
                        {processing2FA ? 'Disabling...' : 'Confirm Disable 2FA'}
                      </button>
                      <button
                        type="button"
                        className={styles.formCancelBtn}
                        onClick={() => {
                          setShowDisableModal(false);
                          setDisablePassword('');
                          setDisableCode('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Technical Settings & APIs Shortcut Card (Admins only) */}
        {!isModerator && (
          <div className={`${styles.formCard} ${styles.profileShortcutCard}`}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <h2 className={styles.tableTitle} style={{ marginBottom: '4px' }}>
                Technical Settings, SMTP, Cloudflare Tunnel &amp; Google APIs
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', margin: 0 }}>
                Configure Homepage SEO, .htaccess/robots.txt/ads.txt, SMTP Email Server, Cloudflare Tunnel, Google Analytics (GA4), and custom API keys in the Settings hub.
              </p>
            </div>
            <Link href="/df-admin77/settings" className={styles.addBtn}>
              Open Settings &amp; APIs →
            </Link>
          </div>
        )}

        {/* Personal Recent Activity Table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>
              My Recent Account Activity ({recentLogs.length})
            </h2>
            {!isModerator && (
              <Link href="/df-admin77/logs" className={`${styles.actionBtn} ${styles.editBtn}`}>
                View All System Logs
              </Link>
            )}
          </div>
          <div className={styles.tableWrapper}>
            {recentLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-gray-500)' }}>
                No recent activity recorded for your account yet.
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Timestamp</th>
                    <th style={{ width: '180px' }}>Action</th>
                    <th style={{ width: '110px' }}>Category</th>
                    <th>Description</th>
                    <th style={{ width: '140px' }}>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '12px', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            background: 'rgba(106, 11, 158, 0.08)',
                            color: 'var(--color-primary)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', textTransform: 'capitalize', fontWeight: 600 }}>
                        {log.category}
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--color-gray-800)' }}>
                        {log.summary}
                      </td>
                      <td style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--color-gray-600)' }}>
                        {log.ipAddress || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
