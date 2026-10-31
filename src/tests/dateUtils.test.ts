import { describe, it, expect } from 'vitest';
import {
  classifyDueDate,
  formatDueDate,
  getDaysDifference,
  getRelativeDueLabel,
  getTodayDateString,
} from '../utils/dateUtils';

describe('Date & Urgency Utilities', () => {
  const FIXED_TODAY = '2026-10-29';

  describe('classifyDueDate', () => {
    it('classifies past dates as overdue for active items', () => {
      expect(classifyDueDate('2026-10-28', FIXED_TODAY, false)).toBe('overdue');
      expect(classifyDueDate('2026-01-01', FIXED_TODAY, false)).toBe('overdue');
    });

    it('classifies today date as due-today for active items', () => {
      expect(classifyDueDate('2026-10-29', FIXED_TODAY, false)).toBe('due-today');
    });

    it('classifies future dates as upcoming for active items', () => {
      expect(classifyDueDate('2026-10-30', FIXED_TODAY, false)).toBe('upcoming');
      expect(classifyDueDate('2026-11-15', FIXED_TODAY, false)).toBe('upcoming');
    });

    it('never classifies completed responsibilities as active overdue items', () => {
      // Regression requirement: Completed items must not appear as active overdue
      expect(classifyDueDate('2026-10-20', FIXED_TODAY, true)).toBe('none');
      expect(classifyDueDate('2026-10-29', FIXED_TODAY, true)).toBe('none');
      expect(classifyDueDate('2026-11-05', FIXED_TODAY, true)).toBe('none');
    });

    it('handles missing or empty dates as none', () => {
      expect(classifyDueDate(undefined, FIXED_TODAY)).toBe('none');
      expect(classifyDueDate('', FIXED_TODAY)).toBe('none');
      expect(classifyDueDate('   ', FIXED_TODAY)).toBe('none');
    });
  });

  describe('getDaysDifference & Boundary Conditions', () => {
    it('returns 0 when target is today', () => {
      expect(getDaysDifference('2026-10-29', FIXED_TODAY)).toBe(0);
    });

    it('returns negative difference for overdue dates', () => {
      expect(getDaysDifference('2026-10-25', FIXED_TODAY)).toBe(-4);
      expect(getDaysDifference('2026-10-28', FIXED_TODAY)).toBe(-1);
    });

    it('returns positive difference for future dates', () => {
      expect(getDaysDifference('2026-10-30', FIXED_TODAY)).toBe(1);
      expect(getDaysDifference('2026-11-05', FIXED_TODAY)).toBe(7);
    });

    it('correctly calculates difference across month boundaries (March 31 to April 1)', () => {
      expect(getDaysDifference('2026-04-01', '2026-03-31')).toBe(1);
      expect(getDaysDifference('2026-03-31', '2026-04-01')).toBe(-1);
      expect(getDaysDifference('2026-04-05', '2026-03-30')).toBe(6);
    });

    it('correctly calculates difference across year boundaries (Dec 31 to Jan 1)', () => {
      expect(getDaysDifference('2027-01-01', '2026-12-31')).toBe(1);
      expect(getDaysDifference('2026-12-31', '2027-01-01')).toBe(-1);
      expect(getDaysDifference('2027-01-10', '2026-12-25')).toBe(16);
    });

    it('correctly calculates difference across leap year Feb 29 (Feb 28 to March 1 in 2024)', () => {
      // 2024 is a leap year (includes Feb 29): 2 days difference
      expect(getDaysDifference('2024-03-01', '2024-02-28')).toBe(2);
      expect(getDaysDifference('2024-02-29', '2024-02-28')).toBe(1);
    });

    it('correctly calculates difference across non-leap year Feb 28 (Feb 28 to March 1 in 2025)', () => {
      // 2025 is not a leap year: 1 day difference
      expect(getDaysDifference('2025-03-01', '2025-02-28')).toBe(1);
    });
  });

  describe('getRelativeDueLabel', () => {
    it('returns overdue text with correct singular and plural grammar', () => {
      expect(getRelativeDueLabel('2026-10-28', FIXED_TODAY, false).text).toBe('1 day overdue');
      expect(getRelativeDueLabel('2026-10-25', FIXED_TODAY, false).text).toBe('4 days overdue');
    });

    it('returns "Due today" for items due today', () => {
      const res = getRelativeDueLabel('2026-10-29', FIXED_TODAY, false);
      expect(res.text).toBe('Due today');
      expect(res.status).toBe('due-today');
    });

    it('returns "Due tomorrow" for +1 day', () => {
      const res = getRelativeDueLabel('2026-10-30', FIXED_TODAY, false);
      expect(res.text).toBe('Due tomorrow');
      expect(res.status).toBe('upcoming');
    });

    it('returns "Due in X days" for near upcoming horizon (up to 7 days)', () => {
      const res = getRelativeDueLabel('2026-11-03', FIXED_TODAY, false);
      expect(res.text).toBe('Due in 5 days');
      expect(res.status).toBe('upcoming');
    });

    it('formats date without overdue text when item is already completed', () => {
      const res = getRelativeDueLabel('2026-10-20', FIXED_TODAY, true);
      expect(res.status).toBe('none');
      expect(res.text).not.toContain('overdue');
      expect(res.text).toContain('20');
    });

    it('returns "No due date" for undefined or empty input', () => {
      expect(getRelativeDueLabel(undefined, FIXED_TODAY).text).toBe('No due date');
      expect(getRelativeDueLabel('', FIXED_TODAY).text).toBe('No due date');
    });
  });

  describe('formatDueDate timezone resilience', () => {
    it('formats date correctly without shifting date component across timezones', () => {
      const formatted = formatDueDate('2026-10-29');
      expect(formatted).toContain('29');
      expect(formatted).toContain('2026');
    });

    it('handles empty input gracefully', () => {
      expect(formatDueDate(undefined)).toBe('No due date');
      expect(formatDueDate('')).toBe('No due date');
    });
  });

  describe('getTodayDateString with controllable clock', () => {
    it('formats given Date object into YYYY-MM-DD local format', () => {
      const mockDate = new Date(2026, 9, 29); // Oct 29, 2026
      expect(getTodayDateString(mockDate)).toBe('2026-10-29');
    });
  });
});
