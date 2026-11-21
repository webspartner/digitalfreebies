'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../admin.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';

interface ForumSubmission {
  id: number;
  title: string;
  slug: string;
  dealUrl: string;
  brand: string | null;
  category: string;
  description: string;
  authorName: string;
  authorEmail: string | null;
  userId?: number | null;
  ipAddress?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  upvotes: number;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    email: string;
    isBanned?: boolean;
    banReason?: string | null;
    lastIp?: string | null;
  } | null;
  _count?: {
    comments: number;
  };
}

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

export default function AdminForumPage() {
  const { confirm } = useDialog();
  const [submissions, setSubmissions] = useState<ForumSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  // Edit state
  const [editingPost, setEditingPost] = useState<ForumSubmission | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDealUrl, setEditDealUrl] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/df-admin77/login');
      return;
    }
    fetchSubmissions();
  }, [statusFilter]);

  const fetchSubmissions = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/forum?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        router.push('/df-admin77/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.posts || []);
        setCounts({
          pending: data.pendingCount || 0,
          approved: data.approvedCount || 0,
          rejected: data.rejectedCount || 0,
          total: data.total || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: 'approved' | 'rejected' | 'pending') => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/forum/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setMessage({
          text: `Submission #${id} marked as ${newStatus}!`,
          type: 'success',
        });
        fetchSubmissions();
      } else {
        const d = await res.json();
        setMessage({ text: d.error || 'Action failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error', type: 'error' });
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!(await confirm(`Are you sure you want to permanently delete "${title}"?`))) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/forum/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMessage({ text: 'Submission deleted successfully.', type: 'success' });
        fetchSubmissions();
      } else {
        const d = await res.json();
        setMessage({ text: d.error || 'Delete failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error', type: 'error' });
    }
  };

  const handleToggleBanUser = async (post: ForumSubmission) => {
    const isCurrentlyBanned = Boolean(post.user?.isBanned);
    const targetIp = post.ipAddress || post.user?.lastIp || null;
    const targetUsername = post.user?.username || post.authorName;

    const promptText = isCurrentlyBanned
      ? `Unban forum user "${targetUsername}"${targetIp ? ` and IP ${targetIp}` : ''}?`
      : `Are you sure you want to BAN "${targetUsername}"${
          targetIp ? ` (IP: ${targetIp})` : ''
        } from posting or commenting in the forum?`;

    if (
      !(await confirm(promptText, {
        title: isCurrentlyBanned ? 'Unban Forum User' : 'Ban Forum User & IP',
      }))
    ) {
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      if (isCurrentlyBanned) {
        const params = new URLSearchParams();
        if (post.user?.id || post.userId) {
          params.set('userId', String(post.user?.id || post.userId));
        }
        if (targetIp) {
          params.set('ip', targetIp);
        }
        const res = await fetch(`/api/admin/forum/bans?${params.toString()}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setMessage({ text: `Unbanned "${targetUsername}".`, type: 'success' });
          fetchSubmissions();
        } else {
          const d = await res.json();
          setMessage({ text: d.error || 'Failed to unban user', type: 'error' });
        }
      } else {
        const res = await fetch('/api/admin/forum/bans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: post.user?.id || post.userId || null,
            username: targetUsername,
            ipAddress: targetIp,
            reason: 'Banned by moderator from forum submissions',
          }),
        });
        const d = await res.json();
        if (res.ok) {
          setMessage({
            text: d.message || `Banned "${targetUsername}" from posting or commenting.`,
            type: 'success',
          });
          fetchSubmissions();
        } else {
          setMessage({ text: d.error || 'Failed to ban user', type: 'error' });
        }
      }
    } catch {
      setMessage({ text: 'Network error updating ban status', type: 'error' });
    }
  };

  const openEditModal = (post: ForumSubmission) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditDealUrl(post.dealUrl);
    setEditBrand(post.brand || '');
    setEditCategory(post.category);
    setEditDescription(post.description);
    setMessage(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/forum/${editingPost.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          dealUrl: editDealUrl,
          brand: editBrand,
          category: editCategory,
          description: editDescription,
        }),
      });

      if (res.ok) {
        setMessage({ text: 'Submission updated successfully.', type: 'success' });
        setEditingPost(null);
        fetchSubmissions();
      } else {
        const d = await res.json();
        setMessage({ text: d.error || 'Update failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error updating post', type: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className={styles.adminLayout}>
      <AdminNav />

      <main className={styles.adminMain}>
        {/* Page Header */}
        <div className={styles.tableHeader} style={{ marginBottom: '20px', border: 'none', padding: 0 }}>
          <div>
            <h1 className={styles.pageTitle}>Community Forum Moderation</h1>
            <p className={styles.pageSubtitle}>
              Review, approve, or delete user-submitted freebies before or after they go live on the forum.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href="/df-admin77/users"
              className={styles.addBtn}
              style={{ textDecoration: 'none' }}
            >
              Manage Forum Users
            </a>
            <a
              href="/forum"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.addBtn}
              style={{ textDecoration: 'none' }}
            >
              View Public Forum
            </a>
          </div>
        </div>

        {message && (
          <div className={message.type === 'success' ? styles.successMsg : styles.errorMsg} style={{ marginBottom: '20px' }}>
            {message.text}
          </div>
        )}

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={styles.actionBtn}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '13px',
              background: statusFilter === 'pending' ? 'var(--color-primary)' : 'var(--color-white)',
              color: statusFilter === 'pending' ? '#ffffff' : 'var(--color-gray-700)',
              border: '1px solid var(--color-gray-300)',
              borderRadius: '8px',
            }}
          >
            Pending Review ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={styles.actionBtn}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '13px',
              background: statusFilter === 'approved' ? 'var(--color-primary)' : 'var(--color-white)',
              color: statusFilter === 'approved' ? '#ffffff' : 'var(--color-gray-700)',
              border: '1px solid var(--color-gray-300)',
              borderRadius: '8px',
            }}
          >
            Approved ({counts.approved})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={styles.actionBtn}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '13px',
              background: statusFilter === 'rejected' ? 'var(--color-primary)' : 'var(--color-white)',
              color: statusFilter === 'rejected' ? '#ffffff' : 'var(--color-gray-700)',
              border: '1px solid var(--color-gray-300)',
              borderRadius: '8px',
            }}
          >
            Rejected ({counts.rejected})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={styles.actionBtn}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '13px',
              background: statusFilter === 'all' ? 'var(--color-primary)' : 'var(--color-white)',
              color: statusFilter === 'all' ? '#ffffff' : 'var(--color-gray-700)',
              border: '1px solid var(--color-gray-300)',
              borderRadius: '8px',
            }}
          >
            All Submissions ({counts.pending + counts.approved + counts.rejected})
          </button>
        </div>

        {/* Edit Modal / Form */}
        {editingPost && (
          <div className={styles.formCard} style={{ marginBottom: '24px', borderLeft: '4px solid var(--color-primary)' }}>
            <h2 className={styles.tableTitle} style={{ marginBottom: '16px' }}>
              Edit Submission: <span style={{ color: 'var(--color-primary)' }}>{editingPost.title}</span>
            </h2>
            <form onSubmit={handleSaveEdit}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Title *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Deal Link *</label>
                  <input
                    type="url"
                    className={styles.formInput}
                    value={editDealUrl}
                    onChange={(e) => setEditDealUrl(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Brand / Store</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Category *</label>
                  <select
                    className={styles.formInput}
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup} style={{ marginTop: '12px' }}>
                <label className={styles.formLabel}>Description *</label>
                <textarea
                  className={styles.formInput}
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.formSubmitBtn} disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className={styles.formCancelBtn}
                  onClick={() => setEditingPost(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Submissions Table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>
              {statusFilter.toUpperCase()} SUBMISSIONS ({submissions.length})
            </h2>
          </div>

          <div className={styles.tableWrapper}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-gray-500)' }}>
                Loading submissions...
              </div>
            ) : submissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-gray-500)' }}>
                No {statusFilter !== 'all' ? statusFilter : ''} submissions found.
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>ID</th>
                    <th>Deal Title & Details</th>
                    <th>Category</th>
                    <th>Submitted By</th>
                    <th>Status</th>
                    <th style={{ width: '220px' }}>Moderation Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((post) => {
                    const isPending = post.status === 'pending';
                    const isApproved = post.status === 'approved';

                    return (
                      <tr key={post.id}>
                        <td>#{post.id}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: '4px' }}>
                            {post.title}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {post.brand && <span>Brand: <strong>{post.brand}</strong></span>}
                            <span>•</span>
                            <a
                              href={post.dealUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                            >
                              View Deal Link ↗
                            </a>
                            <span>•</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: 'rgba(106, 11, 158, 0.08)',
                              color: 'var(--color-primary)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {post.category}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>{post.authorName}</span>
                            {post.user?.isBanned && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(239, 68, 68, 0.14)',
                                  color: '#dc2626',
                                }}
                              >
                                BANNED
                              </span>
                            )}
                          </div>
                          {post.authorEmail && (
                            <div style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>
                              {post.authorEmail}
                            </div>
                          )}
                          {(post.ipAddress || post.user?.lastIp) && (
                            <div style={{ fontSize: '11px', color: 'var(--color-gray-400)', fontFamily: 'monospace' }}>
                              IP: {post.ipAddress || post.user?.lastIp}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              background:
                                post.status === 'approved'
                                  ? 'rgba(34, 197, 94, 0.12)'
                                  : post.status === 'rejected'
                                  ? 'rgba(239, 68, 68, 0.12)'
                                  : 'rgba(245, 158, 11, 0.12)',
                              color:
                                post.status === 'approved'
                                  ? '#16a34a'
                                  : post.status === 'rejected'
                                  ? '#dc2626'
                                  : '#d97706',
                            }}
                          >
                            {post.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className={styles.tableActions}>
                            {!isApproved && (
                              <button
                                onClick={() => handleUpdateStatus(post.id, 'approved')}
                                className={styles.actionBtn}
                                style={{ background: '#22c55e', color: '#ffffff', fontWeight: 700 }}
                                title="Approve deal to show on forum"
                              >
                                Approve
                              </button>
                            )}

                            {isPending && (
                              <button
                                onClick={() => handleUpdateStatus(post.id, 'rejected')}
                                className={styles.actionBtn}
                                style={{ background: '#f59e0b', color: '#ffffff', fontWeight: 700 }}
                                title="Reject submission"
                              >
                                Reject
                              </button>
                            )}

                            <button
                              onClick={() => openEditModal(post)}
                              className={`${styles.actionBtn} ${styles.editBtn}`}
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleToggleBanUser(post)}
                              className={styles.actionBtn}
                              style={{
                                background: post.user?.isBanned ? '#16a34a' : '#7f1d1d',
                                color: '#ffffff',
                                fontWeight: 700,
                              }}
                              title={
                                post.user?.isBanned
                                  ? 'Unban user & IP'
                                  : 'Ban user account & IP from posting or commenting'
                              }
                            >
                              {post.user?.isBanned ? 'Unban User' : 'Ban User'}
                            </button>

                            <button
                              onClick={() => handleDelete(post.id, post.title)}
                              className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            >
                              Delete
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
