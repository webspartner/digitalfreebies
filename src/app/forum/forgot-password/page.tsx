'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import TurnstileWidget from '@/components/TurnstileWidget/TurnstileWidget';
import { useForumAuth } from '@/context/ForumAuthContext';
import styles from '../forum.module.css';

function ForgotPasswordForm() {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const { login } = useForumAuth();
  const router = useRouter();

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (turnstileEnabled && !turnstileToken) {
      setError('Please complete the Cloudflare security check');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/forum/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          website,
          turnstileToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send password reset email');
        if (turnstileEnabled) setTurnstileResetKey((k) => k + 1);
        return;
      }

      setInfoMessage(
        data.message ||
          'If an account with that email exists, we sent a 6-digit password reset code.'
      );
      setStep('reset');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/forum/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      if (data.user) {
        login(data.token, data.user);
      }
      router.push('/forum');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 className={styles.heroTitle} style={{ fontSize: '22px', marginBottom: '6px' }}>
            {step === 'request' ? 'Forgot Your Password?' : 'Reset Your Password'}
          </h1>
          <p className={styles.heroSubtitle} style={{ fontSize: '14px' }}>
            {step === 'request'
              ? 'Enter your registered email address and we will send you a 6-digit reset code.'
              : `Enter the 6-digit code sent to ${email} and choose a new password.`}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        {infoMessage && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
            }}
          >
            {infoMessage}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestCode} autoComplete="on">
            {/* Honeypot */}
            <div
              style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
              aria-hidden="true"
            >
              <label htmlFor="forgot_hp">Website</label>
              <input
                id="forgot_hp"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
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

            <TurnstileWidget
              onVerify={setTurnstileToken}
              onStatusChange={setTurnstileEnabled}
              resetKey={turnstileResetKey}
            />

            <button
              type="submit"
              className={styles.submitBtn}
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Sending Reset Code...' : 'Send 6-Digit Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} autoComplete="off">
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>6-Digit Reset Code *</label>
              <input
                type="text"
                inputMode="numeric"
                className={styles.formInput}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
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

            <div className={styles.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.formLabel}>New Password *</label>
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
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Confirm New Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.formInput}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Resetting Password...' : 'Reset Password & Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('request');
                  setCode('');
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-gray-500)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ← Request another code
              </button>
            </div>
          </form>
        )}

        <div
          style={{
            textAlign: 'center',
            marginTop: '20px',
            fontSize: '13px',
            color: 'var(--color-gray-600)',
          }}
        >
          Remembered your password?{' '}
          <Link
            href="/forum/login"
            style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <>
      <Header />
      <main className={styles.forumPage}>
        <div className={styles.container}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 0' }}>Loading...</div>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
