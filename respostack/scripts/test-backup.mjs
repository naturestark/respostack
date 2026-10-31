import test from 'node:test';
import assert from 'node:assert/strict';

// --- BACKUP CONSTANTS & VALIDATION RULES (Pure ESM) ---
const BACKUP_FORMAT_IDENTIFIER = 'life-admin-backup';
const CURRENT_BACKUP_VERSION = 3;
const SUPPORTED_BACKUP_VERSIONS = [1, 2, 3];
const MAX_BACKUP_RECORD_COUNT = 5000;
const CATEGORIES = ['Personal', 'Bills', 'Documents', 'Health', 'Education', 'Other'];

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(year, month) {
  if (month < 1 || month > 12) return 0;
  switch (month) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12: return 31;
    case 4: case 6: case 9: case 11: return 30;
    case 2: return isLeapYear(year) ? 29 : 28;
    default: return 0;
  }
}

function isValidCalendarDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (year < 1000 || year > 9999 || month < 1 || month > 12) return false;
  const maxDays = getDaysInMonth(year, month);
  return day >= 1 && day <= maxDays;
}

function isValidCurrencyCode(code) {
  return typeof code === 'string' && /^[A-Z]{3}$/.test(code);
}

function validateBackupObject(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { isValid: false, error: 'Invalid backup structure. Root content must be a JSON object.' };
  }

  if ((data.format !== BACKUP_FORMAT_IDENTIFIER && data.format !== 'respostack-backup') || (data.app !== 'Respostack' && data.app !== 'Life Admin')) {
    return { isValid: false, error: 'Unrecognized backup format.' };
  }

  if (typeof data.version !== 'number' || !Number.isInteger(data.version)) {
    return { isValid: false, error: 'Invalid backup version.' };
  }

  if (!SUPPORTED_BACKUP_VERSIONS.includes(data.version)) {
    return { isValid: false, error: `Unsupported backup version (${data.version}).` };
  }

  if (typeof data.exportedAt !== 'string' || isNaN(Date.parse(data.exportedAt))) {
    return { isValid: false, error: 'Invalid export timestamp.' };
  }

  if (!Array.isArray(data.responsibilities)) {
    return { isValid: false, error: 'Responsibilities must be an array.' };
  }

  if (data.responsibilities.length > MAX_BACKUP_RECORD_COUNT) {
    return { isValid: false, error: 'Backup exceeds maximum allowed record limit.' };
  }

  const seenIds = new Set();
  const sanitized = [];

  for (let idx = 0; idx < data.responsibilities.length; idx++) {
    const item = data.responsibilities[idx];
    const recNum = idx + 1;

    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return { isValid: false, error: `Record #${recNum} must be an object.` };
    }

    if (typeof item.id !== 'string' || !item.id.trim()) {
      return { isValid: false, error: `Record #${recNum} missing valid id.` };
    }
    const cleanId = item.id.trim();
    if (seenIds.has(cleanId)) {
      return { isValid: false, error: `Duplicate responsibility ID "${cleanId}" in record #${recNum}.` };
    }
    seenIds.add(cleanId);

    if (typeof item.title !== 'string' || !item.title.trim()) {
      return { isValid: false, error: `Record #${recNum}: Title cannot be empty.` };
    }
    if (item.title.trim().length > 200) {
      return { isValid: false, error: `Record #${recNum}: Title exceeds 200 characters.` };
    }

    if (!CATEGORIES.includes(item.category)) {
      return { isValid: false, error: `Record #${recNum}: Invalid category "${item.category}".` };
    }

    if (typeof item.isCompleted !== 'boolean') {
      return { isValid: false, error: `Record #${recNum}: isCompleted must be a boolean.` };
    }

    if (typeof item.createdAt !== 'string' || isNaN(Date.parse(item.createdAt))) {
      return { isValid: false, error: `Record #${recNum}: Invalid createdAt timestamp.` };
    }

    if (typeof item.updatedAt !== 'string' || isNaN(Date.parse(item.updatedAt))) {
      return { isValid: false, error: `Record #${recNum}: Invalid updatedAt timestamp.` };
    }

    if (item.isCompleted) {
      if (typeof item.completedAt !== 'string' || isNaN(Date.parse(item.completedAt))) {
        return { isValid: false, error: `Record #${recNum}: Completed item must include valid completedAt.` };
      }
    } else {
      if (item.completedAt) {
        return { isValid: false, error: `Record #${recNum}: Incomplete item cannot have completedAt.` };
      }
    }

    if (item.dueDate && !isValidCalendarDate(item.dueDate.trim())) {
      return { isValid: false, error: `Record #${recNum}: Invalid calendar date "${item.dueDate}".` };
    }

    if (item.amount !== undefined && item.amount !== null && item.amount !== '') {
      const num = Number(item.amount);
      if (isNaN(num) || !Number.isFinite(num) || num < 0 || num > 1_000_000_000) {
        return { isValid: false, error: `Record #${recNum}: Invalid amount.` };
      }
      if (Math.round(num * 100) !== Number((num * 100).toFixed(6))) {
        return { isValid: false, error: `Record #${recNum}: Amount has more than 2 decimal places.` };
      }
      if (!item.currency || !isValidCurrencyCode(item.currency.trim().toUpperCase())) {
        return { isValid: false, error: `Record #${recNum}: Invalid currency code.` };
      }
    }

    if (item.recurrence) {
      const rec = item.recurrence;
      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(rec.frequency)) {
        return { isValid: false, error: `Record #${recNum}: Invalid recurrence frequency.` };
      }
      if (!Number.isInteger(rec.interval) || rec.interval < 1) {
        return { isValid: false, error: `Record #${recNum}: Invalid recurrence interval.` };
      }
      if (rec.endDate && !isValidCalendarDate(rec.endDate.trim())) {
        return { isValid: false, error: `Record #${recNum}: Invalid recurrence end date.` };
      }
    }

    sanitized.push({ ...item });
  }

  return {
    isValid: true,
    backup: {
      app: 'Respostack',
      format: BACKUP_FORMAT_IDENTIFIER,
      version: data.version,
      exportedAt: data.exportedAt,
      itemCount: sanitized.length,
      responsibilities: sanitized,
    }
  };
}

