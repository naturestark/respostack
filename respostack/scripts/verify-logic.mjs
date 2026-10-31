import test from 'node:test';
import assert from 'node:assert/strict';

// --- DOMAIN IMPLEMENTATION (Pure ESM for direct execution) ---
const CATEGORIES = ['Personal', 'Bills', 'Documents', 'Health', 'Education', 'Other'];

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(year, month) {
  if (month < 1 || month > 12) return 0;
  switch (month) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
      return 31;
    case 4: case 6: case 9: case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

function isValidCalendarDate(dateStr) {
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

function isValidCurrencyCode(code) {
  if (!code || typeof code !== 'string') return false;
  return /^[A-Z]{3}$/.test(code);
}

function validateResponsibility(data) {
  const errors = {};

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

  if (!data.category || !CATEGORIES.includes(data.category)) {
    errors.category = 'Please select a valid category.';
  }

  if (data.dueDate !== undefined && data.dueDate !== null && data.dueDate.trim() !== '') {
    const trimmedDate = data.dueDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      errors.dueDate = 'Due date must be in YYYY-MM-DD format.';
    } else if (!isValidCalendarDate(trimmedDate)) {
      errors.dueDate = 'Invalid calendar date. Please check the day and month.';
    }
  }

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

function getTodayDateString(refDate = new Date()) {
  const year = refDate.getFullYear();
  const month = String(refDate.getMonth() + 1).padStart(2, '0');
  const day = String(refDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function classifyDueDate(dueDate, todayStr = getTodayDateString(), isCompleted = false) {
  if (isCompleted) return 'none';
  if (!dueDate || typeof dueDate !== 'string' || !dueDate.trim()) return 'none';
  const trimmed = dueDate.trim();
  if (trimmed < todayStr) return 'overdue';
  if (trimmed === todayStr) return 'due-today';
  return 'upcoming';
}

function getDaysDifference(targetDateStr, todayStr = getTodayDateString()) {
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

function formatDueDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return 'No due date';
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRelativeDueLabel(dateStr, todayStr = getTodayDateString(), isCompleted = false) {
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
    return { text: `${days} ${days === 1 ? 'day' : 'days'} overdue`, status: 'overdue' };
  }
  if (diff === 0) return { text: 'Due today', status: 'due-today' };
  if (diff === 1) return { text: 'Due tomorrow', status: 'upcoming' };
  if (diff <= 7) return { text: `Due in ${diff} days`, status: 'upcoming' };
  return { text: formatDueDate(dateStr), status: 'upcoming' };
}

function filterResponsibilities(items, options) {
  const query = (options.searchQuery || '').trim().toLowerCase();
  const categoryFilter = options.category || 'ALL';
  const statusFilter = options.completionStatus || 'all';

  return items.filter((item) => {
    if (statusFilter === 'active' && item.isCompleted) return false;
    if (statusFilter === 'completed' && !item.isCompleted) return false;
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (query) {
      const matchTitle = item.title ? item.title.toLowerCase().includes(query) : false;
      const matchNotes = item.notes ? item.notes.toLowerCase().includes(query) : false;
      if (!matchTitle && !matchNotes) return false;
    }
    return true;
  });
}

function sortResponsibilities(items, sortBy, todayStr = getTodayDateString()) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'urgency': {
        if (!a.isCompleted && b.isCompleted) return -1;
        if (a.isCompleted && !b.isCompleted) return 1;

        if (a.isCompleted && b.isCompleted) {
          const dateA = a.completedAt || a.updatedAt;
          const dateB = b.completedAt || b.updatedAt;
          const cmp = dateB.localeCompare(dateA);
          return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
        }

        const statusA = classifyDueDate(a.dueDate, todayStr, a.isCompleted);
        const statusB = classifyDueDate(b.dueDate, todayStr, b.isCompleted);

        const statusRank = (s) => (s === 'overdue' ? 1 : s === 'due-today' ? 2 : s === 'upcoming' ? 3 : 4);
        const diff = statusRank(statusA) - statusRank(statusB);
        if (diff !== 0) return diff;

        if (a.dueDate && b.dueDate) {
          const dateDiff = a.dueDate.localeCompare(b.dueDate);
          if (dateDiff !== 0) return dateDiff;
        } else if (a.dueDate && !b.dueDate) {
          return -1;
        } else if (!a.dueDate && b.dueDate) {
          return 1;
        }

        const createdDiff = b.createdAt.localeCompare(a.createdAt);
        if (createdDiff !== 0) return createdDiff;
        return a.id.localeCompare(b.id);
      }
      case 'dueDateAsc': {
        if (a.dueDate && b.dueDate) {
          const diff = a.dueDate.localeCompare(b.dueDate);
          if (diff !== 0) return diff;
        } else if (a.dueDate && !b.dueDate) {
          return -1;
        } else if (!a.dueDate && b.dueDate) {
          return 1;
        }
        const createdDiff = b.createdAt.localeCompare(a.createdAt);
        if (createdDiff !== 0) return createdDiff;
        return a.id.localeCompare(b.id);
      }
      case 'titleAsc': {
        const titleDiff = a.title.localeCompare(b.title);
        if (titleDiff !== 0) return titleDiff;
        return a.id.localeCompare(b.id);
      }
      default:
        return 0;
    }
  });
  return sorted;
}

