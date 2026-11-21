import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getAdminFromRequest } from '@/lib/auth';
import { logActivity } from '@/lib/audit';

const ALLOWED_FOLDERS = ['assets', 'sliders', 'offers', 'brands', 'hero', 'banners'] as const;

export async function GET(request: NextRequest) {
  try {
    // Require Admin or Moderator authentication
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawFolder = searchParams.get('folder')?.trim().toLowerCase();

    const baseDir = path.resolve(process.cwd(), 'public', 'images');
    const results: {
      url: string;
      name: string;
      folder: string;
      size: number;
      createdAt: number;
    }[] = [];

    const readDirRecursively = async (dirPath: string, relativeFolder: string) => {
      try {
        const resolvedDir = path.resolve(dirPath);
        if (!resolvedDir.startsWith(baseDir + path.sep) && resolvedDir !== baseDir) {
          return;
        }
        const entries = await fs.readdir(resolvedDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            await readDirRecursively(
              path.join(resolvedDir, entry.name),
              `${relativeFolder}/${entry.name}`
            );
          } else if (entry.isFile() && /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(entry.name)) {
            const stat = await fs.stat(path.join(resolvedDir, entry.name));
            results.push({
              url: `/images/${relativeFolder === '' ? '' : relativeFolder + '/'}${entry.name}`.replace(
                /\/\//g,
                '/'
              ),
              name: entry.name,
              folder: relativeFolder || 'root',
              size: stat.size,
              createdAt: stat.birthtimeMs,
            });
          }
        }
      } catch {
        // Directory might not exist yet, ignore
      }
    };

    if (rawFolder && ALLOWED_FOLDERS.includes(rawFolder as (typeof ALLOWED_FOLDERS)[number])) {
      await readDirRecursively(path.join(baseDir, rawFolder), rawFolder);
    } else {
      for (const f of ALLOWED_FOLDERS) {
        await readDirRecursively(path.join(baseDir, f), f);
      }
    }

    results.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Require Admin or Moderator authentication
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filepathParam = searchParams.get('path');

    if (!filepathParam) {
      return NextResponse.json({ error: 'Path required' }, { status: 400 });
    }

    if (filepathParam.includes('..') || !filepathParam.startsWith('/images/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const baseImagesDir = path.resolve(process.cwd(), 'public', 'images');
    const relativePath = filepathParam.replace(/^\/images\//, '');
    const absolutePath = path.resolve(baseImagesDir, relativePath);

    if (!absolutePath.startsWith(baseImagesDir + path.sep)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    await fs.unlink(absolutePath);

    await logActivity({
      actor: admin.username,
      actorRole: admin.role || 'admin',
      action: 'MEDIA_DELETED',
      category: 'media',
      summary: `Deleted media file "${filepathParam}"`,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error('Delete error:', e);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
