import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import prisma from '@/lib/prisma';
import {
  getAdminFromRequest,
  isFullAdmin,
  verifyPasswordTimingSafe,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/auth';
import { verifyTotpToken } from '@/lib/totp';
import { logActivity } from '@/lib/audit';

const execFileAsync = promisify(execFile);

const MAX_BACKUP_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isFullAdmin(admin)) {
      return NextResponse.json(
        { error: 'Forbidden: Full Admin access required to download backups' },
        { status: 403 }
      );
    }

    const ip = getClientIp(request);
    const rateKey = `admin_backup:${ip}:${admin.id}`;
    const rateCheck = checkRateLimit(rateKey, MAX_BACKUP_ATTEMPTS, WINDOW_MS);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed verification attempts. Try again in ${Math.ceil(
            rateCheck.retryAfterSeconds / 60
          )} minutes.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { adminPassword, totpCode, backupType = 'full' } = body;

    if (!adminPassword || typeof adminPassword !== 'string') {
      return NextResponse.json(
        { error: 'Your current admin password is required to download a backup' },
        { status: 400 }
      );
    }

    if (!totpCode || typeof totpCode !== 'string' || !totpCode.trim()) {
      return NextResponse.json(
        { error: 'Your 6-digit 2FA authenticator code is required to download a backup' },
        { status: 400 }
      );
    }

    const actingAdmin = await prisma.admin.findUnique({ where: { id: admin.id } });
    if (!actingAdmin) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    // 1. Verify Admin Password (constant-time)
    const passwordValid = verifyPasswordTimingSafe(adminPassword, actingAdmin.passwordHash);
    if (!passwordValid) {
      recordFailedAttempt(rateKey, MAX_BACKUP_ATTEMPTS, WINDOW_MS, LOCKOUT_MS);
      await logActivity({
        actor: actingAdmin.username,
        actorRole: 'admin',
        action: 'BACKUP_AUTH_FAILED',
        category: 'security',
        summary: `Failed password check during backup download attempt by "${actingAdmin.username}"`,
        request,
      });
      return NextResponse.json(
        { error: 'Incorrect admin password' },
        { status: 401 }
      );
    }

    // 2. Enforce 2FA Enabled & Verify 6-Digit TOTP Code
    if (!actingAdmin.twoFactorEnabled || !actingAdmin.twoFactorSecret) {
      return NextResponse.json(
        {
          error:
            'Two-Factor Authentication (2FA) is not enabled on your account yet. Please enable 2FA in My Profile (/df-admin77/profile) before downloading backups.',
          requires2FASetup: true,
        },
        { status: 403 }
      );
    }

    const totpValid = verifyTotpToken(totpCode.trim(), actingAdmin.twoFactorSecret);
    if (!totpValid) {
      recordFailedAttempt(rateKey, MAX_BACKUP_ATTEMPTS, WINDOW_MS, LOCKOUT_MS);
      await logActivity({
        actor: actingAdmin.username,
        actorRole: 'admin',
        action: 'BACKUP_2FA_FAILED',
        category: 'security',
        summary: `Invalid 2FA code entered during backup download attempt by "${actingAdmin.username}"`,
        request,
      });
      return NextResponse.json(
        { error: 'Invalid 6-digit 2FA authenticator code' },
        { status: 401 }
      );
    }

    clearFailedAttempts(rateKey);

    const cwd = process.cwd();
    const dateStamp = new Date().toISOString().slice(0, 10);

    // Flush WAL/pending writes before copying SQLite file
    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE);');
    } catch {
      // ignore if not in WAL mode
    }

    if (backupType === 'database') {
      const dbPath = path.resolve(cwd, 'prisma', 'dev.db');
      const dbBuffer = await fs.readFile(dbPath);
      const filename = `digitalfreebies-db-${dateStamp}.sqlite`;

      await logActivity({
        actor: actingAdmin.username,
        actorRole: 'admin',
        action: 'BACKUP_DOWNLOADED',
        category: 'security',
        summary: `Admin "${actingAdmin.username}" downloaded SQLite database backup (${filename}) with Password + 2FA`,
        request,
      });

      return new NextResponse(new Uint8Array(dbBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Full backup (.tar.gz) containing prisma/dev.db, prisma/technical-settings.json, and public/images
    const tmpArchivePath = path.join(
      os.tmpdir(),
      `df-backup-${Date.now()}-${Math.round(Math.random() * 1e6)}.tar.gz`
    );

    const targets: string[] = [];
    for (const relPath of [
      'prisma/dev.db',
      'prisma/technical-settings.json',
      'prisma/newsletter-data.json',
      'prisma/traffic-stats.json',
      'public/images',
    ]) {
      try {
        await fs.access(path.resolve(cwd, relPath));
        targets.push(relPath);
      } catch {
        // skip if optional file doesn't exist
      }
    }

    await execFileAsync('tar', ['-czf', tmpArchivePath, ...targets], { cwd });
    const archiveBuffer = await fs.readFile(tmpArchivePath);
    await fs.unlink(tmpArchivePath).catch(() => {});

    const filename = `digitalfreebies-full-backup-${dateStamp}.tar.gz`;

    await logActivity({
      actor: actingAdmin.username,
      actorRole: 'admin',
      action: 'BACKUP_DOWNLOADED',
      category: 'security',
      summary: `Admin "${actingAdmin.username}" downloaded full backup archive (${filename}) with Password + 2FA`,
      request,
    });

    return new NextResponse(new Uint8Array(archiveBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error creating backup download:', error);
    return NextResponse.json(
      { error: 'Failed to generate backup archive' },
      { status: 500 }
    );
  }
}
