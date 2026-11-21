'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import TurnstileWidget from '@/components/TurnstileWidget/TurnstileWidget';
import { useForumAuth } from '@/context/ForumAuthContext';
import styles from '../forum.module.css';

function LoginForm() {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [website, setWebsite] = useState(''); // Honeypot
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useForumAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '/forum';
  // Prevent open-redirect attacks: only allow internal paths starting with single '/'
  const redirectUrl =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/forum';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (turnstileEnabled && !turnstileToken) {
      setError('Please complete the Cloudflare security check');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/forum/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          login: loginInput.trim(),
          password,
          rememberMe,
          website,
          turnstileToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification && data.email) {
          router.push(
            `/forum/verify-email?email=${encodeURIComponent(data.email)}&redirect=${encodeURIComponent(redirectUrl)}`
          );
          return;
        }
        setError(data.error || 'Login failed');
        if (turnstileEnabled) setTurnstileResetKey((k) => k + 1);
        return;
      }

      login(data.token, data.user);
      router.push(redirectUrl);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        {/* Auth Tabs */}
        <div className={styles.authTabs}>
          <span className={`${styles.authTab} ${styles.authTabActive}`}>
            Sign In
          </span>
          <Link
            href={`/forum/register?redirect=${encodeURIComponent(redirectUrl)}`}
            className={styles.authTab}
          >
            Create Account
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 className={styles.heroTitle} style={{ fontSize: '22px', marginBottom: '6px' }}>
            Welcome Back!
          </h1>
          <p className={styles.heroSubtitle} style={{ fontSize: '14px' }}>
            Sign in to share deals and comment on freebies.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="on">
          {/* Anti-bot Honeypot */}
          <div
            style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
            aria-hidden="true"
          >
            <label htmlFor="forum_login_hp">Website</label>
            <input
              id="forum_login_hp"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Username or Email</label>
            <input
              type="text"
              className={styles.formInput}
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder="Enter your username or email"
              required
              maxLength={120}
              autoComplete="username"
            />
          </div>

          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className={styles.formLabel}>Password</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '6px' }}>
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
                <span style={{ color: 'var(--color-gray-300)', fontSize: '12px' }}>|</span>
                <Link
                  href="/forum/forgot-password"
                  style={{
                    color: 'var(--color-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className={styles.formInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              marginBottom: '6px',
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

          <button
            type="submit"
            className={styles.submitBtn}
            style={{ width: '100%', marginTop: '12px' }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--color-gray-600)' }}>
          Don&apos;t have an account yet?{' '}
          <Link
            href={`/forum/register?redirect=${encodeURIComponent(redirectUrl)}`}
            style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            Create one free
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className={styles.forumPage}>
        <div className={styles.container}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 0' }}>Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
