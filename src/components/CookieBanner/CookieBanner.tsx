'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './CookieBanner.module.css';

const STORAGE_KEY = 'df_cookie_consent_v1';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleConsent = (choice: 'accepted' | 'essential') => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={styles.bannerWrapper} role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className={styles.bannerCard}>
        <div className={styles.textBlock}>
          <p className={styles.message}>
            We use cookies to improve your browsing experience, personalize content, and analyze site traffic. By clicking{' '}
            <strong>Accept All</strong>, you consent to our use of cookies. Read our{' '}
            <Link href="/privacy-policy#cookies" className={styles.policyLink}>
              Cookie Policy
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy" className={styles.policyLink}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => handleConsent('essential')}
          >
            Essential Only
          </button>
          <button
            type="button"
            className={styles.acceptBtn}
            onClick={() => handleConsent('accepted')}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
