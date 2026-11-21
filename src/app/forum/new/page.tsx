'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import { useForumAuth } from '@/context/ForumAuthContext';
import styles from '../forum.module.css';

const CATEGORIES = [
  'Streaming',
  'Subscription',
  'VPNs',
  'Gaming',
  'Education',
  'Software',
  'Hardware',
  'Events',
  'General',
];

export default function SubmitFreebiePage() {
  const { user, loading: authLoading, getAuthHeaders } = useForumAuth();

  const [title, setTitle] = useState('');
  const [dealUrl, setDealUrl] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be registered and signed in to submit a deal.');
      return;
    }

    if (!title.trim() || !dealUrl.trim() || !description.trim()) {
      setError('Please fill in all required fields (Title, Deal Link, Description).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          title,
          dealUrl,
          brand,
          category,
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit freebie');
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Network error while submitting. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />

      <main className={styles.forumPage}>
        <div className={styles.container}>
          <div className={styles.formCard}>
            {authLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-gray-500)' }}>
                Checking community membership status...
              </div>
            ) : !user ? (
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <div style={{ fontSize: '48px', marginBottom: '14px' }}>🛡️</div>
                <h1 className={styles.heroTitle} style={{ fontSize: '24px', marginBottom: '10px' }}>
                  Community Registration Required
                </h1>
                <p style={{ color: 'var(--color-gray-600)', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  To protect our community from spam bots and malicious links, only registered community members can share new deals. Creating an account takes less than 30 seconds!
                </p>

                <div className={styles.authPromptActions} style={{ marginBottom: '24px' }}>
                  <Link
                    href="/forum/login?redirect=/forum/new"
                    className={styles.primaryAuthBtn}
                    style={{ padding: '12px 28px', fontSize: '15px' }}
                  >
                    Sign In to Share Deals
                  </Link>
                  <Link
                    href="/forum/register?redirect=/forum/new"
                    className={styles.secondaryAuthBtn}
                    style={{ padding: '12px 28px', fontSize: '15px' }}
                  >
                    Create Free Account
                  </Link>
                </div>

                <div style={{ borderTop: '1px solid var(--color-gray-200)', paddingTop: '16px' }}>
                  <Link href="/forum" style={{ color: 'var(--color-gray-600)', fontSize: '13px', textDecoration: 'none' }}>
                    ← Return to Community Forum
                  </Link>
                </div>
              </div>
            ) : user.isBanned ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '42px', marginBottom: '12px' }}>🚫</div>
                <h1 className={styles.heroTitle} style={{ fontSize: '24px', marginBottom: '10px', color: '#dc2626' }}>
                  Account Restricted from Posting
                </h1>
                <p style={{ color: 'var(--color-gray-600)', maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  {user.banReason ||
                    'Your account or IP address has been banned by a moderator from posting or commenting in the community forum.'}
                </p>
                <Link href="/forum" className={styles.shareBtn} style={{ display: 'inline-flex' }}>
                  ← Return to Community Forum
                </Link>
              </div>
            ) : submitted ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '48px', marginBottom: '14px' }}>🎉</div>
                <h1 className={styles.heroTitle} style={{ fontSize: '24px', marginBottom: '10px' }}>
                  Thank You for Sharing, @{user.username}!
                </h1>
                <p style={{ color: 'var(--color-gray-600)', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  Your submission has been received. To keep our community clean and spam-free, submissions are reviewed by our moderation team before appearing publicly.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <Link href="/forum" className={styles.shareBtn}>
                    ← Return to Community Forum
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setTitle('');
                      setDealUrl('');
                      setBrand('');
                      setDescription('');
                    }}
                    className={styles.categoryPill}
                    style={{ padding: '12px 20px' }}
                  >
                    Share Another Freebie
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <Link href="/forum" style={{ fontSize: '13px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                    ← Back to Forum
                  </Link>
                  <h1 className={styles.heroTitle} style={{ marginTop: '8px' }}>Share a Freebie</h1>
                  <p className={styles.heroSubtitle}>
                    Share a digital freebie, free trial, or deal with the community.
                  </p>
                </div>

                {/* Verified user card */}
                <div className={styles.verifiedUserCard}>
                  <div className={styles.verifiedUserInfo}>
                    <div className={styles.avatarCircle}>{user.username.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-gray-900)' }}>
                        Sharing as @{user.username}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>{user.email}</div>
                    </div>
                  </div>
                  <span className={styles.verifiedBadge}>✓ Verified Member</span>
                </div>

                <div className={styles.noticeBanner}>
                  🛡️ <strong>Spam Protection:</strong> Submissions from registered accounts are reviewed by moderators to keep links working and deals spam-free.
                </div>

                {error && (
                  <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '18px', fontSize: '14px' }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Freebie Title *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. 3 Months Free Apple TV+ for New Users"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Direct Link to Claim Deal *</label>
                    <input
                      type="url"
                      className={styles.formInput}
                      value={dealUrl}
                      onChange={(e) => setDealUrl(e.target.value)}
                      placeholder="https://example.com/promo"
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Brand / Service (Optional)</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="e.g. Apple, NordVPN, Spotify"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Category *</label>
                      <select
                        className={styles.formSelect}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Description & Instructions to Claim *</label>
                    <textarea
                      className={styles.formTextarea}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Explain what is included, any restrictions, expiration date, or promo code needed..."
                      required
                    />
                  </div>

                  <div className={styles.formActions}>
                    <button type="submit" className={styles.submitBtn} disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit for Review 🚀'}
                    </button>
                    <Link href="/forum" className={styles.cancelLink}>
                      Cancel
                    </Link>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
