import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getAdminFromRequest } from '@/lib/auth';
import { logActivity } from '@/lib/audit';

const ALLOWED_FOLDERS = new Set([
  'assets',
  'sliders',
  'offers',
  'brands',
  'hero',
  'banners',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
]);

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    // 1. Require Admin or Moderator authentication
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.formData();
    const file = data.get('file') as unknown as File | null;
    const rawFolder = ((data.get('folder') as string) || 'assets').trim().toLowerCase();

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 2. Enforce strict folder whitelist (blocks path traversal)
    const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : 'assets';

    // 3. Enforce file size limit
    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size must be under 10 MB' },
        { status: 400 }
      );
    }

    // 4. Enforce extension and MIME type whitelist
    const sanitizedOriginal = path.basename(file.name).replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const dotIndex = sanitizedOriginal.lastIndexOf('.');
    if (dotIndex <= 0) {
      return NextResponse.json({ error: 'Invalid file name or extension' }, { status: 400 });
    }

    const ext = sanitizedOriginal.substring(dotIndex).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: PNG, JPG, GIF, WEBP, AVIF, ICO' },
        { status: 400 }
      );
    }

    if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid image MIME type' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const nameWithoutExt = sanitizedOriginal.substring(0, dotIndex).slice(0, 80);
    const finalFilename = `${nameWithoutExt}-${uniqueSuffix}${ext}`;

    const baseImagesDir = path.resolve(process.cwd(), 'public', 'images');
    const uploadDir = path.resolve(baseImagesDir, folder);

    if (!uploadDir.startsWith(baseImagesDir + path.sep)) {
      return NextResponse.json({ error: 'Invalid upload directory' }, { status: 400 });
    }

    await fs.mkdir(uploadDir, { recursive: true });

    const filepath = path.resolve(uploadDir, finalFilename);
    if (!filepath.startsWith(uploadDir + path.sep)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    await fs.writeFile(filepath, buffer);

    const imageUrl = `/images/${folder}/${finalFilename}`;

    await logActivity({
      actor: admin.username,
      actorRole: admin.role || 'admin',
      action: 'MEDIA_UPLOADED',
      category: 'media',
      summary: `Uploaded "${finalFilename}" to /images/${folder}`,
      request,
    });

    return NextResponse.json({ url: imageUrl, success: true });
  } catch (e: unknown) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
