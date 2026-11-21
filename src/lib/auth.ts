import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const globalForAuth = globalThis as unknown as { fallbackJwtSecret?: string };
if (!process.env.JWT_SECRET && !globalForAuth.fallbackJwtSecret) {
  console.warn('[Security Warning] JWT_SECRET is not set in environment; generated ephemeral runtime secret.');
  globalForAuth.fallbackJwtSecret = crypto.randomBytes(32).toString('hex');
}

const BASE_SECRET =
  process.env.JWT_SECRET || globalForAuth.fallbackJwtSecret!;

// Cryptographic domain-separated secrets so Forum tokens and Admin tokens can never be confused
const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET ||
  crypto.createHmac('sha256', BASE_SECRET).update('digitalfreebies:admin:v2').digest('hex');

const FORUM_JWT_SECRET =
  process.env.FORUM_JWT_SECRET ||
  crypto.createHmac('sha256', BASE_SECRET).update('digitalfreebies:forum:v2').digest('hex');

const BCRYPT_ROUNDS = 12;
const MAX_PASSWORD_BYTES = 72;

// Precomputed dummy hash used when a user/admin record is not found to prevent timing enumeration
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-timing-protection-secret-key', BCRYPT_ROUNDS);

export interface AuthUserPayload {
  id: number;
  username: string;
  email?: string;
  role?: 'admin' | 'moderator' | 'user';
}

export function hashPassword(password: string): string {
  const safePassword = password.slice(0, MAX_PASSWORD_BYTES);
  return bcrypt.hashSync(safePassword, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!password || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return false;
  }
  return bcrypt.compareSync(password, hash);
}

/**
 * Constant-time password verification that always executes bcrypt comparison
 * even when the user account does not exist, preventing username/email enumeration via timing attacks.
 */
export function verifyPasswordTimingSafe(
  password: string,
  hash: string | null | undefined
): boolean {
  if (!password || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    bcrypt.compareSync('invalid', DUMMY_PASSWORD_HASH);
    return false;
  }
  const targetHash = hash || DUMMY_PASSWORD_HASH;
  const isValid = bcrypt.compareSync(password, targetHash);
  return Boolean(hash && isValid);
}

/**
 * Generate an Admin / Moderator JWT (strictly scoped to admin dashboard APIs).
 */
export function generateAdminToken(payload: {
  id: number;
  username: string;
  role?: 'admin' | 'moderator' | string;
  rememberMe?: boolean;
}): string {
  const normalizedRole = payload.role === 'moderator' ? 'moderator' : 'admin';
  return jwt.sign(
    {
      id: payload.id,
      username: payload.username,
      role: normalizedRole,
    },
    ADMIN_JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: payload.rememberMe ? '30d' : '12h',
      issuer: 'digitalfreebies',
      audience: 'digitalfreebies:admin',
      jwtid: crypto.randomUUID(),
    }
  );
}

/**
 * Generate a Forum User JWT (strictly scoped to community forum APIs).
 */
export function generateForumToken(payload: {
  id: number;
  username: string;
  email?: string;
  rememberMe?: boolean;
}): string {
  return jwt.sign(
    {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      role: 'user',
    },
    FORUM_JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: payload.rememberMe ? '30d' : '24h',
      issuer: 'digitalfreebies',
      audience: 'digitalfreebies:forum',
      jwtid: crypto.randomUUID(),
    }
  );
}

export const generateUserToken = generateForumToken;

/**
 * Legacy helper routed by role (defaults to forum user if email is present, otherwise admin).
 */
export function generateToken(payload: AuthUserPayload): string {
  if (
    payload.role === 'admin' ||
    payload.role === 'moderator' ||
    (!payload.email && payload.role !== 'user')
  ) {
    return generateAdminToken({
      id: payload.id,
      username: payload.username,
      role: payload.role,
    });
  }
  return generateForumToken({
    id: payload.id,
    username: payload.username,
    email: payload.email,
  });
}

/**
 * Verify an Admin or Moderator token. Rejects any forum user token or tampered token.
 */
export function verifyToken(token: string): AuthUserPayload | null {
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'digitalfreebies',
      audience: 'digitalfreebies:admin',
    }) as AuthUserPayload;

    if (
      !decoded ||
      (decoded.role !== 'admin' && decoded.role !== 'moderator') ||
      typeof decoded.id !== 'number'
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function isFullAdmin(user: AuthUserPayload | null | undefined): boolean {
  return Boolean(user && user.role === 'admin');
}

/**
 * Verify a Forum User token.
 */
export function verifyForumToken(token: string): AuthUserPayload | null {
  try {
    const decoded = jwt.verify(token, FORUM_JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'digitalfreebies',
      audience: 'digitalfreebies:forum',
    }) as AuthUserPayload;

    if (!decoded || decoded.role !== 'user' || typeof decoded.id !== 'number') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract and verify an Admin user from either Authorization Bearer header or HttpOnly admin_token cookie.
 */
export function getAdminFromRequest(request: NextRequest): AuthUserPayload | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const verified = verifyToken(token);
    if (verified) return verified;
  }

  const cookieToken = request.cookies.get('admin_token')?.value;
  if (cookieToken) {
    const verified = verifyToken(cookieToken);
    if (verified) return verified;
  }

  return null;
}

/**
 * Extract and verify a Forum user from either HttpOnly forum_token cookie or Authorization Bearer header.
 */
export function getUserFromRequest(request: NextRequest): AuthUserPayload | null {
  const cookieToken = request.cookies.get('forum_token')?.value;
  if (cookieToken) {
    const verified = verifyForumToken(cookieToken);
    if (verified) return verified;
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const verified = verifyForumToken(token);
    if (verified) return verified;
  }

  return null;
}

// ============================================================================
// Brute-Force & Rate Limiting Protection (In-Memory Sliding Window + Lockout)
// ============================================================================

interface RateLimitEntry {
  attempts: number[];
  lockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; retryAfterSeconds: number; remainingAttempts: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0, remainingAttempts: maxAttempts };
  }

  if (entry.lockedUntil && entry.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds, remainingAttempts: 0 };
  }

  // Filter attempts within the active sliding window
  const recentAttempts = entry.attempts.filter((ts) => now - ts < windowMs);
  entry.attempts = recentAttempts;
  entry.lockedUntil = null;

  if (recentAttempts.length >= maxAttempts) {
    entry.lockedUntil = now + windowMs;
    rateLimitStore.set(key, entry);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      remainingAttempts: 0,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, maxAttempts - recentAttempts.length),
  };
}

export function recordFailedAttempt(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  lockoutMs = 15 * 60 * 1000
): { locked: boolean; retryAfterSeconds: number; remainingAttempts: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { attempts: [], lockedUntil: null };

  entry.attempts = entry.attempts.filter((ts) => now - ts < windowMs);
  entry.attempts.push(now);

  if (entry.attempts.length >= maxAttempts) {
    entry.lockedUntil = now + lockoutMs;
    rateLimitStore.set(key, entry);
    return {
      locked: true,
      retryAfterSeconds: Math.ceil(lockoutMs / 1000),
      remainingAttempts: 0,
    };
  }

  rateLimitStore.set(key, entry);
  return {
    locked: false,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, maxAttempts - entry.attempts.length),
  };
}

export function clearFailedAttempts(key: string): void {
  rateLimitStore.delete(key);
}
