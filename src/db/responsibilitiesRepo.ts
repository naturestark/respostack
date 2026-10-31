import { db } from './db';
import { Responsibility, ResponsibilityFormData } from '../types/responsibility';
import { validateResponsibility } from '../utils/validation';
import { getDemoResponsibilities } from '../data/demoData';
import { validateRecurrenceRule } from '../features/recurrence/recurrence.validation';
import { completeOccurrence, reopenOccurrence, updateOccurrence } from '../features/recurrence/recurrence.lifecycle';

export class ValidationError extends Error {
  errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    const message = Object.values(errors).join(' ');
    super(message || 'Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Repository layer isolating IndexedDB (Dexie) operations from UI presentation.
 * Enforces schema validation, recurrence lifecycle, timestamp management, and data normalization.
 */
export const responsibilitiesRepo = {
  /**
   * Fetch all responsibilities from IndexedDB.
   */
  async getAll(): Promise<Responsibility[]> {
    try {
      return await db.responsibilities.toArray();
    } catch (err) {
      console.error('Failed to query responsibilities from IndexedDB:', err);
      throw new Error('Could not read saved responsibilities from local storage.');
    }
  },

  /**
   * Get a single responsibility by ID.
   */
  async getById(id: string): Promise<Responsibility | undefined> {
    if (!id || typeof id !== 'string') {
      return undefined;
    }
    try {
      return await db.responsibilities.get(id);
    } catch (err) {
      console.error(`Failed to fetch responsibility "${id}":`, err);
      throw new Error('Could not retrieve responsibility from local storage.');
    }
  },

  /**
   * Create a new responsibility and save to IndexedDB.
   * If recurrence is configured, provisions the seriesId and stores the recurrence rule.
   */
  async create(formData: ResponsibilityFormData): Promise<Responsibility> {
    const validation = validateResponsibility(formData);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    if (formData.recurrence) {
      const recVal = validateRecurrenceRule(formData.recurrence, formData.dueDate);
      if (!recVal.isValid) {
        throw new ValidationError(recVal.errors);
      }
    }

    const nowIso = new Date().toISOString();
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'resp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

    const parsedAmount =
      formData.amount !== undefined && formData.amount !== '' && !isNaN(Number(formData.amount))
        ? Number(formData.amount)
        : undefined;

    const trimmedDueDate = formData.dueDate?.trim() || undefined;
    const trimmedReminderAt = formData.reminderAt?.trim() || undefined;
    const trimmedNotes = formData.notes?.trim() || undefined;
    const normalizedCurrency =
      parsedAmount !== undefined
        ? (formData.currency?.trim().toUpperCase() || 'USD')
        : undefined;

    // If recurrence is configured, generate a stable seriesId
    const seriesId = formData.recurrence
      ? formData.seriesId ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? `series-${crypto.randomUUID()}`
          : `series-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`)
      : undefined;

    const newItem: Responsibility = {
      id,
      seriesId,
      recurrence: formData.recurrence || undefined,
      title: formData.title.trim(),
      category: formData.category,
      dueDate: trimmedDueDate,
      reminderAt: trimmedReminderAt,
      notes: trimmedNotes,
      amount: parsedAmount,
      currency: normalizedCurrency,
      isCompleted: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await db.responsibilities.add(newItem);
      return newItem;
    } catch (err) {
      console.error('Failed to add responsibility to IndexedDB:', err);
      throw new Error('Failed to save responsibility to local database.');
    }
  },

  /**
   * Update an existing responsibility.
   * Delegates to updateOccurrence to support single-occurrence and series-wide scopes safely.
   */
  async update(id: string, formData: Partial<ResponsibilityFormData>): Promise<Responsibility> {
    if (!id) {
      throw new Error('Responsibility ID is required for update.');
    }

    const existing = await db.responsibilities.get(id);
    if (!existing) {
      throw new Error(`Responsibility with id "${id}" was not found.`);
    }

    const mergedFormData: ResponsibilityFormData = {
      title: formData.title !== undefined ? formData.title : existing.title,
      category: formData.category !== undefined ? formData.category : existing.category,
      dueDate: formData.dueDate !== undefined ? formData.dueDate : existing.dueDate,
      reminderAt: formData.reminderAt !== undefined ? formData.reminderAt : existing.reminderAt,
      notes: formData.notes !== undefined ? formData.notes : existing.notes,
      amount: formData.amount !== undefined ? formData.amount : existing.amount,
      currency: formData.currency !== undefined ? formData.currency : existing.currency,
      seriesId: formData.seriesId !== undefined ? formData.seriesId : existing.seriesId,
      recurrence: formData.recurrence !== undefined ? formData.recurrence : existing.recurrence,
      editScope: formData.editScope || 'occurrence',
    };

    return await updateOccurrence(existing, mergedFormData);
  },

  /**
   * Toggle completion status.
   * If completing a recurring occurrence: marks this occurrence completed and provisions
   * the next occurrence atomically if one does not already exist.
   * If reopening: reopens this occurrence without altering future or historical occurrences.
   */
  async toggleComplete(id: string): Promise<Responsibility> {
    const existing = await db.responsibilities.get(id);
    if (!existing) {
      throw new Error(`Responsibility with id "${id}" was not found.`);
    }

    if (!existing.isCompleted) {
      // Mark as completed and provision next recurring instance if applicable
      const result = await completeOccurrence(existing);
      return result.completed;
    } else {
      // Reopen occurrence
      return await reopenOccurrence(existing);
    }
  },

  /**
   * Permanently delete a responsibility record and clean up associated reminder logs.
   */
  async delete(id: string): Promise<void> {
    if (!id) {
      throw new Error('Responsibility ID is required for deletion.');
    }
    try {
      await db.transaction('rw', [db.responsibilities, db.reminderLogs], async () => {
        await db.responsibilities.delete(id);
        await db.reminderLogs.where('responsibilityId').equals(id).delete();
      });
    } catch (err) {
      console.error(`Failed to delete responsibility "${id}":`, err);
      throw new Error('Failed to delete responsibility from local database.');
    }
  },

  /**
   * Atomically replaces all responsibilities in IndexedDB with the provided collection.
   * Runs inside an explicit Dexie read-write transaction.
   */
  async replaceAll(items: Responsibility[]): Promise<void> {
    try {
      await db.transaction('rw', [db.responsibilities, db.reminderLogs], async () => {
        await db.responsibilities.clear();
        await db.reminderLogs.clear();
        for (const item of items) {
          await db.responsibilities.add(item);
        }
      });
    } catch (err) {
      console.error('Failed to replace responsibilities in database transaction:', err);
      throw new Error('Database transaction failed during restore. Existing records were preserved.');
    }
  },

  /**
   * Populates database with curated demo data records.
   * Atomic operation executed inside an IndexedDB transaction.
   */
  async loadDemoData(): Promise<void> {
    const demoItems = getDemoResponsibilities();
    try {
      await db.transaction('rw', db.responsibilities, async () => {
        for (const item of demoItems) {
          await db.responsibilities.put(item);
        }
      });
    } catch (err) {
      console.error('Failed to load demo data:', err);
      throw new Error('Failed to load sample responsibilities into database.');
    }
  },

  /**
   * Removes all responsibilities from IndexedDB.
   */
  async clearAll(): Promise<void> {
    try {
      await db.transaction('rw', [db.responsibilities, db.reminderLogs], async () => {
        await db.responsibilities.clear();
        await db.reminderLogs.clear();
      });
    } catch (err) {
      console.error('Failed to clear database:', err);
      throw new Error('Failed to clear responsibilities from local database.');
    }
  },
};
