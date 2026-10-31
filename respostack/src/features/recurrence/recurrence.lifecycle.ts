import { db } from '../../db/db';
import { Responsibility, ResponsibilityFormData } from '../../types/responsibility';
import {
  calculateNextOccurrenceDate,
  calculateNextReminderInstant,
} from './recurrence.service';
import { getTodayDateString } from '../../utils/dateUtils';
import { validateResponsibility } from '../../utils/validation';
import { validateRecurrenceRule } from './recurrence.validation';

/**
 * Completes a responsibility occurrence.
 * If the responsibility is part of a recurring series, atomically provisions the next scheduled
 * occurrence if one does not already exist, respecting end dates and preventing duplicates.
 */
export async function completeOccurrence(
  occurrence: Responsibility,
  now: Date = new Date(),
  todayStr: string = getTodayDateString(now)
): Promise<{ completed: Responsibility; nextOccurrence?: Responsibility }> {
  const nowIso = now.toISOString();

  let completedItem: Responsibility = {
    ...occurrence,
    isCompleted: true,
    completedAt: nowIso,
    updatedAt: nowIso,
  };

  let nextOccurrence: Responsibility | undefined = undefined;

  await db.transaction('rw', [db.responsibilities, db.reminderLogs], async () => {
    // 1. Mark current occurrence as completed
    await db.responsibilities.put(completedItem);

    // Invalidate active reminder log for completed occurrence
    if (occurrence.reminderAt) {
      await db.reminderLogs.where('responsibilityId').equals(occurrence.id).delete();
    }

    // 2. If recurring series, provision next occurrence
    if (occurrence.seriesId && occurrence.recurrence) {
      // Check if an uncompleted occurrence already exists for this series
      const existingActive = await db.responsibilities
        .where('seriesId')
        .equals(occurrence.seriesId)
        .filter((r) => !r.isCompleted && r.id !== occurrence.id)
        .first();

      if (!existingActive) {
        // Calculate next due date
        const nextDueDate = calculateNextOccurrenceDate(
          occurrence.dueDate || todayStr,
          occurrence.recurrence
        );

        if (nextDueDate) {
          // Check if an occurrence for this series on nextDueDate already exists
          const existingOnDate = await db.responsibilities
            .where('seriesId')
            .equals(occurrence.seriesId)
            .filter((r) => r.dueDate === nextDueDate)
            .first();

          if (!existingOnDate) {
            const nextId =
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'resp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

            const nextReminderAt = calculateNextReminderInstant(
              occurrence.reminderAt,
              occurrence.dueDate,
              nextDueDate
            );

            nextOccurrence = {
              id: nextId,
              seriesId: occurrence.seriesId,
              recurrence: occurrence.recurrence,
              title: occurrence.title,
              category: occurrence.category,
              dueDate: nextDueDate,
              reminderAt: nextReminderAt,
              notes: occurrence.notes,
              amount: occurrence.amount,
              currency: occurrence.currency,
              isCompleted: false,
              createdAt: nowIso,
              updatedAt: nowIso,
            };

            await db.responsibilities.add(nextOccurrence);
          }
        }
      }
    }
  });

  return { completed: completedItem, nextOccurrence };
}

/**
 * Reopens a completed occurrence.
 * Leaves historical completed records and already provisioned future occurrences intact.
 */
export async function reopenOccurrence(
  occurrence: Responsibility,
  now: Date = new Date()
): Promise<Responsibility> {
  const nowIso = now.toISOString();

  const reopenedItem: Responsibility = {
    ...occurrence,
    isCompleted: false,
    completedAt: undefined,
    updatedAt: nowIso,
  };

  await db.responsibilities.put(reopenedItem);
  return reopenedItem;
}

/**
 * Updates a responsibility.
 * If editScope is 'series' and the item belongs to a recurring series,
 * updates the series template across this occurrence and all active (uncompleted) occurrences,
 * while strictly protecting completed historical records from corruption.
 */
export async function updateOccurrence(
  existing: Responsibility,
  formData: ResponsibilityFormData,
  now: Date = new Date()
): Promise<Responsibility> {
  const nowIso = now.toISOString();

  // Validate base fields
  const validation = validateResponsibility(formData);
  if (!validation.isValid) {
    const msg = Object.values(validation.errors).join(' ');
    throw new Error(msg || 'Validation failed');
  }

  // Validate recurrence rule if present
  if (formData.recurrence) {
    const recValidation = validateRecurrenceRule(formData.recurrence, formData.dueDate);
    if (!recValidation.isValid) {
      const msg = Object.values(recValidation.errors).join(' ');
      throw new Error(msg || 'Recurrence validation failed');
    }
  }

  const parsedAmount =
    formData.amount !== undefined && formData.amount !== '' && !isNaN(Number(formData.amount))
      ? Number(formData.amount)
      : undefined;

  const normalizedCurrency =
    parsedAmount !== undefined
      ? formData.currency?.trim().toUpperCase() || existing.currency || 'USD'
      : undefined;

  const editScope = formData.editScope || 'occurrence';

  let updatedSelf: Responsibility = {
    ...existing,
    title: formData.title.trim(),
    category: formData.category,
    dueDate: formData.dueDate?.trim() || undefined,
    reminderAt: formData.reminderAt?.trim() || undefined,
    notes: formData.notes?.trim() || undefined,
    amount: parsedAmount,
    currency: normalizedCurrency,
    seriesId: formData.recurrence ? (existing.seriesId || formData.seriesId) : undefined,
    recurrence: formData.recurrence || undefined,
    updatedAt: nowIso,
  };

  // If recurring series edit requested and series exists:
  if (editScope === 'series' && existing.seriesId && formData.recurrence) {
    await db.transaction('rw', db.responsibilities, async () => {
      // 1. Update this occurrence
      await db.responsibilities.put(updatedSelf);

      // 2. Update all active (uncompleted) occurrences of the same series
      const activeOccurrences = await db.responsibilities
        .where('seriesId')
        .equals(existing.seriesId!)
        .filter((r) => !r.isCompleted && r.id !== existing.id)
        .toArray();

      for (const occ of activeOccurrences) {
        await db.responsibilities.put({
          ...occ,
          title: formData.title.trim(),
          category: formData.category,
          notes: formData.notes?.trim() || undefined,
          amount: parsedAmount,
          currency: normalizedCurrency,
          recurrence: formData.recurrence,
          updatedAt: nowIso,
        });
      }
      // Note: completed historical occurrences are strictly untouched!
    });
  } else {
    // Single occurrence edit
    await db.responsibilities.put(updatedSelf);
  }

  return updatedSelf;
}