function computeMetrics(items, todayStr = getTodayDateString()) {
  let active = 0, completed = 0, overdue = 0, dueToday = 0, upcoming = 0;
  for (const item of items) {
    if (item.isCompleted) {
      completed++;
    } else {
      active++;
      const status = classifyDueDate(item.dueDate, todayStr, item.isCompleted);
      if (status === 'overdue') overdue++;
      else if (status === 'due-today') dueToday++;
      else if (status === 'upcoming') upcoming++;
    }
  }
  return { total: items.length, active, completed, overdue, dueToday, upcoming };
}

// ==================== TEST SUITES ====================

test('validation - titles, categories, leap years, currency, amounts', () => {
  // Title tests
  assert.strictEqual(validateResponsibility({ title: '', category: 'Personal' }).isValid, false);
  assert.strictEqual(validateResponsibility({ title: '   ', category: 'Personal' }).isValid, false);
  assert.strictEqual(validateResponsibility({ title: 'a'.repeat(201), category: 'Personal' }).isValid, false);
  assert.strictEqual(validateResponsibility({ title: 'Renew passport', category: 'Documents' }).isValid, true);

  // Category tests
  assert.strictEqual(validateResponsibility({ title: 'Valid', category: 'InvalidCat' }).isValid, false);

  // Leap year and calendar date tests
  assert.strictEqual(isValidCalendarDate('2024-02-29'), true); // 2024 is leap year
  assert.strictEqual(isValidCalendarDate('2028-02-29'), true); // 2028 is leap year
  assert.strictEqual(isValidCalendarDate('2025-02-29'), false); // 2025 non-leap
  assert.strictEqual(isValidCalendarDate('2026-02-29'), false); // 2026 non-leap
  assert.strictEqual(isValidCalendarDate('2026-02-30'), false); // Impossible
  assert.strictEqual(isValidCalendarDate('2026-04-31'), false); // April has 30 days
  assert.strictEqual(isValidCalendarDate('2026-06-31'), false); // June has 30 days

  // Currency validation
  assert.strictEqual(isValidCurrencyCode('USD'), true);
  assert.strictEqual(isValidCurrencyCode('EUR'), true);
  assert.strictEqual(isValidCurrencyCode('US'), false);
  assert.strictEqual(isValidCurrencyCode('USDD'), false);
  assert.strictEqual(isValidCurrencyCode('usd'), false);

  // Monetary Amount validation
  assert.strictEqual(validateResponsibility({ title: 'Bill', category: 'Bills', amount: -10 }).isValid, false);
  assert.strictEqual(validateResponsibility({ title: 'Bill', category: 'Bills', amount: 200, currency: '' }).isValid, false);
  assert.strictEqual(validateResponsibility({ title: 'Bill', category: 'Bills', amount: 200, currency: 'USD' }).isValid, true);
  assert.strictEqual(validateResponsibility({ title: 'Bill', category: 'Bills', amount: 15.999, currency: 'USD' }).isValid, false);
});

