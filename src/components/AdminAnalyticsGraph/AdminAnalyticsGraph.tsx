'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';

interface DailyPoint {
  date: string;
  label: string;
  users: number;
  pageViews: number;
  sessions: number;
}

interface AnalyticsResponse {
  configured: boolean;
  source?: 'ga4' | 'local';
  measurementId: string;
  propertyId: string;
  hasServiceAccount: boolean;
  clientEmail?: string;
  apiError?: string;
  points: DailyPoint[];
  totals: {
    users: number;
    pageViews: number;
    sessions: number;
  };
}

export default function AdminAnalyticsGraph() {
  const { confirm } = useDialog();
  const [days, setDays] = useState<7 | 14 | 30>(14);
  const [metric, setMetric] = useState<'users' | 'pageViews' | 'sessions'>('users');
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Config form fields
  const [measurementId, setMeasurementId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAnalytics = useCallback(async (selectedDays: number) => {
    const token = localStorage.getItem('admin_token');
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${selectedDays}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json: AnalyticsResponse = await res.json();
        setData(json);
        setMeasurementId(json.measurementId || '');
        setPropertyId(json.propertyId || '');
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(days);
  }, [days, fetchAnalytics]);

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setServiceAccountJson(reader.result);
        setFormError('');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSaving(true);

    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch('/api/admin/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          measurementId,
          propertyId,
          serviceAccountJson,
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        setFormError(resData.error || 'Failed to save settings');
        return;
      }
      setFormSuccess('Google Analytics settings saved!');
      setServiceAccountJson('');
      setShowConfigForm(false);
      fetchAnalytics(days);
    } catch {
      setFormError('Network error while saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!(await confirm('Disconnect Google Analytics from the dashboard?'))) return;
    const token = localStorage.getItem('admin_token');
    try {
      await fetch('/api/admin/analytics', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setServiceAccountJson('');
      setShowConfigForm(false);
      fetchAnalytics(days);
    } catch {
      // ignore
    }
  };

  const isAttached = Boolean(data?.configured);
  const points = data?.points || [];

  // SVG chart geometry
  const width = 820;
  const height = 220;
  const padLeft = 42;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const values = points.map((p) => p[metric]);
  const maxVal = Math.max(...values, 10);

  const getX = (i: number) =>
    points.length <= 1
      ? padLeft + plotW / 2
      : padLeft + (i / (points.length - 1)) * plotW;

  const getY = (val: number) => padTop + plotH - (val / maxVal) * plotH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p[metric]).toFixed(1)}`)
    .join(' ');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${getX(points.length - 1).toFixed(1)} ${(padTop + plotH).toFixed(
          1
        )} L ${getX(0).toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

  const metricLabel =
    metric === 'users'
      ? 'Active Visitors'
      : metric === 'pageViews'
      ? 'Pageviews'
      : 'Sessions';

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--color-gray-200, #e5e7eb)',
        borderRadius: '12px',
        padding: '22px 24px',
        marginBottom: '28px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(249, 171, 0, 0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Google Analytics Bar Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="13" width="4" height="7" rx="2" fill="#F9AB00" />
              <rect x="10" y="9" width="4" height="11" rx="2" fill="#F9AB00" />
              <rect x="16" y="4" width="4" height="16" rx="2" fill="#E37400" />
            </svg>
          </div>
          <div>
            <h2
              style={{
                fontSize: '17px',
                fontWeight: 800,
                color: 'var(--color-gray-900)',
                margin: 0,
              }}
            >
              Google Analytics Traffic
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', margin: 0 }}>
              {isAttached && data?.propertyId && data?.hasServiceAccount
                ? `Connected${data?.measurementId ? ` • ${data.measurementId}` : ''} (GA4 Property #${data.propertyId})`
                : isAttached
                ? `GA4 Tag Active (${data?.measurementId}) • Live Site Traffic Graph`
                : 'Not attached yet — Connect your Google Analytics 4 credentials below'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isAttached && !showConfigForm && (
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--color-gray-100)',
                borderRadius: '8px',
                padding: '3px',
                gap: '2px',
              }}
            >
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  style={{
                    border: 'none',
                    background: days === d ? '#ffffff' : 'transparent',
                    color: days === d ? 'var(--color-primary)' : 'var(--color-gray-600)',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: days === d ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {d}D
                </button>
              ))}
            </div>
          )}

          {isAttached && (
            <button
              type="button"
              onClick={() => setShowConfigForm((prev) => !prev)}
              style={{
                border: '1px solid var(--color-gray-300)',
                background: '#ffffff',
                color: 'var(--color-gray-800)',
                fontWeight: 600,
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {showConfigForm ? 'Close Settings' : '⚙ Configure GA4'}
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && !data ? (
        <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--color-gray-500)', fontSize: '14px' }}>
          Loading Google Analytics...
        </div>
      ) : !isAttached || showConfigForm ? (
        /* Unattached / Configuration Form State */
        <div
          style={{
            background: 'linear-gradient(180deg, #faf7fd 0%, #ffffff 100%)',
            border: '1px dashed rgba(106, 11, 158, 0.3)',
            borderRadius: '10px',
            padding: '20px',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-gray-900)', margin: '0 0 4px' }}>
              {isAttached ? 'Update Google Analytics (GA4) Credentials' : 'Attach Google Analytics (GA4)'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-gray-600)', margin: 0, lineHeight: 1.5 }}>
              Enter your <strong>GA4 Measurement ID</strong> to automatically track visitors on your website, and your{' '}
              <strong>GA4 Property ID + Service Account JSON Key</strong> to display the live visitor graph here.
            </p>
          </div>

          {formError && (
            <div
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '14px',
              }}
            >
              {formError}
            </div>
          )}

          {formSuccess && (
            <div
              style={{
                background: '#dcfce7',
                color: '#166534',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '14px',
              }}
            >
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px', color: 'var(--color-gray-800)' }}>
                  GA4 Measurement ID (Website Tracking Tag)
                </label>
                <input
                  type="text"
                  value={measurementId}
                  onChange={(e) => setMeasurementId(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '7px',
                    border: '1px solid var(--color-gray-300)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px', color: 'var(--color-gray-800)' }}>
                  GA4 Property ID (For Dashboard Graph)
                </label>
                <input
                  type="text"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  placeholder="e.g. 412345678"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '7px',
                    border: '1px solid var(--color-gray-300)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', flexWrap: 'wrap', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-gray-800)' }}>
                  Google Service Account JSON Token / Key {data?.hasServiceAccount ? '(Already saved — leave blank to keep current)' : ''}
                </label>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'rgba(106, 11, 158, 0.08)',
                      color: 'var(--color-primary)',
                      border: '1px solid rgba(106, 11, 158, 0.25)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Upload .json Key File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleJsonFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
              <textarea
                rows={4}
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
                placeholder='Paste your Google Cloud Service Account JSON here: {"type": "service_account", "client_email": "...", "private_key": "..."}'
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid var(--color-gray-300)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                Tip: In Google Cloud Console → enable <strong>Google Analytics Data API</strong>, create a Service Account JSON key, and add its <code>client_email</code> as a <strong>Viewer</strong> in GA4 Admin → Property Access Management.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '9px 22px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Connecting...' : 'Save & Connect Analytics'}
              </button>

              {isAttached && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  style={{
                    background: '#ffffff',
                    color: '#dc2626',
                    border: '1px solid rgba(220, 38, 38, 0.35)',
                    borderRadius: '9999px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        /* Connected Graph View */
        <>
          {data?.apiError && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <strong>GA4 API Notice:</strong> {data.apiError}
                {data.clientEmail && (
                  <div style={{ marginTop: '3px', fontSize: '11.5px' }}>
                    Make sure <code>{data.clientEmail}</code> has <strong>Viewer</strong> access in GA4 Property Access Management.
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowConfigForm(true)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #d97706',
                  color: '#92400e',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Edit Credentials
              </button>
            </div>
          )}

          {/* Metric Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            {(
              [
                { key: 'users', label: 'Active Visitors', total: data?.totals.users || 0 },
                { key: 'pageViews', label: 'Pageviews', total: data?.totals.pageViews || 0 },
                { key: 'sessions', label: 'Sessions', total: data?.totals.sessions || 0 },
              ] as const
            ).map((item) => {
              const active = metric === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMetric(item.key)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--color-gray-200)',
                    background: active ? 'rgba(106, 11, 158, 0.04)' : '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {item.label} ({days}d)
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: active ? 'var(--color-primary)' : 'var(--color-gray-900)', marginTop: '2px' }}>
                    {item.total.toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive SVG Area/Line Graph */}
          <div style={{ position: 'relative', width: '100%' }}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <defs>
                <linearGradient id="gaAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6a0b9e" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#6a0b9e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = padTop + plotH * ratio;
                const val = Math.round(maxVal * (1 - ratio));
                return (
                  <g key={idx}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={width - padRight}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="#94a3b8"
                      fontWeight="600"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Area and Line */}
              {areaPath && <path d={areaPath} fill="url(#gaAreaGrad)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#6a0b9e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points & Hover Targets */}
              {points.map((p, i) => {
                const cx = getX(i);
                const cy = getY(p[metric]);
                const isHovered = hoverIdx === i;
                const showDateLabel =
                  points.length <= 14 || i % Math.ceil(points.length / 8) === 0 || i === points.length - 1;

                return (
                  <g key={p.date}>
                    {showDateLabel && (
                      <text
                        x={cx}
                        y={height - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                        fontWeight="600"
                      >
                        {p.label}
                      </text>
                    )}

                    {isHovered && (
                      <line
                        x1={cx}
                        y1={padTop}
                        x2={cx}
                        y2={padTop + plotH}
                        stroke="rgba(106, 11, 158, 0.3)"
                        strokeDasharray="3 3"
                      />
                    )}

                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 5.5 : 3.5}
                      fill="#ffffff"
                      stroke="#6a0b9e"
                      strokeWidth={isHovered ? 3 : 2}
                    />

                    {/* Invisible wider hover column */}
                    <rect
                      x={cx - plotW / Math.max(points.length, 1) / 2}
                      y={padTop}
                      width={plotW / Math.max(points.length, 1)}
                      height={plotH}
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoverIdx(i)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoverIdx !== null && points[hoverIdx] && (
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '16px',
                  background: '#1e1b4b',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.16)',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ color: '#c4b5fd', fontSize: '11px', marginBottom: '2px' }}>
                  {points[hoverIdx].label} ({points[hoverIdx].date})
                </div>
                <div>
                  {metricLabel}: <strong>{points[hoverIdx][metric].toLocaleString()}</strong>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
