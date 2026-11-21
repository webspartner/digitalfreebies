'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import TurnstileWidget from '@/components/TurnstileWidget/TurnstileWidget';
import { useForumAuth } from '@/context/ForumAuthContext';
import styles from '../forum.module.css';

function RegisterForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [website, setWebsite] = useState(''); // Honeypot
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  // Email verification step state
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [resending, setResending] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useForumAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '/forum';
  // Prevent open-redirect attacks
  const redirectUrl =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/forum';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (turnstileEnabled && !turnstileToken) {
      setError('Please complete the Cloudflare security check');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/forum/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          website,
          turnstileToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        if (turnstileEnabled) setTurnstileResetKey((k) => k + 1);
        return;
      }

      if (data.requiresVerification) {
        setRequiresVerification(true);
        setInfoMsg(data.message || `We sent a 6-digit verification code to ${email.trim()}.`);
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

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/forum/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid verification code');
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

  const handleResendCode = async () => {
    setError('');
    setInfoMsg('');
    setResending(true);
    try {
      const res = await fetch('/api/forum/auth/verify-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not resend code');
      } else {
        setInfoMsg(data.message || 'A new 6-digit verification code has been sent to your email.');
      }
    } catch {
      setError('Network error resending verification code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        {/* Auth Tabs */}
        <div className={styles.authTabs}>
          <Link
            href={`/forum/login?redirect=${encodeURIComponent(redirectUrl)}`}
            className={styles.authTab}
          >
            Sign In
          </Link>
          <span className={`${styles.authTab} ${styles.authTabActive}`}>
            Create Account
          </span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 className={styles.heroTitle} style={{ fontSize: '22px', marginBottom: '6px' }}>
            {requiresVerification ? 'Verify Your Email' : 'Join the Community'}
          </h1>
          <p className={styles.heroSubtitle} style={{ fontSize: '14px' }}>
            {requiresVerification
              ? `Enter the 6-digit verification code sent to ${email}`
              : 'Create a free account to share deals, vote, and comment.'}
          </p>
        </div>

        {!requiresVerification && (
          <div className={styles.antiSpamNotice}>
            <span>🛡️</span>
            <div>
              <strong>Spam Protection:</strong> Requiring community registration ensures deals are authentic and prevents automated bot spam.
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {infoMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
            {infoMsg}
          </div>
        )}

        {requiresVerification ? (
          <form onSubmit={handleVerifyCode}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>6-Digit Email Verification Code *</label>
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
                autoFocus
                style={{
                  letterSpacing: '6px',
                  fontSize: '20px',
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Email & Complete Sign Up'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '13px' }}>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {resending ? 'Sending...' : 'Resend verification code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequiresVerification(false);
                  setVerificationCode('');
                  setError('');
                  setInfoMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-gray-500)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ← Change email
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="on">
            {/* Anti-bot Honeypot */}
            <div
              style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
              aria-hidden="true"
            >
              <label htmlFor="forum_reg_hp">Website</label>
              <input
                id="forum_reg_hp"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Username *</label>
              <input
                type="text"
                className={styles.formInput}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. DealHunter42"
                required
                minLength={3}
                maxLength={30}
                autoComplete="username"
              />
              <small style={{ fontSize: '11px', color: 'var(--color-gray-500)', marginTop: '4px', display: 'block' }}>
                Letters, numbers, underscores and hyphens only
              </small>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email Address *</label>
              <input
                type="email"
                className={styles.formInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                maxLength={150}
                autoComplete="email"
              />
            </div>

            <div className={styles.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.formLabel}>Password *</label>
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
                    marginBottom: '6px',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.formInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Confirm Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.formInput}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
              />
            </div>

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
              {loading ? 'Creating Account...' : 'Create Free Account & Join'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--color-gray-600)' }}>
          Already have an account?{' '}
          <Link
            href={`/forum/login?redirect=${encodeURIComponent(redirectUrl)}`}
            style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <>
      <Header />
      <main className={styles.forumPage}>
        <div className={styles.container}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 0' }}>Loading...</div>}>
            <RegisterForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
