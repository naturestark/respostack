import {
  BACKUP_FORMAT_IDENTIFIER,
  CURRENT_BACKUP_VERSION,
  SUPPORTED_BACKUP_VERSIONS,
  MAX_BACKUP_FILE_SIZE_BYTES,
  MAX_BACKUP_RECORD_COUNT,
  RESPOSTACK_BACKUP_FORMAT_IDENTIFIER,
  RespostackBackup,
  BackupValidationResult,
} from './backup.types';
import { CATEGORIES, Responsibility, ResponsibilityCategory } from '../../types/responsibility';
import { isValidCalendarDate, isValidCurrencyCode, isValidReminderTimestamp } from '../../utils/validation';
import { validateRecurrenceRule } from '../recurrence/recurrence.validation';
import { RecurrenceRule } from '../recurrence/recurrence.types';

/**
 * Validates untrusted raw JSON string or parsed object representing a Respostack (or legacy Life Admin) backup.
 * Supports version 1 (legacy), version 2 (with reminders), and version 3 (with recurrence).
 */
export function validateBackupString(rawJson: string): BackupValidationResult {
  if (typeof rawJson !== 'string') {
    return { isValid: false, error: 'Backup content must be a text string.' };
  }

  const byteLength = new Blob([rawJson]).size;
  if (byteLength > MAX_BACKUP_FILE_SIZE_BYTES) {
    const sizeMb = (byteLength / (1024 * 1024)).toFixed(1);
    const maxMb = (MAX_BACKUP_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `Backup file is too large (${sizeMb} MB). Maximum allowed size is ${maxMb} MB.`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Syntax error';
    return {
      isValid: false,
      error: `Malformed JSON: The selected file could not be parsed as valid JSON (${msg}).`,
    };
  }

  return validateBackupObject(parsed);
}

/**
 * Validates parsed object against the Respostack backup specification.
 */
export function validateBackupObject(data: unknown): BackupValidationResult {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      isValid: false,
      error: 'Invalid backup structure. Root content must be a JSON object.',
    };
  }

  const obj = data as Record<string, unknown>;

  // 1. Format identifier check (accepts both Respostack and legacy Life Admin)
  const isAllowedApp = obj.app === 'Respostack' || obj.app === 'Life Admin';
  const isAllowedFormat = obj.format === BACKUP_FORMAT_IDENTIFIER || obj.format === RESPOSTACK_BACKUP_FORMAT_IDENTIFIER;

  if (!isAllowedFormat || !isAllowedApp) {
    return {
      isValid: false,
      error: `Unrecognized backup format. Expected a Respostack or Life Admin backup file.`,
    };
  }

  // 2. Version compatibility check
  if (typeof obj.version !== 'number' || !Number.isInteger(obj.version)) {
    return {
      isValid: false,
      error: 'Invalid backup version: Version must be an integer.',
    };
  }

  if (!SUPPORTED_BACKUP_VERSIONS.includes(obj.version)) {
    if (obj.version > CURRENT_BACKUP_VERSION) {
      return {
        isValid: false,
        error: `Unsupported backup version (${obj.version}). This version of Respostack supports up to version ${CURRENT_BACKUP_VERSION}. Please update the application to restore this backup.`,
      };
    }
    return {
      isValid: false,
      error: `Unsupported backup version (${obj.version}). Supported versions are: ${SUPPORTED_BACKUP_VERSIONS.join(', ')}.`,
    };
  }

  // 3. Export timestamp check
  if (typeof obj.exportedAt !== 'string' || isNaN(Date.parse(obj.exportedAt))) {
    return {
      isValid: false,
      error: 'Invalid or missing export timestamp in backup header.',
    };
  }

  // 4. Responsibilities array check
  if (!Array.isArray(obj.responsibilities)) {
    return {
      isValid: false,
      error: 'Invalid backup payload: "responsibilities" must be an array.',
    };
  }

  if (obj.responsibilities.length > MAX_BACKUP_RECORD_COUNT) {
    return {
      isValid: false,
      error: `Backup contains ${obj.responsibilities.length} items, which exceeds the maximum limit of ${MAX_BACKUP_RECORD_COUNT} records.`,
    };
  }

  if (typeof obj.itemCount === 'number' && obj.itemCount !== obj.responsibilities.length) {
    return {
      isValid: false,
      error: `Item count mismatch: Header indicates ${obj.itemCount} items, but file contains ${obj.responsibilities.length} records.`,
    };
  }

  // 5. Deep record validation and unique ID enforcement
  const seenIds = new Set<string>();
  const sanitizedItems: Responsibility[] = [];

  for (let index = 0; index < obj.responsibilities.length; index++) {
    const rawItem = obj.responsibilities[index];
    const recordNum = index + 1;

    if (typeof rawItem !== 'object' || rawItem === null || Array.isArray(rawItem)) {
      return {
        isValid: false,
        error: `Record #${recordNum} is malformed (must be an object).`,
      };
    }

    const item = rawItem as Record<string, unknown>;

    // ID validation
    if (typeof item.id !== 'string' || item.id.trim() === '') {
      return {
        isValid: false,
        error: `Record #${recordNum} is missing a valid non-empty "id".`,
      };
    }
    const cleanId = item.id.trim();
    if (seenIds.has(cleanId)) {
      return {
        isValid: false,
        error: `Duplicate responsibility ID "${cleanId}" detected in record #${recordNum}. All IDs must be unique.`,
      };
    }
    seenIds.add(cleanId);

    // Title validation
    if (typeof item.title !== 'string') {
      return {
        isValid: false,
        error: `Record #${recordNum} (ID: ${cleanId}): "title" must be a string.`,
      };
    }
    const cleanTitle = item.title.trim();
    if (cleanTitle.length === 0) {
      return {
        isValid: false,
        error: `Record #${recordNum} (ID: ${cleanId}): Title cannot be empty.`,
      };
    }
    if (cleanTitle.length > 200) {
      return {
        isValid: false,
        error: `Record #${recordNum} (ID: ${cleanId}): Title exceeds 200 characters.`,
      };
    }

    // Category validation
    if (typeof item.category !== 'string' || !CATEGORIES.includes(item.category as ResponsibilityCategory)) {
      return {
        isValid: false,
        error: `Record #${recordNum} (ID: ${cleanId}): Invalid category "${item.category}". Allowed: ${CATEGORIES.join(', ')}.`,
      };
    }

    // Completion status validation
    if (typeof item.isCompleted !== 'boolean') {
      return {
        isValid: false,
        error: `Record #${recordNum} (ID: ${cleanId}): "isCompleted" must be a boolean.`,
      };
    }

    // Timestamp validations
    if (typeof item.createdAt !== 'string' || isNaN(Date.parse(item.createdAt))) {
      return {
        isValid: false,
        error: `Record #${recordNum} (ID: ${cleanId}): Invalid "createdAt" ISO timestamp.`,
      };
    }

    if (typeof item.updatedAt !== 'string' || isNaN(Date.parse(item.updatedAt))) {
      return {
        isValid: false,
        error: `Record #${recordNum} (ID: ${cleanId}): Invalid "updatedAt" ISO timestamp.`,
      };
    }

    // CompletedAt timestamp consistency
    let cleanCompletedAt: string | undefined = undefined;
    if (item.isCompleted) {
      if (typeof item.completedAt !== 'string' || isNaN(Date.parse(item.completedAt))) {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): Completed item must include a valid "completedAt" timestamp.`,
        };
      }
      cleanCompletedAt = item.completedAt;
    } else {
      if (item.completedAt !== undefined && item.completedAt !== null && item.completedAt !== '') {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): Incomplete item cannot have a "completedAt" timestamp.`,
        };
      }
    }

    // Due date validation (optional)
    let cleanDueDate: string | undefined = undefined;
    if (item.dueDate !== undefined && item.dueDate !== null && item.dueDate !== '') {
      if (typeof item.dueDate !== 'string') {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): "dueDate" must be a string.`,
        };
      }
      const trimmedDate = item.dueDate.trim();
      if (!isValidCalendarDate(trimmedDate)) {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): Invalid calendar date "${trimmedDate}". Expected YYYY-MM-DD.`,
        };
      }
      cleanDueDate = trimmedDate;
    }

    // ReminderAt timestamp validation (optional)
    let cleanReminderAt: string | undefined = undefined;
    if (item.reminderAt !== undefined && item.reminderAt !== null && item.reminderAt !== '') {
      if (typeof item.reminderAt !== 'string') {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): "reminderAt" must be a string.`,
        };
      }
      const trimmedReminder = item.reminderAt.trim();
      if (!isValidReminderTimestamp(trimmedReminder)) {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): Invalid reminder instant "${trimmedReminder}". Expected ISO timestamp.`,
        };
      }
      cleanReminderAt = trimmedReminder;
    }

    // Recurrence validation (optional)
    let cleanRecurrence: RecurrenceRule | undefined = undefined;
    let cleanSeriesId: string | undefined = undefined;

    if (item.recurrence !== undefined && item.recurrence !== null) {
      if (typeof item.recurrence !== 'object' || Array.isArray(item.recurrence)) {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): "recurrence" must be an object.`,
        };
      }
      const recRule = item.recurrence as RecurrenceRule;
      const recVal = validateRecurrenceRule(recRule, cleanDueDate);
      if (!recVal.isValid) {
        const errorMsg = Object.values(recVal.errors).join(' ');
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}) recurrence invalid: ${errorMsg}`,
        };
      }
      cleanRecurrence = {
        frequency: recRule.frequency,
        interval: recRule.interval,
        weekdays: recRule.weekdays ? [...recRule.weekdays] : undefined,
        monthPolicy: recRule.monthPolicy,
        monthDay: recRule.monthDay,
        endDate: recRule.endDate?.trim() || undefined,
      };

      if (typeof item.seriesId === 'string' && item.seriesId.trim()) {
        cleanSeriesId = item.seriesId.trim();
      } else {
        cleanSeriesId = `series-${cleanId}`;
      }
    } else if (typeof item.seriesId === 'string' && item.seriesId.trim()) {
      cleanSeriesId = item.seriesId.trim();
    }

    // Notes validation (optional)
    let cleanNotes: string | undefined = undefined;
    if (item.notes !== undefined && item.notes !== null && item.notes !== '') {
      if (typeof item.notes !== 'string') {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): "notes" must be a string.`,
        };
      }
      const trimmedNotes = item.notes.trim();
      if (trimmedNotes.length > 0) {
        cleanNotes = trimmedNotes;
      }
    }

    // Amount validation (optional)
    let cleanAmount: number | undefined = undefined;
    if (item.amount !== undefined && item.amount !== null && item.amount !== '') {
      const num = Number(item.amount);
      if (typeof item.amount !== 'number' && typeof item.amount !== 'string') {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): "amount" must be a number.`,
        };
      }
      if (isNaN(num) || !Number.isFinite(num)) {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): "amount" must be a finite number.`,
        };
      }
      if (num < 0) {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): "amount" cannot be negative.`,
        };
      }
      if (num > 1_000_000_000) {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): "amount" exceeds maximum allowed value.`,
        };
      }
      if (Math.round(num * 100) !== Number((num * 100).toFixed(6))) {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): "amount" cannot have more than 2 decimal places.`,
        };
      }
      cleanAmount = num;
    }

    // Currency validation (required if amount is present)
    let cleanCurrency: string | undefined = undefined;
    if (cleanAmount !== undefined) {
      if (typeof item.currency !== 'string') {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): Currency code is required when amount is specified.`,
        };
      }
      const trimmedCurrency = item.currency.trim().toUpperCase();
      if (!isValidCurrencyCode(trimmedCurrency)) {
        return {
          isValid: false,
          error: `Record #${recordNum} (ID: ${cleanId}): Invalid currency code "${item.currency}". Expected 3-letter ISO code (e.g. USD).`,
        };
      }
      cleanCurrency = trimmedCurrency;
    } else if (item.currency !== undefined && item.currency !== null && item.currency !== '') {
      if (typeof item.currency === 'string' && isValidCurrencyCode(item.currency.trim().toUpperCase())) {
        cleanCurrency = item.currency.trim().toUpperCase();
      }
    }

    sanitizedItems.push({
      id: cleanId,
      seriesId: cleanSeriesId,
      recurrence: cleanRecurrence,
      title: cleanTitle,
      category: item.category as ResponsibilityCategory,
      dueDate: cleanDueDate,
      reminderAt: cleanReminderAt,
      notes: cleanNotes,
      amount: cleanAmount,
      currency: cleanCurrency,
      isCompleted: item.isCompleted,
      completedAt: cleanCompletedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }

  const validBackup: RespostackBackup = {
    app: (obj.app === 'Life Admin' ? 'Life Admin' : 'Respostack'),
    format: (obj.format === RESPOSTACK_BACKUP_FORMAT_IDENTIFIER ? RESPOSTACK_BACKUP_FORMAT_IDENTIFIER : BACKUP_FORMAT_IDENTIFIER),
    version: obj.version as number,
    exportedAt: obj.exportedAt as string,
    itemCount: sanitizedItems.length,
    responsibilities: sanitizedItems,
  };

  return {
    isValid: true,
    backup: validBackup,
  };
}
