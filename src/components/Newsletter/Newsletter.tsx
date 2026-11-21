'use client';

import { useState } from 'react';
import styles from './Newsletter.module.css';

interface NewsletterProps {
  noBottomMargin?: boolean;
}

export default function Newsletter({ noBottomMargin = false }: NewsletterProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  return (
    <div className={`${styles.section} ${noBottomMargin ? styles.sectionNoBottom : ''}`}>
      <div className={styles.banner}>
        <div className={styles.inner}>
          <div className={styles.content}>
            <h2 className={styles.title}>Get Updates on New Freebies</h2>
            <p className={styles.subtitle}>
              Receive handpicked digital freebies, trials &amp; exclusive deals directly to your inbox.
            </p>
          </div>

          <div className={styles.formWrapper}>
            {status === 'success' ? (
              <div className={styles.successMessage}>
                <span>✓</span>
                <span>You&apos;re in! We&apos;ll notify you when fresh freebies drop.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="Email for freebie updates"
                  disabled={status === 'loading'}
                />
                <button
                  type="submit"
                  className={styles.button}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>
                      <span>Get Freebies</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {status === 'error' && errorMessage && (
              <p className={styles.errorMessage}>{errorMessage}</p>
            )}

            {status !== 'success' && (
              <span className={styles.privacy}>
                Zero spam. Unsubscribe with 1-click anytime.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
