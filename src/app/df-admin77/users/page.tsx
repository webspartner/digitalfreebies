'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../admin.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';

interface AdminUser {
  id: number;
  username: string;
  email?: string | null;
  role?: 'admin' | 'moderator' | string;
  twoFactorEnabled?: boolean;
}

interface ForumUser {
  id: number;
  username: string;
  email: string;
  emailVerified?: boolean;
  isBanned?: boolean;
  banReason?: string | null;
  bannedAt?: string | null;
  lastIp?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    posts: number;
    comments: number;
  };
}

interface BannedIpEntry {
  id: number;
  ipAddress: string;
  reason: string | null;
  bannedBy: string | null;
  userId: number | null;
  username: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { confirm, promptPassword } = useDialog();
  const [activeTab, setActiveTab] = useState<'forum' | 'bans' | 'admin'>('forum');
  const [currentRole, setCurrentRole] = useState<'admin' | 'moderator'>('admin');

  // Admin & Moderator accounts state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'moderator'>('moderator');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [editAdminUsername, setEditAdminUsername] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminRole, setEditAdminRole] = useState<'admin' | 'moderator'>('admin');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editAdminConfirmPassword, setEditAdminConfirmPassword] = useState('');
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [showConfirmAdminPassword, setShowConfirmAdminPassword] = useState(false);
  const [showEditAdminPassword, setShowEditAdminPassword] = useState(false);
  const [showEditAdminConfirmPassword, setShowEditAdminConfirmPassword] = useState(false);

