import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isReminderDue,
  getReminderStatus,
  getActiveReminderAttentionItems,
  getApproachingResponsibilities,
  formatRelativeReminder,
  isoToDatetimeLocal,
  datetimeLocalToIso,
} from './reminder.service';
import { Responsibility } from '../../types/responsibility';
import { isValidReminderTimestamp } from '../../utils/validation';

describe('Local Reminders & Deadline Awareness', () => {
  const FIXED_NOW = new Date('2026-10-30T10:00:00.000Z');

  describe('Timestamp Validation', () => {
    it('validates correct ISO 8601 reminder timestamps', () => {
      expect(isValidReminderTimestamp('2026-10-30T09:00:00.000Z')).toBe(true);
      expect(isValidReminderTimestamp('2026-10-30T15:30:00Z')).toBe(true);
      expect(isValidReminderTimestamp('2026-12-01T08:00')).toBe(true);
    });

    it('rejects invalid or malformed reminder timestamps', () => {
      expect(isValidReminderTimestamp('')).toBe(false);
      expect(isValidReminderTimestamp('not-a-timestamp')).toBe(false);
      expect(isValidReminderTimestamp('2026-13-45T99:99')).toBe(false);
    });

    it('converts between HTML datetime-local and ISO 8601 UTC strings', () => {
      const localStr = '2026-10-30T09:00';
      const iso = datetimeLocalToIso(localStr);
      expect(iso).toBeDefined();
      expect(iso).toContain('2026-10-30');

      const convertedLocal = isoToDatetimeLocal(iso);
      expect(convertedLocal).toBe(localStr);
    });
  });

  describe('isReminderDue', () => {
    it('returns true when reminderAt is equal to or earlier than current time', () => {
      // Due right now
      expect(isReminderDue('2026-10-30T10:00:00.000Z', FIXED_NOW)).toBe(true);
      // Past / earlier
      expect(isReminderDue('2026-10-30T09:00:00.000Z', FIXED_NOW)).toBe(true);
      expect(isReminderDue('2026-10-25T12:00:00.000Z', FIXED_NOW)).toBe(true);
    });

    it('returns false when reminderAt is in the future', () => {
      expect(isReminderDue('2026-10-30T10:05:00.000Z', FIXED_NOW)).toBe(false);
      expect(isReminderDue('2026-11-01T09:00:00.000Z', FIXED_NOW)).toBe(false);
    });

    it('returns false when reminderAt is undefined or invalid', () => {
      expect(isReminderDue(undefined, FIXED_NOW)).toBe(false);
      expect(isReminderDue('', FIXED_NOW)).toBe(false);
      expect(isReminderDue('invalid-date', FIXED_NOW)).toBe(false);
    });
  });

  describe('getReminderStatus & Eligibility Rules', () => {
    const baseResp: Responsibility = {
      id: 'test-1',
      title: 'Pay Gas Bill',
      category: 'Bills',
      isCompleted: false,
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    };

    it('returns "none" when responsibility has no reminder set', () => {
      expect(getReminderStatus(baseResp, FIXED_NOW)).toBe('none');
    });

    it('returns "completed" when responsibility is completed, preventing active reminders', () => {
      const completedResp: Responsibility = {
        ...baseResp,
        reminderAt: '2026-10-30T09:00:00.000Z',
        isCompleted: true,
        completedAt: '2026-10-30T09:30:00.000Z',
      };
      expect(getReminderStatus(completedResp, FIXED_NOW)).toBe('completed');
    });

    it('returns "upcoming" for future reminders', () => {
      const futureResp: Responsibility = {
        ...baseResp,
        reminderAt: '2026-10-30T11:00:00.000Z', // 1 hour in future
      };
      expect(getReminderStatus(futureResp, FIXED_NOW)).toBe('upcoming');
    });

    it('returns "due" for reminders occurring within the last 15 minutes', () => {
      const dueResp: Responsibility = {
        ...baseResp,
        reminderAt: '2026-10-30T09:55:00.000Z', // 5 minutes ago
      };
      expect(getReminderStatus(dueResp, FIXED_NOW)).toBe('due');
    });

    it('returns "missed" for reminders occurring more than 15 minutes ago while app was closed', () => {
      const missedResp: Responsibility = {
        ...baseResp,
        reminderAt: '2026-10-30T08:00:00.000Z', // 2 hours ago
      };
      expect(getReminderStatus(missedResp, FIXED_NOW)).toBe('missed');
    });

    it('allows reminders on responsibilities without due dates', () => {
      const undatedWithReminder: Responsibility = {
        ...baseResp,
        dueDate: undefined,
        reminderAt: '2026-10-30T09:50:00.000Z',
      };
      expect(getReminderStatus(undatedWithReminder, FIXED_NOW)).toBe('due');
    });
  });

  describe('getActiveReminderAttentionItems', () => {
    it('aggregates and sorts active due and missed reminders without duplicates', () => {
      const items: Responsibility[] = [
        {
          id: '1',
          title: 'Immediate Task',
          category: 'Personal',
          reminderAt: '2026-10-30T09:58:00.000Z', // Due now
          isCompleted: false,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z',
        },
        {
          id: '2',
          title: 'Missed Task',
          category: 'Health',
          reminderAt: '2026-10-30T07:00:00.000Z', // Missed 3h ago
          isCompleted: false,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z',
        },
        {
          id: '3',
          title: 'Future Task',
          category: 'Education',
          reminderAt: '2026-10-30T14:00:00.000Z', // Future
          isCompleted: false,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z',
        },
        {
          id: '4',
          title: 'Completed Task With Past Reminder',
          category: 'Bills',
          reminderAt: '2026-10-30T08:00:00.000Z',
          isCompleted: true,
          completedAt: '2026-10-30T08:30:00Z',
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-30T08:30:00Z',
        },
      ];

      const attentionItems = getActiveReminderAttentionItems(items, FIXED_NOW);

      // Only items 1 and 2 are active attention items
      expect(attentionItems).toHaveLength(2);
      expect(attentionItems[0].responsibility.id).toBe('1'); // 'due' prioritized first
      expect(attentionItems[0].status).toBe('due');
      expect(attentionItems[1].responsibility.id).toBe('2'); // 'missed' second
      expect(attentionItems[1].status).toBe('missed');
    });
  });

  describe('getApproachingResponsibilities', () => {
    it('returns responsibilities due within the upcoming horizon (1 to 3 days)', () => {
      const items: Responsibility[] = [
        {
          id: '1',
          title: 'Due in 2 days',
          category: 'Bills',
          dueDate: '2026-11-01',
          isCompleted: false,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z',
        },
        {
          id: '2',
          title: 'Due in 10 days',
          category: 'Personal',
          dueDate: '2026-11-09',
          isCompleted: false,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z',
        },
        {
          id: '3',
          title: 'Due today',
          category: 'Health',
          dueDate: '2026-10-30',
          isCompleted: false,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z',
        },
      ];

      const approaching = getApproachingResponsibilities(items, '2026-10-30', 3);
      expect(approaching).toHaveLength(1);
      expect(approaching[0].id).toBe('1');
    });
  });

  describe('formatRelativeReminder', () => {
    it('formats missed reminders with human-friendly elapsed labels', () => {
      const fiveMinsAgo = new Date(FIXED_NOW.getTime() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeReminder(fiveMinsAgo, FIXED_NOW)).toBe('Missed (5m ago)');

      const threeHoursAgo = new Date(FIXED_NOW.getTime() - 3 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeReminder(threeHoursAgo, FIXED_NOW)).toBe('Missed (3h ago)');
    });

    it('formats upcoming reminders with time remaining labels', () => {
      const thirtyMinsFuture = new Date(FIXED_NOW.getTime() + 30 * 60 * 1000).toISOString();
      expect(formatRelativeReminder(thirtyMinsFuture, FIXED_NOW)).toBe('Due in 30m');
    });
  });
});
