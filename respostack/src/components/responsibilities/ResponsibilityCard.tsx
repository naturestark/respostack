import React from 'react';
import { Responsibility } from '../../types/responsibility';
import { Badge } from '../common/Badge';
import { getRelativeDueLabel, formatDueDate } from '../../utils/dateUtils';
import { formatReminderDateTime } from '../../features/reminders/reminder.service';
import { formatRecurrenceRule } from '../../features/recurrence/recurrence.service';

interface ResponsibilityCardProps {
  responsibility: Responsibility;
  onToggleComplete: (id: string) => void;
  onEdit: (responsibility: Responsibility) => void;
  onDelete: (responsibility: Responsibility) => void;
}

export const ResponsibilityCard: React.FC<ResponsibilityCardProps> = ({
  responsibility,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  const {
    isCompleted,
    dueDate,
    reminderAt,
    recurrence,
    completedAt,
    amount,
    currency,
    notes,
    category,
    title,
  } = responsibility;
  const dueInfo = getRelativeDueLabel(dueDate, undefined, isCompleted);

  return (
    <div
      className={`group relative bg-white rounded-xl border p-4 sm:p-5 transition-all duration-150 ${
        isCompleted
          ? 'border-slate-200/60 bg-slate-50/50 opacity-80'
          : dueInfo.status === 'overdue'
          ? 'border-rose-200/90 hover:border-rose-300 shadow-sm'
          : dueInfo.status === 'due-today'
          ? 'border-amber-200/90 hover:border-amber-300 shadow-sm'
          : 'border-slate-200/80 hover:border-slate-300 shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Toggle complete button */}
        <button
          type="button"
          onClick={() => onToggleComplete(responsibility.id)}
          aria-label={isCompleted ? `Reopen "${title}"` : `Mark "${title}" as completed`}
          className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
            isCompleted
              ? 'bg-teal-600 border-teal-600 text-white'
              : 'border-slate-300 hover:border-teal-500 bg-white'
          }`}
        >
          {isCompleted && (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge variant="category" category={category} size="sm">
              {category}
            </Badge>

            {!isCompleted && dueDate && (
              <Badge variant="status" status={dueInfo.status} size="sm">
                {dueInfo.text}
              </Badge>
            )}

            {/* Recurring Series Indicator */}
            {recurrence && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full"
                title={formatRecurrenceRule(recurrence)}
              >
                <span aria-hidden="true">🔁</span>
                <span>{formatRecurrenceRule(recurrence)}</span>
              </span>
            )}

            {/* Reminder Badge */}
            {!isCompleted && reminderAt && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                <span aria-hidden="true">🔔</span>
                <span>{formatReminderDateTime(reminderAt)}</span>
              </span>
            )}

            {isCompleted && completedAt && (
              <span className="text-xs text-slate-400">
                Completed on {new Date(completedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <h3
            className={`text-base font-semibold leading-snug break-words ${
              isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
            }`}
          >
            {title}
          </h3>

          {notes && (
            <p className="mt-1.5 text-sm text-slate-600 whitespace-pre-line leading-relaxed break-words">
              {notes}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              {dueDate && (
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <svg
                    className="w-3.5 h-3.5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatDueDate(dueDate)}
                </span>
              )}

              {amount !== undefined && (
                <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  {currency || 'USD'}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                type="button"
                onClick={() => onEdit(responsibility)}
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label={`Edit "${title}"`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(responsibility)}
                className="px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                aria-label={`Delete "${title}"`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
