'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';
import styles from '../../../admin.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';
import AdminImageUpload from '@/components/AdminImageUpload/AdminImageUpload';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { parseOfferRegions } from '@/lib/regions';

const CATEGORIES = ['streaming', 'subscription', 'vpns', 'gaming', 'education', 'software', 'hardware', 'events'];
const SPECIAL_CATEGORIES = [
  'General Freebies',
  'Student Freebies',
  'Purchase Freebies',
  'Signups Freebies',
  'Trials Freebies',
  'Referrals Freebies',
];
const REGIONS = ['North America', 'Latin America', 'UK', 'Europe', 'Pacific Asia'];
const REGION_LABELS: Record<string, string> = {
  'North America': 'N. America',
  'Latin America': 'S. America',
  'UK': 'UK',
  'Europe': 'Europe',
  'Pacific Asia': 'Asia',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditOfferPage({ params }: PageProps) {
  const { id } = use(params);
  const { alert } = useDialog();
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [specialCategories, setSpecialCategories] = useState<string[]>(SPECIAL_CATEGORIES);
  const [form, setForm] = useState({
    title: '',
    brand: '',
    shortDescription: '',
    fullDescription: '',
    metaTitle: '',
    metaDescription: '',
    offerUrl: '',
    termsUrl: '',
    category: 'streaming',
    specialCategory: 'General Freebies',
    regions: [] as string[],
    label: '',
    isFeatured: false,
    isTrending: false,
    trendingOrder: 1,
    isActive: true,
    isOnHomepage: true,
    sortOrder: 0,
    imageUrl: '',
    logoUrl: '',
    expiresAt: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Gemini AI Auto-Fill states
  const [aiGenerating, setAiGenerating] = useState(false);
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [aiStatusMessage, setAiStatusMessage] = useState('');

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.push('/df-admin77/login'); return; }
    fetchOffer(token);

    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const std = data.filter((c: { type: string }) => c.type !== 'special').map((c: { slug: string }) => c.slug);
          const spc = data.filter((c: { type: string }) => c.type === 'special').map((c: { name: string }) => c.name);
          if (std.length > 0) setCategories(std);
          if (spc.length > 0) setSpecialCategories(spc);
        }
      })
      .catch(() => {});
  }, [id, router]);

  const runGeminiAutoFill = async (titleVal: string, urlVal: string) => {
    const cleanTitle = titleVal.trim();
    const cleanUrl = urlVal.trim();
    if (!cleanTitle && !cleanUrl) {
      setError('Please enter a Title or Freebie URL first to generate with Gemini AI.');
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setAiGenerating(true);
    setAiStatusMessage('Generating Brand, Descriptions and SEO with Gemini AI...');
    try {
      const res = await fetch('/api/admin/gemini-freebie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: cleanTitle,
          offerUrl: cleanUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate with Gemini AI');
        setAiStatusMessage('');
        return;
      }

      setForm((prev) => ({
        ...prev,
        brand: data.brand || prev.brand,
        shortDescription: data.shortDescription || prev.shortDescription,
        fullDescription: data.fullDescription || prev.fullDescription,
        metaTitle: data.metaTitle || prev.metaTitle,
        metaDescription: data.metaDescription || prev.metaDescription,
      }));

      if (
        data.suggestedTitle &&
        data.suggestedTitle.trim() &&
        data.suggestedTitle.trim().toLowerCase() !== cleanTitle.toLowerCase()
      ) {
        setSuggestedTitle(data.suggestedTitle.trim());
      }

      setAiStatusMessage(
        data.source === 'gemini'
          ? 'Auto-filled Brand, Short & Full Description, Meta Title, and Meta Description via Gemini AI.'
          : 'Auto-filled Brand, Descriptions and SEO Meta.'
      );
    } catch {
      setAiStatusMessage('');
    } finally {
      setAiGenerating(false);
    }
  };

  const fetchOffer = async (token: string) => {
    try {
      const res = await fetch(`/api/offers/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();

      const regions = parseOfferRegions(data.regions);

      setSlug(data.slug || '');
      setForm({
        title: data.title || '',
        brand: data.brand || '',
        shortDescription: data.shortDescription || '',
        fullDescription: data.fullDescription || '',
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        offerUrl: data.offerUrl || '',
        termsUrl: data.termsUrl || '',
        category: data.category || 'streaming',
        specialCategory: data.specialCategory || 'General Freebies',
        regions,
        label: data.label || '',
        isFeatured: data.isFeatured || false,
        isTrending: Boolean(data.isTrending),
        trendingOrder: data.trendingOrder ? Number(data.trendingOrder) : 1,
        isActive: data.isActive !== false,
        isOnHomepage: data.isOnHomepage !== false,
        sortOrder: data.sortOrder || 0,
        imageUrl: data.imageUrl || '',
        logoUrl: data.logoUrl || '',
        expiresAt: data.expiresAt ? data.expiresAt.split('T')[0] : '',
      });
    } catch (error) {
      console.error('Error fetching offer:', error);
      setError('Failed to load freebie');
    } finally {
      setFetching(false);
    }
  };

  const handleRegionToggle = (region: string) => {
    setForm((prev) => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter((r) => r !== region)
        : [...prev.regions, region],
    }));
  };

  const isGlobal = REGIONS.every(r => form.regions.includes(r));
  const handleGlobalToggle = () => {
    setForm(prev => ({
      ...prev,
      regions: isGlobal ? [] : [...REGIONS]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.regions.length === 0) {
      setError('Please select at least one region.');
      return;
    }
    setLoading(true);

    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`/api/offers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          label: form.label || null,
          expiresAt: form.expiresAt || null,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          await alert('Your session has expired. Please log in again.');
          router.push('/df-admin77/login');
          return;
        }
        const data = await res.json();
        setError(data.error || 'Failed to update freebie');
        return;
      }

      const updatedData = await res.json();
      if (updatedData?.slug) {
        setSlug(updatedData.slug);
      }
      setSuccess('Freebie updated successfully!');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className={styles.adminLayout}>
        <AdminNav />
        <div className={styles.adminMain} style={{ textAlign: 'center', paddingTop: '100px' }}>
          <p>Loading freebie...</p>
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
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '16px',
            maxWidth: '800px',
          }}
        >
          <div>
            <h1 className={styles.pageTitle}>Edit Freebie</h1>
            <p className={styles.pageSubtitle} style={{ marginBottom: 0 }}>
              Update freebie details.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {slug && (
              <Link
                href={`/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.addBtn}
              >
                View Freebie Page ↗
              </Link>
            )}
            {form.offerUrl && (
              <a
                href={form.offerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.actionBtn} ${styles.editBtn}`}
                style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 700 }}
              >
                Open Freebie Link ↗
              </a>
            )}
          </div>
        </div>

        <div className={styles.formCard}>
          {error && <div className={styles.errorMsg}>{error}</div>}
          {success && <div className={styles.successMsg}>{success}</div>}

          {/* Gemini AI Auto-Fill Button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '18px',
            }}
          >
            <button
              type="button"
              onClick={() => runGeminiAutoFill(form.title, form.offerUrl)}
              disabled={aiGenerating}
              className={styles.formSubmitBtn}
              style={{ padding: '9px 16px', fontSize: '13px' }}
            >
              {aiGenerating ? 'Generating...' : 'Generate with Gemini AI'}
            </button>

            {aiStatusMessage && (
              <div style={{ fontSize: '12.5px', color: 'var(--color-primary)', fontWeight: 600 }}>
                {aiStatusMessage}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Title *</label>
                <input type="text" className={styles.formInput} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />

                {suggestedTitle && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(106, 11, 158, 0.06)',
                      border: '1px solid rgba(106, 11, 158, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-primary)' }}>
                      Suggested Better Title:
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                      {suggestedTitle}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, title: suggestedTitle }));
                          setSuggestedTitle('');
                        }}
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        style={{
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuggestedTitle('')}
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 700 }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Brand *</label>
                <input type="text" className={styles.formInput} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
              </div>

              <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                <label className={styles.formLabel}>Short Description *</label>
                <input type="text" className={styles.formInput} value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} required />
              </div>

              <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                <label className={styles.formLabel}>Full Description</label>
                <textarea className={`${styles.formInput} ${styles.formTextarea}`} value={form.fullDescription} onChange={(e) => setForm({ ...form, fullDescription: e.target.value })} />
              </div>

              <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.formLabel}>Meta Title (SEO)</label>
                  <span style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>
                    {form.metaTitle.length} / 60 chars
                  </span>
                </div>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.metaTitle}
                  onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                  placeholder="Custom SEO meta title for search engines (defaults to Freebie Title if left blank)"
                />
              </div>

              <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.formLabel}>Meta Description (SEO)</label>
                  <span style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>
                    {form.metaDescription.length} / 160 chars
                  </span>
                </div>
                <textarea
                  className={styles.formInput}
                  rows={2}
                  value={form.metaDescription}
                  onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                  placeholder="Custom SEO meta description for search engines (defaults to Short Description if left blank)"
                />
              </div>

              <div className={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.formLabel}>Freebie URL *</label>
                  {form.offerUrl && (
                    <a
                      href={form.offerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '12px', fontWeight: 600, color: '#0066ff', textDecoration: 'none' }}
                    >
                      View Link ↗
                    </a>
                  )}
                </div>
                <input type="url" className={styles.formInput} value={form.offerUrl} onChange={(e) => setForm({ ...form, offerUrl: e.target.value })} required />
              </div>

              <div className={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.formLabel}>Terms for using with Freebie Link (Optional)</label>
                  {form.termsUrl && (
                    <a
                      href={form.termsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '12px', fontWeight: 600, color: '#0066ff', textDecoration: 'none' }}
                    >
                      View Link ↗
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  className={styles.formInput}
                  value={form.termsUrl}
                  onChange={(e) => setForm({ ...form, termsUrl: e.target.value })}
                  placeholder="https://... (Leave blank to hide terms link)"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category *</label>
                <select className={styles.formSelect} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {categories.map((cat) => (<option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Special Category *</label>
                <select className={styles.formSelect} value={form.specialCategory} onChange={(e) => setForm({ ...form, specialCategory: e.target.value })}>
                  {specialCategories.map((sc) => (<option key={sc} value={sc}>{sc}</option>))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Expires At</label>
                <input type="date" className={styles.formInput} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </div>

              <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                <label className={styles.formLabel}>Regions</label>
                <div className={styles.regionCheckboxes}>
                  <label className={styles.regionCheckbox} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    <input type="checkbox" checked={isGlobal} onChange={handleGlobalToggle} />
                    <span>Global (All)</span>
                  </label>
                  {REGIONS.map((region) => (
                    <label key={region} className={styles.regionCheckbox}>
                      <input type="checkbox" checked={form.regions.includes(region)} onChange={() => handleRegionToggle(region)} />
                      <span>{REGION_LABELS[region] || region}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                <AdminImageUpload
                  label="Image URL"
                  value={form.imageUrl}
                  onChange={(url) => setForm({ ...form, imageUrl: url })}
                  folder="offers"
                  placeholder="/images/offers/..."
                />
              </div>

              <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                <AdminImageUpload
                  label="Logo URL"
                  value={form.logoUrl}
                  onChange={(url) => setForm({ ...form, logoUrl: url })}
                  folder="brands"
                  placeholder="/images/brands/..."
                />
              </div>

              {/* Trending Offers Section Placement */}
              <div
                className={`${styles.formGroup} ${styles.formGridFull}`}
                style={{
                  background: 'rgba(106, 11, 158, 0.04)',
                  border: '1px solid rgba(106, 11, 158, 0.18)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div className={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="isTrending"
                    checked={form.isTrending}
                    onChange={(e) => setForm({ ...form, isTrending: e.target.checked })}
                  />
                  <label htmlFor="isTrending" className={styles.checkboxLabel} style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    Show in Trending Freebies (Homepage section above Latest Freebies — up to 12 freebies)
                  </label>
                </div>

                {form.isTrending && (
                  <div style={{ maxWidth: '280px' }}>
                    <label className={styles.formLabel}>
                      Trending Order Number (1 = First, 2 = Second, up to 12)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={form.trendingOrder}
                      onChange={(e) =>
                        setForm({ ...form, trendingOrder: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className={styles.formInput}
                    />
                  </div>
                )}
              </div>

              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="isFeatured" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                <label htmlFor="isFeatured" className={styles.checkboxLabel}>Featured (show in top banner slider)</label>
              </div>

              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <label htmlFor="isActive" className={styles.checkboxLabel}>Active (visible on site)</label>
              </div>

              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="isOnHomepage" checked={form.isOnHomepage} onChange={(e) => setForm({ ...form, isOnHomepage: e.target.checked })} />
                <label htmlFor="isOnHomepage" className={styles.checkboxLabel}>Show on Homepage (Latest Freebies)</label>
              </div>

              <div className={styles.formGroup} style={{ marginTop: '0.5rem' }}>
                <label className={styles.formLabel}>Sort Order (Latest Freebies)</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className={styles.formInput}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.formSubmitBtn} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              {slug && (
                <Link
                  href={`/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.addBtn}
                >
                  View Freebie ↗
                </Link>
              )}
              <Link href="/df-admin77/offers" className={styles.formCancelBtn}>Back to Freebies</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
