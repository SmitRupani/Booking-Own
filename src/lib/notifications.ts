/**
 * Browser Push Notifications Utility
 * Handles permission, notification display, and click actions
 */

export type NotificationType = 'approval' | 'reminder' | 'penalty' | 'general';

export interface NotificationData {
  title: string;
  body: string;
  type: NotificationType;
  url?: string; // URL to navigate to on click
  icon?: string;
  tag?: string; // Unique tag to replace existing notification
}

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.error('Browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Show a browser notification
 */
export function showNotification(data: NotificationData): Notification | null {
  console.log('showNotification called with:', data);

  if (!isNotificationSupported()) {
    console.error('Browser does not support notifications');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted:', Notification.permission);
    return null;
  }

  try {
    const options: NotificationOptions = {
      body: data.body,
      icon: data.icon || '/sst-logo.png',
      badge: '/sst-logo.png',
      tag: data.tag || `notification-${Date.now()}`,
      requireInteraction: false, // Let notification auto-dismiss
      data: {
        url: data.url,
        type: data.type,
      },
    };

    console.log('Creating notification with options:', options);
    const notification = new Notification(data.title, options);

    console.log('Notification created:', notification);

    // Handle notification click
    notification.onclick = (event) => {
      console.log('Notification clicked');
      event.preventDefault();

      window.focus();

      if (data.url) {
        console.log('Navigating to:', data.url);
        window.location.href = data.url;
      }

      notification.close();
    };

    notification.onerror = (error) => {
      console.error('Notification error:', error);
    };

    notification.onshow = () => {
      console.log('Notification shown successfully');
    };

    notification.onclose = () => {
      console.log('Notification closed');
    };

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Show approval needed notification
 */
export function notifyApprovalNeeded(
  resourceName: string,
  userName: string,
  bookingId: string | number
): Notification | null {
  return showNotification({
    title: '🔔 New Approval Needed',
    body: `${userName} requested ${resourceName}`,
    type: 'approval',
    url: '/admin/lab-approvals',
    tag: `approval-${bookingId}`,
  });
}

/**
 * Show general notification
 */
export function notifyGeneral(title: string, message: string): Notification | null {
  return showNotification({
    title,
    body: message,
    type: 'general',
  });
}

/**
 * Store notification preference in localStorage
 */
export function setNotificationPreference(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('notifications-enabled', enabled ? 'true' : 'false');
  }
}

/**
 * Get notification preference from localStorage
 */
export function getNotificationPreference(): boolean {
  if (typeof window !== 'undefined') {
    const pref = localStorage.getItem('notifications-enabled');
    return pref === 'true';
  }
  return false;
}

/**
 * Check if notifications are enabled and permitted
 */
export function areNotificationsEnabled(): boolean {
  return (
    isNotificationSupported() &&
    Notification.permission === 'granted' &&
    getNotificationPreference()
  );
}
