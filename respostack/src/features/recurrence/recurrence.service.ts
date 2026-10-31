import { RecurrenceRule, WEEKDAYS } from './recurrence.types';
import { getDaysInMonth, isLeapYear } from '../../utils/validation';
import { getTodayDateString } from '../../utils/dateUtils';

/**
 * Calculates the next calendar due date ('YYYY-MM-DD') for a recurrence rule based on the current due date.
 * Returns null if the calculated date exceeds rule.endDate.
 *
 * Uses deterministic local calendar date arithmetic without fixed millisecond approximations.
 */
export function calculateNextOccurrenceDate(
  currentDueDateStr: string,
  rule: RecurrenceRule
): string | null {
  if (!currentDueDateStr || !rule) return null;

  const parts = currentDueDateStr.trim().split('-');
  if (parts.length !== 3) return null;

  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const interval = Math.max(1, Math.floor(rule.interval || 1));
  let nextDateStr = '';

  switch (rule.frequency) {
    case 'daily': {
      // Advance by interval calendar days using local noon to avoid DST hour shifts
      const cur = new Date(year, month - 1, day, 12, 0, 0);
      cur.setDate(cur.getDate() + interval);
      nextDateStr = getTodayDateString(cur);
      break;
    }

    case 'weekly': {
      const cur = new Date(year, month - 1, day, 12, 0, 0);
      const curDayOfWeek = cur.getDay(); // 0 = Sun ... 6 = Sat

      if (!rule.weekdays || rule.weekdays.length === 0) {
        // Standard weekly interval without specific weekday selection
        cur.setDate(cur.getDate() + interval * 7);
        nextDateStr = getTodayDateString(cur);
      } else {
        const sortedDays = Array.from(new Set(rule.weekdays)).sort((a, b) => a - b);
        // Look for next target weekday later in the current calendar week
        const nextDayInWeek = sortedDays.find((d) => d > curDayOfWeek);

        let daysToAdd: number;
        if (nextDayInWeek !== undefined) {
          daysToAdd = nextDayInWeek - curDayOfWeek;
        } else {
          // Wrap around to the first weekday of the next cycle
          const firstDay = sortedDays[0];
          daysToAdd = (7 - curDayOfWeek) + ((interval - 1) * 7) + firstDay;
        }
        cur.setDate(cur.getDate() + daysToAdd);
        nextDateStr = getTodayDateString(cur);
      }
      break;
    }

    case 'monthly': {
      // Original day of the month preserved across months with fewer days
      const targetDay = rule.monthDay !== undefined ? rule.monthDay : day;
      const totalMonths = year * 12 + (month - 1) + interval;
      const nextYear = Math.floor(totalMonths / 12);
      const nextMonth = (totalMonths % 12) + 1;

      // Handle months with fewer days by clamping to the last day of target month
      const maxDaysInTargetMonth = getDaysInMonth(nextYear, nextMonth);
      const clampedDay = Math.min(targetDay, maxDaysInTargetMonth);

      nextDateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
      break;
    }

    case 'yearly': {
      const nextYear = year + interval;
      let nextMonth = month;
      let nextDay = day;

      // Handle leap year boundary: February 29 on non-leap years clamps to February 28
      if (month === 2 && day === 29 && !isLeapYear(nextYear)) {
        nextDay = 28;
      }

      nextDateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
      break;
    }

    default:
      return null;
  }

  // Check end date constraint
  if (rule.endDate && rule.endDate.trim()) {
    if (nextDateStr > rule.endDate.trim()) {
      return null;
    }
  }

  return nextDateStr;
}

/**
 * Catch-up policy when opening after an extended offline period:
 * Advances iteratively from lastDueDate to the next scheduled occurrence on or after todayStr,
 * capped to prevent unbounded loops.
 */
