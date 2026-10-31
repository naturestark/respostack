import { describe, it, expect } from 'vitest';
import {
  generateBackupPayload,
  getBackupFilename,
  parseAndValidateBackup,
} from './backup.service';
import { validateBackupString, validateBackupObject } from './backup.validation';
import { BACKUP_FORMAT_IDENTIFIER, CURRENT_BACKUP_VERSION, RespostackBackup } from './backup.types';
import { Responsibility } from '../../types/responsibility';

describe('Backup & Restore Feature', () => {
  const sampleItems: Responsibility[] = [
    {
      id: 'resp-1',
      title: 'Pay Utility Bill',
      category: 'Bills',
      dueDate: '2026-11-15',
      notes: 'Account #482910',
      amount: 112.5,
      currency: 'USD',
      isCompleted: false,
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 'resp-2',
      title: 'Schedule Dental Cleaning',
      category: 'Health',
      dueDate: '2026-10-25',
      notes: 'Dr. Martinez clinic',
      amount: 45,
      currency: 'USD',
      isCompleted: true,
      completedAt: '2026-10-25T14:30:00.000Z',
      createdAt: '2026-09-15T09:00:00.000Z',
      updatedAt: '2026-10-25T14:30:00.000Z',
    },
  ];

  describe('Export Serialization', () => {
    it('generates a valid backup payload with correct header metadata and version', () => {
      const fixedDate = new Date('2026-10-29T11:00:00.000Z');
      const backup = generateBackupPayload(sampleItems, fixedDate);

      expect(backup.app).toBe('Respostack');
      expect(backup.format).toBe(BACKUP_FORMAT_IDENTIFIER);
      expect(backup.version).toBe(CURRENT_BACKUP_VERSION);
      expect(backup.exportedAt).toBe('2026-10-29T11:00:00.000Z');
      expect(backup.itemCount).toBe(2);
      expect(backup.responsibilities).toHaveLength(2);
    });

    it('preserves all responsibility fields, dates, numeric amounts, and completion timestamps', () => {
      const backup = generateBackupPayload(sampleItems);
      const [item1, item2] = backup.responsibilities;

      // Item 1: Active
      expect(item1.id).toBe('resp-1');
      expect(item1.title).toBe('Pay Utility Bill');
      expect(item1.dueDate).toBe('2026-11-15');
      expect(item1.amount).toBe(112.5);
      expect(typeof item1.amount).toBe('number');
      expect(item1.currency).toBe('USD');
      expect(item1.isCompleted).toBe(false);
      expect(item1.completedAt).toBeUndefined();

      // Item 2: Completed
      expect(item2.id).toBe('resp-2');
      expect(item2.isCompleted).toBe(true);
      expect(item2.completedAt).toBe('2026-10-25T14:30:00.000Z');
    });

    it('correctly handles empty database exports', () => {
      const backup = generateBackupPayload([]);
      expect(backup.itemCount).toBe(0);
      expect(backup.responsibilities).toEqual([]);

      const validation = validateBackupObject(backup);
      expect(validation.isValid).toBe(true);
    });

    it('generates standard date-based backup filenames', () => {
      const fixedDate = new Date(2026, 9, 29); // Oct 29, 2026 local
      const filename = getBackupFilename(fixedDate);
      expect(filename).toBe('respostack-backup-2026-10-29.json');
    });
  });

  describe('Validation Engine', () => {
    it('accepts valid backup JSON text', () => {
      const backup = generateBackupPayload(sampleItems);
      const json = JSON.stringify(backup);
      const result = validateBackupString(json);

      expect(result.isValid).toBe(true);
      expect(result.backup?.itemCount).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('rejects malformed JSON syntax', () => {
      const badJson = '{"format": "life-admin-backup", broken...';
      const result = validateBackupString(badJson);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Malformed JSON');
    });

    it('rejects unrecognized format identifiers or wrong app names', () => {
      const wrongFormat = {
        app: 'Other App',
        format: 'some-other-format',
        version: 1,
        exportedAt: new Date().toISOString(),
        responsibilities: [],
      };
      const result = validateBackupObject(wrongFormat);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unrecognized backup format');
    });

    it('rejects unsupported future backup versions', () => {
      const futureVersion = {
        app: 'Respostack',
        format: BACKUP_FORMAT_IDENTIFIER,
        version: 99,
        exportedAt: new Date().toISOString(),
        responsibilities: [],
      };
      const result = validateBackupObject(futureVersion);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported backup version (99)');
    });

    it('rejects duplicate responsibility IDs in backup file', () => {
      const duplicateIdsBackup: RespostackBackup = {
        app: 'Respostack',
        format: BACKUP_FORMAT_IDENTIFIER,
        version: 1,
        exportedAt: new Date().toISOString(),
        itemCount: 2,
        responsibilities: [
          { ...sampleItems[0], id: 'duplicate-id' },
          { ...sampleItems[1], id: 'duplicate-id' },
        ],
      };
      const result = validateBackupObject(duplicateIdsBackup);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Duplicate responsibility ID "duplicate-id"');
    });

    it('rejects missing or empty titles', () => {
      const invalidTitleBackup = {
        app: 'Respostack',
        format: BACKUP_FORMAT_IDENTIFIER,
        version: 1,
        exportedAt: new Date().toISOString(),
        responsibilities: [
          { ...sampleItems[0], title: '   ' },
        ],
      };
      const result = validateBackupObject(invalidTitleBackup);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Title cannot be empty');
    });

    it('rejects invalid category values', () => {
      const invalidCategoryBackup = {
        app: 'Respostack',
        format: BACKUP_FORMAT_IDENTIFIER,
        version: 1,
        exportedAt: new Date().toISOString(),
        responsibilities: [
          { ...sampleItems[0], category: 'InvalidCategory' },
        ],
      };
      const result = validateBackupObject(invalidCategoryBackup);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid category "InvalidCategory"');
    });

    it('rejects impossible calendar dates (e.g. Feb 30 or April 31)', () => {
      const badDateBackup = {
        app: 'Respostack',
        format: BACKUP_FORMAT_IDENTIFIER,
        version: 1,
        exportedAt: new Date().toISOString(),
        responsibilities: [
          { ...sampleItems[0], dueDate: '2026-02-30' },
        ],
      };
      const result = validateBackupObject(badDateBackup);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid calendar date "2026-02-30"');
    });

    it('rejects negative or malformed amounts', () => {
      const badAmountBackup = {
        app: 'Respostack',
        format: BACKUP_FORMAT_IDENTIFIER,
        version: 1,
        exportedAt: new Date().toISOString(),
        responsibilities: [
          { ...sampleItems[0], amount: -50 },
        ],
      };
      const result = validateBackupObject(badAmountBackup);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be negative');
    });

    it('rejects invalid currency codes when amounts are provided', () => {
      const badCurrencyBackup = {
        app: 'Respostack',
        format: BACKUP_FORMAT_IDENTIFIER,
        version: 1,
        exportedAt: new Date().toISOString(),
        responsibilities: [
          { ...sampleItems[0], amount: 100, currency: 'US' },
        ],
      };
      const result = validateBackupObject(badCurrencyBackup);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid currency code "US"');
    });

    it('rejects completed items with missing or invalid completedAt timestamp', () => {
      const invalidCompletedBackup = {
        app: 'Respostack',
        format: BACKUP_FORMAT_IDENTIFIER,
        version: 1,
        exportedAt: new Date().toISOString(),
        responsibilities: [
          { ...sampleItems[0], isCompleted: true, completedAt: undefined },
        ],
      };
      const result = validateBackupObject(invalidCompletedBackup);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Completed item must include a valid "completedAt"');
    });

    it('rejects active items having a completedAt timestamp', () => {
      const invalidActiveBackup = {
        app: 'Respostack',
        format: BACKUP_FORMAT_IDENTIFIER,
        version: 1,
        exportedAt: new Date().toISOString(),
        responsibilities: [
          { ...sampleItems[0], isCompleted: false, completedAt: '2026-10-01T10:00:00Z' },
        ],
      };
      const result = validateBackupObject(invalidActiveBackup);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Incomplete item cannot have a "completedAt"');
    });

    it('rejects excessive record counts', () => {
      const oversizedBackup = {
        app: 'Respostack',
        format: BACKUP_FORMAT_IDENTIFIER,
        version: 1,
        exportedAt: new Date().toISOString(),
        responsibilities: new Array(5001).fill(null).map((_, i) => ({
          ...sampleItems[0],
          id: `id-${i}`,
        })),
      };
      const result = validateBackupObject(oversizedBackup);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds the maximum limit');
    });
  });
});
