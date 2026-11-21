import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a cryptographically secure 20-byte (160-bit) secret encoded in Base32 (RFC 4648).
 */
export function generateTotpSecret(byteLength = 20): string {
  const buffer = crypto.randomBytes(byteLength);
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decode a Base32 string into a Buffer.
 */
function decodeBase32(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a 6-digit HOTP/TOTP code for a given 30-second counter step (RFC 4226 / RFC 6238).
 */
function generateHotp(secretBase32: string, counter: number): string {
  const key = decodeBase32(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1_000_000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify a 6-digit TOTP token with ±1 step (30s) clock-skew tolerance and timing-safe comparison.
 */
export function verifyTotpToken(token: string, secretBase32: string, windowSteps = 1): boolean {
  const cleanToken = (token || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken) || !secretBase32) {
    return false;
  }

  const currentCounter = Math.floor(Date.now() / 1000 / 30);

  for (let step = -windowSteps; step <= windowSteps; step++) {
    const candidate = generateHotp(secretBase32, currentCounter + step);
    const a = Buffer.from(cleanToken, 'utf8');
    const b = Buffer.from(candidate, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  }

  return false;
}

/**
 * Build standard otpauth:// URI for authenticator apps (Google Authenticator, Authy, 1Password, etc.).
 */
export function buildOtpAuthUri(
  username: string,
  secretBase32: string,
  issuer = 'DigitalFreebies.io'
): string {
  const label = encodeURIComponent(`${issuer}:${username}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
