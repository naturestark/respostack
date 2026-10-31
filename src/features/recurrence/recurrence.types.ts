export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const RECURRENCE_FREQUENCIES: readonly RecurrenceFrequency[] = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const;

export const WEEKDAYS = [
  { value: 0, label: 'Sun', short: 'S' },
  { value: 1, label: 'Mon', short: 'M' },
  { value: 2, label: 'Tue', short: 'T' },
  { value: 3, label: 'Wed', short: 'W' },
  { value: 4, label: 'Thu', short: 'T' },
  { value: 5, label: 'Fri', short: 'F' },
  { value: 6, label: 'Sat', short: 'S' },
] as const;

/**
 * Strict, documented recurrence rule configuration.
 */
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // positive integer >= 1
  /**
   * Selected weekdays for weekly recurrence.
   * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday.
   */
  weekdays?: number[];
  /**
   * Monthly policy: 'same-day' clamps to the last day of target month when target day exceeds month length.
   */
  monthPolicy?: 'same-day';
  /**
   * Original target day of the month (e.g. 31), preserved across months with fewer days.
   */
  monthDay?: number;
  /**
   * Optional recurrence termination calendar date ('YYYY-MM-DD').
   */
  endDate?: string;
}

export type RecurrenceEditScope = 'occurrence' | 'series';
