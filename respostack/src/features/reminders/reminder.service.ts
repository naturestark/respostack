import { Responsibility } from '../../types/responsibility';
import { ReminderStatus, ReminderAttentionItem } from './reminder.types';
import { getDaysDifference, getTodayDateString } from '../../utils/dateUtils';

/**
 * Checks whether a responsibility reminder timestamp instant is currently due or overdue.
 */
export function isReminderDue(reminderAt?: string, now: Date = new Date()): boolean {
  if (!reminderAt || typeof reminderAt !== 'string') return false;
  const parsed = Date.parse(reminderAt);
  if (isNaN(parsed)) return false;
  return parsed <= now.getTime();
}

/**
 * Derives the active reminder status for a responsibility.
 * Completed items are never classified as active reminders.
 */
export function getReminderStatus(
  responsibility: Responsibility,
  now: Date = new Date()
): ReminderStatus {
  if (responsibility.isCompleted) {
    return 'completed';
  }

  if (!responsibility.reminderAt) {
    return 'none';
  }

  const parsed = Date.parse(responsibility.reminderAt);
  if (isNaN(parsed)) {
    return 'none';
  }

  const diffMs = now.getTime() - parsed;

  if (diffMs < 0) {
    return 'upcoming';
  }

  // If due within the last 15 minutes, classify as 'due' (immediate attention)
  // If more than 15 minutes past, classify as 'missed' (occurred while app was closed or inactive)
  if (diffMs > 15 * 60 * 1000) {
    return 'missed';
  }

  return 'due';
}

/**
 * Derives attention items from active saved responsibilities.
 * Collects due and missed reminders without duplicates.
 */
export function getActiveReminderAttentionItems(
  responsibilities: Responsibility[],
  now: Date = new Date()
): ReminderAttentionItem[] {
  const attentionItems: ReminderAttentionItem[] = [];

  for (const resp of responsibilities) {
    if (resp.isCompleted || !resp.reminderAt) {
      continue;
    }

    const status = getReminderStatus(resp, now);
    if (status === 'due' || status === 'missed') {
      attentionItems.push({
        responsibility: resp,
        status,
        reminderAt: resp.reminderAt,
        timeLabel: formatRelativeReminder(resp.reminderAt, now),
      });
    }
  }

  // Sort: 'due' first (soonest first), then 'missed' (most recent first)
  attentionItems.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'due' ? -1 : 1;
    }
    return Date.parse(b.reminderAt) - Date.parse(a.reminderAt);
  });

  return attentionItems;
}

/**
 * Returns responsibilities approaching their scheduled due date within a given horizon (default: 3 days).
 * Excludes overdue items, items due today, and completed items.
 */
export function getApproachingResponsibilities(
  responsibilities: Responsibility[],
  todayStr: string = getTodayDateString(),
  horizonDays: number = 3
): Responsibility[] {
  return responsibilities
    .filter((item) => {
      if (item.isCompleted || !item.dueDate) return false;
      const diff = getDaysDifference(item.dueDate, todayStr);
      return diff > 0 && diff <= horizonDays;
    })
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
}

/**
 * Formats a reminder ISO instant for human reading in the user's local timezone.
 * Example: 'Oct 30, 2026, 9:00 AM'
 */
export function formatReminderDateTime(isoString?: string): string {
  if (!isoString || typeof isoString !== 'string') return '';
  const parsed = Date.parse(isoString);
  if (isNaN(parsed)) return '';

  const d = new Date(parsed);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Formats a relative label for a reminder relative to the current time.
 */
export function formatRelativeReminder(isoString?: string, now: Date = new Date()): string {
  if (!isoString) return '';
  const parsed = Date.parse(isoString);
  if (isNaN(parsed)) return '';

  const diffMs = now.getTime() - parsed;
  const isPast = diffMs >= 0;
  const absDiffSec = Math.floor(Math.abs(diffMs) / 1000);
  const absDiffMin = Math.floor(absDiffSec / 60);
  const absDiffHours = Math.floor(absDiffMin / 60);

  if (isPast) {
    if (absDiffMin < 2) return 'Due just now';
    if (absDiffMin < 60) return `Missed (${absDiffMin}m ago)`;
    if (absDiffHours < 24) return `Missed (${absDiffHours}h ago)`;
    const days = Math.floor(absDiffHours / 24);
    return `Missed (${days}d ago)`;
  } else {
    if (absDiffMin < 60) return `Due in ${absDiffMin}m`;
    if (absDiffHours < 24) return `Due in ${absDiffHours}h`;
    const days = Math.floor(absDiffHours / 24);
    return `Due in ${days}d`;
  }
}

/**
 * Converts a UTC ISO 8601 string to a local 'YYYY-MM-DDTHH:mm' string for HTML datetime-local inputs.
 */
export function isoToDatetimeLocal(isoString?: string): string {
  if (!isoString) return '';
  const parsed = Date.parse(isoString);
  if (isNaN(parsed)) return '';

  const d = new Date(parsed);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converts an HTML datetime-local string ('YYYY-MM-DDTHH:mm') to a full ISO 8601 UTC string.
 */
export function datetimeLocalToIso(localString?: string): string | undefined {
  if (!localString || !localString.trim()) return undefined;
  const parsed = Date.parse(localString);
  if (isNaN(parsed)) return undefined;

  return new Date(localString).toISOString();
}
