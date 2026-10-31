import { describe, it, expect } from 'vitest';
import {
  calculateNextOccurrenceDate,
  calculateCatchUpOccurrenceDate,
  calculateNextReminderInstant,
  formatRecurrenceRule,
} from './recurrence.service';
import { validateRecurrenceRule } from './recurrence.validation';
import { RecurrenceRule } from './recurrence.types';

describe('Recurrence Calculations & Date Boundaries', () => {
  describe('Daily Recurrence', () => {
    it('calculates next day for daily schedule (interval = 1)', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
      expect(calculateNextOccurrenceDate('2026-10-30', rule)).toBe('2026-10-31');
      expect(calculateNextOccurrenceDate('2026-10-31', rule)).toBe('2026-11-01');
    });

    it('calculates next date across month and year boundaries', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 2 };
      expect(calculateNextOccurrenceDate('2026-12-30', rule)).toBe('2027-01-01');
    });

    it('respects end date constraint', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1, endDate: '2026-10-31' };
      expect(calculateNextOccurrenceDate('2026-10-30', rule)).toBe('2026-10-31');
      expect(calculateNextOccurrenceDate('2026-10-31', rule)).toBeNull();
    });
  });

  describe('Weekly Recurrence with Weekday Selection', () => {
    it('advances by interval * 7 days when no weekdays are selected', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 2 };
      expect(calculateNextOccurrenceDate('2026-10-30', rule)).toBe('2026-11-13');
    });

    it('advances to next selected weekday within the same week', () => {
      // 2026-11-02 is Monday (1), target weekdays: Mon (1), Wed (3), Fri (5)
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 1, weekdays: [1, 3, 5] };
      expect(calculateNextOccurrenceDate('2026-11-02', rule)).toBe('2026-11-04'); // Wednesday
      expect(calculateNextOccurrenceDate('2026-11-04', rule)).toBe('2026-11-06'); // Friday
    });

    it('wraps to first weekday of following cycle with interval = 1', () => {
      // 2026-11-06 is Friday (5). Next occurrence wraps to Monday (1)
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 1, weekdays: [1, 5] };
      expect(calculateNextOccurrenceDate('2026-11-06', rule)).toBe('2026-11-09');
    });

    it('wraps across interval > 1 weeks correctly', () => {
      // Friday Oct 30, 2026, every 2 weeks on Mon (1), Fri (5)
      // Skips 1 week and lands on Monday Nov 9, 2026
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 2, weekdays: [1, 5] };
      expect(calculateNextOccurrenceDate('2026-10-30', rule)).toBe('2026-11-09');
    });
  });

  describe('Monthly Recurrence & Clamping on Short Months', () => {
    it('repeats on same day when month has sufficient days', () => {
      const rule: RecurrenceRule = { frequency: 'monthly', interval: 1, monthDay: 15 };
      expect(calculateNextOccurrenceDate('2026-10-15', rule)).toBe('2026-11-15');
      expect(calculateNextOccurrenceDate('2026-11-15', rule)).toBe('2026-12-15');
    });

    it('clamps 31st to 28th in February of non-leap year (2026)', () => {
      const rule: RecurrenceRule = { frequency: 'monthly', interval: 1, monthDay: 31 };
      expect(calculateNextOccurrenceDate('2026-01-31', rule)).toBe('2026-02-28');
    });

    it('clamps 31st to 29th in February of leap year (2024)', () => {
      const rule: RecurrenceRule = { frequency: 'monthly', interval: 1, monthDay: 31 };
      expect(calculateNextOccurrenceDate('2024-01-31', rule)).toBe('2024-02-29');
    });

    it('restores 31st in March after February clamping when monthDay is preserved', () => {
      const rule: RecurrenceRule = { frequency: 'monthly', interval: 1, monthDay: 31 };
      expect(calculateNextOccurrenceDate('2026-02-28', rule)).toBe('2026-03-31');
    });

    it('clamps 31st to 30th in 30-day months (April, June, September, November)', () => {
      const rule: RecurrenceRule = { frequency: 'monthly', interval: 1, monthDay: 31 };
      expect(calculateNextOccurrenceDate('2026-03-31', rule)).toBe('2026-04-30');
      expect(calculateNextOccurrenceDate('2026-05-31', rule)).toBe('2026-06-30');
    });

    it('handles interval > 1 for monthly recurrence (quarterly)', () => {
      const rule: RecurrenceRule = { frequency: 'monthly', interval: 3, monthDay: 31 };
      expect(calculateNextOccurrenceDate('2026-01-31', rule)).toBe('2026-04-30');
    });
  });

  describe('Yearly Recurrence & Leap Day Clamping', () => {
    it('repeats on same month and day each year', () => {
      const rule: RecurrenceRule = { frequency: 'yearly', interval: 1 };
      expect(calculateNextOccurrenceDate('2026-07-15', rule)).toBe('2027-07-15');
    });

    it('clamps February 29 to February 28 on non-leap years', () => {
      const rule: RecurrenceRule = { frequency: 'yearly', interval: 1 };
      // 2024 is leap year, 2025 is not
      expect(calculateNextOccurrenceDate('2024-02-29', rule)).toBe('2025-02-28');
    });

    it('preserves February 29 when interval lands on next leap year', () => {
      const rule: RecurrenceRule = { frequency: 'yearly', interval: 4 };
      // 2024 + 4 years = 2028 (leap year)
      expect(calculateNextOccurrenceDate('2024-02-29', rule)).toBe('2028-02-29');
    });
  });

  describe('Offline Catch-Up Policy', () => {
    it('advances iteratively to the next active cycle on or after today without unbounded generation', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
      // User was offline since Oct 1, today is Oct 10
      const nextCatchUp = calculateCatchUpOccurrenceDate('2026-10-01', rule, '2026-10-10');
      expect(nextCatchUp).toBe('2026-10-10');
    });
  });

  describe('Reminder Instant Calculation on Next Occurrence', () => {
    it('carries forward time-of-day to next occurrence date', () => {
      const curDue = '2026-10-30';
      const curRem = '2026-10-30T09:00:00.000Z';
      const nextDue = '2026-11-06';

      const nextRem = calculateNextReminderInstant(curRem, curDue, nextDue);
      expect(nextRem).toBe('2026-11-06T09:00:00.000Z');
    });
  });

  describe('Validation of Recurrence Rules', () => {
    it('accepts valid daily, weekly, monthly, and yearly configurations', () => {
      expect(validateRecurrenceRule({ frequency: 'daily', interval: 1 }).isValid).toBe(true);
      expect(validateRecurrenceRule({ frequency: 'weekly', interval: 2, weekdays: [1, 5] }).isValid).toBe(true);
      expect(validateRecurrenceRule({ frequency: 'monthly', interval: 1, monthDay: 31 }).isValid).toBe(true);
      expect(validateRecurrenceRule({ frequency: 'yearly', interval: 1 }).isValid).toBe(true);
    });

    it('rejects invalid intervals (zero, negative, non-integer, >365)', () => {
      expect(validateRecurrenceRule({ frequency: 'daily', interval: 0 }).isValid).toBe(false);
      expect(validateRecurrenceRule({ frequency: 'daily', interval: -1 }).isValid).toBe(false);
      expect(validateRecurrenceRule({ frequency: 'daily', interval: 1.5 }).isValid).toBe(false);
      expect(validateRecurrenceRule({ frequency: 'daily', interval: 400 }).isValid).toBe(false);
    });

    it('rejects end dates earlier than first due date', () => {
      const res = validateRecurrenceRule(
        { frequency: 'daily', interval: 1, endDate: '2026-10-20' },
        '2026-10-30'
      );
      expect(res.isValid).toBe(false);
      expect(res.errors.endDate).toContain('earlier than');
    });

    it('formats human-readable recurrence labels', () => {
      expect(formatRecurrenceRule({ frequency: 'daily', interval: 1 })).toBe('Repeats daily');
      expect(formatRecurrenceRule({ frequency: 'daily', interval: 3 })).toBe('Repeats every 3 days');
      expect(formatRecurrenceRule({ frequency: 'weekly', interval: 1, weekdays: [1, 5] })).toBe('Repeats weekly on Mon, Fri');
      expect(formatRecurrenceRule({ frequency: 'monthly', interval: 1, monthDay: 31 })).toBe('Repeats monthly (day 31)');
    });
  });
});
