'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import { useForumAuth } from '@/context/ForumAuthContext';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import styles from '../forum.module.css';

interface UserPostItem {
  id: number;
  title: string;
  slug: string;
  dealUrl: string;
  brand: string | null;
  category: string;
  description: string;
  status: string;
  upvotes: number;
  createdAt: string;
  _count?: {
    comments: number;
  };
}

interface UserCommentItem {
  id: number;
  content: string;
  createdAt: string;
  post?: {
    id: number;
    title: string;
    slug: string;
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

export default function ForumUserProfilePage() {
  const { user, loading: authLoading, login, logout, getAuthHeaders } = useForumAuth();
  const { confirm } = useDialog();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'posts' | 'settings'>('posts');
  const [myPosts, setMyPosts] = useState<UserPostItem[]>([]);
  const [myComments, setMyComments] = useState<UserCommentItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Account Settings State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Post Edit State
  const [editingPost, setEditingPost] = useState<UserPostItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDealUrl, setEditDealUrl] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editDescription, setEditDescription] = useState('');
  const [savingPost, setSavingPost] = useState(false);

  // Feedback Banners
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProfileData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/forum/profile', {
        credentials: 'same-origin',
        headers: {
          ...getAuthHeaders(),
        },
        cache: 'no-store',
      });

      if (res.status === 401) {
        router.push('/forum/login?redirect=/forum/profile');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUsername(data.user.username || '');
          setEmail(data.user.email || '');
        }
        setMyPosts(data.posts || []);
        setMyComments(data.comments || []);
      }
    } catch (err) {
      console.error('Error loading forum profile:', err);
    } finally {
      setLoadingData(false);
    }
  }, [getAuthHeaders, router]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/forum/login?redirect=/forum/profile');
      } else {
        setUsername(user.username || '');
        setEmail(user.email || '');
        fetchProfileData();
      }
    }
  }, [authLoading, user, router, fetchProfileData]);

  const handleSaveAccountSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Please enter your current password to confirm changes.');
      return;
    }

    if (newPassword) {
      if (newPassword !== confirmNewPassword) {
        setError('New passwords do not match.');
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long.');
        return;
      }
    }

    setSavingSettings(true);
    try {
      const res = await fetch('/api/forum/profile', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          currentPassword,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      if (data.user) {
        login(data.token, data.user);
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccess(data.message || 'Your account settings have been updated.');
      fetchProfileData();
    } catch {
      setError('Network error while saving settings. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenEditPost = (post: UserPostItem) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditDealUrl(post.dealUrl);
    setEditBrand(post.brand || '');
    setEditCategory(post.category || 'General');
    setEditDescription(post.description);
    setError('');
    setSuccess('');
  };

  const handleSavePostEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    setError('');
    setSuccess('');
    setSavingPost(true);

    try {
      const res = await fetch(`/api/forum/${editingPost.slug}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          dealUrl: editDealUrl.trim(),
          brand: editBrand.trim() || null,
          category: editCategory,
          description: editDescription.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update post');
        return;
      }

      setMyPosts((prev) =>
        prev.map((p) => (p.id === editingPost.id ? { ...p, ...data } : p))
      );
      setEditingPost(null);
      setSuccess('Your post has been updated.');
    } catch {
      setError('Network error updating post');
    } finally {
      setSavingPost(false);
    }
  };

  const handleDeletePost = async (post: UserPostItem) => {
    if (!(await confirm(`Are you sure you want to permanently delete your post "${post.title}" from the forum?`))) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/forum/${post.slug}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
          ...getAuthHeaders(),
        },
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete post');
        return;
      }

      setMyPosts((prev) => prev.filter((p) => p.id !== post.id));
      if (editingPost?.id === post.id) {
        setEditingPost(null);
      }
      setSuccess(`Post "${post.title}" was deleted from the forum.`);
    } catch {
      setError('Network error deleting post');
    }
  };

  if (authLoading || loadingData) {
    return (
      <>
        <Header />
        <main className={styles.forumPage}>
          <div className={styles.container} style={{ textAlign: 'center', padding: '80px 0', color: 'var(--color-gray-500)' }}>
            Loading your community profile...
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header />

      <main className={styles.forumPage}>
        <div className={styles.container}>
          {/* Breadcrumb */}
          <div style={{ marginBottom: '16px' }}>
            <Link
              href="/forum"
              style={{
                fontSize: '13px',
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              ← Back to Community Forum
            </Link>
          </div>

          {/* Profile Hero Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
              border: '1px solid var(--color-gray-200, #eeeeee)',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <div
                className={styles.avatarCircle}
                style={{ width: '64px', height: '64px', fontSize: '26px' }}
              >
                {user.username.charAt(0)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-gray-900)', margin: 0 }}>
                    @{user.username}
                  </h1>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: 'rgba(106, 11, 158, 0.1)',
                      color: 'var(--color-primary)',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                    }}
                  >
                    Community Member
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-gray-600)' }}>
                  {user.email}
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    marginTop: '10px',
                    fontSize: '13px',
                    color: 'var(--color-gray-500)',
                    fontWeight: 600,
                  }}
                >
                  <span>{myPosts.length} Shared Freebies</span>
                  <span>•</span>
                  <span>{myComments.length} Comments</span>
                  {user.createdAt && (
                    <>
                      <span>•</span>
                      <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link href="/forum/new" className={styles.shareBtn}>
                + Share a Freebie
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push('/forum');
                }}
                className={styles.secondaryAuthBtn}
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('posts');
                setError('');
                setSuccess('');
              }}
              className={`${styles.categoryPill} ${activeTab === 'posts' ? styles.categoryPillActive : ''}`}
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              My Shared Freebies ({myPosts.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setError('');
                setSuccess('');
              }}
              className={`${styles.categoryPill} ${activeTab === 'settings' ? styles.categoryPillActive : ''}`}
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              Edit Profile & Password
            </button>
          </div>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '20px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '20px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {success}
            </div>
          )}

          {/* ==================== TAB 1: MY SHARED FREEBIES ==================== */}
          {activeTab === 'posts' && (
            <>
              {/* Inline Edit Post Modal / Card */}
              {editingPost && (
                <div
                  className={styles.formCard}
                  style={{
                    maxWidth: '100%',
                    marginBottom: '24px',
                    borderLeft: '4px solid var(--color-primary)',
                  }}
                >
                  <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: 'var(--color-gray-900)' }}>
                    Edit Your Post: <span style={{ color: 'var(--color-primary)' }}>{editingPost.title}</span>
                  </h2>

                  <form onSubmit={handleSavePostEdit}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Freebie Title *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                        maxLength={160}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Direct Link to Claim Deal *</label>
                      <input
                        type="url"
                        className={styles.formInput}
                        value={editDealUrl}
                        onChange={(e) => setEditDealUrl(e.target.value)}
                        required
                      />
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '16px',
                      }}
                    >
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Brand / Service</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={editBrand}
                          onChange={(e) => setEditBrand(e.target.value)}
                          placeholder="Optional"
                          maxLength={80}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Category *</label>
                        <select
                          className={styles.formSelect}
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Description & Instructions *</label>
                      <textarea
                        className={styles.formTextarea}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        required
                        maxLength={5000}
                      />
                    </div>

                    <div className={styles.formActions}>
                      <button type="submit" className={styles.submitBtn} disabled={savingPost}>
                        {savingPost ? 'Saving...' : 'Save Post Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPost(null)}
                        className={styles.secondaryAuthBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {myPosts.length === 0 ? (
                <div className={styles.emptyState}>
                  <h2 className={styles.emptyTitle}>You haven&apos;t shared any freebies yet</h2>
                  <p style={{ color: 'var(--color-gray-600)', marginBottom: '20px' }}>
                    Found a working promo code, free trial, or digital giveaway? Share it with the community!
                  </p>
                  <Link href="/forum/new" className={styles.shareBtn} style={{ display: 'inline-flex' }}>
                    + Share Your First Freebie
                  </Link>
                </div>
              ) : (
                <div className={styles.postList}>
                  {myPosts.map((post) => {
                    const commentCount = post._count?.comments || 0;
                    const statusBadgeStyle =
                      post.status === 'approved'
                        ? { background: '#dcfce7', color: '#15803d', label: 'Published' }
                        : post.status === 'rejected'
                        ? { background: '#fee2e2', color: '#b91c1c', label: 'Declined' }
                        : { background: '#fef3c7', color: '#b45309', label: 'Pending Review' };

                    return (
                      <div key={post.id} className={styles.postCard}>
                        <div className={styles.voteCol} style={{ cursor: 'default' }}>
                          <span className={styles.voteIcon}>▲</span>
                          <span className={styles.voteCount}>{post.upvotes}</span>
                        </div>

                        <div className={styles.postContent}>
                          <div className={styles.postMetaRow}>
                            <span
                              style={{
                                background: statusBadgeStyle.background,
                                color: statusBadgeStyle.color,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                              }}
                            >
                              {statusBadgeStyle.label}
                            </span>
                            <span className={styles.categoryTag}>{post.category}</span>
                            {post.brand && <span className={styles.brandTag}>{post.brand}</span>}
                            <span className={styles.metaDot}>•</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>

                          <Link
                            href={`/forum/${post.slug}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <h2 className={styles.postTitle}>{post.title}</h2>
                            <p className={styles.postDescription}>{post.description}</p>
                          </Link>

                          <div className={styles.postFooter}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <Link href={`/forum/${post.slug}`} className={styles.commentCount}>
                                {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                              </Link>
                              <a
                                href={post.dealUrl}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: 'var(--color-primary)',
                                  textDecoration: 'none',
                                }}
                              >
                                Deal Link ↗
                              </a>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <Link
                                href={`/forum/${post.slug}`}
                                className={styles.secondaryAuthBtn}
                                style={{ padding: '6px 14px', fontSize: '12px' }}
                              >
                                View
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleOpenEditPost(post)}
                                className={styles.secondaryAuthBtn}
                                style={{ padding: '6px 14px', fontSize: '12px' }}
                              >
                                Edit Post
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post)}
                                style={{
                                  padding: '6px 14px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#dc2626',
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  borderRadius: '9999px',
                                  cursor: 'pointer',
                                }}
                              >
                                Delete Post
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ==================== TAB 2: EDIT PROFILE & PASSWORD ==================== */}
          {activeTab === 'settings' && (
            <div className={styles.formCard} style={{ maxWidth: '640px', margin: 0 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: '6px' }}>
                Account & Security Settings
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-gray-600)', marginBottom: '20px', lineHeight: 1.5 }}>
                Update your public community username, email address, or account password. For your security, entering your current password is required to save changes.
              </p>

              <form onSubmit={handleSaveAccountSettings} autoComplete="on">
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Username *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_]+"
                    title="Letters, numbers, and underscores only"
                    autoComplete="username"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--color-gray-500)', marginTop: '4px', display: 'block' }}>
                    3–30 characters (letters, numbers, and underscores). Updating your username also updates the author name on your existing posts.
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email Address *</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={120}
                    autoComplete="email"
                  />
                </div>

                <hr
                  style={{
                    border: 'none',
                    borderTop: '1px solid var(--color-gray-200)',
                    margin: '24px 0 18px',
                  }}
                />

                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                    Change Password (Optional)
                  </span>
                  <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', margin: '2px 0 0' }}>
                    Leave the new password fields blank if you only want to update your username or email.
                  </p>
                </div>

                <div className={styles.formGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={styles.formLabel}>New Password (min 6 characters)</label>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {showNewPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className={styles.formInput}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    minLength={6}
                    maxLength={72}
                    autoComplete="new-password"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Confirm New Password</label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className={styles.formInput}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    minLength={6}
                    maxLength={72}
                    autoComplete="new-password"
                  />
                </div>

                <hr
                  style={{
                    border: 'none',
                    borderTop: '1px solid var(--color-gray-200)',
                    margin: '24px 0 18px',
                  }}
                />

                <div
                  className={styles.formGroup}
                  style={{
                    background: 'rgba(106, 11, 158, 0.04)',
                    border: '1px solid rgba(106, 11, 158, 0.18)',
                    borderRadius: '10px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={styles.formLabel} style={{ color: 'var(--color-primary)' }}>
                      Current Password (Required to Confirm Changes) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {showCurrentPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    className={styles.formInput}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password to save changes"
                    required
                    maxLength={72}
                    autoComplete="current-password"
                  />
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className={styles.submitBtn} disabled={savingSettings}>
                    {savingSettings ? 'Saving Changes...' : 'Save Account Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
