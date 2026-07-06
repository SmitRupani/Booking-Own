import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata', // IST timezone
  });
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata', // IST timezone
  });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export interface StudentInfo {
  name: string;
  rollNumber: string;
  email: string;
}

/**
 * Parse student information from SST email format
 * Format: xyz.23bcs10179@sst.scaler.com
 * Returns: { name: "xyz", rollNumber: "23bcs10179", email: original }
 */
export function parseStudentEmail(email: string): StudentInfo | null {
  if (!email) return null;

  try {
    const [localPart] = email.split('@');
    if (!localPart) return null;

    const parts = localPart.split('.');
    if (parts.length >= 2) {
      const name = parts[0];
      const rollNumber = parts[1];

      return {
        name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
        rollNumber: rollNumber.toUpperCase(),
        email,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL && process.env.NEXT_PUBLIC_BASE_URL !== 'http://localhost:3000') {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}
