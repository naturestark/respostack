import {
  BACKUP_FORMAT_IDENTIFIER,
  CURRENT_BACKUP_VERSION,
  RespostackBackup,
  BackupValidationResult,
} from './backup.types';
import { validateBackupString } from './backup.validation';
import { Responsibility } from '../../types/responsibility';
import { responsibilitiesRepo } from '../../db/responsibilitiesRepo';
import { getTodayDateString } from '../../utils/dateUtils';

/**
 * Creates a structured, versioned backup payload from an array of responsibilities.
 */
export function generateBackupPayload(
  responsibilities: Responsibility[],
  refDate: Date = new Date()
): RespostackBackup {
  return {
    app: 'Respostack',
    format: BACKUP_FORMAT_IDENTIFIER,
    version: CURRENT_BACKUP_VERSION,
    exportedAt: refDate.toISOString(),
    itemCount: responsibilities.length,
    responsibilities: responsibilities.map((r) => ({
      id: r.id,
      seriesId: r.seriesId,
      recurrence: r.recurrence,
      title: r.title,
      category: r.category,
      dueDate: r.dueDate,
      reminderAt: r.reminderAt,
      notes: r.notes,
      amount: r.amount,
      currency: r.currency,
      isCompleted: r.isCompleted,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      updatedAt: r.updatedAt,
    })),
  };
}

/**
 * Generates the default backup filename based on current local date.
 * Format: 'respostack-backup-YYYY-MM-DD.json'
 */
export function getBackupFilename(refDate: Date = new Date()): string {
  const dateStr = getTodayDateString(refDate);
  return `respostack-backup-${dateStr}.json`;
}

/**
 * Serializes backup object into formatted, human-readable JSON
 * and triggers a client-side file download via Blob and Object URL.
 */
export function triggerBackupDownload(backup: RespostackBackup, filename?: string): void {
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);

  const finalName = filename || getBackupFilename();

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = finalName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Clean up DOM and revoke temporary object URL
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 100);
}

/**
 * Reads a user-selected File from an input element as UTF-8 text.
 */
export async function readBackupFile(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return await file.text();
  }

  // Fallback for older environments
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read backup file.'));
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Parses and validates raw backup text.
 */
export function parseAndValidateBackup(rawText: string): BackupValidationResult {
  return validateBackupString(rawText);
}

/**
 * Executes a full replacement restore of responsibilities inside an atomic transaction.
 * All existing responsibilities are replaced by the validated backup records.
 */
export async function executeRestore(backup: RespostackBackup): Promise<void> {
  await responsibilitiesRepo.replaceAll(backup.responsibilities);
}