  // Forum users state
  const [forumUsers, setForumUsers] = useState<ForumUser[]>([]);
  const [bannedIps, setBannedIps] = useState<BannedIpEntry[]>([]);
  const [manualBanIp, setManualBanIp] = useState('');
  const [manualBanReason, setManualBanReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForumModal, setShowAddForumModal] = useState(false);
  const [editingForumUser, setEditingForumUser] = useState<ForumUser | null>(null);
  const [newForumUsername, setNewForumUsername] = useState('');
  const [newForumEmail, setNewForumEmail] = useState('');
  const [newForumPassword, setNewForumPassword] = useState('');
  const [confirmForumPassword, setConfirmForumPassword] = useState('');
  const [editForumUsername, setEditForumUsername] = useState('');
  const [editForumEmail, setEditForumEmail] = useState('');
  const [editForumPassword, setEditForumPassword] = useState('');
  const [editForumConfirmPassword, setEditForumConfirmPassword] = useState('');
  const [showNewForumPassword, setShowNewForumPassword] = useState(false);
  const [showConfirmForumPassword, setShowConfirmForumPassword] = useState(false);
  const [showEditForumPassword, setShowEditForumPassword] = useState(false);
  const [showEditForumConfirmPassword, setShowEditForumConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');
    if (!token) {
      router.push('/df-admin77/login');
      return;
    }
    let role: 'admin' | 'moderator' = 'admin';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUsername(u.username || '');
        if (u.role === 'moderator') {
          role = 'moderator';
          setCurrentRole('moderator');
        }
      } catch {
        // ignore
      }
    }
    fetchAllData(token, role);
  }, [router]);

  const fetchAllData = async (token?: string, roleOverride?: 'admin' | 'moderator') => {
    const t = token || localStorage.getItem('admin_token');
    if (!t) return;
    const role = roleOverride || currentRole;
    setLoading(true);
    try {
      const requests: Promise<Response>[] = [
        fetch('/api/admin/forum-users', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/admin/forum/bans', { headers: { Authorization: `Bearer ${t}` } }),
      ];
      if (role === 'admin') {
        requests.push(fetch('/api/users', { headers: { Authorization: `Bearer ${t}` } }));
      }

      const [forumRes, bansRes, adminRes] = await Promise.all(requests);

      if (forumRes.status === 401) {
        router.push('/df-admin77/login');
        return;
      }

      if (forumRes.ok) {
        const forumData = await forumRes.json();
        setForumUsers(forumData || []);
      }
      if (bansRes && bansRes.ok) {
        const bansData = await bansRes.json();
        setBannedIps(bansData.bannedIps || []);
      }
      if (adminRes && adminRes.ok) {
        const adminData = await adminRes.json();
        setAdminUsers(adminData || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- FORUM USER HANDLERS ---
  const handleAddForumUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newForumPassword !== confirmForumPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newForumPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/forum-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newForumUsername.trim(),
          email: newForumEmail.trim(),
          password: newForumPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create forum user');
        return;
      }

      setSuccess(`Forum user "${data.username}" created successfully.`);
      setNewForumUsername('');
      setNewForumEmail('');
      setNewForumPassword('');
      setConfirmForumPassword('');
      setShowAddForumModal(false);
      fetchAllData(token);
    } catch {
      setError('Network error creating forum user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditForumUser = (user: ForumUser) => {
    setEditingForumUser(user);
    setShowAddForumModal(false);
    setEditForumUsername(user.username);
    setEditForumEmail(user.email);
    setEditForumPassword('');
    setEditForumConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleUpdateForumUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForumUser) return;
    setError('');
    setSuccess('');

    if (editForumPassword && editForumPassword !== editForumConfirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (editForumPassword && editForumPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!editForumUsername.trim() || !editForumEmail.trim()) {
      setError('Username and email cannot be empty');
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSubmitting(true);
    try {
      const payload: { username?: string; email?: string; password?: string } = {
        username: editForumUsername.trim(),
        email: editForumEmail.trim(),
      };
      if (editForumPassword) {
        payload.password = editForumPassword;
      }

      const res = await fetch(`/api/admin/forum-users/${editingForumUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update forum user');
        return;
      }

      setSuccess(`Forum user "${data.username}" updated successfully.`);
      setEditingForumUser(null);
      fetchAllData(token);
    } catch {
      setError('Network error updating forum user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBanForumUser = async (user: ForumUser) => {
    const nextBanned = !user.isBanned;
    const msg = nextBanned
      ? `Are you sure you want to BAN forum user "${user.username}"${
          user.lastIp ? ` and their IP address (${user.lastIp})` : ''
        }? They will not be able to post or comment when logged in or from their IP.`
      : `Unban forum user "${user.username}"${
          user.lastIp ? ` and remove the IP ban on ${user.lastIp}` : ''
        }?`;

    if (!(await confirm(msg, { title: nextBanned ? 'Ban Forum User & IP' : 'Unban Forum User' }))) {
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/forum-users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isBanned: nextBanned,
          banReason: nextBanned
            ? 'Banned by moderator from posting or commenting in the community forum.'
            : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update ban status');
        return;
      }

      setSuccess(
        nextBanned
          ? `Banned forum user "${user.username}"${user.lastIp ? ` and IP ${user.lastIp}` : ''}.`
          : `Unbanned forum user "${user.username}".`
      );
      fetchAllData(token);
    } catch {
      setError('Network error updating ban status');
    }
  };

  const handleManualBanIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBanIp.trim()) return;
    setError('');
    setSuccess('');
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/forum/bans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ipAddress: manualBanIp.trim(),
          reason: manualBanReason.trim() || 'IP banned from posting or commenting in the forum',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to ban IP address');
        return;
      }
      setManualBanIp('');
      setManualBanReason('');
      setSuccess(data.message || 'IP address banned.');
      fetchAllData(token);
    } catch {
      setError('Network error banning IP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnbanIp = async (entry: BannedIpEntry) => {
    if (
      !(await confirm(
        `Remove ban on IP address "${entry.ipAddress}"${
          entry.username ? ` (linked to user "${entry.username}")` : ''
        }?`,
        { title: 'Unban IP Address' }
      ))
    ) {
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const params = new URLSearchParams({ ip: entry.ipAddress });
      if (entry.userId) params.set('userId', String(entry.userId));
      const res = await fetch(`/api/admin/forum/bans?${params.toString()}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccess(`Unbanned IP ${entry.ipAddress}.`);
        fetchAllData(token);
      }
    } catch {
      setError('Failed to unban IP address');
    }
  };

  const handleDeleteForumUser = async (user: ForumUser, deleteContent = false) => {
    const msg = deleteContent
      ? `Are you sure you want to delete forum user "${user.username}" AND permanently delete all their forum posts and comments?`
      : `Are you sure you want to delete forum user "${user.username}"?`;
    if (!(await confirm(msg))) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch(
        `/api/admin/forum-users/${user.id}${deleteContent ? '?deleteContent=true' : ''}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete forum user');
        return;
      }

      setSuccess(
        deleteContent
          ? `Forum user "${user.username}" and their content were deleted.`
          : `Forum user "${user.username}" deleted successfully.`
      );
      if (editingForumUser?.id === user.id) {
        setEditingForumUser(null);
      }
      fetchAllData(token);
    } catch {
      setError('Network error deleting forum user');
    }
  };

  // --- ADMIN & MODERATOR ACCOUNT HANDLERS ---
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newAdminPassword !== confirmAdminPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newAdminPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    const adminPassword = await promptPassword(
      `Enter your current admin password to confirm creating the ${
        newAdminRole === 'moderator' ? 'Moderator' : 'Admin'
      } account "${newAdminUsername.trim()}".`
    );
    if (!adminPassword) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newAdminUsername.trim(),
          email: newAdminEmail.trim() || null,
          password: newAdminPassword,
          role: newAdminRole,
          adminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add staff user');
        return;
      }

      setSuccess(
        `${data.role === 'moderator' ? 'Moderator' : 'Admin'} account "${data.username}" created successfully.`
      );
      setNewAdminUsername('');
      setNewAdminEmail('');
      setNewAdminRole('moderator');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
      setShowAddAdminModal(false);
      fetchAllData(token);
    } catch {
      setError('Network error creating staff user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditAdmin = (user: AdminUser) => {
    setEditingAdmin(user);
    setShowAddAdminModal(false);
    setEditAdminUsername(user.username);
    setEditAdminEmail(user.email || '');
    setEditAdminRole(user.role === 'moderator' ? 'moderator' : 'admin');
    setEditAdminPassword('');
    setEditAdminConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setError('');
    setSuccess('');

    if (editAdminPassword && editAdminPassword !== editAdminConfirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (editAdminPassword && editAdminPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!editAdminUsername.trim()) {
      setError('Username cannot be empty');
      return;
    }

    const adminPassword = await promptPassword(
      `Enter your current admin password to confirm saving changes to "${editingAdmin.username}".`
    );
    if (!adminPassword) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSubmitting(true);
    try {
      const payload: {
        username?: string;
        email?: string | null;
        password?: string;
        role?: 'admin' | 'moderator';
        adminPassword: string;
      } = {
        username: editAdminUsername.trim(),
        email: editAdminEmail.trim() || null,
        role: editAdminRole,
        adminPassword,
      };
      if (editAdminPassword) {
        payload.password = editAdminPassword;
      }

      const res = await fetch(`/api/users/${editingAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update account');
        return;
      }

      if (editingAdmin.username === currentUsername) {
        localStorage.setItem(
          'admin_user',
          JSON.stringify({
            id: data.id,
            username: data.username,
            email: data.email,
            role: data.role || 'admin',
          })
        );
        setCurrentUsername(data.username);
      }

      setSuccess(
        `${data.role === 'moderator' ? 'Moderator' : 'Admin'} account "${data.username}" updated successfully.`
      );
      setEditingAdmin(null);
      fetchAllData(token);
    } catch {
      setError('Network error updating account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (user: AdminUser) => {
    const label = user.role === 'moderator' ? 'moderator' : 'admin';
    const adminPassword = await promptPassword(
      `Are you sure you want to delete ${label} account "${user.username}"? Enter your current admin password to confirm.`,
      {
        title: `Delete ${label === 'moderator' ? 'Moderator' : 'Admin'} Account`,
        confirmText: 'Delete Account',
        danger: true,
      }
    );
    if (!adminPassword) {
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adminPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete account');
        return;
      }

      if (user.username === currentUsername) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        router.push('/df-admin77/login');
        return;
      }

      setSuccess(`Account "${user.username}" deleted successfully.`);
      fetchAllData(token);
    } catch {
      setError('Network error deleting account');
    }
  };

  const filteredForumUsers = forumUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.lastIp && u.lastIp.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const bannedUsersCount = forumUsers.filter((u) => u.isBanned).length;

  if (loading) {
    return (
      <div className={styles.adminLayout}>
        <AdminNav />
        <div className={styles.adminMain} style={{ textAlign: 'center', paddingTop: '100px' }}>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <AdminNav />

      <main className={styles.adminMain}>
        <div className={styles.tableHeader} style={{ marginBottom: '20px', border: 'none', padding: 0 }}>
          <div>
            <h1 className={styles.pageTitle}>Users &amp; Roles Management</h1>
            <p className={styles.pageSubtitle}>
              Manage community forum users, user/IP bans{currentRole === 'admin' ? ', and Admin & Moderator accounts' : ''}.
            </p>
          </div>
          {activeTab === 'forum' && (
            <button
              onClick={() => {
                setShowAddForumModal(!showAddForumModal);
                setEditingForumUser(null);
                setError('');
                setSuccess('');
              }}
              className={styles.addBtn}
            >
              {showAddForumModal ? 'Close Form' : '+ Add Forum User'}
            </button>
          )}
          {activeTab === 'admin' && currentRole === 'admin' && (
            <button
              onClick={() => {
                setShowAddAdminModal(!showAddAdminModal);
                setEditingAdmin(null);
                setError('');
                setSuccess('');
              }}
              className={styles.addBtn}
            >
              {showAddAdminModal ? 'Close Form' : '+ Add Admin / Moderator'}
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('forum');
              setError('');
              setSuccess('');
            }}
            className={styles.actionBtn}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '13px',
              background: activeTab === 'forum' ? 'var(--color-primary)' : 'var(--color-white)',
              color: activeTab === 'forum' ? '#ffffff' : 'var(--color-gray-700)',
              border: '1px solid var(--color-gray-300)',
              borderRadius: '8px',
            }}
          >
            Forum Users ({forumUsers.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('bans');
              setError('');
              setSuccess('');
            }}
            className={styles.actionBtn}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '13px',
              background: activeTab === 'bans' ? 'var(--color-primary)' : 'var(--color-white)',
              color: activeTab === 'bans' ? '#ffffff' : 'var(--color-gray-700)',
              border: '1px solid var(--color-gray-300)',
              borderRadius: '8px',
            }}
          >
            Banned Users &amp; IPs ({bannedUsersCount + bannedIps.length})
          </button>

          {currentRole === 'admin' && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setError('');
                setSuccess('');
              }}
              className={styles.actionBtn}
              style={{
                padding: '10px 18px',
                fontWeight: 700,
                fontSize: '13px',
                background: activeTab === 'admin' ? 'var(--color-primary)' : 'var(--color-white)',
                color: activeTab === 'admin' ? '#ffffff' : 'var(--color-gray-700)',
                border: '1px solid var(--color-gray-300)',
                borderRadius: '8px',
              }}
            >
              Admins &amp; Moderators ({adminUsers.length})
            </button>
          )}
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}
        {success && <div className={styles.successMsg}>{success}</div>}

        {/* ==================== FORUM USERS TAB ==================== */}
        {activeTab === 'forum' && (
          <>
            {/* Add Forum User Form */}
            {showAddForumModal && (
              <div className={styles.formCard} style={{ marginBottom: '24px' }}>
                <h2 className={styles.tableTitle} style={{ marginBottom: '16px' }}>
                  Create New Forum User
                </h2>
                <form onSubmit={handleAddForumUser}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Username *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={newForumUsername}
                        onChange={(e) => setNewForumUsername(e.target.value)}
                        placeholder="e.g. dealhunter"
                        required
                        minLength={3}
                        maxLength={30}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Email Address *</label>
                      <input
                        type="email"
                        className={styles.formInput}
                        value={newForumEmail}
                        onChange={(e) => setNewForumEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Password * (min 6 characters)</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showNewForumPassword ? 'text' : 'password'}
                          className={styles.formInput}
                          value={newForumPassword}
                          onChange={(e) => setNewForumPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className={styles.passwordToggleBtn}
                          onClick={() => setShowNewForumPassword((prev) => !prev)}
                          aria-label={showNewForumPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewForumPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Confirm Password *</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showConfirmForumPassword ? 'text' : 'password'}
                          className={styles.formInput}
                          value={confirmForumPassword}
                          onChange={(e) => setConfirmForumPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className={styles.passwordToggleBtn}
                          onClick={() => setShowConfirmForumPassword((prev) => !prev)}
                          aria-label={showConfirmForumPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          {showConfirmForumPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button type="submit" className={styles.formSubmitBtn} disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create Forum User'}
                    </button>
                    <button
                      type="button"
                      className={styles.formCancelBtn}
                      onClick={() => setShowAddForumModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Edit Forum User Form */}
            {editingForumUser && (
              <div
                className={styles.formCard}
                style={{ marginBottom: '24px', borderLeft: '4px solid var(--color-primary)' }}
              >
                <h2 className={styles.tableTitle} style={{ marginBottom: '16px' }}>
                  Edit Forum User:{' '}
                  <span style={{ color: 'var(--color-primary)' }}>{editingForumUser.username}</span>
                </h2>
                <form onSubmit={handleUpdateForumUser}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Username *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={editForumUsername}
                        onChange={(e) => setEditForumUsername(e.target.value)}
                        required
                        minLength={3}
                        maxLength={30}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Email Address *</label>
                      <input
                        type="email"
                        className={styles.formInput}
                        value={editForumEmail}
                        onChange={(e) => setEditForumEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        New Password (leave blank to keep current)
                      </label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showEditForumPassword ? 'text' : 'password'}
                          className={styles.formInput}
                          value={editForumPassword}
                          onChange={(e) => setEditForumPassword(e.target.value)}
                          placeholder="New password (optional)"
                          minLength={6}
                        />
                        <button
                          type="button"
                          className={styles.passwordToggleBtn}
                          onClick={() => setShowEditForumPassword((prev) => !prev)}
                          aria-label={showEditForumPassword ? 'Hide new password' : 'Show new password'}
                        >
                          {showEditForumPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Confirm New Password</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showEditForumConfirmPassword ? 'text' : 'password'}
                          className={styles.formInput}
                          value={editForumConfirmPassword}
                          onChange={(e) => setEditForumConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          minLength={6}
                        />
                        <button
                          type="button"
                          className={styles.passwordToggleBtn}
                          onClick={() => setShowEditForumConfirmPassword((prev) => !prev)}
                          aria-label={showEditForumConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          {showEditForumConfirmPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button type="submit" className={styles.formSubmitBtn} disabled={submitting}>
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className={styles.formCancelBtn}
                      onClick={() => setEditingForumUser(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Forum Users Table */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h2 className={styles.tableTitle}>
                  Registered Forum Users ({filteredForumUsers.length})
                </h2>
                <input
                  type="text"
                  placeholder="Search username, email, or IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.formInput}
                  style={{ maxWidth: '280px', padding: '7px 12px', fontSize: '13px' }}
                />
              </div>
              <div className={styles.tableWrapper}>
                {filteredForumUsers.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 0',
                      color: 'var(--color-gray-500)',
                    }}
                  >
                    {searchQuery
                      ? 'No forum users match your search.'
                      : 'No registered forum users yet.'}
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Status &amp; Last IP</th>
                        <th>Forum Activity</th>
                        <th>Joined</th>
                        <th style={{ width: '340px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredForumUsers.map((user) => {
                        const postsCount = user._count?.posts || 0;
                        const commentsCount = user._count?.comments || 0;
                        return (
                          <tr key={user.id}>
                            <td>#{user.id}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: 'var(--color-gray-900)' }}>
                                {user.username}
                              </span>
                            </td>
                            <td style={{ color: 'var(--color-gray-600)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span>{user.email}</span>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: '9999px',
                                    background:
                                      user.emailVerified !== false
                                        ? 'rgba(34, 197, 94, 0.12)'
                                        : 'rgba(245, 158, 11, 0.14)',
                                    color: user.emailVerified !== false ? '#15803d' : '#b45309',
                                  }}
                                >
                                  {user.emailVerified !== false ? 'Verified' : 'Unverified'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    width: 'fit-content',
                                    background: user.isBanned
                                      ? 'rgba(239, 68, 68, 0.14)'
                                      : 'rgba(34, 197, 94, 0.12)',
                                    color: user.isBanned ? '#dc2626' : '#15803d',
                                  }}
                                >
                                  {user.isBanned ? 'BANNED (Login & IP)' : 'Active'}
                                </span>
                                {user.lastIp && (
                                  <code style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>
                                    IP: {user.lastIp}
                                  </code>
                                )}
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  background: 'rgba(106, 11, 158, 0.08)',
                                  color: 'var(--color-primary)',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  display: 'inline-block',
                                }}
                              >
                                {postsCount} {postsCount === 1 ? 'Post' : 'Posts'} · {commentsCount}{' '}
                                {commentsCount === 1 ? 'Comment' : 'Comments'}
                              </span>
                            </td>
                            <td style={{ color: 'var(--color-gray-500)', fontSize: '12px' }}>
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              <div className={styles.tableActions}>
                                <button
                                  onClick={() => handleToggleBanForumUser(user)}
                                  className={styles.actionBtn}
                                  style={{
                                    background: user.isBanned ? '#16a34a' : '#dc2626',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                  }}
                                  title={
                                    user.isBanned
                                      ? 'Unban user account and IP'
                                      : 'Ban user from posting or commenting (blocks account & IP)'
                                  }
                                >
                                  {user.isBanned ? 'Unban' : 'Ban User'}
                                </button>
                                <button
                                  onClick={() => handleOpenEditForumUser(user)}
                                  className={`${styles.actionBtn} ${styles.editBtn}`}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteForumUser(user, false)}
                                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                  title="Delete user account"
                                >
                                  Delete
                                </button>
                                {(postsCount > 0 || commentsCount > 0) && (
                                  <button
                                    onClick={() => handleDeleteForumUser(user, true)}
                                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                    title="Delete user account and all their posts/comments"
                                  >
                                    Delete + Posts
                                  </button>
                                )}
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
          </>
        )}

        {/* ==================== BANNED USERS & IPS TAB ==================== */}
        {activeTab === 'bans' && (
          <div className={styles.formCard} style={{ maxWidth: '100%', marginBottom: '24px' }}>
            <h2 className={styles.tableTitle} style={{ marginBottom: '6px' }}>
              Ban IP Address or Manage Forum Bans
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '18px' }}>
              Banned users and IP addresses cannot create forum posts or post comments even when signed in.
            </p>

            <form onSubmit={handleManualBanIp} style={{ marginBottom: '24px' }}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>IP Address to Ban *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={manualBanIp}
                    onChange={(e) => setManualBanIp(e.target.value)}
                    placeholder="e.g. 203.0.113.45"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ban Reason (Optional)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={manualBanReason}
                    onChange={(e) => setManualBanReason(e.target.value)}
                    placeholder="Spamming referral links / abusive comments"
                  />
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.formSubmitBtn} disabled={submitting}>
                  {submitting ? 'Banning IP...' : '+ Ban IP Address'}
                </button>
              </div>
            </form>

            <div className={styles.tableWrapper}>
              {bannedIps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--color-gray-500)' }}>
                  No banned IP addresses currently recorded.
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>IP Address</th>
                      <th>Linked Forum User</th>
                      <th>Reason</th>
                      <th>Banned By</th>
                      <th>Date</th>
                      <th style={{ width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bannedIps.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <code style={{ fontWeight: 700, color: '#dc2626' }}>{entry.ipAddress}</code>
                        </td>
                        <td>{entry.username ? `@${entry.username}` : '—'}</td>
                        <td style={{ fontSize: '13px', color: 'var(--color-gray-600)' }}>
                          {entry.reason || '—'}
                        </td>
                        <td>{entry.bannedBy || 'admin'}</td>
                        <td style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleUnbanIp(entry)}
                            className={styles.actionBtn}
                            style={{ background: '#16a34a', color: '#ffffff', fontWeight: 700 }}
                          >
                            Unban IP
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ==================== ADMIN & MODERATOR ACCOUNTS TAB ==================== */}
        {activeTab === 'admin' && currentRole === 'admin' && (
          <>
            {/* Add Admin / Moderator Form */}
            {showAddAdminModal && (
              <div className={styles.formCard} style={{ marginBottom: '24px' }}>
                <h2 className={styles.tableTitle} style={{ marginBottom: '16px' }}>
                  Create New Admin or Moderator Account
                </h2>
                <form onSubmit={handleAddAdmin}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Username *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={newAdminUsername}
                        onChange={(e) => setNewAdminUsername(e.target.value)}
                        placeholder="e.g. mod_sarah"
                        required
                        minLength={3}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Role &amp; Permissions *</label>
                      <select
                        className={styles.formSelect}
                        value={newAdminRole}
                        onChange={(e) => setNewAdminRole(e.target.value as 'admin' | 'moderator')}
                      >
                        <option value="moderator">
                          Moderator (Freebies, Media, Forum Posts &amp; Forum Users)
                        </option>
                        <option value="admin">
                          Admin (Full Access — Settings, Staff, Categories, FAQ &amp; Logs)
                        </option>
                      </select>
                    </div>

                    <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                      <label className={styles.formLabel}>Email Address (optional)</label>
                      <input
                        type="email"
                        className={styles.formInput}
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="staff@digitalfreebies.io"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Password * (min 6 characters)</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showNewAdminPassword ? 'text' : 'password'}
                          className={styles.formInput}
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className={styles.passwordToggleBtn}
                          onClick={() => setShowNewAdminPassword((prev) => !prev)}
                          aria-label={showNewAdminPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewAdminPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Confirm Password *</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showConfirmAdminPassword ? 'text' : 'password'}
                          className={styles.formInput}
                          value={confirmAdminPassword}
                          onChange={(e) => setConfirmAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className={styles.passwordToggleBtn}
                          onClick={() => setShowConfirmAdminPassword((prev) => !prev)}
                          aria-label={showConfirmAdminPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          {showConfirmAdminPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button type="submit" className={styles.formSubmitBtn} disabled={submitting}>
                      {submitting
                        ? 'Creating...'
                        : `Create ${newAdminRole === 'moderator' ? 'Moderator' : 'Admin'}`}
                    </button>
                    <button
                      type="button"
                      className={styles.formCancelBtn}
                      onClick={() => setShowAddAdminModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Edit Admin / Moderator Form */}
            {editingAdmin && (
              <div
                className={styles.formCard}
                style={{ marginBottom: '24px', borderLeft: '4px solid var(--color-primary)' }}
              >
                <h2 className={styles.tableTitle} style={{ marginBottom: '16px' }}>
                  Edit Account:{' '}
                  <span style={{ color: 'var(--color-primary)' }}>{editingAdmin.username}</span>
                </h2>
                <form onSubmit={handleUpdateAdmin}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Username *</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={editAdminUsername}
                        onChange={(e) => setEditAdminUsername(e.target.value)}
                        required
                        minLength={3}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Role &amp; Permissions *</label>
                      <select
                        className={styles.formSelect}
                        value={editAdminRole}
                        onChange={(e) => setEditAdminRole(e.target.value as 'admin' | 'moderator')}
                      >
                        <option value="admin">
                          Admin (Full Access)
                        </option>
                        <option value="moderator">
                          Moderator (Freebies, Media, Forum Posts &amp; Forum Users)
                        </option>
                      </select>
                    </div>

                    <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                      <label className={styles.formLabel}>Email Address</label>
                      <input
                        type="email"
                        className={styles.formInput}
                        value={editAdminEmail}
                        onChange={(e) => setEditAdminEmail(e.target.value)}
                        placeholder="staff@digitalfreebies.io"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        New Password (leave blank to keep current)
                      </label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showEditAdminPassword ? 'text' : 'password'}
                          className={styles.formInput}
                          value={editAdminPassword}
                          onChange={(e) => setEditAdminPassword(e.target.value)}
                          placeholder="New password (optional)"
                          minLength={6}
                        />
                        <button
                          type="button"
                          className={styles.passwordToggleBtn}
                          onClick={() => setShowEditAdminPassword((prev) => !prev)}
                          aria-label={showEditAdminPassword ? 'Hide new password' : 'Show new password'}
                        >
                          {showEditAdminPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Confirm New Password</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showEditAdminConfirmPassword ? 'text' : 'password'}
                          className={styles.formInput}
                          value={editAdminConfirmPassword}
                          onChange={(e) => setEditAdminConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          minLength={6}
                        />
                        <button
                          type="button"
                          className={styles.passwordToggleBtn}
                          onClick={() => setShowEditAdminConfirmPassword((prev) => !prev)}
                          aria-label={showEditAdminConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          {showEditAdminConfirmPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button type="submit" className={styles.formSubmitBtn} disabled={submitting}>
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className={styles.formCancelBtn}
                      onClick={() => setEditingAdmin(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Admin & Moderator Accounts Table */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h2 className={styles.tableTitle}>
                  Admin &amp; Moderator Accounts ({adminUsers.length})
                </h2>
                <Link href="/df-admin77/profile" className={`${styles.actionBtn} ${styles.editBtn}`}>
                  Manage My Account &amp; 2FA
                </Link>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '70px' }}>ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role &amp; Access</th>
                      <th>2FA Security</th>
                      <th>Status</th>
                      <th style={{ width: '260px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((user) => {
                      const isCurrent = user.username === currentUsername;
                      const isMod = user.role === 'moderator';
                      return (
                        <tr key={user.id}>
                          <td>#{user.id}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--color-gray-900)' }}>
                                {user.username}
                              </span>
                              {isCurrent && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    background: 'var(--color-primary-10)',
                                    color: 'var(--color-primary)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ color: user.email ? 'var(--color-gray-700)' : 'var(--color-gray-400)', fontSize: '13px' }}>
                            {user.email || '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  background: isMod
                                    ? 'rgba(2, 132, 199, 0.12)'
                                    : 'rgba(106, 11, 158, 0.1)',
                                  color: isMod ? '#0369a1' : 'var(--color-primary)',
                                  padding: '4px 10px',
                                  borderRadius: '9999px',
                                  width: 'fit-content',
                                }}
                              >
                                {isMod ? 'Moderator' : 'Admin'}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>
                                {isMod
                                  ? 'Freebies, Media, Forum & Forum Users'
                                  : 'Full Dashboard Access'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                background: user.twoFactorEnabled
                                  ? 'rgba(34, 197, 94, 0.12)'
                                  : 'rgba(156, 163, 175, 0.15)',
                                color: user.twoFactorEnabled ? '#15803d' : 'var(--color-gray-600)',
                                display: 'inline-block',
                              }}
                            >
                              {user.twoFactorEnabled ? '2FA Enabled' : '2FA Off'}
                            </span>
                          </td>
                          <td>
                            <span className={styles.statusActive}>Active</span>
                          </td>
                          <td>
                            <div className={styles.tableActions}>
                              {isCurrent && (
                                <Link
                                  href="/df-admin77/profile"
                                  className={`${styles.actionBtn} ${styles.editBtn}`}
                                >
                                  My Account
                                </Link>
                              )}
                              <button
                                onClick={() => handleOpenEditAdmin(user)}
                                className={`${styles.actionBtn} ${styles.editBtn}`}
                              >
                                Edit / Role
                              </button>
                              {adminUsers.length > 1 && (
                                <button
                                  onClick={() => handleDeleteAdmin(user)}
                                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
