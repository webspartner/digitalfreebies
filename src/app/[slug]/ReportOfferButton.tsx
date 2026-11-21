'use client';

import { useState, useEffect } from 'react';
import styles from './offerDetail.module.css';

export default function ReportOfferButton({ offerId }: { offerId: number }) {
  const [reported, setReported] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(`reported_offer_${offerId}`) === 'true') {
        setReported(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, [offerId]);

  const handleReport = async () => {
    if (reported || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/offers/${offerId}/report`, {
        method: 'POST',
      });

      if (res.ok) {
        setReported(true);
        try {
          localStorage.setItem(`reported_offer_${offerId}`, 'true');
        } catch {
          // Ignore storage errors
        }
      }
    } catch (error) {
      console.error('Error reporting offer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      className={styles.feedbackLink}
      onClick={handleReport}
      disabled={reported || submitting}
      style={
        reported
          ? { color: '#ef4444', fontWeight: 600, cursor: 'default' }
          : undefined
      }
      id="not-working-button"
    >
      {submitting
        ? '⏳ Reporting...'
        : reported
        ? '✓ Reported as Not Working'
        : '🚩 Not Working?'}
    </button>
  );
}
