'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../admin.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import {
  ALL_REGIONS,
  REGION_LABELS,
  offerMatchesRegion,
} from '@/lib/regions';

interface Offer {
  id: number;
  title: string;
  brand: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  category: string;
  specialCategory?: string;
  regions?: string;
  label: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isTrending?: boolean;
  trendingOrder?: number;
  isOnHomepage: boolean;
  sortOrder: number;
  slug: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    reports: number;
  };
}

type DateSortOption =
  | 'created_desc'
  | 'created_asc'
  | 'edited_desc'
  | 'edited_asc';

type DateFilterField = 'createdAt' | 'updatedAt';

type ColumnSortField = 'title' | 'date' | 'reports' | 'status';
type SortDirection = 'asc' | 'desc';

export default function AdminOffersPage() {
  const { confirm } = useDialog();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('Global');
  const [dateSort, setDateSort] = useState<DateSortOption>('created_desc');
  const [dateFilterField, setDateFilterField] = useState<DateFilterField>('createdAt');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<ColumnSortField>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const handleColumnSort = (field: ColumnSortField) => {
    if (sortField === field) {
      const nextDir: SortDirection = sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(nextDir);
      if (field === 'date') {
        const prefix = dateSort.startsWith('edited') ? 'edited' : 'created';
        setDateSort(`${prefix}_${nextDir}` as DateSortOption);
      }
    } else {
      const initialDir: SortDirection = field === 'reports' || field === 'date' ? 'desc' : 'asc';
      setSortField(field);
      setSortDir(initialDir);
      if (field === 'date') {
        const prefix = dateSort.startsWith('edited') ? 'edited' : 'created';
        setDateSort(`${prefix}_${initialDir}` as DateSortOption);
      }
    }
  };

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/df-admin77/login');
      return;
    }
    fetchOffers();
    fetchCategories();
  }, [router]);

  const fetchOffers = async () => {
    try {
      const res = await fetch('/api/offers?limit=500&all=true');
      const data = await res.json();
      setOffers(data.offers || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const std = data
            .filter((c: { type: string }) => c.type !== 'special')
            .map((c: { slug: string }) => c.slug);
          setCategories(std);
        }
      }
    } catch {
      // ignore
    }
  };

  // All unique categories present in offers + category table
  const availableCategories = useMemo(() => {
    const set = new Set<string>(categories);
    offers.forEach((o) => {
      if (o.category) set.add(o.category);
    });
    return Array.from(set);
  }, [categories, offers]);

  const toggleCategoryFilter = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('Are you sure you want to delete this freebie?'))) return;
    const token = localStorage.getItem('admin_token');
    try {
      await fetch(`/api/offers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers((prev) => prev.filter((o) => o.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    const token = localStorage.getItem('admin_token');
    try {
      await fetch(`/api/offers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setOffers((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, isActive: !isActive, updatedAt: new Date().toISOString() } : o
        )
      );
    } catch (error) {
      console.error('Error toggling:', error);
    }
  };

  const filteredAndSortedOffers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = offers.filter((offer) => {
      // 1. Search query match
      if (q) {
        const matchesSearch =
          offer.title.toLowerCase().includes(q) ||
          offer.brand.toLowerCase().includes(q) ||
          offer.category.toLowerCase().includes(q) ||
          (offer.specialCategory && offer.specialCategory.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // 2. Multi-category filter (1, 2, or more selected categories)
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(offer.category)) {
          return false;
        }
      }

      // 2b. Region filter
      if (selectedRegionFilter && selectedRegionFilter !== 'Global') {
        if (!offerMatchesRegion(offer.regions, selectedRegionFilter)) {
          return false;
        }
      }

      // 3. Date range filter (by Created Date or Last Edited Date)
      if (dateFrom || dateTo) {
        const targetDateIso =
          dateFilterField === 'updatedAt'
            ? offer.updatedAt || offer.createdAt
            : offer.createdAt;
        if (targetDateIso) {
          const dayStr = targetDateIso.slice(0, 10); // YYYY-MM-DD
          if (dateFrom && dayStr < dateFrom) return false;
          if (dateTo && dayStr > dateTo) return false;
        }
      }

      return true;
    });

    // 4. Sort by selected column & direction
    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;

      if (sortField === 'title') {
        return a.title.localeCompare(b.title) * dir;
      }
      if (sortField === 'reports') {
        const aRep = a._count?.reports || 0;
        const bRep = b._count?.reports || 0;
        return (aRep - bRep) * dir;
      }
      if (sortField === 'status') {
        const aVal = a.isActive ? 1 : 0;
        const bVal = b.isActive ? 1 : 0;
        return (aVal - bVal) * dir;
      }

      // Default: 'date'
      const aCreated = new Date(a.createdAt || 0).getTime();
      const bCreated = new Date(b.createdAt || 0).getTime();
      const aEdited = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bEdited = new Date(b.updatedAt || b.createdAt || 0).getTime();

      switch (dateSort) {
        case 'created_asc':
          return aCreated - bCreated;
        case 'edited_desc':
          return bEdited - aEdited;
        case 'edited_asc':
          return aEdited - bEdited;
        case 'created_desc':
        default:
          return bCreated - aCreated;
      }
    });
  }, [offers, searchQuery, selectedCategories, selectedRegionFilter, dateSort, dateFilterField, dateFrom, dateTo, sortField, sortDir]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategories.length > 0 ||
    selectedRegionFilter !== 'Global' ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    dateSort !== 'created_desc' ||
    sortField !== 'date';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedRegionFilter('Global');
    setDateSort('created_desc');
    setDateFilterField('createdAt');
    setDateFrom('');
    setDateTo('');
    setSortField('date');
    setSortDir('desc');
  };

  if (loading) {
    return (
      <div className={styles.adminLayout}>
        <AdminNav />
        <div className={styles.adminMain} style={{ textAlign: 'center', paddingTop: '100px' }}>
          <p>Loading freebies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <AdminNav />

      <main className={styles.adminMain}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h1 className={styles.pageTitle}>Manage Freebies</h1>
            <p className={styles.pageSubtitle} style={{ marginBottom: 0 }}>
              Search, filter by multiple categories or created/edited dates, and manage all digital freebies.
            </p>
          </div>
          <Link href="/df-admin77/offers/new" className={styles.addBtn}>
            + Add New Freebie
          </Link>
        </div>

        {/* Search & Filter Toolbar Above Table */}
        <div
          className={styles.formCard}
          style={{
            maxWidth: '100%',
            padding: '18px 20px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Row 1: Search Input + Date Sort + Date Range Filter */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '12px',
              alignItems: 'end',
            }}
          >
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Search Freebies</label>
              <input
                type="text"
                className={styles.formInput}
                style={{ padding: '9px 12px', fontSize: '14px' }}
                placeholder="Search by title, brand, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Sort By Date</label>
              <select
                className={styles.formSelect}
                style={{ padding: '9px 12px', fontSize: '14px' }}
                value={dateSort}
                onChange={(e) => {
                  const val = e.target.value as DateSortOption;
                  setDateSort(val);
                  setSortField('date');
                  setSortDir(val.endsWith('_asc') ? 'asc' : 'desc');
                }}
              >
                <option value="created_desc">Created Date (Newest First)</option>
                <option value="created_asc">Created Date (Oldest First)</option>
                <option value="edited_desc">Last Edited Date (Recently Edited)</option>
                <option value="edited_asc">Last Edited Date (Oldest Edited)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Filter Date Type</label>
              <select
                className={styles.formSelect}
                style={{ padding: '9px 12px', fontSize: '14px' }}
                value={dateFilterField}
                onChange={(e) => setDateFilterField(e.target.value as DateFilterField)}
              >
                <option value="createdAt">Created Date</option>
                <option value="updatedAt">Last Edited Date</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.formLabel}>From Date</label>
                <input
                  type="date"
                  className={styles.formInput}
                  style={{ padding: '8px 10px', fontSize: '13px' }}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.formLabel}>To Date</label>
                <input
                  type="date"
                  className={styles.formInput}
                  style={{ padding: '8px 10px', fontSize: '13px' }}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Multi-Category Filter Chips (Select 1, 2, or more categories) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span className={styles.formLabel} style={{ fontSize: '13px' }}>
                Filter by Categories (Select one, two, or more):
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  Reset All Filters
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSelectedCategories([])}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border:
                    selectedCategories.length === 0
                      ? '1.5px solid var(--color-primary)'
                      : '1px solid var(--color-gray-300)',
                  background:
                    selectedCategories.length === 0
                      ? 'var(--color-primary)'
                      : 'var(--color-white)',
                  color:
                    selectedCategories.length === 0
                      ? '#ffffff'
                      : 'var(--color-gray-700)',
                  transition: 'all 0.15s ease',
                }}
              >
                All Categories
              </button>

              {availableCategories.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategoryFilter(cat)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      border: isSelected
                        ? '1.5px solid var(--color-primary)'
                        : '1px solid var(--color-gray-300)',
                      background: isSelected
                        ? 'rgba(106, 11, 158, 0.1)'
                        : 'var(--color-gray-50)',
                      color: isSelected
                        ? 'var(--color-primary)'
                        : 'var(--color-gray-700)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected ? `✓ ${cat}` : cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Region Filter Chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className={styles.formLabel} style={{ fontSize: '13px' }}>
              Filter by Region:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ALL_REGIONS.map((region) => {
                const isSelected = selectedRegionFilter === region;
                const label = region === 'Global' ? 'All Regions' : REGION_LABELS[region] || region;
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setSelectedRegionFilter(region)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 700 : 600,
                      cursor: 'pointer',
                      border: isSelected
                        ? '1.5px solid var(--color-primary)'
                        : '1px solid var(--color-gray-300)',
                      background: isSelected
                        ? region === 'Global'
                          ? 'var(--color-primary)'
                          : 'rgba(106, 11, 158, 0.1)'
                        : 'var(--color-gray-50)',
                      color: isSelected
                        ? region === 'Global'
                          ? '#ffffff'
                          : 'var(--color-primary)'
                        : 'var(--color-gray-700)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected && region !== 'Global' ? `✓ ${label}` : label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Freebies Table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>
              {hasActiveFilters
                ? `Filtered Freebies (${filteredAndSortedOffers.length} of ${offers.length})`
                : `All Freebies (${offers.length})`}
            </h2>
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
                      { key: 'date', label: 'Added / Edited Date', sortable: true },
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
                {filteredAndSortedOffers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-gray-500)' }}
                    >
                      No freebies match your current search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedOffers.map((offer) => {
                    const reportCount = offer._count?.reports || 0;
                    const createdDateStr = offer.createdAt
                      ? new Date(offer.createdAt).toLocaleDateString()
                      : '—';
                    const updatedDateStr = offer.updatedAt
                      ? new Date(offer.updatedAt).toLocaleDateString()
                      : createdDateStr;
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
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-gray-800)' }}>
                              Added: {createdDateStr}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>
                              Edited: {updatedDateStr}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {reportCount > 0 ? (
                            <Link
                              href="/df-admin77/not-working"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                background: 'rgba(239, 68, 68, 0.12)',
                                color: '#dc2626',
                                fontWeight: 700,
                                fontSize: '12px',
                                padding: '3px 10px',
                                borderRadius: '9999px',
                                textDecoration: 'none',
                              }}
                            >
                              {reportCount}
                            </Link>
                          ) : (
                            <span style={{ color: 'var(--color-gray-400)', fontSize: '12px' }}>0</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={
                              offer.isActive ? styles.statusActive : styles.statusInactive
                            }
                          >
                            {offer.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.tableActions}>
                            <Link
                              href={`/${offer.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${styles.actionBtn} ${styles.editBtn}`}
                              title="View Freebie on Website"
                            >
                              View ↗
                            </Link>
                            <Link
                              href={`/df-admin77/offers/${offer.id}/edit`}
                              className={`${styles.actionBtn} ${styles.editBtn}`}
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleToggle(offer.id, offer.isActive)}
                              className={`${styles.actionBtn} ${styles.toggleBtn}`}
                            >
                              {offer.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(offer.id)}
                              className={`${styles.actionBtn} ${styles.deleteBtn}`}
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
    </div>
  );
}
