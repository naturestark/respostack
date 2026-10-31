import test from 'node:test';
import assert from 'node:assert/strict';

// In-memory mock database simulating IndexedDB / Dexie table semantics
class MockTable {
  constructor() {
    this.store = new Map();
  }
  async toArray() {
    return Array.from(this.store.values());
  }
  async get(id) {
    return this.store.get(id);
  }
  async add(item) {
    if (this.store.has(item.id)) {
      throw new Error(`Key already exists: ${item.id}`);
    }
    this.store.set(item.id, { ...item });
  }
  async put(item) {
    this.store.set(item.id, { ...item });
  }
  async delete(id) {
    this.store.delete(id);
  }
  async clear() {
    this.store.clear();
  }
}

// Simulating the repository logic
function createRepo(table) {
  const CATEGORIES = ['Personal', 'Bills', 'Documents', 'Health', 'Education', 'Other'];

  function validate(formData) {
    const errors = {};
    if (!formData.title || !formData.title.trim()) errors.title = 'Title required';
    if (!formData.category || !CATEGORIES.includes(formData.category)) errors.category = 'Category invalid';
    if (formData.amount !== undefined && formData.amount !== null && formData.amount !== '') {
      const num = Number(formData.amount);
      if (isNaN(num) || num < 0 || !Number.isFinite(num)) errors.amount = 'Amount invalid';
      const cur = formData.currency ? formData.currency.trim().toUpperCase() : '';
      if (!/^[A-Z]{3}$/.test(cur)) errors.currency = 'Currency invalid';
    }
    return { isValid: Object.keys(errors).length === 0, errors };
  }

  return {
    async create(formData) {
      const v = validate(formData);
      if (!v.isValid) throw new Error(`Validation failed: ${JSON.stringify(v.errors)}`);
      const now = new Date().toISOString();
      const id = 'resp-' + Math.random().toString(36).substring(2, 9);
      const parsedAmount = formData.amount !== undefined && formData.amount !== '' ? Number(formData.amount) : undefined;
      const item = {
        id,
        title: formData.title.trim(),
        category: formData.category,
        dueDate: formData.dueDate?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        amount: parsedAmount,
        currency: parsedAmount !== undefined ? (formData.currency?.trim().toUpperCase() || 'USD') : undefined,
        isCompleted: false,
        createdAt: now,
        updatedAt: now,
      };
      await table.add(item);
      return item;
    },
    async update(id, formData) {
      const existing = await table.get(id);
      if (!existing) throw new Error('Not found');
      const merged = {
        title: formData.title !== undefined ? formData.title : existing.title,
        category: formData.category !== undefined ? formData.category : existing.category,
        dueDate: formData.dueDate !== undefined ? formData.dueDate : existing.dueDate,
        notes: formData.notes !== undefined ? formData.notes : existing.notes,
        amount: formData.amount !== undefined ? formData.amount : existing.amount,
        currency: formData.currency !== undefined ? formData.currency : existing.currency,
      };
      const v = validate(merged);
      if (!v.isValid) throw new Error(`Validation failed: ${JSON.stringify(v.errors)}`);
      const now = new Date().toISOString();
      const parsedAmount = merged.amount !== undefined && merged.amount !== '' ? Number(merged.amount) : undefined;
      const updated = {
        ...existing,
        title: merged.title.trim(),
        category: merged.category,
        dueDate: merged.dueDate?.trim() || undefined,
        notes: merged.notes?.trim() || undefined,
        amount: parsedAmount,
        currency: parsedAmount !== undefined ? (merged.currency?.trim().toUpperCase() || 'USD') : undefined,
        createdAt: existing.createdAt, // PRESERVED
        updatedAt: now,
      };
      await table.put(updated);
      return updated;
    },
    async toggleComplete(id) {
      const existing = await table.get(id);
      if (!existing) throw new Error('Not found');
      const next = !existing.isCompleted;
      const now = new Date().toISOString();
      const updated = {
        ...existing,
        isCompleted: next,
        completedAt: next ? now : undefined,
        updatedAt: now,
      };
      await table.put(updated);
      return updated;
    },
    async delete(id) {
      await table.delete(id);
    }
  };
}

test('repository - creation, validation, immutability, timestamps', async () => {
  const table = new MockTable();
  const repo = createRepo(table);

  // 1. Create valid
  const item = await repo.create({
    title: '  Dentist Cleaning  ',
    category: 'Health',
    amount: 75,
    currency: 'USD',
  });
  assert.strictEqual(item.title, 'Dentist Cleaning');
  assert.strictEqual(item.isCompleted, false);
  assert.strictEqual(item.completedAt, undefined);
  assert.ok(item.createdAt);
  assert.strictEqual(item.createdAt, item.updatedAt);

  // 2. Reject invalid creation
  await assert.rejects(
    async () => repo.create({ title: '', category: 'Personal' }),
    /Validation failed/
  );

  // 3. Update preserves createdAt and ID
  await new Promise((r) => setTimeout(r, 10));
  const updated = await repo.update(item.id, {
    title: 'Dr. Smith Dentist Cleaning',
  });
  assert.strictEqual(updated.id, item.id);
  assert.strictEqual(updated.createdAt, item.createdAt);
  assert.notStrictEqual(updated.updatedAt, item.updatedAt);
  assert.strictEqual(updated.title, 'Dr. Smith Dentist Cleaning');

  // 4. Reject update with empty title
  await assert.rejects(
    async () => repo.update(item.id, { title: '   ' }),
    /Validation failed/
  );

  // 5. Toggle complete sets completedAt, reopen clears it
  const completed = await repo.toggleComplete(item.id);
  assert.strictEqual(completed.isCompleted, true);
  assert.ok(completed.completedAt);

  const reopened = await repo.toggleComplete(item.id);
  assert.strictEqual(reopened.isCompleted, false);
  assert.strictEqual(reopened.completedAt, undefined);

  // 6. Delete
  await repo.delete(item.id);
  const remaining = await table.toArray();
  assert.strictEqual(remaining.length, 0);
});
