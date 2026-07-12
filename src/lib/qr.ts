import crypto from 'crypto';
import QRCode from 'qrcode';

const envSecret = process.env.QR_HMAC_SECRET;

if (!envSecret && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  QR_HMAC_SECRET environment variable is not set');
}

const QR_SECRET: string = envSecret || 'dev-fallback-secret-do-not-use-in-production';

if (!envSecret) {
  console.warn('⚠️  QR_HMAC_SECRET not set - using insecure fallback for development');
}

export interface QRPayload {
  bid: string; // booking ID
  uid: string; // user ID
  iat: number; // issued at
  exp: number; // expires at
  n: string; // nonce
}

export function generateQRToken(bookingId: string | number, userId: string | number, expiresInMinutes: number): string {
  if (process.env.NODE_ENV === 'production' && !envSecret) {
    throw new Error('QR_HMAC_SECRET environment variable is required in production');
  }
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInMinutes * 60);
  const nonce = crypto.randomBytes(8).toString('hex');

  const payload: QRPayload = {
    bid: String(bookingId),
    uid: String(userId),
    iat: now,
    exp,
    n: nonce,
  };

  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(data)
    .digest('hex');

  const token = Buffer.from(`${data}.${signature}`).toString('base64url');

  return token;
}

export function verifyQRToken(token: string): { valid: boolean; payload?: QRPayload; error?: string } {
  if (process.env.NODE_ENV === 'production' && !envSecret) {
    throw new Error('QR_HMAC_SECRET environment variable is required in production');
  }
  try {
    const normalizedToken = token.trim();
    const decoded = Buffer.from(normalizedToken, 'base64url').toString('utf-8');
    const separatorIndex = decoded.lastIndexOf('.');

    if (separatorIndex <= 0 || separatorIndex === decoded.length - 1) {
      return { valid: false, error: 'Invalid token format' };
    }

    const data = decoded.slice(0, separatorIndex);
    const signature = decoded.slice(separatorIndex + 1);

    if (!data || !signature) return { valid: false, error: 'Invalid token format' };

    const expectedSignature = crypto
      .createHmac('sha256', QR_SECRET)
      .update(data)
      .digest('hex');

    const providedSigBuf = Buffer.from(signature, 'hex');
    const expectedSigBuf = Buffer.from(expectedSignature, 'hex');

    if (
      providedSigBuf.length !== expectedSigBuf.length ||
      !crypto.timingSafeEqual(providedSigBuf, expectedSigBuf)
    ) {
      return { valid: false, error: 'Invalid signature' };
    }

    const payload: QRPayload = JSON.parse(data);

    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: 'Failed to verify token' };
  }
}

export async function generateQRCodeImage(token: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(token, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (error) {
    throw new Error('Failed to generate QR code image');
  }
}
