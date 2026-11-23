'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './admin.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';
import AdminAnalyticsGraph from '@/components/AdminAnalyticsGraph/AdminAnalyticsGraph';
import { isOfferExpired } from '@/lib/utils';

interface Stats {
  activeOffers: number;
  visitsToday: number;
  visitsThisMonth: number;
  pageviewsThisMonth: number;
}

interface Offer {
  id: number;
  title: string;
  brand: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  category: string;
  specialCategory?: string;
  label: string | null;
  isActive: boolean;
  isFeatured: boolean;
  slug: string;
  expiresAt?: string | null;
  _count?: {
    reports: number;
  };
}

type DashboardSortField = 'title' | 'reports' | 'status';
type SortDirection = 'asc' | 'desc';

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    activeOffers: 0,
    visitsToday: 0,
    visitsThisMonth: 0,
    pageviewsThisMonth: 0,
  });
  const [recentOffers, setRecentOffers] = useState<Offer[]>([]);
  const [reportedOffers, setReportedOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<DashboardSortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const router = useRouter();

  const handleColumnSort = (field: DashboardSortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'reports' ? 'desc' : 'asc');
    }
  };

  const sortedRecentOffers = useMemo(() => {
    if (!sortField) return recentOffers;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...recentOffers].sort((a, b) => {
      if (sortField === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortField === 'reports') {
        return ((a._count?.reports || 0) - (b._count?.reports || 0)) * dir;
      }
      if (sortField === 'status') {
        const getStatusRank = (o: Offer) =>
          !o.isActive ? 0 : isOfferExpired(o.expiresAt) ? 1 : 2;
        const diff = (getStatusRank(a) - getStatusRank(b)) * dir;
        if (diff !== 0) return diff;
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [recentOffers, sortField, sortDir]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/df-admin77/login');
      return;
    }
    fetchData(token);
  }, [router]);

  const fetchData = async (token: string) => {
    try {
      const [offersRes, notWorkingRes, analyticsRes] = await Promise.all([
        fetch('/api/offers?limit=100', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/not-working', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/analytics?days=30', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      const offersData = await offersRes.json();
      const notWorkingData = notWorkingRes.ok ? await notWorkingRes.json() : { offers: [], totalReports: 0 };
      const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null;

      const allOffers: Offer[] = offersData.offers || [];
      const flaggedOffers: Offer[] = notWorkingData.offers || [];

      setStats({
        activeOffers: allOffers.filter((o: Offer) => o.isActive && !isOfferExpired(o.expiresAt)).length,
        visitsToday: analyticsData?.summary?.visitsToday || 0,
        visitsThisMonth: analyticsData?.summary?.visitsThisMonth || 0,
        pageviewsThisMonth: analyticsData?.summary?.pageviewsThisMonth || 0,
      });
      setReportedOffers(flaggedOffers);
      setRecentOffers(allOffers.slice(0, 10));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearReports = async (offerId: number) => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    try {
      const res = await fetch(`/api/offers/${offerId}/report`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchData(token);
      }
    } catch (error) {
      console.error('Error clearing reports:', error);
    }
  };

  if (loading) {
    return (
      <div className={styles.adminLayout}>
        <AdminNav />
        <div className={styles.adminMain} style={{ textAlign: 'center', paddingTop: '100px' }}>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <AdminNav />

      {/* Main content */}
      <main className={styles.adminMain}>
        <h1 className={styles.pageTitle}>Dashboard Overview</h1>
        <p className={styles.pageSubtitle}>Welcome back! Here&apos;s a summary of your platform.</p>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.activeOffers.toLocaleString()}</div>
            <div className={styles.statLabel}>Active Freebies Total</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.visitsToday.toLocaleString()}</div>
            <div className={styles.statLabel}>Total Visits Today</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.visitsThisMonth.toLocaleString()}</div>
            <div className={styles.statLabel}>Total Visits This Month</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.pageviewsThisMonth.toLocaleString()}</div>
            <div className={styles.statLabel}>Total Pageviews This Month</div>
          </div>
        </div>

        {/* Google Analytics Graph (or Attach GA4 credentials prompt) */}
        <AdminAnalyticsGraph />

        {/* Recent offers table */}
        <div className={styles.tableCard} style={{ marginBottom: '28px' }}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Recent Freebies</h2>
            <Link href="/df-admin77/offers/new" className={styles.addBtn}>+ Add Freebie</Link>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {(
                    [
                      { key: 'brand', label: 'Brand', width: '56px', sortable: false },
                      { key: 'title', label: 'Title', sortable: true },
                      { key: 'category', label: 'Category', sortable: false },
                      { key: 'reports', label: 'N/W', align: 'center', width: '72px', sortable: true },
                      { key: 'status', label: 'Status', sortable: true },
                    ] as const
                  ).map((col) => {
                    if (!col.sortable) {
                      return (
                        <th
                          key={col.key}
                          style={{
                            width: 'width' in col ? col.width : undefined,
                            textAlign: 'left',
                          }}
                        >
                          {col.label}
                        </th>
                      );
                    }
                    const isActive = sortField === col.key;
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleColumnSort(col.key)}
                        style={{
                          width: 'width' in col ? col.width : undefined,
                          textAlign: 'align' in col ? col.align : 'left',
                          cursor: 'pointer',
                          userSelect: 'none',
                          color: isActive ? 'var(--color-primary)' : undefined,
                        }}
                        title={`Sort by ${col.label} (${isActive && sortDir === 'asc' ? 'descending' : 'ascending'})`}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            justifyContent: 'align' in col && col.align === 'center' ? 'center' : 'flex-start',
                          }}
                        >
                          <span>{col.label}</span>
                          <span
                            style={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              lineHeight: 0.75,
                              fontSize: '8.5px',
                              marginLeft: '2px',
                            }}
                          >
                            <span
                              style={{
                                opacity: isActive ? (sortDir === 'asc' ? 1 : 0.25) : 0.45,
                                color: isActive && sortDir === 'asc' ? 'var(--color-primary)' : 'currentColor',
                              }}
                            >
                              ▲
                            </span>
                            <span
                              style={{
                                opacity: isActive ? (sortDir === 'desc' ? 1 : 0.25) : 0.45,
                                color: isActive && sortDir === 'desc' ? 'var(--color-primary)' : 'currentColor',
                              }}
                            >
                              ▼
                            </span>
                          </span>
                        </span>
                      </th>
                    );
                  })}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecentOffers.map((offer) => {
                  const reportCount = offer._count?.reports || 0;
                  const brandLogo = offer.logoUrl || offer.imageUrl;
                  return (
                    <tr key={offer.id}>
                      <td>
                        <div className={styles.tableBrand} title={offer.brand}>
                          <div
                            className={styles.tableBrandIcon}
                            style={{
                              overflow: 'hidden',
                              background: brandLogo ? '#ffffff' : undefined,
                              border: brandLogo ? '1px solid var(--color-gray-200)' : undefined,
                            }}
                          >
                            {brandLogo ? (
                              <img
                                src={brandLogo}
                                alt={offer.brand}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                            ) : (
                              offer.brand.charAt(0)
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{offer.title}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: 'var(--color-gray-800)',
                              textTransform: 'capitalize',
                            }}
                          >
                            {offer.category}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--color-primary)',
                            }}
                          >
                            {offer.specialCategory || 'General Freebies'}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {reportCount > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#dc2626',
                              fontWeight: 700,
                              fontSize: '12px',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                            }}
                          >
                            {reportCount}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-gray-400)', fontSize: '12px' }}>0</span>
                        )}
                      </td>
                      <td>
                        {!offer.isActive ? (
                          <span className={styles.statusInactive}>Inactive</span>
                        ) : isOfferExpired(offer.expiresAt) ? (
                          <span className={styles.statusInactive}>Expired</span>
                        ) : (
                          <span className={styles.statusActive}>Active</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          <Link href={`/df-admin77/offers/${offer.id}/edit`} className={`${styles.actionBtn} ${styles.editBtn}`}>Edit</Link>
                          <Link href={`/${offer.slug}`} className={`${styles.actionBtn} ${styles.toggleBtn}`}>View</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Not Working offers table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Not Working Reports ({reportedOffers.length})</h2>
            <Link href="/df-admin77/not-working" className={styles.addBtn}>View All Reports</Link>
          </div>
          <div className={styles.tableWrapper}>
            {reportedOffers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-gray-500)', fontSize: '14px' }}>
                No freebies have been reported as not working yet.
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Title</th>
                    <th>Not Working Clicks (Unique IPs)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportedOffers.map((offer) => {
                    const count = offer._count?.reports || 0;
                    return (
                      <tr key={offer.id}>
                        <td>
                          <div className={styles.tableBrand}>
                            <div className={styles.tableBrandIcon}>{offer.brand.charAt(0)}</div>
                            <span className={styles.tableBrandName}>{offer.brand}</span>
                          </div>
                        </td>
                        <td>{offer.title}</td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#dc2626',
                              fontWeight: 800,
                              fontSize: '13px',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                            }}
                          >
                            {count}
                          </span>
                        </td>
                        <td>
                          <span className={offer.isActive ? styles.statusActive : styles.statusInactive}>
                            {offer.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.tableActions}>
                            <Link href={`/df-admin77/offers/${offer.id}/edit`} className={`${styles.actionBtn} ${styles.editBtn}`}>Edit</Link>
                            <Link href={`/${offer.slug}`} className={`${styles.actionBtn} ${styles.toggleBtn}`}>View</Link>
                            <button
                              type="button"
                              onClick={() => handleClearReports(offer.id)}
                              className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            >
                              Clear
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
