import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { Responsibility } from '../../types/responsibility';
import { BackupSettings } from '../../features/backup/BackupSettings';
import { ReminderSettings } from '../../features/reminders/ReminderSettings';

interface SettingsViewProps {
  totalCount: number;
  activeCount: number;
  completedCount: number;
  responsibilities: Responsibility[];
  onLoadDemoData: () => Promise<void>;
  onClearAllData: () => Promise<void>;
  onRestoreSuccess: (count: number) => void;
  onShowToast: (type: 'success' | 'error', message: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  totalCount,
  activeCount,
  completedCount,
  responsibilities,
  onLoadDemoData,
  onClearAllData,
  onRestoreSuccess,
  onShowToast,
}) => {
  const { isStandalone, canInstall, platform, promptInstall } = usePwaInstall();
  const [isDemoConfirmOpen, setIsDemoConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleConfirmDemo = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      await onLoadDemoData();
      setIsDemoConfirmOpen(false);
      setFeedback({
        type: 'success',
        message: 'Sample responsibilities (marked [Sample]) loaded into local database.',
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to load sample responsibilities.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmClear = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      await onClearAllData();
      setIsClearConfirmOpen(false);
      setFeedback({
        type: 'success',
        message: 'All responsibility data has been deleted from this browser.',
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to clear data.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInstallClick = async () => {
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        setFeedback({
          type: 'success',
          message: 'Respostack installation initiated successfully.',
        });
      }
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Settings &amp; Privacy</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage deadline reminders, local backups, Progressive Web App status, and private storage.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3.5 border rounded-xl text-sm font-medium transition-all ${
            feedback.type === 'success'
              ? 'bg-teal-50 border-teal-200 text-teal-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Reminders & Deadline Awareness Settings */}
      <ReminderSettings onShowToast={onShowToast} />

      {/* Backup and Restore Controls */}
      <BackupSettings
        responsibilities={responsibilities}
        onRestoreSuccess={onRestoreSuccess}
        onShowToast={onShowToast}
      />

      {/* PWA & Offline Status Card */}
      <Card className="p-6">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-2.5 rounded-xl bg-teal-100 text-teal-800 flex-shrink-0" aria-hidden="true">
            📱
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                Progressive Web App &amp; Offline Status
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  isStandalone
                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isStandalone ? '✓ Standalone App' : 'Browser Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Respostack caches its application shell to provide offline access without external server dependencies.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block mb-1">Display Mode</span>
            <span className="font-semibold text-slate-800">
              {isStandalone ? 'Installed (Standalone Window)' : 'Web Browser Tab'}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-slate-400 block mb-1">Offline Reliability</span>
            <span className="font-semibold text-teal-700">
              Available Once Cached
            </span>
          </div>
        </div>

        {/* Installation Actions */}
        {!isStandalone && (
          <div className="pt-3 border-t border-slate-100">
            {canInstall ? (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-slate-600">
                  Ready to install as a standalone desktop or mobile application:
                </span>
                <Button variant="primary" size="sm" onClick={handleInstallClick}>
                  Install Respostack
                </Button>
              </div>
            ) : platform === 'ios' ? (
              <div className="bg-teal-50/60 p-3 rounded-lg border border-teal-200 text-xs text-slate-700 space-y-1">
                <p className="font-semibold text-teal-900">To install on iPhone or iPad:</p>
                <p className="text-slate-600">
                  Tap the <strong>Share</strong> icon (📤) in Safari, scroll down, and select <strong>Add to Home Screen</strong> (➕).
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                To install manually, check your browser menu for &ldquo;Install Respostack&rdquo; or look for the install icon (⊕) in your browser address bar.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Privacy Architecture Notice */}
      <Card className="p-6 border-teal-200 bg-gradient-to-br from-teal-50/50 to-white">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-teal-600 text-white mt-0.5 shadow-sm" aria-hidden="true">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">
              Privacy-First Architecture
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Respostack stores all your responsibilities directly on your personal device using{' '}
              <strong className="text-slate-800 font-semibold">IndexedDB</strong>.
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 pt-1">
              <li>
                <strong>Cache &amp; Storage Separation:</strong> The service worker caches only static application code (HTML, JS, CSS, icons). Your personal responsibilities are kept strictly inside IndexedDB and are never placed in URLs or service-worker HTTP caches.
              </li>
              <li>
                <strong>Zero Remote Transmission:</strong> Your data never leaves this browser. There is no remote backend, cloud server, analytics tracker, or third-party telemetry.
              </li>
              <li>
                <strong>Standard Browser Storage:</strong> Data is saved in your local browser sandbox unencrypted. Anyone with physical access to your device profile could view it, so avoid storing sensitive raw credentials.
              </li>
              <li>
                <strong>Browser Cache &amp; Reset Notice:</strong> Clearing site data or IndexedDB storage will delete your records unless backed up.
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Demo & Test Data Controls */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          Sample Data &amp; Reset
        </h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Populate sample responsibilities clearly marked with <code className="bg-slate-100 px-1 py-0.5 rounded font-semibold text-slate-700">[Sample]</code> to test filtering, due-date sorting, and categories, or delete all records.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setIsDemoConfirmOpen(true)}
            disabled={isProcessing}
          >
            Load Sample Responsibilities
          </Button>

          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={() => setIsClearConfirmOpen(true)}
            disabled={totalCount === 0 || isProcessing}
          >
            Clear All Data
          </Button>
        </div>
      </Card>

      {/* Storage Diagnostics */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          Local Storage Diagnostics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block mb-1">Storage Type</span>
            <span className="font-semibold text-slate-800">IndexedDB</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block mb-1">Database Name</span>
            <span className="font-mono text-slate-800 font-medium">life_admin_db</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block mb-1">Active Items</span>
            <span className="font-semibold text-teal-700">{activeCount}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block mb-1">Completed Items</span>
            <span className="font-semibold text-slate-700">{completedCount}</span>
          </div>
        </div>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={isDemoConfirmOpen}
        onClose={() => {
          if (!isProcessing) setIsDemoConfirmOpen(false);
        }}
        onConfirm={handleConfirmDemo}
        title="Load Sample Responsibilities?"
        message="This will add 7 realistic sample responsibilities (each clearly labelled with [Sample]) to your local database so you can explore the app. Existing records will not be deleted."
        confirmLabel="Load Sample Data"
        variant="primary"
        isLoading={isProcessing}
      />

      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => {
          if (!isProcessing) setIsClearConfirmOpen(false);
        }}
        onConfirm={handleConfirmClear}
        title="Delete All Responsibilities?"
        message="Are you sure you want to permanently delete all responsibilities from this browser? This action cannot be undone."
        confirmLabel="Yes, Clear All Data"
        variant="danger"
        isLoading={isProcessing}
      />
    </div>
  );
};
