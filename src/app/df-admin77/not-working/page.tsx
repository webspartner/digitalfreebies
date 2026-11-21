'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../admin.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';

interface OfferReportItem {
  id: number;
  ipAddress: string;
  createdAt: string;
}

interface ReportedOffer {
  id: number;
  title: string;
  slug: string;
  brand: string;
  category: string;
  offerUrl: string;
  isActive: boolean;
  _count?: {
    reports: number;
  };
  reports: OfferReportItem[];
}

export default function AdminNotWorkingPage() {
  const [offers, setOffers] = useState<ReportedOffer[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/df-admin77/login');
      return;
    }
    fetchReportedOffers(token);
  }, [router]);

  const fetchReportedOffers = async (token?: string) => {
    const authToken = token || localStorage.getItem('admin_token');
    if (!authToken) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/not-working', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.status === 401) {
        router.push('/df-admin77/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setOffers(data.offers || []);
        setTotalReports(data.totalReports || 0);
      }
    } catch (error) {
      console.error('Error fetching reported offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearReports = async (offerId: number, title: string) => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/offers/${offerId}/report`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMessage({ text: `Cleared "Not Working" reports for "${title}".`, type: 'success' });
        fetchReportedOffers(token);
      } else {
        setMessage({ text: 'Failed to clear reports.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error while clearing reports.', type: 'error' });
    }
  };

  const handleToggleActive = async (offerId: number, isActive: boolean) => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        setOffers((prev) =>
          prev.map((o) => (o.id === offerId ? { ...o, isActive: !isActive } : o))
        );
      }
    } catch (error) {
      console.error('Error toggling offer status:', error);
    }
  };

  return (
    <div className={styles.adminLayout}>
      <AdminNav />

      <main className={styles.adminMain}>
        <div className={styles.tableHeader} style={{ marginBottom: '20px', border: 'none', padding: 0 }}>
          <div>
            <h1 className={styles.pageTitle}>Not Working Reports</h1>
            <p className={styles.pageSubtitle}>
              Freebies flagged by users as &ldquo;Not Working&rdquo;. Each unique IP address automatically increments the counter (1, 2, 3...).
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchReportedOffers()}
            className={styles.addBtn}
          >
            Refresh
          </button>
        </div>

        {message && (
          <div
            className={message.type === 'success' ? styles.successMsg : styles.errorMsg}
            style={{ marginBottom: '20px' }}
          >
            {message.text}
          </div>
        )}

        <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(2, minmax(200px, 300px))' }}>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: offers.length > 0 ? '#dc2626' : undefined }}>
              {offers.length}
            </div>
            <div className={styles.statLabel}>Reported Freebies</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: totalReports > 0 ? '#dc2626' : undefined }}>
              {totalReports}
            </div>
            <div className={styles.statLabel}>Unique IP Clicks</div>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Reported Freebies ({offers.length})</h2>
          </div>

          <div className={styles.tableWrapper}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-gray-500)' }}>
                Loading reported freebies...
              </div>
            ) : offers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-gray-500)' }}>
                No freebies are currently reported as not working.
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Freebie Title</th>
                    <th>Not Working (Unique IPs)</th>
                    <th>Latest Report / IPs</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => {
                    const count = offer._count?.reports ?? offer.reports.length;
                    const latestReport = offer.reports[0];
                    const ipList = offer.reports.map((r) => r.ipAddress).join(', ');

                    return (
                      <tr key={offer.id}>
                        <td>
                          <div className={styles.tableBrand}>
                            <div className={styles.tableBrandIcon}>{offer.brand.charAt(0)}</div>
                            <span className={styles.tableBrandName}>{offer.brand}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: '4px' }}>
                            <Link href={`/${offer.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {offer.title}
                            </Link>
                          </div>
                          <div style={{ fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <a
                              href={offer.offerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                            >
                              Check Freebie Link
                            </a>
                            <span>•</span>
                            <Link
                              href={`/${offer.slug}`}
                              target="_blank"
                              style={{ color: 'var(--color-gray-500)', textDecoration: 'underline' }}
                            >
                              View Page
                            </Link>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#dc2626',
                              fontWeight: 800,
                              fontSize: '14px',
                              padding: '5px 12px',
                              borderRadius: '9999px',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                            }}
                          >
                            {count}
                          </span>
                        </td>
                        <td>
                          {latestReport && (
                            <div style={{ fontSize: '12px', color: 'var(--color-gray-700)', fontWeight: 600 }}>
                              {new Date(latestReport.createdAt).toLocaleString()}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-gray-500)',
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={ipList}
                          >
                            IPs: {ipList}
                          </div>
                        </td>
                        <td>
                          <span className={offer.isActive ? styles.statusActive : styles.statusInactive}>
                            {offer.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.tableActions}>
                            <Link
                              href={`/df-admin77/offers/${offer.id}/edit`}
                              className={`${styles.actionBtn} ${styles.editBtn}`}
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(offer.id, offer.isActive)}
                              className={`${styles.actionBtn} ${styles.toggleBtn}`}
                            >
                              {offer.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClearReports(offer.id, offer.title)}
                              className={`${styles.actionBtn} ${styles.deleteBtn}`}
                              title="Reset Not Working count to 0"
                            >
                              Clear ({count})
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
