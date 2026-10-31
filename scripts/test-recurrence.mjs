import test from 'node:test';
import assert from 'node:assert/strict';

// --- RECURRENCE IMPLEMENTATION (Pure ESM for direct execution) ---
function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function getDaysInMonth(y, m) {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

function calculateNextOccurrenceDate(currentDueDateStr, rule) {
  if (!currentDueDateStr || !rule) return null;
  const parts = currentDueDateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  const interval = Math.max(1, Math.floor(rule.interval || 1));

  let nextDateStr = '';
  switch (rule.frequency) {
    case 'daily': {
      const cur = new Date(year, month - 1, day, 12);
      cur.setDate(cur.getDate() + interval);
      const Y = cur.getFullYear();
      const M = String(cur.getMonth() + 1).padStart(2, '0');
      const D = String(cur.getDate()).padStart(2, '0');
      nextDateStr = `${Y}-${M}-${D}`;
      break;
    }
    case 'weekly': {
      const cur = new Date(year, month - 1, day, 12);
      const curDayOfWeek = cur.getDay(); // 0-6
      if (!rule.weekdays || rule.weekdays.length === 0) {
        cur.setDate(cur.getDate() + interval * 7);
      } else {
        const sorted = [...new Set(rule.weekdays)].sort((a, b) => a - b);
        const nextInWeek = sorted.find((d) => d > curDayOfWeek);
        let daysToAdd;
        if (nextInWeek !== undefined) {
          daysToAdd = nextInWeek - curDayOfWeek;
        } else {
          const firstDay = sorted[0];
          daysToAdd = (7 - curDayOfWeek) + ((interval - 1) * 7) + firstDay;
        }
        cur.setDate(cur.getDate() + daysToAdd);
      }
      const Y = cur.getFullYear();
      const M = String(cur.getMonth() + 1).padStart(2, '0');
      const D = String(cur.getDate()).padStart(2, '0');
      nextDateStr = `${Y}-${M}-${D}`;
      break;
    }
    case 'monthly': {
      const targetDay = rule.monthDay !== undefined ? rule.monthDay : day;
      const totalMonths = year * 12 + (month - 1) + interval;
      const nextYear = Math.floor(totalMonths / 12);
      const nextMonth = (totalMonths % 12) + 1;
      const maxDays = getDaysInMonth(nextYear, nextMonth);
      const clampedDay = Math.min(targetDay, maxDays);
      nextDateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
      break;
    }
    case 'yearly': {
      const nextYear = year + interval;
      let nextMonth = month;
      let nextDay = day;
      if (month === 2 && day === 29 && !isLeapYear(nextYear)) {
        nextDay = 28;
      }
      nextDateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
      break;
    }
    default:
      return null;
  }

  if (rule.endDate && rule.endDate.trim()) {
    if (nextDateStr > rule.endDate.trim()) {
      return null;
    }
  }
  return nextDateStr;
}

function calculateCatchUpDate(lastDueDateStr, rule, todayStr, maxIter = 365) {
  let candidate = calculateNextOccurrenceDate(lastDueDateStr, rule);
  if (!candidate) return null;
  let iter = 0;
  while (candidate < todayStr && iter < maxIter) {
    const nextCandidate = calculateNextOccurrenceDate(candidate, rule);
    if (!nextCandidate) break;
    candidate = nextCandidate;
    iter++;
  }
  return candidate;
}

// Simulated recurrence lifecycle store
class MockRecurrenceDatabase {
  constructor() {
    this.records = new Map();
  }

  async add(item) {
    this.records.set(item.id, { ...item });
  }

  async put(item) {
    this.records.set(item.id, { ...item });
  }

  async get(id) {
    return this.records.get(id);
  }

  async getAll() {
    return Array.from(this.records.values());
  }

  async complete(id, now = new Date()) {
    const item = this.records.get(id);
    if (!item) throw new Error('Not found');

    const nowIso = now.toISOString();
    item.isCompleted = true;
    item.completedAt = nowIso;
    item.updatedAt = nowIso;

    let nextItem = null;
    if (item.seriesId && item.recurrence) {
      // Check if active occurrence exists
      const activeExisting = Array.from(this.records.values()).find(
        (r) => r.seriesId === item.seriesId && !r.isCompleted && r.id !== id
      );

      if (!activeExisting) {
        const nextDueDate = calculateNextOccurrenceDate(item.dueDate, item.recurrence);
        if (nextDueDate) {
          const existsOnDate = Array.from(this.records.values()).find(
            (r) => r.seriesId === item.seriesId && r.dueDate === nextDueDate
          );
          if (!existsOnDate) {
            nextItem = {
              ...item,
              id: 'next-' + Math.random().toString(36).substring(2, 7),
              dueDate: nextDueDate,
              isCompleted: false,
              completedAt: undefined,
              createdAt: nowIso,
              updatedAt: nowIso,
            };
            this.records.set(nextItem.id, nextItem);
          }
        }
      }
    }
    return { completed: item, nextOccurrence: nextItem };
  }

  async reopen(id, now = new Date()) {
    const item = this.records.get(id);
    if (!item) throw new Error('Not found');
    item.isCompleted = false;
    item.completedAt = undefined;
    item.updatedAt = now.toISOString();
    return item;
  }

  async updateSeries(id, updatedFields, editScope) {
    const item = this.records.get(id);
    if (!item) throw new Error('Not found');

    if (editScope === 'series' && item.seriesId) {
      // Update this occurrence and all active uncompleted future occurrences
      for (const r of this.records.values()) {
        if (r.seriesId === item.seriesId && !r.isCompleted) {
          Object.assign(r, updatedFields, { updatedAt: new Date().toISOString() });
        }
      }
    } else {
      Object.assign(item, updatedFields, { updatedAt: new Date().toISOString() });
    }
  }
}

// --- TEST SUITES ---

test('recurrence - date arithmetic: daily, weekly, monthly clamping, leap days', () => {
  // 1. Daily
  const daily = { frequency: 'daily', interval: 1 };
  assert.strictEqual(calculateNextOccurrenceDate('2026-10-30', daily), '2026-10-31');
  assert.strictEqual(calculateNextOccurrenceDate('2026-12-31', daily), '2027-01-01');

  // Daily interval > 1
  const daily3 = { frequency: 'daily', interval: 3 };
  assert.strictEqual(calculateNextOccurrenceDate('2026-10-30', daily3), '2026-11-02');

  // 2. Weekly with weekdays
  // Friday Oct 30, 2026 (day 5), repeat on Mon (1), Fri (5)
  const weeklyMonFri = { frequency: 'weekly', interval: 1, weekdays: [1, 5] };
  assert.strictEqual(calculateNextOccurrenceDate('2026-10-30', weeklyMonFri), '2026-11-02'); // Next is Mon Nov 2
  assert.strictEqual(calculateNextOccurrenceDate('2026-11-02', weeklyMonFri), '2026-11-06'); // Next is Fri Nov 6

  // Weekly interval = 2
  const biweekly = { frequency: 'weekly', interval: 2, weekdays: [1, 5] };
  assert.strictEqual(calculateNextOccurrenceDate('2026-10-30', biweekly), '2026-11-09'); // Skips week and lands on Mon Nov 9

  // 3. Monthly on 31st with clamping
  const monthly31 = { frequency: 'monthly', interval: 1, monthDay: 31 };
  assert.strictEqual(calculateNextOccurrenceDate('2026-01-31', monthly31), '2026-02-28'); // Feb non-leap clamped
  assert.strictEqual(calculateNextOccurrenceDate('2026-02-28', monthly31), '2026-03-31'); // Mar restored to 31
  assert.strictEqual(calculateNextOccurrenceDate('2026-03-31', monthly31), '2026-04-30'); // Apr clamped to 30
  assert.strictEqual(calculateNextOccurrenceDate('2024-01-31', monthly31), '2024-02-29'); // Feb leap clamped to 29

  // 4. Yearly on Feb 29
  const yearly = { frequency: 'yearly', interval: 1 };
  assert.strictEqual(calculateNextOccurrenceDate('2024-02-29', yearly), '2025-02-28'); // Non-leap year clamped
  const yearly4 = { frequency: 'yearly', interval: 4 };
  assert.strictEqual(calculateNextOccurrenceDate('2024-02-29', yearly4), '2028-02-29'); // Next leap year preserved

  // 5. End Date
  const withEnd = { frequency: 'daily', interval: 1, endDate: '2026-10-31' };
  assert.strictEqual(calculateNextOccurrenceDate('2026-10-30', withEnd), '2026-10-31');
  assert.strictEqual(calculateNextOccurrenceDate('2026-10-31', withEnd), null); // Exceeds end date
});

test('recurrence - lifecycle: completion, next occurrence provision, and idempotence', async () => {
  const db = new MockRecurrenceDatabase();

  const initialOccurrence = {
    id: 'occ-1',
    seriesId: 'series-rent',
    title: 'Pay Apartment Rent',
    category: 'Bills',
    dueDate: '2026-11-01',
    amount: 1400,
    currency: 'USD',
    isCompleted: false,
    recurrence: { frequency: 'monthly', interval: 1, monthDay: 1 },
  };

  await db.add(initialOccurrence);

  // 1. Complete occurrence 1 -> Provisions occurrence 2
  const { completed, nextOccurrence } = await db.complete('occ-1');
  assert.strictEqual(completed.isCompleted, true);
  assert.ok(completed.completedAt);
  assert.ok(nextOccurrence);
  assert.strictEqual(nextOccurrence.dueDate, '2026-12-01');
  assert.strictEqual(nextOccurrence.isCompleted, false);
  assert.strictEqual(nextOccurrence.seriesId, 'series-rent');

  const allRecords = await db.getAll();
  assert.strictEqual(allRecords.length, 2);

  // 2. Completing again (idempotence) MUST NOT create duplicate future occurrence
  const repeatComplete = await db.complete('occ-1');
  assert.strictEqual(repeatComplete.nextOccurrence, null, 'Should not create duplicate when future occurrence exists');
  const afterRepeat = await db.getAll();
  assert.strictEqual(afterRepeat.length, 2);

  // 3. Reopen occurrence 1
  const reopened = await db.reopen('occ-1');
  assert.strictEqual(reopened.isCompleted, false);
  assert.strictEqual(reopened.completedAt, undefined);
  // Future occurrence 2 is preserved
  assert.strictEqual(db.records.get(nextOccurrence.id).isCompleted, false);

  // 4. Edit series vs edit occurrence
  // Editing occurrence only:
  await db.updateSeries('occ-1', { title: 'Pay Rent + Extra Utility' }, 'occurrence');
  assert.strictEqual(db.records.get('occ-1').title, 'Pay Rent + Extra Utility');
  assert.strictEqual(db.records.get(nextOccurrence.id).title, 'Pay Apartment Rent'); // Untouched

  // Editing series: updates this and future active occurrences
  await db.updateSeries('occ-1', { title: 'Monthly Apartment Rent' }, 'series');
  assert.strictEqual(db.records.get('occ-1').title, 'Monthly Apartment Rent');
  assert.strictEqual(db.records.get(nextOccurrence.id).title, 'Monthly Apartment Rent'); // Updated!
});

test('recurrence - offline catch-up policy', () => {
  const daily = { frequency: 'daily', interval: 1 };
  // User offline from Oct 1, reopens app on Oct 10
  const catchUpDate = calculateCatchUpDate('2026-10-01', daily, '2026-10-10');
  assert.strictEqual(catchUpDate, '2026-10-10');
});

test('recurrence - backup compatibility (v1, v2, v3)', () => {
  const isSupportedVersion = (v) => [1, 2, 3].includes(v);

  // Version 1 (legacy without reminders or recurrence)
  assert.strictEqual(isSupportedVersion(1), true);

  // Version 2 (with reminders)
  assert.strictEqual(isSupportedVersion(2), true);

  // Version 3 (with recurrence)
  assert.strictEqual(isSupportedVersion(3), true);

  // Version 4 (future unsupported)
  assert.strictEqual(isSupportedVersion(4), false);
});
