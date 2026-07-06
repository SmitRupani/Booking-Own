import nodemailer from 'nodemailer';
import { eq } from 'drizzle-orm';
import { getDb } from './db/client';
import { emailRouting, users } from './db/schema';
import { getBaseUrl } from './utils';

const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('Email not sent (SMTP not configured):', {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  try {
    await transporter.sendMail({
      from: `"SST Booking System" <${process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

export function generateApprovalEmailHTML(
  bookingId: string | number,
  resourceName: string,
  userName: string,
  userEmail: string,
  startTime: string,
  endTime: string,
  approveToken: string,
  rejectToken: string,
  borrowReason?: string
): string {
  const baseUrl = getBaseUrl();
  const approveUrl = `${baseUrl}/api/approve/${approveToken}`;
  const rejectUrl = `${baseUrl}/api/approve/${rejectToken}?action=reject`;

  const reasonRow = borrowReason ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Reason:</td>
            <td style="padding: 8px 0; font-style: italic;">${borrowReason}</td>
          </tr>` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Approval Required</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #2f4f7f; margin-top: 0;">Booking Approval Required</h1>
        <p style="margin-bottom: 0;">A new booking requires your approval.</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #2f4f7f; margin-top: 0;">Booking Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 150px;">Student:</td>
            <td style="padding: 8px 0;">${userName} (${userEmail})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Resource:</td>
            <td style="padding: 8px 0;">${resourceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Start Time:</td>
            <td style="padding: 8px 0;">${startTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">End Time:</td>
            <td style="padding: 8px 0;">${endTime}</td>
          </tr>${reasonRow}
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Booking ID:</td>
            <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${bookingId}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${approveUrl}" 
           style="display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-right: 10px; font-weight: bold;">
          ✓ Approve
        </a>
        <a href="${rejectUrl}" 
           style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          ✗ Reject
        </a>
      </div>

      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px;">
          <strong>Note:</strong> You can approve or reject this booking directly from this email without logging in.
        </p>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p style="margin: 0;">SST Booking System</p>
      </div>
    </body>
    </html>
  `;
}

function getEmailRoutingCategory(resourceType: string): string {
  switch (resourceType) {
    case 'LAB_EQUIPMENT': return 'LAB_EQUIPMENT';
    case 'SPORTS_EQUIPMENT': return 'SPORTS_EQUIPMENT';
    case 'FACILITY': return 'FACILITY';
    case 'ROOM': return 'ROOM';
    case 'LIBRARY': return 'LIBRARY';
    default: return 'DEFAULT';
  }
}

export async function getApprovalEmailRecipients(resourceType: string): Promise<string[]> {
  try {
    const db = getDb();
    const category = getEmailRoutingCategory(resourceType);

    const categoryRuleResult = await db
      .select()
      .from(emailRouting)
      .where(eq(emailRouting.category, category));

    const categoryRule = categoryRuleResult[0];

    if (categoryRule?.enabled) {
      const emails = categoryRule.emails as string[];
      if (emails && emails.length > 0) {
        console.log(`Using ${category} routing: ${emails.join(', ')}`);
        return emails;
      }
    }

    if (category !== 'DEFAULT') {
      const defaultRuleResult = await db
        .select()
        .from(emailRouting)
        .where(eq(emailRouting.category, 'DEFAULT'));

      const defaultRule = defaultRuleResult[0];

      if (defaultRule?.enabled) {
        const emails = defaultRule.emails as string[];
        if (emails && emails.length > 0) {
          console.log(`Using DEFAULT routing: ${emails.join(', ')}`);
          return emails;
        }
      }
    }

    const admins = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.role, 'ADMIN'));

    const adminEmails = admins.map(admin => admin.email).filter(Boolean);
    console.log(`Using all admin emails fallback: ${adminEmails.join(', ')}`);
    return adminEmails;
  } catch (error) {
    console.error('Error fetching email recipients:', error);
    try {
      const db = getDb();
      const admins = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.role, 'ADMIN'));
      return admins.map(admin => admin.email).filter(Boolean);
    } catch {
      return [];
    }
  }
}
