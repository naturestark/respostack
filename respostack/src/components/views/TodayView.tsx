import React from 'react';
import { Responsibility } from '../../types/responsibility';
import { StatCounterCard } from '../responsibilities/StatCounterCard';
import { ResponsibilityCard } from '../responsibilities/ResponsibilityCard';
import { EmptyState } from '../common/EmptyState';
import { classifyDueDate, getTodayDateString } from '../../utils/dateUtils';
import { sortResponsibilities } from '../../utils/filterSortUtils';
import {
  getActiveReminderAttentionItems,
  getApproachingResponsibilities,
} from '../../features/reminders/reminder.service';
import { dismissReminder } from '../../features/reminders/reminder.scheduler';

interface TodayViewProps {
  responsibilities: Responsibility[];
  onToggleComplete: (id: string) => void;
  onEdit: (responsibility: Responsibility) => void;
  onDelete: (responsibility: Responsibility) => void;
  onNewResponsibility: () => void;
  onDismissReminder?: (id: string, reminderAt: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  responsibilities,
  onToggleComplete,
  onEdit,
  onDelete,
  onNewResponsibility,
}) => {
  const todayStr = getTodayDateString();
  const now = new Date();

  // 1. Filter only active responsibilities for Today review
  const activeItems = responsibilities.filter((item) => !item.isCompleted);

  // 2. Classify active items by due date
  const overdueItems = sortResponsibilities(
    activeItems.filter((item) => classifyDueDate(item.dueDate, todayStr, false) === 'overdue'),
    'dueDateAsc',
    todayStr
  );

  const dueTodayItems = activeItems.filter(
    (item) => classifyDueDate(item.dueDate, todayStr, false) === 'due-today'
  );

  // 3. Reminders Due & Missed (Active attention items derived from actual records)
  const activeReminders = getActiveReminderAttentionItems(activeItems, now);

  // 4. Approaching Horizon (Due within the next 3 days, excluding today and overdue)
  const approachingItems = getApproachingResponsibilities(activeItems, todayStr, 3);

  // 5. Remaining upcoming items beyond approaching horizon
  const remainingUpcomingItems = sortResponsibilities(
    activeItems.filter((item) => {
      const isOverdue = classifyDueDate(item.dueDate, todayStr, false) === 'overdue';
      const isDueToday = classifyDueDate(item.dueDate, todayStr, false) === 'due-today';
      const isApproaching = approachingItems.some((a) => a.id === item.id);
      return !isOverdue && !isDueToday && !isApproaching && item.dueDate;
    }),
    'dueDateAsc',
    todayStr
  );

  const todayDateFormatted = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const totalActionable = overdueItems.length + dueTodayItems.length + activeReminders.length;

  const handleDismissReminderClick = async (responsibilityId: string, reminderAt: string) => {
    try {
      await dismissReminder(responsibilityId, reminderAt);
      // Local state update via Dexie live query
    } catch (err) {
      console.warn('Failed to dismiss reminder:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with date */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Today Overview</h2>
          <p className="text-sm text-slate-500 mt-0.5">{todayDateFormatted}</p>
        </div>
        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg self-start sm:self-auto">
          {totalActionable === 0
            ? '✓ All caught up for today'
            : `${totalActionable} ${totalActionable === 1 ? 'item needs' : 'items need'} attention today`}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCounterCard
          label="Overdue"
          count={overdueItems.length}
          description="Tasks past their scheduled target date"
          variant="overdue"
        />
        <StatCounterCard
          label="Due Today"
          count={dueTodayItems.length}
          description="Responsibilities scheduled for today"
          variant="due-today"
        />
        <StatCounterCard
          label="Reminders &amp; Approaching"
          count={activeReminders.length + approachingItems.length}
          description="Active reminders or deadlines in next 3 days"
          variant="upcoming"
        />
      </div>

      {/* SECTION 1: Active Reminders Due or Missed */}
      {activeReminders.length > 0 && (
        <section aria-labelledby="reminders-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" aria-hidden="true" />
            <h3 id="reminders-heading" className="text-sm font-bold uppercase tracking-wider text-teal-900">
              Reminders Due &amp; Missed ({activeReminders.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {activeReminders.map(({ responsibility, status, reminderAt, timeLabel }) => (
              <div
                key={`reminder-${responsibility.id}-${reminderAt}`}
                className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
                    🔔
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-600 text-white">
                        {status === 'due' ? 'Reminder Due Now' : 'Missed Reminder'}
                      </span>
                      <span className="text-xs text-teal-800 font-medium">
                        {timeLabel}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 break-words">
                      {responsibility.title}
                    </h4>
                    {responsibility.notes && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {responsibility.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDismissReminderClick(responsibility.id, reminderAt)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-teal-100/60 rounded-md transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(responsibility)}
                    className="px-2.5 py-1.5 text-xs font-medium text-teal-800 hover:text-teal-900 hover:bg-teal-100 rounded-md transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleComplete(responsibility.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 rounded-md shadow-xs transition-colors"
                  >
                    Mark Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: Overdue Section */}
      {overdueItems.length > 0 && (
        <section aria-labelledby="overdue-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" aria-hidden="true" />
            <h3 id="overdue-heading" className="text-sm font-bold uppercase tracking-wider text-rose-900">
              Needs Immediate Attention ({overdueItems.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {overdueItems.map((item) => (
              <ResponsibilityCard
                key={item.id}
                responsibility={item}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 3: Due Today Section */}
      {dueTodayItems.length > 0 && (
        <section aria-labelledby="due-today-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden="true" />
            <h3 id="due-today-heading" className="text-sm font-bold uppercase tracking-wider text-amber-900">
              Due Today ({dueTodayItems.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {dueTodayItems.map((item) => (
              <ResponsibilityCard
                key={item.id}
                responsibility={item}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 4: Approaching Deadlines (Next 3 Days Horizon) */}
      {approachingItems.length > 0 && (
        <section aria-labelledby="approaching-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" aria-hidden="true" />
            <h3 id="approaching-heading" className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Approaching Deadlines (Next 3 Days) ({approachingItems.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {approachingItems.map((item) => (
              <ResponsibilityCard
                key={item.id}
                responsibility={item}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 5: Later Upcoming Section */}
      {remainingUpcomingItems.length > 0 && (
        <section aria-labelledby="upcoming-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" aria-hidden="true" />
            <h3 id="upcoming-heading" className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Later Upcoming ({remainingUpcomingItems.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {remainingUpcomingItems.map((item) => (
              <ResponsibilityCard
                key={item.id}
                responsibility={item}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty States */}
      {activeItems.length === 0 ? (
        <EmptyState
          title="No active responsibilities"
          description="Your personal plate is clean! Add responsibilities with due dates or reminders to keep track of life tasks."
          actionLabel="Add Responsibility"
          onAction={onNewResponsibility}
        />
      ) : totalActionable === 0 ? (
        <div className="p-6 bg-teal-50/60 border border-teal-200/80 rounded-2xl text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg mb-2">
            ✓
          </div>
          <h3 className="text-base font-semibold text-teal-900">
            No responsibilities need immediate attention today
          </h3>
          <p className="text-sm text-teal-700 max-w-md mx-auto mt-1">
            You have no overdue items, reminders due, or tasks scheduled for today. Review upcoming responsibilities above or switch to All Responsibilities.
          </p>
        </div>
      ) : null}
    </div>
  );
};
