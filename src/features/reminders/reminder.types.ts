import { Responsibility } from '../../types/responsibility';

export type ReminderStatus = 'due' | 'missed' | 'upcoming' | 'completed' | 'none';

/**
 * Persistent record of notification delivery and dismissal.
 * Stored in Dexie IndexedDB to ensure deduplication survives app reloads.
 */
export interface ReminderLog {
  id: string; // `${responsibilityId}:${reminderAt}`
  responsibilityId: string;
  reminderAt: string; // ISO 8601 UTC timestamp instant
  notifiedAt?: string; // ISO 8601 timestamp when browser notification was displayed
  dismissedAt?: string; // ISO 8601 timestamp when user dismissed the reminder
  createdAt: string;
}

export interface AppSettingRecord {
  key: string;
  value: unknown;
}

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

export interface ReminderAttentionItem {
  responsibility: Responsibility;
  status: 'due' | 'missed';
  reminderAt: string;
  timeLabel: string;
}
