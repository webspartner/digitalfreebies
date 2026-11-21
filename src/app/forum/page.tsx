'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import { useForumAuth } from '@/context/ForumAuthContext';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import styles from './forum.module.css';

interface ForumPostItem {
  id: number;
  title: string;
  slug: string;
  dealUrl: string;
  brand: string | null;
  category: string;
  description: string;
  authorName: string;
  userId?: number | null;
  upvotes: number;
  createdAt: string;
  _count?: {
    comments: number;
  };
}

const CATEGORIES = [
  'All',
  'Streaming',
  'Subscription',
  'VPNs',
  'Gaming',
  'Education',
  'Software',
  'Hardware',
  'Events',
];

export default function ForumPage() {
  const { user, logout, getAuthHeaders } = useForumAuth();
  const { confirm, alert } = useDialog();
  const [posts, setPosts] = useState<ForumPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'top'>('newest');
  const [votedSlugs, setVotedSlugs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, sortBy]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.set('category', selectedCategory);
      params.set('sort', sortBy);

      const res = await fetch(`/api/forum?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to load forum posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (votedSlugs[slug]) return; // already voted in this session

    try {
      const res = await fetch(`/api/forum/${slug}/upvote`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) => (p.slug === slug ? { ...p, upvotes: data.upvotes } : p))
        );
        setVotedSlugs((prev) => ({ ...prev, [slug]: true }));
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
    }
  };

  const handleDeleteOwnPost = async (post: ForumPostItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!(await confirm(`Are you sure you want to delete your post "${post.title}" from the forum?`))) {
      return;
    }

    try {
      const res = await fetch(`/api/forum/${post.slug}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
          ...getAuthHeaders(),
        },
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
      } else {
        const data = await res.json();
        await alert(data.error || 'Failed to delete post');
      }
    } catch {
      await alert('Network error deleting post');
    }
  };

  return (
    <>
      <Header />

      <main className={styles.forumPage}>
        <div className={styles.container}>
          {/* Hero Header */}
          <div className={styles.forumHero}>
            <div className={styles.heroContent}>
              <span className={styles.heroTag}>💬 Community Forum</span>
              <h1 className={styles.heroTitle}>Freebies & Deals Shared by You</h1>
              <p className={styles.heroSubtitle}>
                Discover working digital promotions, free trials, and promo codes discovered by fellow users. Found something good? Share it with everyone!
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
              {user ? (
                <div className={styles.userBadgeRow}>
                  <Link
                    href="/forum/profile"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                    title="Manage your profile, password & posts"
                  >
                    <div className={styles.avatarCircle}>{user.username.charAt(0)}</div>
                    <span className={styles.userBadgeName}>@{user.username}</span>
                  </Link>
                  <Link
                    href="/forum/profile"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      textDecoration: 'none',
                      padding: '2px 6px',
                    }}
                  >
                    My Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className={styles.logoutBtn}
                    title="Sign Out"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link href="/forum/login" className={styles.secondaryAuthBtn}>
                    Sign In
                  </Link>
                  <Link href="/forum/register" className={styles.secondaryAuthBtn} style={{ background: '#f8fafc' }}>
                    Register Free
                  </Link>
                </div>
              )}

              <Link href="/forum/new" className={styles.shareBtn}>
                <span>+ Share a Freebie</span>
              </Link>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.categoryPills}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.categoryPill} ${selectedCategory === cat ? styles.categoryPillActive : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'top')}
              aria-label="Sort deals"
            >
              <option value="newest">🕒 Newest First</option>
              <option value="top">🔥 Most Upvoted</option>
            </select>
          </div>

          {/* Posts List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-gray-500)' }}>
              Loading community freebies...
            </div>
          ) : posts.length === 0 ? (
            <div className={styles.emptyState}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 14px',
                  borderRadius: '999px',
                  background: 'rgba(106, 11, 158, 0.08)',
                  color: 'var(--color-primary)',
                  fontSize: '12px',
                  fontWeight: 700,
                  marginBottom: '12px',
                }}
              >
                Community Deal Board
              </div>
              <h2 className={styles.emptyTitle}>No freebies found in this category</h2>
              <p style={{ color: 'var(--color-gray-600)', marginBottom: '20px' }}>
                Be the first to share a free trial or promotion with the community!
              </p>
              <Link href="/forum/new" className={styles.shareBtn} style={{ display: 'inline-flex' }}>
                + Share the First Freebie
              </Link>
            </div>
          ) : (
            <div className={styles.postList}>
              {posts.map((post) => {
                const commentCount = post._count?.comments || 0;
                const isVoted = votedSlugs[post.slug];
                const isOwnPost = Boolean(user && post.userId && post.userId === user.id);

                return (
                  <div key={post.id} className={styles.postCard}>
                    {/* Upvote button */}
                    <button
                      type="button"
                      className={styles.voteCol}
                      onClick={(e) => handleUpvote(post.slug, e)}
                      title={isVoted ? 'You upvoted this' : 'Upvote this freebie'}
                      style={isVoted ? { borderColor: 'var(--color-primary)', background: 'rgba(106, 11, 158, 0.1)' } : {}}
                    >
                      <span className={styles.voteIcon} style={isVoted ? { color: 'var(--color-primary)' } : {}}>
                        ▲
                      </span>
                      <span className={styles.voteCount}>{post.upvotes}</span>
                    </button>

                    {/* Content */}
                    <div className={styles.postContent}>
                      <div className={styles.postMetaRow}>
                        <span className={styles.categoryTag}>{post.category}</span>
                        {post.brand && <span className={styles.brandTag}>{post.brand}</span>}
                        <span className={styles.metaDot}>•</span>
                        <span>Posted by {post.authorName}</span>
                        {isOwnPost && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              background: 'rgba(106, 11, 158, 0.1)',
                              color: 'var(--color-primary)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            Your Post
                          </span>
                        )}
                        <span className={styles.metaDot}>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>

                      <Link href={`/forum/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h2 className={styles.postTitle}>{post.title}</h2>
                        <p className={styles.postDescription}>{post.description}</p>
                      </Link>

                      <div className={styles.postFooter}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <Link href={`/forum/${post.slug}`} className={styles.commentCount}>
                            💬 {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                          </Link>

                          {isOwnPost && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteOwnPost(post, e)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dc2626',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: 0,
                              }}
                              title="Delete your post"
                            >
                              Delete Post
                            </button>
                          )}
                        </div>

                        <a
                          href={post.dealUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className={styles.claimDealBtn}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Get Freebie ↗
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
