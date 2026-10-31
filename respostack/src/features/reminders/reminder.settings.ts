import { db } from '../../db/db';

const SETTINGS_KEY_NOTIFICATIONS_ENABLED = 'reminders_notifications_enabled';

/**
 * Retrieves the user's notification preference from IndexedDB.
 * Defaults to false (explicit opt-in required).
 */
export async function getNotificationPreference(): Promise<boolean> {
  try {
    const record = await db.appSettings.get(SETTINGS_KEY_NOTIFICATIONS_ENABLED);
    return Boolean(record?.value);
  } catch (err) {
    console.warn('Could not read notification preference from IndexedDB:', err);
    return false;
  }
}

/**
 * Saves the user's notification preference into IndexedDB.
 */
export async function setNotificationPreference(enabled: boolean): Promise<void> {
  try {
    await db.appSettings.put({
      key: SETTINGS_KEY_NOTIFICATIONS_ENABLED,
      value: enabled,
    });
  } catch (err) {
    console.error('Could not save notification preference to IndexedDB:', err);
    throw new Error('Failed to save notification preference to local database.');
  }
}