function generateBackup(responsibilities, date = new Date()) {
  return {
    app: 'Respostack',
    format: BACKUP_FORMAT_IDENTIFIER,
    version: CURRENT_BACKUP_VERSION,
    exportedAt: date.toISOString(),
    itemCount: responsibilities.length,
    responsibilities: responsibilities.map(r => ({ ...r })),
  };
}

// Transaction simulation
class MockDatabase {
  constructor(initialItems = []) {
    this.records = new Map(initialItems.map(i => [i.id, { ...i }]));
  }
  async replaceAllAtomic(newItems, shouldFailAtIdx = -1) {
    const snapshot = new Map(this.records);
    try {
      this.records.clear();
      for (let i = 0; i < newItems.length; i++) {
        if (i === shouldFailAtIdx) {
          throw new Error('Simulated write failure');
        }
        this.records.set(newItems[i].id, { ...newItems[i] });
      }
    } catch (err) {
      this.records = snapshot;
      throw err;
    }
  }
}

// --- TEST SUITES ---

test('backup - serialization and metadata preservation (Version 3 with recurrence)', () => {
  const items = [
    {
      id: 'resp-1',
      seriesId: 'series-rent',
      title: 'Pay Apartment Rent',
      category: 'Bills',
      dueDate: '2026-11-01',
      amount: 1450.5,
      currency: 'USD',
      isCompleted: false,
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
      recurrence: { frequency: 'monthly', interval: 1, monthDay: 1 },
    },
    {
      id: 'resp-2',
      title: 'Annual Physical Exam',
      category: 'Health',
      dueDate: '2026-10-20',
      isCompleted: true,
      completedAt: '2026-10-20T11:00:00Z',
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-10-20T11:00:00Z',
    }
  ];

  const backup = generateBackup(items, new Date('2026-10-29T12:00:00Z'));
  assert.strictEqual(backup.app, 'Respostack');
  assert.strictEqual(backup.format, 'life-admin-backup');
  assert.strictEqual(backup.version, 3);
  assert.strictEqual(backup.exportedAt, '2026-10-29T12:00:00.000Z');
  assert.strictEqual(backup.itemCount, 2);
  assert.strictEqual(backup.responsibilities[0].amount, 1450.5);
  assert.strictEqual(backup.responsibilities[0].seriesId, 'series-rent');
  assert.strictEqual(backup.responsibilities[0].recurrence.frequency, 'monthly');
  assert.strictEqual(backup.responsibilities[1].isCompleted, true);

  const validation = validateBackupObject(backup);
  assert.strictEqual(validation.isValid, true);
});

test('backup - validation rejects malformed and untrusted data', () => {
  // Wrong app
  assert.strictEqual(validateBackupObject({ app: 'UnknownApp', format: 'life-admin-backup', version: 3, exportedAt: '2026-10-29T00:00:00Z', responsibilities: [] }).isValid, false);

  // Future unsupported version (>3)
  assert.strictEqual(validateBackupObject({ app: 'Respostack', format: 'life-admin-backup', version: 4, exportedAt: '2026-10-29T00:00:00Z', responsibilities: [] }).isValid, false);

  // Duplicate IDs
  const dup = {
    app: 'Respostack', format: 'life-admin-backup', version: 3, exportedAt: '2026-10-29T00:00:00Z',
    responsibilities: [
      { id: 'same', title: 'T1', category: 'Personal', isCompleted: false, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' },
      { id: 'same', title: 'T2', category: 'Personal', isCompleted: false, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' },
    ]
  };
  assert.strictEqual(validateBackupObject(dup).isValid, false);

  // Invalid recurrence frequency
  const badRecurrence = {
    app: 'Respostack', format: 'life-admin-backup', version: 3, exportedAt: '2026-10-29T00:00:00Z',
    responsibilities: [
      { id: '1', title: 'Task', category: 'Personal', isCompleted: false, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', recurrence: { frequency: 'hourly', interval: 1 } }
    ]
  };
  assert.strictEqual(validateBackupObject(badRecurrence).isValid, false);
});

test('backup - atomic replacement restore and rollback safety', async () => {
  const existingRecords = [
    { id: 'orig-1', title: 'Original Task 1', category: 'Personal' },
    { id: 'orig-2', title: 'Original Task 2', category: 'Bills' },
  ];
  const db = new MockDatabase(existingRecords);

  const incomingRecords = [
    { id: 'new-1', title: 'Restored Task 1', category: 'Health', recurrence: { frequency: 'daily', interval: 1 } },
    { id: 'new-2', title: 'Restored Task 2', category: 'Documents' },
  ];

  // 1. Successful replacement
  await db.replaceAllAtomic(incomingRecords);
  assert.strictEqual(db.records.size, 2);
  assert.strictEqual(db.records.has('new-1'), true);
  assert.strictEqual(db.records.has('orig-1'), false);

  // 2. Failed replacement triggers clean rollback
  await assert.rejects(
    async () => db.replaceAllAtomic([{ id: 'err-1' }, { id: 'err-2' }], 1),
    /Simulated write failure/
  );

  // Verify state rolled back to incomingRecords without being wiped or corrupted!
  assert.strictEqual(db.records.size, 2);
  assert.strictEqual(db.records.has('new-1'), true);
  assert.strictEqual(db.records.has('err-1'), false);
});
