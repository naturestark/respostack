import { CATEGORIES, ResponsibilityFormData, ValidationResult } from '../types/responsibility';

/**
 * Checks whether a given year is a leap year in the Gregorian calendar.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the maximum number of days in a given month of a given year.
 * Month is 1-indexed (1 = January, 12 = December).
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  switch (month) {
    case 1: // January
    case 3: // March
    case 5: // May
    case 7: // July
    case 8: // August
    case 10: // October
    case 12: // December
      return 31;
    case 4: // April
    case 6: // June
    case 9: // September
    case 11: // November
      return 30;
    case 2: // February
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

/**
 * Validates a local calendar date string formatted strictly as 'YYYY-MM-DD'.
 * Rejects impossible dates (e.g., Feb 29 on non-leap years, Feb 30, April 31).
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;

  const maxDays = getDaysInMonth(year, month);
  return day >= 1 && day <= maxDays;
}

/**
 * Validates currency code adhering to ISO 4217 (3 uppercase English letters).
 */
export function isValidCurrencyCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  return /^[A-Z]{3}$/.test(code);
}

/**
 * Validates a reminder timestamp instant.
 * Must be a valid parseable ISO 8601 string.
 */
export function isValidReminderTimestamp(timestamp: string): boolean {
  if (!timestamp || typeof timestamp !== 'string') return false;
  const parsed = Date.parse(timestamp);
  if (isNaN(parsed)) return false;

  const d = new Date(parsed);
  const year = d.getFullYear();
  return year >= 1000 && year <= 9999;
}

/**
 * Form validation engine for responsibilities.
 * Validates required titles, valid categories, leap-year-safe calendar dates,
 * valid reminder instants, non-negative finite amounts, and ISO 4217 currency codes.
 */
export function validateResponsibility(data: ResponsibilityFormData): ValidationResult {
  const errors: Record<string, string> = {};

  // 1. Title Validation
  const rawTitle = data.title;
  if (typeof rawTitle !== 'string') {
    errors.title = 'Title is required.';
  } else {
    const trimmedTitle = rawTitle.trim();
    if (trimmedTitle.length === 0) {
      errors.title = 'Title is required.';
    } else if (trimmedTitle.length > 200) {
      errors.title = 'Title must be 200 characters or fewer.';
    }
  }

  // 2. Category Validation
  if (!data.category || !CATEGORIES.includes(data.category)) {
    errors.category = 'Please select a valid category.';
  }

  // 3. Due Date Validation (Optional)
  if (data.dueDate !== undefined && data.dueDate !== null && data.dueDate.trim() !== '') {
    const trimmedDate = data.dueDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      errors.dueDate = 'Due date must be in YYYY-MM-DD format.';
    } else if (!isValidCalendarDate(trimmedDate)) {
      errors.dueDate = 'Invalid calendar date. Please check the day and month.';
    }
  }

  // 4. Reminder Timestamp Validation (Optional)
  if (data.reminderAt !== undefined && data.reminderAt !== null && data.reminderAt.trim() !== '') {
    const trimmedReminder = data.reminderAt.trim();
    if (!isValidReminderTimestamp(trimmedReminder)) {
      errors.reminderAt = 'Reminder must be a valid date and time.';
    }
  }

  // 5. Amount Validation (Optional)
  let hasValidAmount = false;
  if (data.amount !== undefined && data.amount !== null && data.amount !== '') {
    const num = Number(data.amount);
    if (isNaN(num)) {
      errors.amount = 'Amount must be a valid number.';
    } else if (!Number.isFinite(num)) {
      errors.amount = 'Amount must be a finite number.';
    } else if (num < 0) {
      errors.amount = 'Amount cannot be negative.';
    } else if (num > 1_000_000_000) {
      errors.amount = 'Amount cannot exceed 1,000,000,000.';
    } else if (Math.round(num * 100) !== Number((num * 100).toFixed(6))) {
      errors.amount = 'Amount cannot have more than 2 decimal places.';
    } else {
      hasValidAmount = true;
    }
  }

  // 6. Currency Validation
  if (hasValidAmount) {
    const currency = data.currency ? data.currency.trim().toUpperCase() : '';
    if (!currency) {
      errors.currency = 'Currency code is required when specifying an amount.';
    } else if (!isValidCurrencyCode(currency)) {
      errors.currency = 'Currency code must be a 3-letter ISO code (e.g. USD, EUR, GBP).';
    }
  } else if (data.currency && data.currency.trim() !== '') {
    const currency = data.currency.trim().toUpperCase();
    if (!isValidCurrencyCode(currency)) {
      errors.currency = 'Currency code must be a 3-letter ISO code (e.g. USD, EUR, GBP).';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
