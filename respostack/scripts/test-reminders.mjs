import test from 'node:test';
import assert from 'node:assert/strict';

// --- REMINDER LOGIC IMPLEMENTATION (Pure ESM for direct execution) ---
function isReminderDue(reminderAt, now = new Date()) {
  if (!reminderAt || typeof reminderAt !== 'string') return false;
  const parsed = Date.parse(reminderAt);
  if (isNaN(parsed)) return false;
  return parsed <= now.getTime();
}

function getReminderStatus(responsibility, now = new Date()) {
  if (responsibility.isCompleted) return 'completed';
  if (!responsibility.reminderAt) return 'none';
  const parsed = Date.parse(responsibility.reminderAt);
  if (isNaN(parsed)) return 'none';

  const diffMs = now.getTime() - parsed;
  if (diffMs < 0) return 'upcoming';
  if (diffMs > 15 * 60 * 1000) return 'missed';
  return 'due';
}

function getActiveReminderAttentionItems(responsibilities, now = new Date()) {
  const attention = [];
  for (const resp of responsibilities) {
    if (resp.isCompleted || !resp.reminderAt) continue;
    const status = getReminderStatus(resp, now);
    if (status === 'due' || status === 'missed') {
      attention.push({
        responsibility: resp,
        status,
        reminderAt: resp.reminderAt,
      });
    }
  }
  attention.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'due' ? -1 : 1;
    return Date.parse(b.reminderAt) - Date.parse(a.reminderAt);
  });
  return attention;
}

function isValidReminderTimestamp(ts) {
  if (!ts || typeof ts !== 'string') return false;
  const parsed = Date.parse(ts);
  if (isNaN(parsed)) return false;
  const d = new Date(parsed);
  const y = d.getFullYear();
  return y >= 1000 && y <= 9999;
}

// Simulated notification scheduler & deduplication store
class MockNotificationScheduler {
  constructor() {
    this.logs = new Map(); // id -> { id, responsibilityId, reminderAt, notifiedAt, dismissedAt }
    this.notificationsDispatched = [];
    this.preferenceEnabled = false;
    this.permission = 'default';
  }

  setPreference(enabled) {
    this.preferenceEnabled = enabled;
  }

  setPermission(perm) {
    this.permission = perm;
  }

  async checkAndDispatch(responsibilities, now = new Date()) {
    if (this.permission !== 'granted' || !this.preferenceEnabled) {
      return 0;
    }

    let count = 0;
    for (const item of responsibilities) {
      if (item.isCompleted || !item.reminderAt) continue;
      const parsed = Date.parse(item.reminderAt);
      if (isNaN(parsed) || parsed > now.getTime()) continue;

      const logId = `${item.id}:${item.reminderAt}`;
      const existing = this.logs.get(logId);
      if (existing && (existing.notifiedAt || existing.dismissedAt)) {
        // Suppress duplicate notification!
        continue;
      }

      // Dispatch
      this.notificationsDispatched.push({
        title: 'Respostack Reminder',
        body: `"${item.title}" is due now.`,
        tag: `reminder-${item.id}`,
      });

      this.logs.set(logId, {
        id: logId,
        responsibilityId: item.id,
        reminderAt: item.reminderAt,
        notifiedAt: now.toISOString(),
      });
      count++;
    }
    return count;
  }

  dismiss(responsibilityId, reminderAt, now = new Date()) {
    const logId = `${responsibilityId}:${reminderAt}`;
    this.logs.set(logId, {
      id: logId,
      responsibilityId,
      reminderAt,
      dismissedAt: now.toISOString(),
    });
  }
}

// Backup compatibility validator
function validateBackup(data) {
  if (!data || (data.app !== 'Respostack' && data.app !== 'Life Admin') || (data.format !== 'life-admin-backup' && data.format !== 'respostack-backup')) {
    return { isValid: false, error: 'Unrecognized format' };
  }
  // Supports version 1 (legacy without reminderAt) and version 2 (with reminderAt)
  if (![1, 2].includes(data.version)) {
    return { isValid: false, error: `Unsupported backup version: ${data.version}` };
  }
  if (!Array.isArray(data.responsibilities)) {
    return { isValid: false, error: 'Responsibilities must be an array' };
  }

  for (const item of data.responsibilities) {
    if (!item.id || !item.title) {
      return { isValid: false, error: 'Missing required item fields' };
    }
    if (item.reminderAt && !isValidReminderTimestamp(item.reminderAt)) {
      return { isValid: false, error: `Invalid reminderAt timestamp: ${item.reminderAt}` };
    }
  }
  return { isValid: true };
}

// --- TEST SUITES ---

test('reminders - timestamp validation and format conversion', () => {
  assert.strictEqual(isValidReminderTimestamp('2026-10-30T09:00:00.000Z'), true);
  assert.strictEqual(isValidReminderTimestamp('2026-10-30T14:30'), true);
  assert.strictEqual(isValidReminderTimestamp(''), false);
  assert.strictEqual(isValidReminderTimestamp('invalid-date'), false);
  assert.strictEqual(isValidReminderTimestamp('2026-99-99T99:99'), false);
});

