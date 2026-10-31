import { DueDateStatus } from '../types/responsibility';

/**
 * Returns today's date formatted as 'YYYY-MM-DD' in the user's local timezone.
 * Accepts an optional reference date to support controllable clocks in tests.
 */
export function getTodayDateString(refDate: Date = new Date()): string {
  const year = refDate.getFullYear();
  const month = String(refDate.getMonth() + 1).padStart(2, '0');
  const day = String(refDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Classifies a responsibility's due date status relative to today.
 * Both dates must be 'YYYY-MM-DD'.
 *
 * If isCompleted is true, the item is never classified as active overdue or due-today.
 */
export function classifyDueDate(
  dueDate?: string,
  todayStr: string = getTodayDateString(),
  isCompleted: boolean = false
): DueDateStatus {
  // Completed responsibilities never appear as active overdue or due-today items
  if (isCompleted) {
    return 'none';
  }

  if (!dueDate || typeof dueDate !== 'string' || !dueDate.trim()) {
    return 'none';
  }

  const trimmed = dueDate.trim();

  // Strict lexicographical comparison is safe for ISO 'YYYY-MM-DD'
  if (trimmed < todayStr) {
    return 'overdue';
  }
  if (trimmed === todayStr) {
    return 'due-today';
  }
  return 'upcoming';
}

/**
 * Computes calendar day difference between target date and today.
 * Positive = upcoming in future, 0 = today, Negative = overdue in past.
 *
 * Uses UTC components to eliminate Daylight Saving Time hour shifts (e.g. 23h or 25h days).
 */
export function getDaysDifference(
  targetDateStr: string,
  todayStr: string = getTodayDateString()
): number {
  if (!targetDateStr || typeof targetDateStr !== 'string') return 0;

  const parts1 = targetDateStr.trim().split('-');
  const parts2 = todayStr.trim().split('-');

  if (parts1.length !== 3 || parts2.length !== 3) return 0;

  const [y1, m1, d1] = parts1.map(Number);
  const [y2, m2, d2] = parts2.map(Number);

  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((utc1 - utc2) / MS_PER_DAY);
}

/**
 * Formats a 'YYYY-MM-DD' date string for human reading without timezone shifts.
 * Example: '2026-10-29' -> 'Oct 29, 2026'
 */
export function formatDueDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
    return 'No due date';
  }

  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) {
    return dateStr;
  }

  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return dateStr;
  }

  // Construct local date by explicit components (avoids UTC parsing shift)
  const localDate = new Date(year, month - 1, day);

  return localDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Generates an intuitive, readable badge label with urgency classification.
 */
export function getRelativeDueLabel(
  dateStr?: string,
  todayStr: string = getTodayDateString(),
  isCompleted: boolean = false
): { text: string; status: DueDateStatus } {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
    return { text: 'No due date', status: 'none' };
  }

  if (isCompleted) {
    return { text: formatDueDate(dateStr), status: 'none' };
  }

  const status = classifyDueDate(dateStr, todayStr, isCompleted);
  const diff = getDaysDifference(dateStr, todayStr);

  if (diff < 0) {
    const days = Math.abs(diff);
    return {
      text: `${days} ${days === 1 ? 'day' : 'days'} overdue`,
      status: 'overdue',
    };
  }

  if (diff === 0) {
    return { text: 'Due today', status: 'due-today' };
  }

  if (diff === 1) {
    return { text: 'Due tomorrow', status: 'upcoming' };
  }

  if (diff <= 7) {
    return { text: `Due in ${diff} days`, status: 'upcoming' };
  }

  return { text: formatDueDate(dateStr), status: 'upcoming' };
}