test('dateUtils - classification, completed items, month/year transitions, timezone isolation', () => {
  const FIXED_TODAY = '2026-10-29';

  // Active items
  assert.strictEqual(classifyDueDate('2026-10-28', FIXED_TODAY, false), 'overdue');
  assert.strictEqual(classifyDueDate('2026-10-29', FIXED_TODAY, false), 'due-today');
  assert.strictEqual(classifyDueDate('2026-10-30', FIXED_TODAY, false), 'upcoming');

  // Completed items must NEVER appear as active overdue
  assert.strictEqual(classifyDueDate('2026-10-20', FIXED_TODAY, true), 'none');
  assert.strictEqual(classifyDueDate('2026-10-29', FIXED_TODAY, true), 'none');

  // Month transitions (March 31 to April 1)
  assert.strictEqual(getDaysDifference('2026-04-01', '2026-03-31'), 1);
  assert.strictEqual(getDaysDifference('2026-03-31', '2026-04-01'), -1);

  // Year transitions (Dec 31 to Jan 1)
  assert.strictEqual(getDaysDifference('2027-01-01', '2026-12-31'), 1);
  assert.strictEqual(getDaysDifference('2026-12-31', '2027-01-01'), -1);

  // Leap year boundary (Feb 28 to March 1 in 2024 = 2 days difference)
  assert.strictEqual(getDaysDifference('2024-03-01', '2024-02-28'), 2);

  // Non-leap year boundary (Feb 28 to March 1 in 2025 = 1 day difference)
  assert.strictEqual(getDaysDifference('2025-03-01', '2025-02-28'), 1);

  // Relative labels
  assert.strictEqual(getRelativeDueLabel('2026-10-28', FIXED_TODAY, false).text, '1 day overdue');
  assert.strictEqual(getRelativeDueLabel('2026-10-25', FIXED_TODAY, false).text, '4 days overdue');
  assert.strictEqual(getRelativeDueLabel('2026-10-29', FIXED_TODAY, false).text, 'Due today');
  assert.strictEqual(getRelativeDueLabel('2026-10-30', FIXED_TODAY, false).text, 'Due tomorrow');

  // Relative label for completed item does not claim overdue
  assert.strictEqual(getRelativeDueLabel('2026-10-20', FIXED_TODAY, true).status, 'none');

  // Format date
  assert.match(formatDueDate('2026-10-29'), /Oct 29, 2026/);
});

test('filterSortUtils - search trimming, stable sorting, completed ranking, metrics', () => {
  const FIXED_TODAY = '2026-10-29';
  const items = [
    { id: '1', title: 'Pay Water Bill', category: 'Bills', dueDate: '2026-10-27', isCompleted: false, createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z' },
    { id: '2', title: 'Dentist visit', category: 'Health', dueDate: '2026-10-29', isCompleted: false, createdAt: '2026-10-02T10:00:00Z', updatedAt: '2026-10-02T10:00:00Z' },
    { id: '3', title: 'Renew Passport', category: 'Documents', dueDate: '2026-11-15', isCompleted: false, createdAt: '2026-10-03T10:00:00Z', updatedAt: '2026-10-03T10:00:00Z' },
    { id: '4', title: 'Oil change', category: 'Personal', isCompleted: false, createdAt: '2026-10-04T10:00:00Z', updatedAt: '2026-10-04T10:00:00Z' },
    { id: '5', title: 'File Tax return', category: 'Bills', dueDate: '2026-10-15', isCompleted: true, completedAt: '2026-10-15T10:00:00Z', createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-10-15T10:00:00Z' },
  ];

  // Whitespace-trimmed search
  const searchWater = filterResponsibilities(items, { searchQuery: '   water   ' });
  assert.strictEqual(searchWater.length, 1);
  assert.strictEqual(searchWater[0].id, '1');

  // Urgency sorting puts completed item 5 at the end, not at top as overdue
  const sorted = sortResponsibilities(items, 'urgency', FIXED_TODAY);
  assert.strictEqual(sorted[0].id, '1'); // active overdue
  assert.strictEqual(sorted[1].id, '2'); // active due today
  assert.strictEqual(sorted[2].id, '3'); // active upcoming
  assert.strictEqual(sorted[3].id, '4'); // active no date
  assert.strictEqual(sorted[4].id, '5'); // completed item at end

  // Stable sorting when multiple items share same due date
  const tieItems = [
    { id: 'b', title: 'B', category: 'Personal', dueDate: '2026-11-01', isCompleted: false, createdAt: '2026-10-01T10:00:00Z' },
    { id: 'a', title: 'A', category: 'Personal', dueDate: '2026-11-01', isCompleted: false, createdAt: '2026-10-01T12:00:00Z' },
  ];
  const tieSorted = sortResponsibilities(tieItems, 'urgency', FIXED_TODAY);
  assert.strictEqual(tieSorted[0].id, 'a'); // newer createdAt first
  assert.strictEqual(tieSorted[1].id, 'b');

  // Metrics: completed item does not increment overdue count
  const metrics = computeMetrics(items, FIXED_TODAY);
  assert.strictEqual(metrics.total, 5);
  assert.strictEqual(metrics.active, 4);
  assert.strictEqual(metrics.completed, 1);
  assert.strictEqual(metrics.overdue, 1); // Only item 1
  assert.strictEqual(metrics.dueToday, 1); // Only item 2
  assert.strictEqual(metrics.upcoming, 1); // Only item 3
});
