import { Responsibility } from '../../types/responsibility';

export const BACKUP_FORMAT_IDENTIFIER = 'life-admin-backup' as const;
export const RESPOSTACK_BACKUP_FORMAT_IDENTIFIER = 'respostack-backup' as const;
export const CURRENT_BACKUP_VERSION = 3 as const;
export const SUPPORTED_BACKUP_VERSIONS: readonly number[] = [1, 2, 3] as const;
export const MAX_BACKUP_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB limit to prevent memory exhaustion
export const MAX_BACKUP_RECORD_COUNT = 5000; // Sensible ceiling for client-side responsibilities manager

/**
 * Standard Respostack versioned backup schema.
 * Version 1: Initial schema without reminders (Life Admin).
 * Version 2: Added optional reminderAt ISO timestamp instant.
 * Version 3: Added optional recurrence rule configuration and seriesId.
 * Supports backward-compatible restore of legacy Life Admin backups.
 */
export interface RespostackBackup {
  app: 'Respostack' | 'Life Admin';
  format: typeof BACKUP_FORMAT_IDENTIFIER | typeof RESPOSTACK_BACKUP_FORMAT_IDENTIFIER;
  version: number;
  exportedAt: string; // ISO 8601 UTC timestamp
  itemCount: number;
  responsibilities: Responsibility[];
}

export type LifeAdminBackup = RespostackBackup;

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  backup?: RespostackBackup;
}