test('reminders - eligibility rules, missed reminders, and completion isolation', () => {
  const FIXED_NOW = new Date('2026-10-30T10:00:00.000Z');

  // 1. Due now
  const dueItem = { id: '1', title: 'Task 1', isCompleted: false, reminderAt: '2026-10-30T09:55:00.000Z' };
  assert.strictEqual(isReminderDue(dueItem.reminderAt, FIXED_NOW), true);
  assert.strictEqual(getReminderStatus(dueItem, FIXED_NOW), 'due');

  // 2. Future reminder
  const futureItem = { id: '2', title: 'Task 2', isCompleted: false, reminderAt: '2026-10-30T11:00:00.000Z' };
  assert.strictEqual(isReminderDue(futureItem.reminderAt, FIXED_NOW), false);
  assert.strictEqual(getReminderStatus(futureItem, FIXED_NOW), 'upcoming');

  // 3. Missed reminder (occurred 2h ago while app was closed)
  const missedItem = { id: '3', title: 'Task 3', isCompleted: false, reminderAt: '2026-10-30T08:00:00.000Z' };
  assert.strictEqual(isReminderDue(missedItem.reminderAt, FIXED_NOW), true);
  assert.strictEqual(getReminderStatus(missedItem, FIXED_NOW), 'missed');

  // 4. Completed item with past reminder: MUST NEVER be active
  const completedItem = { id: '4', title: 'Task 4', isCompleted: true, reminderAt: '2026-10-30T08:00:00.000Z' };
  assert.strictEqual(getReminderStatus(completedItem, FIXED_NOW), 'completed');

  // 5. Undated task with reminder
  const undatedItem = { id: '5', title: 'Task 5', dueDate: undefined, isCompleted: false, reminderAt: '2026-10-30T09:50:00.000Z' };
  assert.strictEqual(getReminderStatus(undatedItem, FIXED_NOW), 'due');

  // 6. In-app attention aggregation
  const attention = getActiveReminderAttentionItems([dueItem, futureItem, missedItem, completedItem, undatedItem], FIXED_NOW);
  assert.strictEqual(attention.length, 3); // dueItem, missedItem, undatedItem
  assert.strictEqual(attention[0].status, 'due'); // 'due' comes before 'missed'
});

test('notifications - deduplication, preferences, and permissions', async () => {
  const FIXED_NOW = new Date('2026-10-30T10:00:00.000Z');
  const scheduler = new MockNotificationScheduler();

  const item = { id: 'resp-1', title: 'Property Tax', isCompleted: false, reminderAt: '2026-10-30T09:30:00.000Z' };

  // 1. When permission is default and preference is disabled -> 0 dispatched
  let dispatched = await scheduler.checkAndDispatch([item], FIXED_NOW);
  assert.strictEqual(dispatched, 0);
  assert.strictEqual(scheduler.notificationsDispatched.length, 0);

  // 2. When permission granted and enabled -> 1 dispatched
  scheduler.setPermission('granted');
  scheduler.setPreference(true);

  dispatched = await scheduler.checkAndDispatch([item], FIXED_NOW);
  assert.strictEqual(dispatched, 1);
  assert.strictEqual(scheduler.notificationsDispatched.length, 1);
  assert.strictEqual(scheduler.notificationsDispatched[0].tag, 'reminder-resp-1');

  // 3. Repeated evaluation MUST BE DEDUPLICATED (0 dispatched)
  dispatched = await scheduler.checkAndDispatch([item], FIXED_NOW);
  assert.strictEqual(dispatched, 0);
  assert.strictEqual(scheduler.notificationsDispatched.length, 1); // Still 1!

  // 4. User edits reminder time -> becomes eligible again for new time
  const updatedItem = { ...item, reminderAt: '2026-10-30T09:45:00.000Z' };
  dispatched = await scheduler.checkAndDispatch([updatedItem], FIXED_NOW);
  assert.strictEqual(dispatched, 1);
  assert.strictEqual(scheduler.notificationsDispatched.length, 2);

  // 5. Dismissed reminder is suppressed
  const itemToDismiss = { id: 'resp-2', title: 'Doctor', isCompleted: false, reminderAt: '2026-10-30T09:00:00.000Z' };
  scheduler.dismiss(itemToDismiss.id, itemToDismiss.reminderAt, FIXED_NOW);

  dispatched = await scheduler.checkAndDispatch([itemToDismiss], FIXED_NOW);
  assert.strictEqual(dispatched, 0); // Suppressed because dismissed
});

test('backup migration & compatibility - versions 1 and 2', () => {
  // Legacy Version 1 Backup (no reminderAt field)
  const v1Backup = {
    app: 'Life Admin',
    format: 'life-admin-backup',
    version: 1,
    exportedAt: '2026-10-28T10:00:00Z',
    itemCount: 1,
    responsibilities: [
      {
        id: 'legacy-1',
        title: 'Legacy task without reminder',
        category: 'Personal',
        dueDate: '2026-11-01',
        isCompleted: false,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      }
    ]
  };

  const v1Result = validateBackup(v1Backup);
  assert.strictEqual(v1Result.isValid, true, 'Legacy Version 1 backup must remain 100% restorable');

  // New Version 2 Backup (with reminderAt field)
  const v2Backup = {
    app: 'Life Admin',
    format: 'life-admin-backup',
    version: 2,
    exportedAt: '2026-10-30T10:00:00Z',
    itemCount: 1,
    responsibilities: [
      {
        id: 'v2-1',
        title: 'Task with reminder',
        category: 'Bills',
        dueDate: '2026-11-05',
        reminderAt: '2026-11-05T09:00:00.000Z',
        isCompleted: false,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      }
    ]
  };

  const v2Result = validateBackup(v2Backup);
  assert.strictEqual(v2Result.isValid, true, 'Version 2 backup with reminderAt must be valid');

  // Version 3 (Unsupported future version)
  const v3Backup = { ...v2Backup, version: 3 };
  const v3Result = validateBackup(v3Backup);
  assert.strictEqual(v3Result.isValid, false, 'Unsupported future versions must be rejected');
});
