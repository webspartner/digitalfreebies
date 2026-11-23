'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import adminStyles from '../admin.module.css';
import styles from './categories.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  type: string;
  metaTitle: string | null;
  metaDescription: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCategoriesPage() {
  const { confirm, alert } = useDialog();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'standard' | 'special'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    icon: '',
    type: 'standard',
    metaTitle: '',
    metaDescription: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Lightweight Drag & Drop state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [reorderState, setReorderState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/df-admin77/login');
      return;
    }
    fetchCategories();
  }, [router]);

  const clearFrontendCategoryCache = () => {
    try {
      sessionStorage.removeItem('df_categories_cache_v1');
    } catch {
      // ignore
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCategories(data || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const persistNewOrder = async (nextCategories: Category[]) => {
    const token = localStorage.getItem('admin_token');

    setReorderState('saving');
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderedIds: nextCategories.map((c) => c.id),
        }),
      });
      if (res.ok) {
        clearFrontendCategoryCache();
        setReorderState('saved');
        setTimeout(() => setReorderState('idle'), 1800);
      } else {
        const errData = await res.json().catch(() => ({}));
        setReorderState('idle');
        await alert(errData.error || 'Failed to save new category order. Please sign in again.');
        fetchCategories();
      }
    } catch {
      setReorderState('idle');
      await alert('Network error while saving category order.');
      fetchCategories();
    }
  };

  const handleMoveCategory = (id: number, direction: 'up' | 'down') => {
    const visibleIds = filteredCategories.map((c) => c.id);
    const fromVisibleIdx = visibleIds.indexOf(id);
    const toVisibleIdx = direction === 'up' ? fromVisibleIdx - 1 : fromVisibleIdx + 1;
    if (fromVisibleIdx === -1 || toVisibleIdx < 0 || toVisibleIdx >= visibleIds.length) return;

    const reorderedVisibleIds = [...visibleIds];
    const [movedId] = reorderedVisibleIds.splice(fromVisibleIdx, 1);
    reorderedVisibleIds.splice(toVisibleIdx, 0, movedId);

    const catById = new Map(categories.map((c) => [c.id, c]));
    let visiblePointer = 0;
    const nextCategories = categories.map((cat) => {
      if (visibleIds.includes(cat.id)) {
        const nextId = reorderedVisibleIds[visiblePointer++];
        return catById.get(nextId)!;
      }
      return cat;
    });

    setCategories(nextCategories);
    persistNewOrder(nextCategories);
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, targetId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (targetId !== dragOverId) {
      setDragOverId(targetId);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetId: number) => {
    e.preventDefault();
    const sourceId = draggedId ?? Number(e.dataTransfer.getData('text/plain'));
    setDraggedId(null);
    setDragOverId(null);

    if (!sourceId || sourceId === targetId) return;

    // Reorder within the currently visible subset while preserving relative positions in full list
    const visibleIds = filteredCategories.map((c) => c.id);
    const fromVisibleIdx = visibleIds.indexOf(sourceId);
    const toVisibleIdx = visibleIds.indexOf(targetId);
    if (fromVisibleIdx === -1 || toVisibleIdx === -1) return;

    const reorderedVisibleIds = [...visibleIds];
    const [movedId] = reorderedVisibleIds.splice(fromVisibleIdx, 1);
    reorderedVisibleIds.splice(toVisibleIdx, 0, movedId);

    const catById = new Map(categories.map((c) => [c.id, c]));
    let visiblePointer = 0;
    const nextCategories = categories.map((cat) => {
      if (visibleIds.includes(cat.id)) {
        const nextId = reorderedVisibleIds[visiblePointer++];
        return catById.get(nextId)!;
      }
      return cat;
    });

    setCategories(nextCategories);
    persistNewOrder(nextCategories);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const openAddModal = (defaultType: 'standard' | 'special' = 'standard') => {
    setEditingCat(null);
    setForm({
      name: '',
      slug: '',
      icon: '',
      type: defaultType,
      metaTitle: '',
      metaDescription: '',
    });
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCat(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || '',
      type: cat.type || 'standard',
      metaTitle: cat.metaTitle || '',
      metaDescription: cat.metaDescription || '',
    });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCat(null);
    setError('');
  };

  const handleNameChange = (nameVal: string) => {
    if (!editingCat) {
      const autoSlug = nameVal
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setForm((prev) => ({ ...prev, name: nameVal, slug: autoSlug }));
    } else {
      setForm((prev) => ({ ...prev, name: nameVal }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError('');
    const token = localStorage.getItem('admin_token');

    try {
      const url = editingCat ? `/api/categories/${editingCat.id}` : '/api/categories';
      const method = editingCat ? 'PUT' : 'POST';

      const payload = editingCat
        ? { ...form, sortOrder: editingCat.sortOrder }
        : { ...form, sortOrder: categories.length + 1 };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save category');
        return;
      }

      clearFrontendCategoryCache();
      closeModal();
      fetchCategories();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (
      !(await confirm(
        `Are you sure you want to delete category "${name}"? Freebies using this category will remain, but the category page will be removed.`
      ))
    ) {
      return;
    }

    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        await alert('Failed to delete category');
        return;
      }

      clearFrontendCategoryCache();
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error deleting category:', err);
      await alert('Error deleting category');
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (activeTab === 'standard') return c.type === 'standard';
    if (activeTab === 'special') return c.type === 'special';
    return true;
  });

  const standardCount = categories.filter((c) => c.type === 'standard').length;
  const specialCount = categories.filter((c) => c.type === 'special').length;

  if (loading) {
    return (
      <div className={adminStyles.adminLayout}>
        <AdminNav />
        <div className={adminStyles.adminMain} style={{ textAlign: 'center', paddingTop: '100px' }}>
          <p>Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={adminStyles.adminLayout}>
      <AdminNav />

      <main className={adminStyles.adminMain}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1 className={adminStyles.pageTitle}>Categories &amp; Special Categories</h1>
            <p className={adminStyles.pageSubtitle}>
              Drag and drop categories to change their order on the site.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => openAddModal('standard')} className={adminStyles.addBtn}>
              + Add Standard Category
            </button>
            <button onClick={() => openAddModal('special')} className={adminStyles.addBtn}>
              + Add Special Category
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className={styles.tabBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Categories ({categories.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'standard' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('standard')}
          >
            Standard Categories ({standardCount}) — Outside Bar
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'special' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('special')}
          >
            Special Categories ({specialCount}) — Burger Menu
          </button>
        </div>

        {/* Categories Table */}
        <div className={adminStyles.tableCard}>
          <div className={adminStyles.tableHeader}>
            <h2 className={adminStyles.tableTitle}>
              {activeTab === 'all' && 'All Categories'}
              {activeTab === 'standard' && 'Standard Categories (Sliding Navigation)'}
              {activeTab === 'special' && 'Special Categories (Menu Burger)'} (
              {filteredCategories.length})
            </h2>
            <span
              className={`${styles.reorderStatus} ${
                reorderState === 'saved' ? styles.reorderSaved : ''
              }`}
            >
              {reorderState === 'saving'
                ? 'Saving new order...'
                : reorderState === 'saved'
                ? '✓ Category order saved'
                : '⋮⋮ Drag & drop rows to reorder'}
            </span>
          </div>

          <div className={adminStyles.tableWrapper}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }} title="Drag to reorder">
                    ⋮⋮
                  </th>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Location / Type</th>
                  <th>SEO Metadata</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#9e9e9e' }}>
                      No categories found in this section.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat, idx) => {
                    const isDragging = draggedId === cat.id;
                    const isDragOver = dragOverId === cat.id && draggedId !== cat.id;
                    return (
                      <tr
                        key={cat.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, cat.id)}
                        onDragOver={(e) => handleDragOver(e, cat.id)}
                        onDrop={(e) => handleDrop(e, cat.id)}
                        onDragEnd={handleDragEnd}
                        className={`${styles.draggableRow} ${
                          isDragging ? styles.draggingRow : ''
                        } ${isDragOver ? styles.dragOverRow : ''}`}
                      >
                        <td className={styles.dragHandleCell} title="Drag or use arrows to reorder">
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span className={styles.dragHandle} aria-hidden="true">
                              ⋮⋮
                            </span>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '1px' }}>
                              <button
                                type="button"
                                onClick={() => handleMoveCategory(cat.id, 'up')}
                                disabled={idx === 0}
                                title="Move up"
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  padding: '0 2px',
                                  fontSize: '10px',
                                  lineHeight: 1,
                                  cursor: idx === 0 ? 'default' : 'pointer',
                                  opacity: idx === 0 ? 0.25 : 0.75,
                                  color: 'var(--color-gray-700)',
                                }}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveCategory(cat.id, 'down')}
                                disabled={idx === filteredCategories.length - 1}
                                title="Move down"
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  padding: '0 2px',
                                  fontSize: '10px',
                                  lineHeight: 1,
                                  cursor: idx === filteredCategories.length - 1 ? 'default' : 'pointer',
                                  opacity: idx === filteredCategories.length - 1 ? 0.25 : 0.75,
                                  color: 'var(--color-gray-700)',
                                }}
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--color-gray-900)' }}>
                          <Link
                            href={`/category/${cat.slug}`}
                            target="_blank"
                            style={{ color: 'inherit', textDecoration: 'none' }}
                            title="Preview category page"
                          >
                            {cat.name}
                          </Link>
                        </td>
                        <td>
                          <code
                            style={{
                              fontSize: '12px',
                              background: '#f5f5f5',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            /category/{cat.slug}
                          </code>
                        </td>
                        <td>
                          <span
                            className={`${styles.typeBadge} ${
                              cat.type === 'special' ? styles.typeSpecial : styles.typeStandard
                            }`}
                          >
                            {cat.type === 'special' ? 'Special (Burger)' : 'Standard (Bar)'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.metaPreview}>
                            <div
                              className={styles.metaTitleText}
                              title={cat.metaTitle || 'Default title'}
                            >
                              {cat.metaTitle || <em style={{ color: '#aaa' }}>Default Title</em>}
                            </div>
                            <div
                              className={styles.metaDescText}
                              title={cat.metaDescription || 'Default description'}
                            >
                              {cat.metaDescription || (
                                <em style={{ color: '#aaa' }}>Default description</em>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={adminStyles.tableActions}>
                            <button
                              onClick={() => openEditModal(cat)}
                              className={`${adminStyles.actionBtn} ${adminStyles.editBtn}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id, cat.name)}
                              className={`${adminStyles.actionBtn} ${adminStyles.deleteBtn}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingCat ? `Edit Category: ${editingCat.name}` : 'Create New Category'}
              </h2>
              <button type="button" className={styles.modalCloseBtn} onClick={closeModal}>
                ×
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleSave}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div className={adminStyles.formGrid}>
                <div className={adminStyles.formGroup}>
                  <label className={adminStyles.formLabel}>Name *</label>
                  <input
                    type="text"
                    className={adminStyles.formInput}
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Student Freebies"
                    required
                  />
                </div>

                <div className={adminStyles.formGroup}>
                  <label className={adminStyles.formLabel}>URL Slug *</label>
                  <input
                    type="text"
                    className={adminStyles.formInput}
                    value={form.slug}
                    onChange={(e) =>
                      setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })
                    }
                    placeholder="e.g. student-freebies"
                    required
                  />
                </div>
              </div>

              <div className={adminStyles.formGroup}>
                <label className={adminStyles.formLabel}>Category Type *</label>
                <select
                  className={adminStyles.formSelect}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="standard">
                    Standard Category (Appears in Outside Horizontal Bar)
                  </option>
                  <option value="special">
                    Special Category (Appears in Menu Burger &amp; On Cards)
                  </option>
                </select>
              </div>

              <div
                style={{
                  borderTop: '1px solid #e0e0e0',
                  paddingTop: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                  SEO &amp; Meta Settings
                </h3>

                <div className={adminStyles.formGroup}>
                  <label className={adminStyles.formLabel}>Meta Title</label>
                  <input
                    type="text"
                    className={adminStyles.formInput}
                    value={form.metaTitle}
                    onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                    placeholder="e.g. Free Student Offers, Discounts & Deals — DigitalFreebies.io"
                  />
                  <span className={styles.metaHelp}>
                    The title displayed on Google search results and browser tabs.
                  </span>
                </div>

                <div className={adminStyles.formGroup}>
                  <label className={adminStyles.formLabel}>Meta Description</label>
                  <textarea
                    className={`${adminStyles.formInput} ${adminStyles.formTextarea}`}
                    rows={3}
                    value={form.metaDescription}
                    onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                    placeholder="e.g. Discover the best verified student discounts, free subscriptions, and tools..."
                  />
                  <span className={styles.metaHelp}>
                    The summary snippet shown on search engines and social shares.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  className={adminStyles.formCancelBtn}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className={adminStyles.formSubmitBtn} disabled={saving}>
                  {saving ? 'Saving...' : editingCat ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
