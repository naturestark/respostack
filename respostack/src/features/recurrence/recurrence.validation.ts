import { RecurrenceRule, RECURRENCE_FREQUENCIES } from './recurrence.types';
import { isValidCalendarDate } from '../../utils/validation';

export interface RecurrenceValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates a recurrence configuration rule.
 */
export function validateRecurrenceRule(
  rule: RecurrenceRule,
  firstDueDate?: string
): RecurrenceValidationResult {
  const errors: Record<string, string> = {};

  // 1. Frequency validation
  if (!rule.frequency || !RECURRENCE_FREQUENCIES.includes(rule.frequency)) {
    errors.frequency = 'Please select a valid recurrence frequency (daily, weekly, monthly, or yearly).';
  }

  // 2. Interval validation
  if (
    typeof rule.interval !== 'number' ||
    !Number.isInteger(rule.interval) ||
    rule.interval < 1
  ) {
    errors.interval = 'Repeat interval must be a whole number greater than or equal to 1.';
  } else if (rule.interval > 365) {
    errors.interval = 'Repeat interval cannot exceed 365.';
  }

  // 3. Weekly weekdays validation
  if (rule.frequency === 'weekly' && rule.weekdays !== undefined && rule.weekdays !== null) {
    if (!Array.isArray(rule.weekdays)) {
      errors.weekdays = 'Weekly days must be an array of weekdays.';
    } else if (rule.weekdays.length > 0) {
      const uniqueDays = new Set(rule.weekdays);
      if (uniqueDays.size !== rule.weekdays.length) {
        errors.weekdays = 'Weekday selections cannot contain duplicates.';
      }
      for (const day of rule.weekdays) {
        if (!Number.isInteger(day) || day < 0 || day > 6) {
          errors.weekdays = 'Weekdays must be numbers between 0 (Sunday) and 6 (Saturday).';
          break;
        }
      }
    }
  }

  // 4. Monthly policy validation
  if (rule.frequency === 'monthly') {
    if (rule.monthPolicy && rule.monthPolicy !== 'same-day') {
      errors.monthPolicy = 'Unsupported monthly recurrence policy.';
    }
    if (rule.monthDay !== undefined && rule.monthDay !== null) {
      if (!Number.isInteger(rule.monthDay) || rule.monthDay < 1 || rule.monthDay > 31) {
        errors.monthDay = 'Monthly target day must be an integer between 1 and 31.';
      }
    }
  }

  // 5. End Date validation
  if (rule.endDate !== undefined && rule.endDate !== null && rule.endDate.trim() !== '') {
    const trimmedEndDate = rule.endDate.trim();
    if (!isValidCalendarDate(trimmedEndDate)) {
      errors.endDate = 'End date must be a valid calendar date in YYYY-MM-DD format.';
    } else if (firstDueDate && trimmedEndDate < firstDueDate) {
      errors.endDate = 'Recurrence end date cannot be earlier than the initial due date.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
