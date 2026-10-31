import React, { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { responsibilitiesRepo } from './db/responsibilitiesRepo';
import { Responsibility, ResponsibilityFormData } from './types/responsibility';
import { Layout } from './components/layout/Layout';
import { TabId } from './components/layout/Navigation';
import { TodayView } from './components/views/TodayView';
import { AllResponsibilitiesView } from './components/views/AllResponsibilitiesView';
import { CompletedView } from './components/views/CompletedView';
import { SettingsView } from './components/views/SettingsView';
import { ResponsibilityFormModal } from './components/responsibilities/ResponsibilityFormModal';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { Button } from './components/common/Button';
import { computeMetrics } from './utils/filterSortUtils';
import { getTodayDateString } from './utils/dateUtils';
import { checkAndDispatchDueReminders } from './features/reminders/reminder.scheduler';
import { getActiveReminderAttentionItems } from './features/reminders/reminder.service';

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export function App() {
  const [currentTab, setCurrentTab] = useState<TabId>('today');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Responsibility | null>(null);
  const [deletingItem, setDeletingItem] = useState<Responsibility | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4000);
  };

  // Live query from Dexie IndexedDB
  const responsibilities = useLiveQuery(
    async () => {
      try {
        const items = await db.responsibilities.toArray();
        if (dbError) setDbError(null);
        return items;
      } catch (err: unknown) {
        console.error('Failed to query IndexedDB:', err);
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not access browser storage. Please check permissions.';
        setDbError(msg);
        return [];
      }
    },
    [],
    undefined
  );

  const todayStr = getTodayDateString();
  const metrics = computeMetrics(responsibilities || [], todayStr);
  const activeReminders = responsibilities
    ? getActiveReminderAttentionItems(responsibilities.filter((r) => !r.isCompleted))
    : [];

  // Reminder evaluation lifecycle: runs on load, visibility change, focus, and interval
  const evaluateReminders = useCallback(async () => {
    if (!responsibilities || responsibilities.length === 0) return;
    try {
      await checkAndDispatchDueReminders(responsibilities);
    } catch (err) {
      console.warn('Reminder evaluation check encountered an error:', err);
    }
  }, [responsibilities]);

  useEffect(() => {
    evaluateReminders();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        evaluateReminders();
      }
    };

    const handleFocus = () => {
      evaluateReminders();
    };

    // Re-check periodically while app is open (every 60 seconds)
    const interval = setInterval(evaluateReminders, 60000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [evaluateReminders]);

  // Action handlers
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (item: Responsibility) => {
    setEditingItem(item);
    setIsFormModalOpen(true);
  };

  const handleSaveResponsibility = async (formData: ResponsibilityFormData) => {
    try {
      if (editingItem) {
        await responsibilitiesRepo.update(editingItem.id, formData);
        showToast('success', 'Responsibility updated successfully.');
      } else {
        await responsibilitiesRepo.create(formData);
        showToast('success', 'New responsibility created.');
      }
    } catch (err: unknown) {
      console.error('Error saving responsibility:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save responsibility.';
      showToast('error', msg);
      throw err; // Let form display inline validation errors
    }
  };

  const handleToggleComplete = async (id: string) => {
    const existing = responsibilities?.find((r) => r.id === id);
    try {
      const updated = await responsibilitiesRepo.toggleComplete(id);
      if (updated.isCompleted) {
        showToast('success', `Completed "${existing?.title || 'responsibility'}".`);
      } else {
        showToast('success', `Reopened "${existing?.title || 'responsibility'}".`);
      }
    } catch (err: unknown) {
      console.error('Error toggling completion status:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update completion status.';
      showToast('error', msg);
    }
  };

  const handleDeletePrompt = (item: Responsibility) => {
    setDeletingItem(item);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    const title = deletingItem.title;
    try {
      setIsDeleting(true);
      await responsibilitiesRepo.delete(deletingItem.id);
      setDeletingItem(null);
      showToast('success', `Deleted "${title}".`);
    } catch (err: unknown) {
      console.error('Failed to delete responsibility:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete responsibility.';
      showToast('error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Critical database error state
  if (dbError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-6 sm:p-8 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 text-xl">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Unable to Access Local Storage
          </h2>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            Respostack could not access its IndexedDB database on this device. This can happen if browser storage permissions are blocked or running in strict restricted mode.
          </p>
          <p className="text-xs font-mono text-rose-700 bg-rose-50 p-2.5 rounded-lg mb-6 break-words">
            {dbError}
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </Button>
        </div>
      </div>
    );
  }

  // Loading state while IndexedDB initializes
  if (responsibilities === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">
          Loading your local responsibilities...
        </p>
      </div>
    );
  }

  return (
    <Layout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      onNewResponsibility={handleOpenCreateModal}
      counts={{
        urgentToday: metrics.overdue + metrics.dueToday + activeReminders.length,
        active: metrics.active,
        completed: metrics.completed,
      }}
    >
      {/* Accessible Toast Notification Banner */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full animate-fade-in"
        >
          <div
            className={`p-3.5 rounded-xl border shadow-lg flex items-center justify-between gap-3 text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-teal-900 text-white border-teal-700 shadow-teal-900/10'
                : 'bg-rose-900 text-white border-rose-700 shadow-rose-900/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/70 hover:text-white text-xs font-bold px-1"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {currentTab === 'today' && (
        <TodayView
          responsibilities={responsibilities}
          onToggleComplete={handleToggleComplete}
          onEdit={handleOpenEditModal}
          onDelete={handleDeletePrompt}
          onNewResponsibility={handleOpenCreateModal}
        />
      )}

      {currentTab === 'all' && (
        <AllResponsibilitiesView
          responsibilities={responsibilities}
          onToggleComplete={handleToggleComplete}
          onEdit={handleOpenEditModal}
          onDelete={handleDeletePrompt}
          onNewResponsibility={handleOpenCreateModal}
        />
      )}

      {currentTab === 'completed' && (
        <CompletedView
          responsibilities={responsibilities}
          onToggleComplete={handleToggleComplete}
          onEdit={handleOpenEditModal}
          onDelete={handleDeletePrompt}
          onSwitchToAll={() => setCurrentTab('all')}
        />
      )}

      {currentTab === 'settings' && (
        <SettingsView
          totalCount={metrics.total}
          activeCount={metrics.active}
          completedCount={metrics.completed}
          responsibilities={responsibilities}
          onLoadDemoData={async () => {
            await responsibilitiesRepo.loadDemoData();
            showToast('success', 'Sample responsibilities loaded.');
          }}
          onClearAllData={async () => {
            await responsibilitiesRepo.clearAll();
            showToast('success', 'All responsibilities cleared.');
          }}
          onRestoreSuccess={() => {
            // Live query updates automatically from Dexie IndexedDB
          }}
          onShowToast={showToast}
        />
      )}

      {/* Form Modal (Create & Edit) */}
      <ResponsibilityFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveResponsibility}
        initialData={editingItem}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Responsibility?"
        message={`Are you sure you want to permanently delete "${deletingItem?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </Layout>
  );
}

export default App;
