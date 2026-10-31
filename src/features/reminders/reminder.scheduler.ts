import { db } from '../../db/db';
import { Responsibility } from '../../types/responsibility';
import { ReminderLog, NotificationPermissionStatus } from './reminder.types';
import { getNotificationPreference } from './reminder.settings';

/**
 * Checks whether the browser supports the HTML5 Notifications API.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Returns current permission status ('default' | 'granted' | 'denied' | 'unsupported').
 */
export function getNotificationPermissionStatus(): NotificationPermissionStatus {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Requests browser notification permission. Must only be invoked in response to explicit user interaction.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionStatus;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return Notification.permission as NotificationPermissionStatus;
  }
}

/**
 * Evaluates active saved responsibilities and dispatches browser notifications for eligible due reminders.
 * Enforces deduplication using the persistent IndexedDB reminderLogs table.
 */
export async function checkAndDispatchDueReminders(
  responsibilities: Responsibility[],
  now: Date = new Date()
): Promise<number> {
  if (!isNotificationSupported()) {
    return 0;
  }

  // Check user preference in IndexedDB
  const isEnabled = await getNotificationPreference();
  if (!isEnabled || Notification.permission !== 'granted') {
    return 0;
  }

  const nowIso = now.toISOString();
  let dispatchedCount = 0;

  for (const item of responsibilities) {
    // 1. Completed items and items without reminders are excluded
    if (item.isCompleted || !item.reminderAt) {
      continue;
    }

    // 2. Check if reminder time has arrived
    const reminderTime = Date.parse(item.reminderAt);
    if (isNaN(reminderTime) || reminderTime > now.getTime()) {
      continue;
    }

    // 3. Check persistent deduplication record in IndexedDB
    const logId = `${item.id}:${item.reminderAt}`;
    const existingLog = await db.reminderLogs.get(logId);

    // If already notified or explicitly dismissed, suppress duplicate notification
    if (existingLog && (existingLog.notifiedAt || existingLog.dismissedAt)) {
      continue;
    }

    // 4. Dispatch privacy-conscious notification
    try {
      // Minimal, privacy-conscious notification text that avoids leaking financial or sensitive notes on lock screen
      const notificationTitle = 'Respostack Reminder';
      const notificationOptions: NotificationOptions = {
        body: `"${item.title}" is due now.`,
        icon: '/pwa-192x192.png',
        tag: `reminder-${item.id}`, // Replaces previous notification for this item
        badge: '/pwa-192x192.png',
      };

      // Try service worker notification first, fallback to standard window Notification
      let notificationShown = false;
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            await reg.showNotification(notificationTitle, notificationOptions);
            notificationShown = true;
          }
        } catch {
          // Fallback to standard Notification API
        }
      }

      if (!notificationShown) {
        new Notification(notificationTitle, notificationOptions);
      }

      // 5. Record successful notification delivery in IndexedDB
      const logRecord: ReminderLog = {
        id: logId,
        responsibilityId: item.id,
        reminderAt: item.reminderAt,
        notifiedAt: nowIso,
        createdAt: nowIso,
      };

      await db.reminderLogs.put(logRecord);
      dispatchedCount++;
    } catch (err) {
      console.warn(`Failed to display notification for "${item.title}":`, err);
    }
  }

  // 6. Prune stale reminder logs older than 30 days to keep IndexedDB storage bounded
  try {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.reminderLogs.where('createdAt').below(thirtyDaysAgo).delete();
  } catch {
    // Non-critical background cleanup
  }

  return dispatchedCount;
}

/**
 * Marks a reminder as dismissed so it does not trigger notifications or in-app attention banners.
 */
export async function dismissReminder(
  responsibilityId: string,
  reminderAt: string,
  now: Date = new Date()
): Promise<void> {
  const logId = `${responsibilityId}:${reminderAt}`;
  const nowIso = now.toISOString();

  await db.reminderLogs.put({
    id: logId,
    responsibilityId,
    reminderAt,
    dismissedAt: nowIso,
    createdAt: nowIso,
  });
}

/**
 * Sends a sample test notification so users can verify browser notification settings on their device.
 */
export async function sendTestNotification(): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const title = 'Respostack — Test Notification';
    const options: NotificationOptions = {
      body: 'Notifications are configured properly on this device.',
      icon: '/pwa-192x192.png',
      tag: 'respostack-test',
    };

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, options);
          return true;
        }
      } catch {
        // Fallback
      }
    }

    new Notification(title, options);
    return true;
  } catch (err) {
    console.error('Error sending test notification:', err);
    return false;
  }
}
