'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import adminStyles from '../admin.module.css';
import styles from './media.module.css';
import AdminNav from '@/components/AdminNav/AdminNav';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';

interface MediaFile {
  url: string;
  name: string;
  folder: string;
  size: number;
  createdAt: number;
}

const FOLDERS = ['assets', 'sliders', 'offers', 'brands', 'hero', 'banners'];

export default function MediaPage() {
  const { confirm, alert } = useDialog();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('offers');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.push('/df-admin77/login'); return; }
    fetchMedia();
  }, [router]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/media', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setFiles(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (path: string) => {
    if (!(await confirm(`Are you sure you want to delete this file?\n${path}\n\nWARNING: If this image is used in an active freebie/slide, it will break!`))) {
      return;
    }
    
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/api/media?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        fetchMedia();
      } else {
        const data = await res.json();
        await alert(data.error || 'Failed to delete');
      }
    } catch {
      await alert('Delete failed due to network error');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', selectedFolder);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (res.ok) {
        fetchMedia();
      } else {
        const data = await res.json().catch(() => ({}));
        await alert(data.error || 'Upload failed');
      }
    } catch {
      await alert('Upload failed due to network error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const groupedFiles = files.reduce((acc, file) => {
    if (!acc[file.folder]) acc[file.folder] = [];
    acc[file.folder].push(file);
    return acc;
  }, {} as Record<string, MediaFile[]>);

  return (
    <div className={adminStyles.adminLayout}>
      <AdminNav />

      <main className={adminStyles.adminMain}>
        <div className={adminStyles.tableHeader}>
          <div>
            <h1 className={adminStyles.pageTitle}>Media Library</h1>
            <p className={adminStyles.pageSubtitle}>Manage all uploaded images across the platform.</p>
          </div>
          <div className={styles.uploadControls}>
            <select 
              value={selectedFolder} 
              onChange={(e) => setSelectedFolder(e.target.value)}
              className={styles.folderSelect}
            >
              {FOLDERS.map(f => (
                <option key={f} value={f}>Upload to /{f}</option>
              ))}
            </select>
            <input type="file" ref={fileInputRef} className={styles.hiddenFile} onChange={handleFileChange} accept="image/*" />
            <button onClick={handleUploadClick} disabled={uploading} className={adminStyles.addBtn}>
              {uploading ? 'Uploading...' : '☁ Upload File'}
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading media...</p>
        ) : files.length === 0 ? (
          <p>No media files found.</p>
        ) : (
          <div className={styles.mediaContainer}>
            {Object.keys(groupedFiles).sort().map(folder => (
              <div key={folder} className={styles.folderSection}>
                <h2 className={styles.folderTitle}>/{folder} <span className={styles.folderCount}>({groupedFiles[folder].length} files)</span></h2>
                <div className={styles.mediaGrid}>
                  {groupedFiles[folder].map(file => (
                    <div key={file.url} className={styles.mediaCard}>
                      <div className={styles.mediaPreview}>
                        <Image src={file.url} alt={file.name} fill className={styles.mediaImg} unoptimized />
                      </div>
                      <div className={styles.mediaInfo}>
                        <p className={styles.mediaName} title={file.name}>{file.name}</p>
                        <p className={styles.mediaMeta}>{formatSize(file.size)}</p>
                      </div>
                      <button 
                        className={styles.deleteBtn} 
                        onClick={() => handleDelete(file.url)}
                        title="Delete file"
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
