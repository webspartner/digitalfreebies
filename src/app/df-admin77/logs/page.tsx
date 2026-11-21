'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../admin.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';

interface AuditLogEntry {
  id: number;
  actor: string;
  actorRole: string;
  action: string;
  category: string;
  summary: string;
  ipAddress: string | null;
  createdAt: string;
}

const CATEGORIES = [
  { key: 'all', label: 'All Events' },
  { key: 'offers', label: 'Freebies' },
  { key: 'forum', label: 'Forum' },
  { key: 'users', label: 'Users' },
  { key: 'categories', label: 'Categories' },
  { key: 'security', label: 'Security' },
];

function getActionBadgeStyle(action: string): { background: string; color: string } {
  const upper = action.toUpperCase();
  if (
    upper.includes('DELETE') ||
    upper.includes('FAILED') ||
    upper.includes('REJECT') ||
    upper.includes('REPORTED')
  ) {
    return { background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' };
  }
  if (
    upper.includes('CREATE') ||
    upper.includes('APPROVE') ||
    upper.includes('REGISTER') ||
    upper.includes('ACTIVATED') ||
    upper === 'ADMIN_LOGIN' ||
    upper === 'USER_LOGIN'
  ) {
    return { background: 'rgba(34, 197, 94, 0.12)', color: '#16a34a' };
  }
  return { background: 'rgba(106, 11, 158, 0.1)', color: 'var(--color-primary)' };
}

export default function AdminLogsPage() {
  const { confirm } = useDialog();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const router = useRouter();

  const fetchLogs = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/df-admin77/login');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: categoryFilter,
        role: roleFilter,
        page: String(page),
        limit: '50',
      });
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(`/api/admin/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'same-origin',
      });

      if (res.status === 401) {
        router.push('/df-admin77/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, roleFilter, page, searchQuery, router]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePruneOldLogs = async () => {
    if (!(await confirm('Remove activity logs older than 30 days?'))) return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch('/api/admin/logs?mode=older', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage({ text: 'Logs older than 30 days pruned successfully.', type: 'success' });
        fetchLogs();
      }
    } catch {
      setMessage({ text: 'Failed to prune logs.', type: 'error' });
    }
  };

  return (
    <div className={styles.adminLayout}>
      <AdminNav />

      <main className={styles.adminMain}>
        <div
          className={styles.tableHeader}
          style={{ marginBottom: '20px', border: 'none', padding: 0 }}
        >
          <div>
            <h1 className={styles.pageTitle}>Activity &amp; Security Logs</h1>
            <p className={styles.pageSubtitle}>
              Real-time audit trail of admin actions, offer updates, forum submissions, user registrations, and security events.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={fetchLogs} className={styles.addBtn} type="button">
              Refresh Logs
            </button>
            <button onClick={handlePruneOldLogs} className={styles.formCancelBtn} type="button">
              Prune &gt;30 Days
            </button>
          </div>
        </div>

        {message && (
          <div
            className={message.type === 'success' ? styles.successMsg : styles.errorMsg}
            style={{ marginBottom: '20px' }}
          >
            {message.text}
          </div>
        )}

        {/* Category Filter Tabs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat.key);
                  setPage(1);
                }}
                className={styles.actionBtn}
                style={{
                  padding: '9px 16px',
                  fontWeight: 700,
                  fontSize: '13px',
                  background:
                    categoryFilter === cat.key ? 'var(--color-primary)' : 'var(--color-white)',
                  color: categoryFilter === cat.key ? '#ffffff' : 'var(--color-gray-700)',
                  border: '1px solid var(--color-gray-300)',
                  borderRadius: '8px',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className={styles.formSelect}
              style={{ width: 'auto', minWidth: '140px', padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="all">All Actors</option>
              <option value="admin">Admins Only</option>
              <option value="user">Forum Users Only</option>
              <option value="visitor">Visitors Only</option>
            </select>

            <input
              type="text"
              placeholder="Search actor, action, details, IP..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className={styles.formInput}
              style={{ width: '260px', padding: '8px 12px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Recorded Events ({total})</h2>
          </div>

          <div className={styles.tableWrapper}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-gray-500)' }}>
                Loading audit logs...
              </div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-gray-500)' }}>
                No activity logs recorded for the current filter.
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '70px' }}>ID</th>
                    <th style={{ width: '175px' }}>Timestamp</th>
                    <th style={{ width: '160px' }}>Actor</th>
                    <th style={{ width: '185px' }}>Action</th>
                    <th>Activity Details</th>
                    <th style={{ width: '130px' }}>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((entry) => {
                    const badgeStyle = getActionBadgeStyle(entry.action);
                    return (
                      <tr key={entry.id}>
                        <td style={{ color: 'var(--color-gray-500)', fontSize: '12px' }}>
                          #{entry.id}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--color-gray-900)' }}>
                              {entry.actor}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background:
                                  entry.actorRole === 'admin'
                                    ? 'rgba(106, 11, 158, 0.12)'
                                    : entry.actorRole === 'user'
                                    ? 'rgba(59, 130, 246, 0.12)'
                                    : 'var(--color-gray-100)',
                                color:
                                  entry.actorRole === 'admin'
                                    ? 'var(--color-primary)'
                                    : entry.actorRole === 'user'
                                    ? '#2563eb'
                                    : 'var(--color-gray-600)',
                              }}
                            >
                              {entry.actorRole}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              background: badgeStyle.background,
                              color: badgeStyle.color,
                            }}
                          >
                            {entry.action}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--color-gray-800)' }}>
                          {entry.summary}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-gray-500)' }}>
                          {entry.ipAddress || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 20px',
                borderTop: '1px solid var(--color-gray-200)',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--color-gray-600)' }}>
                Page {page} of {totalPages}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={styles.actionBtn}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={styles.actionBtn}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
