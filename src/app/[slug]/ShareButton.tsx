'use client';

import { useState } from 'react';
import styles from './offerDetail.module.css';

export default function ShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <>
      <button
        className={styles.shareButton}
        onClick={handleShare}
        id="share-button"
      >
        {copied ? '✓ Link Copied!' : '🔗 Share Offer'}
      </button>
      {copied && <div className="toast">✓ Link copied to clipboard!</div>}
    </>
  );
}
