import Dexie, { Table } from 'dexie';
import { Responsibility } from '../types/responsibility';
import { ReminderLog, AppSettingRecord } from '../features/reminders/reminder.types';

/**
 * LifeAdminDatabase sets up IndexedDB schema via Dexie with versioned migrations.
 * All user data is stored locally in the browser sandbox.
 */
export class LifeAdminDatabase extends Dexie {
  responsibilities!: Table<Responsibility, string>;
  reminderLogs!: Table<ReminderLog, string>;
  appSettings!: Table<AppSettingRecord, string>;

  constructor() {
    super('life_admin_db');

    // Version 1: Initial foundation schema
    this.version(1).stores({
      responsibilities: 'id, title, category, dueDate, isCompleted, createdAt, updatedAt',
    });

    // Version 2: Added reminderAt index, reminderLogs table for deduplication, and appSettings table
    this.version(2).stores({
      responsibilities: 'id, title, category, dueDate, reminderAt, isCompleted, createdAt, updatedAt',
      reminderLogs: 'id, responsibilityId, reminderAt, notifiedAt, dismissedAt',
      appSettings: 'key',
    }).upgrade(() => {
      // Existing records preserved automatically.
    });

    // Version 3: Added seriesId index to responsibilities table for recurring series lookups
    this.version(3).stores({
      responsibilities: 'id, seriesId, title, category, dueDate, reminderAt, isCompleted, createdAt, updatedAt',
      reminderLogs: 'id, responsibilityId, reminderAt, notifiedAt, dismissedAt',
      appSettings: 'key',
    }).upgrade(() => {
      // Existing records preserved with seriesId: undefined and recurrence: undefined
    });
  }
}

export const db = new LifeAdminDatabase();
