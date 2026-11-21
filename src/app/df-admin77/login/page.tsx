'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import TurnstileWidget from '@/components/TurnstileWidget/TurnstileWidget';
import styles from './login.module.css';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Automatically restore session if a valid admin_token cookie is present
  useEffect(() => {
    fetch('/api/admin/profile', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) {
          if (data.token) {
            localStorage.setItem('admin_token', data.token);
          }
          localStorage.setItem(
            'admin_user',
            JSON.stringify({
              id: data.profile.id,
              username: data.profile.username,
              email: data.profile.email || null,
              role: data.profile.role || 'admin',
              twoFactorEnabled: data.profile.twoFactorEnabled,
            })
          );
          router.replace('/df-admin77');
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!requiresTwoFactor && turnstileEnabled && !turnstileToken) {
      setError('Please complete the Cloudflare security check');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: username.trim(),
          password,
          totpCode: requiresTwoFactor ? totpCode.trim() : undefined,
          rememberMe,
          website,
          turnstileToken: !requiresTwoFactor ? turnstileToken : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        if (!requiresTwoFactor && turnstileEnabled) setTurnstileResetKey((k) => k + 1);
        return;
      }

      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        return;
      }

      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      router.push('/df-admin77');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <Image
            src="/images/assets/logo.png"
            alt="DigitalFreebies.io"
            width={134}
            height={34}
            priority
            className={styles.logoImage}
          />
        </div>

        <form onSubmit={handleSubmit} className={styles.loginForm} autoComplete="on">
          {error && <div className={styles.errorMsg}>{error}</div>}

          {/* Anti-bot Honeypot */}
          <div
            style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
            aria-hidden="true"
          >
            <label htmlFor="website_hp">Website</label>
            <input
              id="website_hp"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {!requiresTwoFactor ? (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="username" className={styles.label}>Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={styles.input}
                  placeholder="Enter your username"
                  required
                  maxLength={64}
                  autoComplete="username"
                />
              </div>

              <div className={styles.inputGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="password" className={styles.label}>Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Enter your password"
                  required
                  maxLength={72}
                  autoComplete="current-password"
                />
              </div>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-gray-700)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginTop: '-2px',
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--color-primary)',
                    cursor: 'pointer',
                  }}
                />
                <span>Remember me for 30 days</span>
              </label>

              <TurnstileWidget
                onVerify={setTurnstileToken}
                onStatusChange={setTurnstileEnabled}
                resetKey={turnstileResetKey}
              />
            </>
          ) : (
            <div className={styles.inputGroup}>
              <label htmlFor="totpCode" className={styles.label}>
                Authenticator Code (6 digits)
              </label>
              <input
                id="totpCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9\s]{6,8}"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className={styles.input}
                placeholder="000000"
                required
                autoFocus
                maxLength={6}
                autoComplete="one-time-code"
                style={{
                  letterSpacing: '6px',
                  fontSize: '20px',
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              />
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading
              ? 'Verifying...'
              : requiresTwoFactor
              ? 'Verify & Sign In'
              : 'Sign In'}
          </button>

          {requiresTwoFactor && (
            <button
              type="button"
              onClick={() => {
                setRequiresTwoFactor(false);
                setTotpCode('');
                setError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-gray-600)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              ← Use a different account
            </button>
          )}
        </form>

        <div className={styles.backLink}>
          Are you looking for forum login?{' '}
          <Link href="/forum/login">Go to Forum Login →</Link>
        </div>
      </div>
    </div>
  );
}
