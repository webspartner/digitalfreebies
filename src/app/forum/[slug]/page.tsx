'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import { useForumAuth } from '@/context/ForumAuthContext';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import styles from '../forum.module.css';

interface CommentItem {
  id: number;
  authorName: string;
  content: string;
  createdAt: string;
}

interface ForumPostDetail {
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
  status: string;
  createdAt: string;
  comments: CommentItem[];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ForumPostDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const { user, getAuthHeaders } = useForumAuth();
  const { confirm, alert } = useDialog();
  const router = useRouter();

  const [post, setPost] = useState<ForumPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  // Comment form state
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data);
      }
    } catch (err) {
      console.error('Failed to load post details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (hasVoted || !post) return;
    try {
      const res = await fetch(`/api/forum/${slug}/upvote`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPost((prev) => (prev ? { ...prev, upvotes: data.upvotes } : null));
        setHasVoted(true);
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (!(await confirm(`Are you sure you want to permanently delete your post "${post.title}" from the forum?`))) {
      return;
    }

    setDeletingPost(true);
    try {
      const res = await fetch(`/api/forum/${slug}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
          ...getAuthHeaders(),
        },
      });
      if (res.ok) {
        router.push('/forum');
      } else {
        const d = await res.json();
        await alert(d.error || 'Failed to delete post');
      }
    } catch {
      await alert('Network error deleting post');
    } finally {
      setDeletingPost(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError('');

    if (!user) {
      setCommentError('You must be signed in to post a comment.');
      return;
    }

    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/forum/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          content: commentText.trim(),
        }),
      });

      if (res.ok) {
        const newC = await res.json();
        setPost((prev) =>
          prev ? { ...prev, comments: [newC, ...prev.comments] } : null
        );
        setCommentText('');
      } else {
        const d = await res.json();
        setCommentError(d.error || 'Failed to submit comment');
      }
    } catch {
      setCommentError('Network error while posting comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.forumPage}>
          <div className={styles.container} style={{ textAlign: 'center', padding: '100px 0', color: 'var(--color-gray-500)' }}>
            Loading freebie details...
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Header />
        <main className={styles.forumPage}>
          <div className={styles.container}>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <h1 className={styles.emptyTitle}>Freebie post not found</h1>
              <p style={{ color: 'var(--color-gray-600)', marginBottom: '20px' }}>
                This deal may have expired or is still undergoing moderation.
              </p>
              <Link href="/forum" className={styles.shareBtn} style={{ display: 'inline-flex' }}>
                ← Browse Community Freebies
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const isOwnPost = Boolean(user && post.userId && post.userId === user.id);

  return (
    <>
      <Header />

      <main className={styles.forumPage}>
        <div className={styles.container}>
          {/* Breadcrumb */}
          <div
            style={{
              maxWidth: '840px',
              margin: '0 auto 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <Link href="/forum" style={{ fontSize: '13px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
              ← Back to Community Forum
            </Link>
            {user && (
              <Link href="/forum/profile" style={{ fontSize: '13px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 700 }}>
                My Profile (@{user.username}) →
              </Link>
            )}
          </div>

          {/* Post Detail Card */}
          <article className={styles.detailCard}>
            <div className={styles.detailHeader}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={styles.categoryTag}>{post.category}</span>
                  {post.brand && <span className={styles.brandTag}>🏷️ {post.brand}</span>}
                </div>

                {isOwnPost && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Link
                      href="/forum/profile"
                      className={styles.secondaryAuthBtn}
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                    >
                      Edit in My Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleDeletePost}
                      disabled={deletingPost}
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
                      {deletingPost ? 'Deleting...' : 'Delete Post'}
                    </button>
                  </div>
                )}
              </div>

              <h1 className={styles.detailTitle}>{post.title}</h1>

              <div className={styles.detailMeta}>
                <span>👤 Shared by <strong>{post.authorName}</strong></span>
                <span className={styles.metaDot}>•</span>
                <span>📅 {new Date(post.createdAt).toLocaleDateString()}</span>
                <span className={styles.metaDot}>•</span>
                <span>💬 {post.comments.length} comments</span>
              </div>
            </div>

            <div className={styles.detailBody}>
              {post.description}
            </div>

            <div className={styles.ctaContainer}>
              <a
                href={post.dealUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={styles.mainCtaBtn}
              >
                Go to Freebie Offer ↗
              </a>

              <button
                type="button"
                onClick={handleUpvote}
                className={styles.categoryPill}
                style={{
                  padding: '12px 20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: hasVoted ? 'var(--color-primary)' : 'var(--color-gray-300)',
                  background: hasVoted ? 'rgba(106, 11, 158, 0.08)' : '#ffffff',
                  color: hasVoted ? 'var(--color-primary)' : 'inherit',
                  fontWeight: 700,
                }}
              >
                <span>▲</span> {hasVoted ? 'Upvoted' : 'Upvote'} ({post.upvotes})
              </button>
            </div>
          </article>

          {/* Comments Section */}
          <section className={styles.commentsSection}>
            <h2 className={styles.commentsTitle}>Community Discussion ({post.comments.length})</h2>

            {!user ? (
              <div className={styles.authPromptBox}>
                <div className={styles.authPromptIcon}>💬</div>
                <h3 className={styles.authPromptTitle}>Join the Community Discussion</h3>
                <p className={styles.authPromptText}>
                  To prevent spam, link farming, and automated bot comments, you must be a registered community member to join the conversation.
                </p>
                <div className={styles.authPromptActions}>
                  <Link
                    href={`/forum/login?redirect=/forum/${slug}`}
                    className={styles.primaryAuthBtn}
                  >
                    Sign In to Comment
                  </Link>
                  <Link
                    href={`/forum/register?redirect=/forum/${slug}`}
                    className={styles.secondaryAuthBtn}
                  >
                    Create Free Account
                  </Link>
                </div>
              </div>
            ) : user.isBanned ? (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  marginBottom: '24px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                🚫 {user.banReason || 'Your account or IP address has been banned from posting or commenting in the community forum.'}
              </div>
            ) : (
              <form onSubmit={handleAddComment} className={styles.commentForm} style={{ marginTop: 0, paddingTop: 0, borderTop: 'none', marginBottom: '24px' }}>
                {commentError && (
                  <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '10px' }}>
                    {commentError}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div className={styles.avatarCircle}>{user.username.charAt(0)}</div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-gray-800)' }}>
                    Commenting as <strong>@{user.username}</strong>
                  </span>
                  <span className={styles.verifiedBadge}>✓ Verified</span>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <textarea
                    className={styles.formTextarea}
                    style={{ minHeight: '80px' }}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Did this freebie work for you? Share tips or updates..."
                    required
                  />
                </div>

                <button type="submit" className={styles.submitBtn} disabled={submittingComment}>
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </form>
            )}

            {/* Comments List */}
            {post.comments.length === 0 ? (
              <p style={{ color: 'var(--color-gray-500)', fontSize: '14px' }}>
                No comments yet. Be the first to leave feedback!
              </p>
            ) : (
              <div>
                {post.comments.map((comment) => (
                  <div key={comment.id} className={styles.commentItem}>
                    <div className={styles.commentAuthorRow}>
                      <span className={styles.commentAuthor}>{comment.authorName}</span>
                      <span className={styles.commentTime}>
                        • {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={styles.commentText}>{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
