import nodemailer from 'nodemailer';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export interface ActiveSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  requireEmailVerification: boolean;
  configured: boolean;
}

/**
 * Generates a cryptographically random 6-digit code and its SHA-256 hash.
 */
export function generateSixDigitCode(): { code: string; codeHash: string } {
  const num = crypto.randomInt(100000, 1000000);
  const code = String(num);
  const codeHash = hashEmailCode(code);
  return { code, codeHash };
}

/**
 * Hashes a verification or reset code using SHA-256.
 */
export function hashEmailCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code.trim())
    .digest('hex');
}

/**
 * Constant-time comparison between a user-supplied code and stored SHA-256 hash.
 */
export function verifyEmailCodeConstantTime(
  inputCode: string,
  storedHash: string | null | undefined
): boolean {
  if (!inputCode || !storedHash) return false;
  const candidateHash = hashEmailCode(inputCode);
  try {
    const bufA = Buffer.from(candidateHash, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Resolves the active SMTP configuration from the database (SmtpSettings)
 * with fallback to environment variables in .env.
 * Pre-configured for Amazon SES (email-smtp.<region>.amazonaws.com).
 */
export async function getActiveSmtpConfig(): Promise<ActiveSmtpConfig> {
  const envHost = (process.env.SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com').trim();
  const envPort = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
  const envSecure =
    process.env.SMTP_SECURE === 'true' || envPort === 465 || envPort === 2465;
  const envUsername = (process.env.SMTP_USER || '').trim();
  const envPassword = process.env.SMTP_PASS || '';
  const envFromName = (process.env.SMTP_FROM_NAME || 'DigitalFreebies.io').trim();
  const envFromEmail = (
    process.env.SMTP_FROM_EMAIL ||
    (envUsername.includes('@') ? envUsername : '') ||
    'noreply@digitalfreebies.io'
  ).trim();

  try {
    const dbConfig = await prisma.smtpSettings.findUnique({ where: { id: 1 } });
    if (dbConfig) {
      const host = dbConfig.host.trim() || envHost;
      const port = dbConfig.port || envPort;
      const secure =
        port === 465 || port === 2465 ? true : port === 587 || port === 2587 ? false : dbConfig.secure;
      const username = dbConfig.username.trim() || envUsername;
      const password = dbConfig.password || envPassword;
      const fromName = dbConfig.fromName.trim() || envFromName || 'DigitalFreebies.io';
      // In Amazon SES, username is an IAM SMTP key (e.g. AKIA...), not an email address
      const rawFromEmail = dbConfig.fromEmail.trim();
      const fromEmail =
        (rawFromEmail.includes('@') ? rawFromEmail : '') ||
        (username.includes('@') ? username : '') ||
        envFromEmail ||
        'noreply@digitalfreebies.io';

      return {
        host,
        port,
        secure,
        username,
        password,
        fromName,
        fromEmail,
        requireEmailVerification: dbConfig.requireEmailVerification,
        configured: Boolean(host && username && password && fromEmail.includes('@')),
      };
    }
  } catch {
    // Fallback to env if DB not reachable
  }

  const configured = Boolean(envHost && envUsername && envPassword && envFromEmail.includes('@'));

  return {
    host: envHost,
    port: envPort,
    secure: envSecure,
    username: envUsername,
    password: envPassword,
    fromName: envFromName,
    fromEmail: envFromEmail,
    requireEmailVerification: true,
    configured,
  };
}

/**
 * Sends an email via Nodemailer SMTP (configured for Amazon SES & standard SMTP).
 * If SMTP credentials are not yet configured, logs the email details safely to the server console
 * and returns { sent: false, smtpConfigured: false }.
 */
export async function sendSmtpEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ sent: boolean; smtpConfigured: boolean; error?: string }> {
  const config = await getActiveSmtpConfig();

  if (!config.configured) {
    console.info(
      `[SMTP Pending Configuration] Email queued/logged for <${options.to}> | Subject: "${options.subject}"\n${options.text}`
    );
    return { sent: false, smtpConfigured: false };
  }

  try {
    const isImplicitTls = config.secure || config.port === 465 || config.port === 2465;
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: isImplicitTls,
      // Amazon SES on port 587 / 2587 requires STARTTLS upgrade
      requireTLS: !isImplicitTls,
      tls: {
        minVersion: 'TLSv1.2',
      },
      auth: {
        user: config.username,
        pass: config.password,
      },
    });

    await transporter.sendMail({
      from: `"${config.fromName.replace(/"/g, '')}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return { sent: true, smtpConfigured: true };
  } catch (err) {
    console.error('SMTP sendMail error:', err);
    return {
      sent: false,
      smtpConfigured: true,
      error: err instanceof Error ? err.message : 'SMTP delivery failed',
    };
  }
}

/**
 * Sends a registration confirmation & verification email with a 6-digit code and confirmation link.
 */
export async function sendRegistrationVerificationEmail(params: {
  toEmail: string;
  username: string;
  code: string;
  origin: string;
}) {
  const verifyLink = `${params.origin}/forum/verify-email?email=${encodeURIComponent(
    params.toEmail
  )}&code=${encodeURIComponent(params.code)}`;

  const subject = `Confirm your DigitalFreebies.io registration (Code: ${params.code})`;
  const text = `Welcome to DigitalFreebies.io, @${params.username}!\n\nThank you for registering! To confirm your registration and activate your community account, enter this 6-digit confirmation code:\n\n${params.code}\n\nOr click the link below to confirm your email address immediately:\n${verifyLink}\n\nThis code expires in 24 hours. If you did not create this account, you can safely ignore this email.`;

  const html = `
    <div style="font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #560981 0%, #6a0b9e 100%); padding: 24px 32px; color: #ffffff;">
        <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">DigitalFreebies.io</div>
        <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Registration Confirmation &amp; Email Verification</div>
      </div>
      <div style="padding: 32px; color: #1f2937; line-height: 1.6;">
        <h2 style="margin: 0 0 12px; font-size: 20px; color: #111827;">Confirm Your Registration, @${params.username}!</h2>
        <p style="margin: 0 0 20px; font-size: 14px; color: #4b5563;">
          Thank you for registering on <strong>DigitalFreebies.io</strong>. Please confirm your email address using the 6-digit confirmation code below to activate your account:
        </p>
        <div style="background: #faf5ff; border: 1.5px dashed #6a0b9e; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6a0b9e; margin-bottom: 6px;">Registration Confirmation Code</div>
          <div style="font-size: 30px; font-weight: 800; letter-spacing: 8px; color: #111827; font-family: monospace;">${params.code}</div>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${verifyLink}" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #560981 0%, #6a0b9e 100%); border-radius: 9999px; text-decoration: none;">
            Confirm Registration &amp; Verify Email
          </a>
        </div>
        <p style="margin: 0; font-size: 12px; color: #6b7280;">
          This confirmation code is valid for 24 hours. If you did not sign up for DigitalFreebies.io, you can safely disregard this message.
        </p>
      </div>
    </div>
  `;

  return sendSmtpEmail({
    to: params.toEmail,
    subject,
    text,
    html,
  });
}

/**
 * Sends a registration confirmed welcome email once the user's account is activated.
 */
export async function sendRegistrationConfirmedEmail(params: {
  toEmail: string;
  username: string;
  origin: string;
}) {
  const forumLink = `${params.origin}/forum`;
  const subject = `Registration Confirmed — Welcome to DigitalFreebies.io, @${params.username}!`;
  const text = `Hi @${params.username},\n\nYour DigitalFreebies.io registration is confirmed and your community account is now active!\n\nYou can now share digital freebies, upvote deals, and join discussions in the community forum:\n${forumLink}\n\nThank you for joining DigitalFreebies.io!`;

  const html = `
    <div style="font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #560981 0%, #6a0b9e 100%); padding: 24px 32px; color: #ffffff;">
        <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">DigitalFreebies.io</div>
        <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Registration Confirmed</div>
      </div>
      <div style="padding: 32px; color: #1f2937; line-height: 1.6;">
        <h2 style="margin: 0 0 12px; font-size: 20px; color: #111827;">Your Account is Active, @${params.username}! 🎉</h2>
        <p style="margin: 0 0 18px; font-size: 14px; color: #4b5563;">
          Your registration on <strong>DigitalFreebies.io</strong> has been confirmed. You now have full access to our Community Deal &amp; Freebies Forum:
        </p>
        <ul style="margin: 0 0 24px; padding-left: 20px; font-size: 14px; color: #374151; line-height: 1.7;">
          <li>Share free trials, digital giveaways, and promo codes</li>
          <li>Upvote the best community deals</li>
          <li>Comment and discuss offers with other members</li>
        </ul>
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${forumLink}" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #560981 0%, #6a0b9e 100%); border-radius: 9999px; text-decoration: none;">
            Explore Community Forum →
          </a>
        </div>
        <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
          Welcome aboard! — The DigitalFreebies.io Team
        </p>
      </div>
    </div>
  `;

  return sendSmtpEmail({
    to: params.toEmail,
    subject,
    text,
    html,
  });
}

/**
 * Sends a Forgot Password reset email with a 6-digit code and reset link (valid for 15 minutes).
 */
export async function sendPasswordResetEmail(params: {
  toEmail: string;
  username: string;
  code: string;
  origin: string;
}) {
  const resetLink = `${params.origin}/forum/reset-password?email=${encodeURIComponent(
    params.toEmail
  )}&code=${encodeURIComponent(params.code)}`;

  const subject = `Reset your DigitalFreebies.io password (Code: ${params.code})`;
  const text = `Hello @${params.username},\n\nWe received a request to reset the password for your DigitalFreebies.io community account.\n\nYour 6-digit password reset code is: ${params.code}\n\nOr click the link below to set a new password:\n${resetLink}\n\nThis code expires in 15 minutes. If you did not request a password reset, no changes have been made to your account.`;

  const html = `
    <div style="font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #560981 0%, #6a0b9e 100%); padding: 24px 32px; color: #ffffff;">
        <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.3px;">DigitalFreebies.io</div>
        <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Account Security & Password Reset</div>
      </div>
      <div style="padding: 32px; color: #1f2937; line-height: 1.6;">
        <h2 style="margin: 0 0 12px; font-size: 20px; color: #111827;">Password Reset Request</h2>
        <p style="margin: 0 0 20px; font-size: 14px; color: #4b5563;">
          Hello <strong>@${params.username}</strong>, we received a request to reset the password for your DigitalFreebies.io community account. Enter this 6-digit security code to set a new password:
        </p>
        <div style="background: #faf5ff; border: 1.5px dashed #6a0b9e; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6a0b9e; margin-bottom: 6px;">Password Reset Code (Valid 15 Mins)</div>
          <div style="font-size: 30px; font-weight: 800; letter-spacing: 8px; color: #111827; font-family: monospace;">${params.code}</div>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetLink}" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 700; color: #6a0b9e; background: #ffffff; border: 1.5px solid #6a0b9e; border-radius: 9999px; text-decoration: none;">
            Reset My Password
          </a>
        </div>
        <p style="margin: 0; font-size: 12px; color: #6b7280;">
          This code expires in 15 minutes for your security. If you did not request a password reset, you can safely ignore this email and your password will remain unchanged.
        </p>
      </div>
    </div>
  `;

  return sendSmtpEmail({
    to: params.toEmail,
    subject,
    text,
    html,
  });
}
