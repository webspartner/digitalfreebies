'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import styles from './AdminImageUpload.module.css';

interface MediaFile {
  url: string;
  name: string;
  folder: string;
  size: number;
  createdAt: number;
}

interface AdminImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: 'sliders' | 'offers' | 'brands' | 'assets' | 'hero' | 'banners';
  label: string;
  placeholder?: string;
}

const FOLDERS = ['all', 'offers', 'brands', 'assets', 'sliders', 'hero', 'banners'] as const;

export default function AdminImageUpload({ value, onChange, folder, label, placeholder }: AdminImageUploadProps) {
  const { alert } = useDialog();
  const [uploading, setUploading] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string>(folder);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const handleOpenMediaModal = async (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMediaModal(true);
    setLoadingMedia(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/media', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data: MediaFile[] = await res.json();
        setMediaFiles(data);
        const hasInDefaultFolder = data.some((f) => f.folder === folder);
        setActiveFolder(hasInDefaultFolder ? folder : 'all');
      }
    } catch {
      // ignore
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        onChange(data.url);
      } else {
        await alert(data.error || 'Upload failed');
      }
    } catch {
      await alert('Network error during upload');
    } finally {
      setUploading(false);
      // Reset input so the same file can be chosen again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredMedia = mediaFiles.filter((file) => {
    const matchesFolder = activeFolder === 'all' || file.folder === activeFolder;
    const matchesSearch =
      !searchQuery.trim() ||
      file.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      file.url.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesFolder && matchesSearch;
  });

  return (
    <div className={styles.uploadGroup}>
      <label className={styles.uploadLabel}>{label}</label>
      <div className={styles.inputRow}>
        <input
          type="text"
          className={styles.urlInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `/images/${folder}/...`}
        />
        <button
          type="button"
          className={styles.mediaBtn}
          onClick={handleOpenMediaModal}
        >
          Choose from Media
        </button>
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={handleUploadClick}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className={styles.hiddenFile}
          onChange={handleFileChange}
          accept="image/*"
        />
      </div>
      {value && (
        <div className={styles.previewBox}>
          <Image src={value} alt="Preview" fill className={styles.previewImg} sizes="160px" unoptimized />
        </div>
      )}

      {showMediaModal && (
        <div className={styles.modalOverlay} onClick={() => setShowMediaModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Select Image from Media Library</h3>
                <p className={styles.modalSubtitle}>Click any image below to use it for {label}.</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowMediaModal(false)}
                aria-label="Close Media Library"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalToolbar}>
              <div className={styles.folderTabs}>
                {FOLDERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`${styles.folderTab} ${activeFolder === f ? styles.folderTabActive : ''}`}
                    onClick={() => setActiveFolder(f)}
                  >
                    {f === 'all' ? 'All Folders' : `/${f}`}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search filename..."
              />
            </div>

            <div className={styles.modalBody}>
              {loadingMedia ? (
                <div className={styles.emptyState}>Loading media library...</div>
              ) : filteredMedia.length === 0 ? (
                <div className={styles.emptyState}>
                  No images found in {activeFolder === 'all' ? 'media library' : `/${activeFolder}`}.
                </div>
              ) : (
                <div className={styles.mediaGrid}>
                  {filteredMedia.map((file) => {
                    const isSelected = value === file.url;
                    return (
                      <button
                        key={file.url}
                        type="button"
                        className={`${styles.mediaItem} ${isSelected ? styles.mediaItemSelected : ''}`}
                        onClick={() => {
                          onChange(file.url);
                          setShowMediaModal(false);
                        }}
                        title={file.url}
                      >
                        <div className={styles.mediaThumb}>
                          <Image
                            src={file.url}
                            alt={file.name}
                            fill
                            className={styles.mediaThumbImg}
                            sizes="140px"
                            unoptimized
                          />
                        </div>
                        <div className={styles.mediaItemInfo}>
                          <span className={styles.mediaItemName}>{file.name}</span>
                          <span className={styles.mediaItemFolder}>/{file.folder}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
