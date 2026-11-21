'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../admin.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
}

export default function AdminFaqPage() {
  const { confirm } = useDialog();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ question: '', answer: '', sortOrder: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.push('/df-admin77/login'); return; }
    fetchFaq();
  }, [router]);

  const fetchFaq = async () => {
    try {
      const res = await fetch('/api/faq');
      const data = await res.json();
      setItems(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch('/api/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) { setError('Failed to add FAQ item'); return; }
      setForm({ question: '', answer: '', sortOrder: 0 });
      setShowAdd(false);
      fetchFaq();
    } catch { setError('Network error'); }
  };

  const handleUpdate = async (id: number) => {
    const token = localStorage.getItem('admin_token');
    const item = items.find((i) => i.id === id);
    if (!item) return;
    try {
      await fetch(`/api/faq/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ question: item.question, answer: item.answer, sortOrder: item.sortOrder }),
      });
      setEditing(null);
    } catch (err) { console.error('Error:', err); }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('Delete this FAQ item?'))) return;
    const token = localStorage.getItem('admin_token');
    try {
      await fetch(`/api/faq/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setItems(items.filter((i) => i.id !== id));
    } catch (err) { console.error('Error:', err); }
  };

  if (loading) {
    return (
      <div className={styles.adminLayout}>
        <AdminNav />
        <div className={styles.adminMain} style={{ textAlign: 'center', paddingTop: '100px' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <AdminNav />

      <main className={styles.adminMain}>
        <h1 className={styles.pageTitle}>Manage FAQ</h1>
        <p className={styles.pageSubtitle}>Add, edit, and reorder frequently asked questions.</p>

        {/* Add new form */}
        {showAdd ? (
          <div className={styles.formCard} style={{ marginBottom: '24px' }}>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <form onSubmit={handleAdd}>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.formLabel}>Question *</label>
                  <input type="text" className={styles.formInput} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required />
                </div>
                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.formLabel}>Answer *</label>
                  <textarea className={`${styles.formInput} ${styles.formTextarea}`} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Sort Order</label>
                  <input type="number" className={styles.formInput} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.formSubmitBtn}>Add FAQ Item</button>
                <button type="button" className={styles.formCancelBtn} onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        ) : null}

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>FAQ Items ({items.length})</h2>
            <button className={styles.addBtn} onClick={() => setShowAdd(!showAdd)}>+ Add FAQ</button>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Order</th>
                  <th>Question</th>
                  <th>Answer</th>
                  <th style={{ width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {editing === item.id ? (
                        <input type="number" className={styles.formInput} style={{ width: '60px' }} value={item.sortOrder}
                          onChange={(e) => setItems(items.map((i) => i.id === item.id ? { ...i, sortOrder: parseInt(e.target.value) || 0 } : i))} />
                      ) : item.sortOrder}
                    </td>
                    <td>
                      {editing === item.id ? (
                        <input type="text" className={styles.formInput} value={item.question}
                          onChange={(e) => setItems(items.map((i) => i.id === item.id ? { ...i, question: e.target.value } : i))} />
                      ) : item.question}
                    </td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {editing === item.id ? (
                        <textarea className={`${styles.formInput} ${styles.formTextarea}`} value={item.answer} style={{ minHeight: '60px' }}
                          onChange={(e) => setItems(items.map((i) => i.id === item.id ? { ...i, answer: e.target.value } : i))} />
                      ) : item.answer}
                    </td>
                    <td>
                      <div className={styles.tableActions}>
                        {editing === item.id ? (
                          <>
                            <button onClick={() => handleUpdate(item.id)} className={`${styles.actionBtn} ${styles.toggleBtn}`}>Save</button>
                            <button onClick={() => setEditing(null)} className={`${styles.actionBtn} ${styles.editBtn}`}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditing(item.id)} className={`${styles.actionBtn} ${styles.editBtn}`}>Edit</button>
                            <button onClick={() => handleDelete(item.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`}>Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
