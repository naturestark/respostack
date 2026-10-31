import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/db';
import { responsibilitiesRepo, ValidationError } from '../db/responsibilitiesRepo';

describe('responsibilitiesRepo (Dexie Persistence & Validation)', () => {
  beforeEach(async () => {
    await db.responsibilities.clear();
  });

  describe('create', () => {
    it('creates and retrieves a new valid responsibility', async () => {
      const created = await responsibilitiesRepo.create({
        title: '  Submit quarterly report  ',
        category: 'Education',
        dueDate: '2026-11-15',
        notes: 'Final semester report',
        amount: 50,
        currency: 'USD',
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe('Submit quarterly report'); // trimmed
      expect(created.category).toBe('Education');
      expect(created.amount).toBe(50);
      expect(created.currency).toBe('USD');
      expect(created.isCompleted).toBe(false);
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();

      const all = await responsibilitiesRepo.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(created.id);
    });

    it('rejects invalid inputs and throws ValidationError', async () => {
      // Empty title
      await expect(
        responsibilitiesRepo.create({
          title: '   ',
          category: 'Personal',
        })
      ).rejects.toThrowError(ValidationError);

      // Invalid category
      await expect(
        responsibilitiesRepo.create({
          title: 'Valid title',
          // @ts-expect-error Testing invalid runtime category
          category: 'InvalidCat',
        })
      ).rejects.toThrowError(ValidationError);

      // Impossible date
      await expect(
        responsibilitiesRepo.create({
          title: 'Valid title',
          category: 'Personal',
          dueDate: '2026-02-30',
        })
      ).rejects.toThrowError(ValidationError);

      // Negative amount
      await expect(
        responsibilitiesRepo.create({
          title: 'Valid title',
          category: 'Personal',
          amount: -5,
        })
      ).rejects.toThrowError(ValidationError);

      // Amount without currency
      await expect(
        responsibilitiesRepo.create({
          title: 'Valid title',
          category: 'Bills',
          amount: 100,
          currency: '',
        })
      ).rejects.toThrowError(ValidationError);

      // Ensure zero items were written
      const all = await responsibilitiesRepo.getAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('updates an existing responsibility while strictly preserving createdAt and id', async () => {
      const created = await responsibilitiesRepo.create({
        title: 'Initial Title',
        category: 'Personal',
      });

      const originalCreatedAt = created.createdAt;
      const originalId = created.id;

      // Small artificial delay to guarantee different updatedAt timestamp
      await new Promise((r) => setTimeout(r, 10));

      const updated = await responsibilitiesRepo.update(created.id, {
        title: 'Updated Title',
        category: 'Bills',
        amount: 250,
        currency: 'USD',
      });

      expect(updated.id).toBe(originalId);
      expect(updated.createdAt).toBe(originalCreatedAt); // MUST BE PRESERVED
      expect(updated.title).toBe('Updated Title');
      expect(updated.category).toBe('Bills');
      expect(updated.amount).toBe(250);
      expect(updated.updatedAt > originalCreatedAt).toBe(true);

      const fetched = await responsibilitiesRepo.getById(created.id);
      expect(fetched?.title).toBe('Updated Title');
      expect(fetched?.createdAt).toBe(originalCreatedAt);
    });

    it('rejects updates that result in invalid state', async () => {
      const created = await responsibilitiesRepo.create({
        title: 'Valid Initial Title',
        category: 'Personal',
      });

      await expect(
        responsibilitiesRepo.update(created.id, {
          title: '   ', // whitespace only
        })
      ).rejects.toThrowError(ValidationError);

      // Ensure record was not corrupted
      const fetched = await responsibilitiesRepo.getById(created.id);
      expect(fetched?.title).toBe('Valid Initial Title');
    });

    it('throws error when updating non-existent id', async () => {
      await expect(
        responsibilitiesRepo.update('non-existent-id-999', {
          title: 'Some title',
        })
      ).rejects.toThrow(/not found/);
    });
  });

  describe('toggleComplete', () => {
    it('sets completedAt when completing and clears it when reopening', async () => {
      const created = await responsibilitiesRepo.create({
        title: 'Task to toggle',
        category: 'Health',
      });

      expect(created.isCompleted).toBe(false);
      expect(created.completedAt).toBeUndefined();

      // 1. Mark completed
      const completed = await responsibilitiesRepo.toggleComplete(created.id);
      expect(completed.isCompleted).toBe(true);
      expect(completed.completedAt).toBeDefined();

      const fetchedCompleted = await responsibilitiesRepo.getById(created.id);
      expect(fetchedCompleted?.isCompleted).toBe(true);
      expect(fetchedCompleted?.completedAt).toBeDefined();

      // 2. Reopen
      const reopened = await responsibilitiesRepo.toggleComplete(created.id);
      expect(reopened.isCompleted).toBe(false);
      expect(reopened.completedAt).toBeUndefined();

      const fetchedReopened = await responsibilitiesRepo.getById(created.id);
      expect(fetchedReopened?.isCompleted).toBe(false);
      expect(fetchedReopened?.completedAt).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('permanently removes responsibility', async () => {
      const created = await responsibilitiesRepo.create({
        title: 'Task to delete',
        category: 'Other',
      });

      await responsibilitiesRepo.delete(created.id);
      const all = await responsibilitiesRepo.getAll();
      expect(all).toHaveLength(0);

      const item = await responsibilitiesRepo.getById(created.id);
      expect(item).toBeUndefined();
    });
  });

  describe('loadDemoData and clearAll', () => {
    it('atomically loads demo records and clears all records', async () => {
      await responsibilitiesRepo.loadDemoData();
      const all = await responsibilitiesRepo.getAll();
      expect(all.length).toBe(7);

      // Verify all demo records have [Sample] tag
      expect(all.every((item) => item.title.startsWith('[Sample]'))).toBe(true);

      // Clear all
      await responsibilitiesRepo.clearAll();
      const afterClear = await responsibilitiesRepo.getAll();
      expect(afterClear).toHaveLength(0);
    });
  });
});