export function calculateCatchUpOccurrenceDate(
  lastDueDateStr: string,
  rule: RecurrenceRule,
  todayStr: string = getTodayDateString(),
  maxIterations: number = 365
): string | null {
  let candidate = calculateNextOccurrenceDate(lastDueDateStr, rule);
  if (!candidate) return null;

  let iterations = 0;
  // If next occurrence is still in the past, advance through cycles until reaching today or future
  while (candidate < todayStr && iterations < maxIterations) {
    const nextCandidate = calculateNextOccurrenceDate(candidate, rule);
    if (!nextCandidate) {
      break;
    }
    candidate = nextCandidate;
    iterations++;
  }

  return candidate;
}

/**
 * Calculates the matching reminder instant on nextDueDate matching the time of currentReminderAt.
 */
export function calculateNextReminderInstant(
  currentReminderAt?: string,
  currentDueDate?: string,
  nextDueDate?: string
): string | undefined {
  if (!currentReminderAt || !nextDueDate) return undefined;

  const parsedReminder = Date.parse(currentReminderAt);
  if (isNaN(parsedReminder)) return undefined;

  const reminderDateObj = new Date(parsedReminder);

  // Extract hours, minutes, seconds from current reminder instant
  const hours = reminderDateObj.getUTCHours();
  const minutes = reminderDateObj.getUTCMinutes();
  const seconds = reminderDateObj.getUTCSeconds();
  const millis = reminderDateObj.getUTCMilliseconds();

  // Parse target date components
  const [targetYear, targetMonth, targetDay] = nextDueDate.split('-').map(Number);
  if (isNaN(targetYear) || isNaN(targetMonth) || isNaN(targetDay)) return undefined;

  // If currentDueDate was set, preserve exact day offset if any
  let dayOffset = 0;
  if (currentDueDate) {
    const [curYear, curMonth, curDay] = currentDueDate.split('-').map(Number);
    const remUtcDay = Date.UTC(reminderDateObj.getUTCFullYear(), reminderDateObj.getUTCMonth(), reminderDateObj.getUTCDate());
    const dueUtcDay = Date.UTC(curYear, curMonth - 1, curDay);
    dayOffset = Math.round((remUtcDay - dueUtcDay) / (1000 * 60 * 60 * 24));
  }

  const nextReminderUtc = Date.UTC(
    targetYear,
    targetMonth - 1,
    targetDay + dayOffset,
    hours,
    minutes,
    seconds,
    millis
  );

  return new Date(nextReminderUtc).toISOString();
}

/**
 * Formats a human-readable summary of a recurrence rule.
 * Example: "Repeats daily", "Repeats every 2 weeks on Mon, Fri", "Repeats monthly on the 31st"
 */
export function formatRecurrenceRule(rule?: RecurrenceRule): string {
  if (!rule) return 'Does not repeat';

  const interval = rule.interval || 1;
  const isEvery = interval === 1;

  switch (rule.frequency) {
    case 'daily':
      return isEvery ? 'Repeats daily' : `Repeats every ${interval} days`;

    case 'weekly': {
      let daysLabel = '';
      if (rule.weekdays && rule.weekdays.length > 0) {
        const sorted = [...new Set(rule.weekdays)].sort((a, b) => a - b);
        const dayNames = sorted.map((d) => WEEKDAYS.find((w) => w.value === d)?.label || '');
        daysLabel = ` on ${dayNames.join(', ')}`;
      }
      return isEvery
        ? `Repeats weekly${daysLabel}`
        : `Repeats every ${interval} weeks${daysLabel}`;
    }

    case 'monthly': {
      const daySuffix = rule.monthDay ? ` (day ${rule.monthDay})` : '';
      return isEvery
        ? `Repeats monthly${daySuffix}`
        : `Repeats every ${interval} months${daySuffix}`;
    }

    case 'yearly':
      return isEvery ? 'Repeats yearly' : `Repeats every ${interval} years`;

    default:
      return 'Repeats';
  }
}
