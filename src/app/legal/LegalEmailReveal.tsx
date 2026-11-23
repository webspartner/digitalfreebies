'use client';

import { useState } from 'react';
import styles from './legal.module.css';

// Encoded character codes so the plain-text email never appears in SSR HTML or static bundles
const USER_CODES = [116, 97, 107, 101, 100, 111, 119, 110, 115];
const DOMAIN_CODES = [
  100, 105, 103, 105, 116, 97, 108, 102, 114, 101, 101, 98, 105, 101, 115, 46, 105, 111,
];

function assembleLegalAddress(): string {
  const localPart = USER_CODES.map((c) => String.fromCharCode(c)).join('');
  const domainPart = DOMAIN_CODES.map((c) => String.fromCharCode(c)).join('');
  return `${localPart}\u0040${domainPart}`;
}

export default function LegalEmailReveal() {
  const [revealedEmail, setRevealedEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReveal = () => {
    setRevealedEmail(assembleLegalAddress());
  };

  const handleCopy = async () => {
    if (!revealedEmail) return;
    try {
      await navigator.clipboard.writeText(revealedEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = revealedEmail;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className={styles.contactBox}>
      <div className={styles.contactBoxTitle}>Legal &amp; Takedown Contact</div>
      <p className={styles.contactBoxDesc}>
        To protect our legal inbox from automated scraper bots, our takedown address is hidden until you click the button below.
      </p>

      {!revealedEmail ? (
        <button
          type="button"
          onClick={handleReveal}
          className={styles.revealBtn}
        >
          Reveal Takedown Email
        </button>
      ) : (
        <div className={styles.revealedRow}>
          <a
            href={`mailto:${revealedEmail}?subject=Legal%20%2F%20Takedown%20Request%20-%20DigitalFreebies.io`}
            className={styles.emailLink}
          >
            {revealedEmail}
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className={styles.copyBtn}
          >
            {copied ? 'Copied!' : 'Copy Email'}
          </button>
        </div>
      )}
    </div>
  );
}
