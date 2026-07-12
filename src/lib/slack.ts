import { getBaseUrl } from '@/lib/utils';

export interface SlackApprovalOptions {
  bookingId: string;
  resourceName: string;
  userName: string;
  userEmail: string;
  startTime: string;
  endTime: string;
  approveToken: string;
  rejectToken: string;
  borrowReason?: string | null;
  isReschedule?: boolean;
}

/**
 * Send an approval request to the admin Slack channel using an incoming webhook.
 * Delivery is best-effort: failure logs an error but does not throw.
 */
export async function sendApprovalRequestSlackNotification(options: SlackApprovalOptions): Promise<void> {
  const webhookUrl = process.env.SLACK_APPROVALS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('Slack not sent (SLACK_APPROVALS_WEBHOOK_URL not configured)');
    return;
  }

  const baseUrl = getBaseUrl();
  const approveUrl = `${baseUrl}/api/approve/${options.approveToken}`;
  const rejectUrl = `${baseUrl}/api/approve/${options.rejectToken}?action=reject`;

  const titleText = options.isReschedule 
    ? `Rescheduled Booking - Approval Required: ${options.resourceName}`
    : `Booking Approval Required: ${options.resourceName}`;

  const reasonBlock = options.borrowReason ? [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Reason:*\n${options.borrowReason}`
      }
    }
  ] : [];

  const payload = {
    text: titleText, // Fallback text
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: titleText,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Student:*\n${options.userName}\n(${options.userEmail})`
          },
          {
            type: "mrkdwn",
            text: `*Resource:*\n${options.resourceName}`
          },
          {
            type: "mrkdwn",
            text: `*Start Time:*\n${options.startTime}`
          },
          {
            type: "mrkdwn",
            text: `*End Time:*\n${options.endTime}`
          }
        ]
      },
      ...reasonBlock,
      {
        type: "context",
        elements: [
          {
            type: "plain_text",
            text: `Booking ID: ${options.bookingId}`,
            emoji: true
          }
        ]
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Approve",
              emoji: true
            },
            style: "primary",
            url: approveUrl,
            value: "approve"
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Reject",
              emoji: true
            },
            style: "danger",
            url: rejectUrl,
            value: "reject"
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}
