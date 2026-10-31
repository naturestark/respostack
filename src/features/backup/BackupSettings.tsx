import React, { useState, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Responsibility } from '../../types/responsibility';
import { RespostackBackup } from './backup.types';
import {
  generateBackupPayload,
  triggerBackupDownload,
  getBackupFilename,
  readBackupFile,
  parseAndValidateBackup,
  executeRestore,
} from './backup.service';

interface BackupSettingsProps {
  responsibilities: Responsibility[];
  onRestoreSuccess: (count: number) => void;
  onShowToast: (type: 'success' | 'error', message: string) => void;
}

export const BackupSettings: React.FC<BackupSettingsProps> = ({
  responsibilities,
  onRestoreSuccess,
  onShowToast,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [stagedBackup, setStagedBackup] = useState<RespostackBackup | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Download Backup handler
  const handleDownloadBackup = () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      const backup = generateBackupPayload(responsibilities);
      const filename = getBackupFilename();
      triggerBackupDownload(backup, filename);
      onShowToast(
        'success',
        `Downloaded backup (${backup.itemCount} ${backup.itemCount === 1 ? 'record' : 'records'}).`
      );
    } catch (err: unknown) {
      console.error('Error generating backup:', err);
      const msg = err instanceof Error ? err.message : 'Failed to generate backup.';
      onShowToast('error', msg);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. File Selection & Validation handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setIsReadingFile(true);

    try {
      const fileText = await readBackupFile(file);
      const result = parseAndValidateBackup(fileText);

      if (!result.isValid || !result.backup) {
        setValidationError(result.error || 'The selected file is not a valid Respostack backup.');
        setStagedBackup(null);
      } else {
        // Validated successfully; stage for user confirmation
        setStagedBackup(result.backup);
      }
    } catch (err: unknown) {
      console.error('Error reading backup file:', err);
      const msg = err instanceof Error ? err.message : 'Could not read file.';
      setValidationError(msg);
      setStagedBackup(null);
    } finally {
      setIsReadingFile(false);
      // Reset input value so user can select the same file again if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 3. Confirm and Execute Restore
  const handleConfirmRestore = async () => {
    if (!stagedBackup || isRestoring) return;

    try {
      setIsRestoring(true);
      await executeRestore(stagedBackup);
      const count = stagedBackup.itemCount;
      setStagedBackup(null);
      setValidationError(null);
      onRestoreSuccess(count);
      onShowToast(
        'success',
        `Successfully restored ${count} ${count === 1 ? 'responsibility' : 'responsibilities'} from backup.`
      );
    } catch (err: unknown) {
      console.error('Restore transaction failed:', err);
      const msg = err instanceof Error ? err.message : 'Database restore failed.';
      onShowToast('error', msg);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancelRestore = () => {
    if (!isRestoring) {
      setStagedBackup(null);
    }
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-start gap-3.5 mb-4">
        <div className="p-2 rounded-lg bg-teal-100 text-teal-800 flex-shrink-0" aria-hidden="true">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              Backup &amp; Restore Controls
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Offline • Privacy-First
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Download your responsibilities as a portable JSON file to keep an offline backup on your device, or restore records from an existing backup.
          </p>
        </div>
      </div>

      {/* Sensitive Data Notice */}
      <div className="mb-5 p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
        <span className="font-semibold block mb-0.5">🔒 Data Privacy Notice:</span>
        Backup files are exported in standard, unencrypted JSON format so you always own and control your data. Because backup files contain your real personal responsibilities and notes, store them in a secure folder or encrypted drive you trust.
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Download Backup Box */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Download Backup</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Export all {responsibilities.length} saved {responsibilities.length === 1 ? 'responsibility' : 'responsibilities'} to a timestamped JSON file.
            </p>
          </div>
          <Button
            variant="outline"
            size="md"
            onClick={handleDownloadBackup}
            disabled={isExporting}
            isLoading={isExporting}
            className="w-full justify-center bg-white hover:bg-slate-50"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Backup (.json)
          </Button>
        </div>

        {/* Restore Backup Box */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Restore from File</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Select a previously exported Respostack (or Life Admin) JSON file to restore your records.
            </p>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
              id="restore-file-input"
              aria-label="Select Respostack JSON backup file to restore"
            />
            <Button
              variant="outline"
              size="md"
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadingFile || isRestoring}
              isLoading={isReadingFile}
              className="w-full justify-center bg-white hover:bg-slate-50 border-teal-300 text-teal-800 hover:bg-teal-50"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Select Backup File to Restore...
            </Button>
          </div>
        </div>
      </div>

      {/* Validation Error Message */}
      {validationError && (
        <div
          role="alert"
          className="mt-4 p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs leading-relaxed"
        >
          <div className="flex items-start gap-2">
            <span className="text-sm flex-shrink-0" aria-hidden="true">⚠️</span>
            <div className="flex-1 min-w-0">
              <strong className="font-semibold block mb-0.5">Backup Validation Failed</strong>
              <p>{validationError}</p>
              <p className="mt-1 text-rose-600">
                Your current database was not modified. Please select a valid Respostack backup file.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold px-1"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Replacement Restore */}
      {stagedBackup && (
        <Modal
          isOpen={true}
          onClose={handleCancelRestore}
          title="Restore Responsibilities from Backup?"
          description="Review the incoming backup details before confirming replacement."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600">
            {/* Backup summary details */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">Backup Format:</span>
                <span className="font-semibold text-slate-800">{stagedBackup.format} (v{stagedBackup.version})</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500">Exported At:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(stagedBackup.exportedAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500">Incoming Records:</span>
                <span className="font-bold text-teal-700 text-sm">{stagedBackup.itemCount} items</span>
              </div>
            </div>

            {/* Warning regarding full replacement */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <span>⚠️</span>
                <span>Full Database Replacement Warning</span>
              </div>
              <p>
                Restoring this backup will <strong>replace all {responsibilities.length} existing {responsibilities.length === 1 ? 'responsibility' : 'responsibilities'}</strong> currently stored on this device.
              </p>
              {responsibilities.length > 0 && (
                <p className="font-medium text-rose-950 pt-0.5">
                  If you have records you wish to keep, we recommend canceling and downloading a backup of your current database first.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                onClick={handleCancelRestore}
                disabled={isRestoring}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleConfirmRestore}
                isLoading={isRestoring}
                disabled={isRestoring}
              >
                Replace &amp; Restore ({stagedBackup.itemCount} Items)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};
