'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import { useForumAuth } from '@/context/ForumAuthContext';
import styles from '../forum.module.css';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useForumAuth();

  const rawRedirect = searchParams.get('redirect') || '/forum';
  const redirectUrl =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/forum';

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState(
    searchParams.get('email') && !searchParams.get('code')
      ? `We sent a 6-digit registration confirmation code to ${searchParams.get('email')}. Enter it below to activate your account.`
      : ''
  );

  const verifyNow = useCallback(
    async (targetEmail: string, targetCode: string) => {
      if (!targetEmail || !targetCode) return;
      setError('');
      setLoading(true);
      try {
        const res = await fetch('/api/forum/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            email: targetEmail.trim(),
            code: targetCode.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Verification failed');
          return;
        }
        login(data.token, data.user);
        router.push(redirectUrl);
      } catch {
        setError('Network error verifying email.');
      } finally {
        setLoading(false);
      }
    },
    [login, router, redirectUrl]
  );

  useEffect(() => {
    const qEmail = searchParams.get('email');
    const qCode = searchParams.get('code');
    if (qEmail && qCode && qCode.length === 6) {
      verifyNow(qEmail, qCode);
    }
  }, [searchParams, verifyNow]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyNow(email, code);
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
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
        setError(data.error || 'Failed to resend code');
      } else {
        setInfoMsg(data.message || 'A new 6-digit verification code has been sent.');
      }
    } catch {
      setError('Network error resending code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 className={styles.heroTitle} style={{ fontSize: '22px', marginBottom: '6px' }}>
            Verify Your Email Address
          </h1>
          <p className={styles.heroSubtitle} style={{ fontSize: '14px' }}>
            Enter the 6-digit verification code sent to your email address.
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

        {infoMsg && (
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
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Email Address *</label>
            <input
              type="email"
              className={styles.formInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>6-Digit Verification Code *</label>
            <input
              type="text"
              inputMode="numeric"
              className={styles.formInput}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              required
              maxLength={6}
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
            {loading ? 'Verifying...' : 'Verify Email & Sign In'}
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '18px',
            fontSize: '13px',
          }}
        >
          <button
            type="button"
            onClick={handleResend}
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
            {resending ? 'Sending...' : 'Resend Code'}
          </button>
          <Link
            href="/forum/login"
            style={{ color: 'var(--color-gray-600)', fontWeight: 600, textDecoration: 'none' }}
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Header />
      <main className={styles.forumPage}>
        <div className={styles.container}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 0' }}>Loading...</div>}>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
