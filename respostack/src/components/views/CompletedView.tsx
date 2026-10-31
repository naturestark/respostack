import React, { useState, useMemo } from 'react';
import { Responsibility } from '../../types/responsibility';
import { ResponsibilityCard } from '../responsibilities/ResponsibilityCard';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../common/Button';

interface CompletedViewProps {
  responsibilities: Responsibility[];
  onToggleComplete: (id: string) => void;
  onEdit: (responsibility: Responsibility) => void;
  onDelete: (responsibility: Responsibility) => void;
  onSwitchToAll: () => void;
}

export const CompletedView: React.FC<CompletedViewProps> = ({
  responsibilities,
  onToggleComplete,
  onEdit,
  onDelete,
  onSwitchToAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const completedItems = useMemo(() => {
    return responsibilities
      .filter((item) => item.isCompleted)
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.notes ? item.notes.toLowerCase().includes(q) : false)
        );
      })
      .sort((a, b) => {
        // Sort most recently completed first
        const dateA = a.completedAt || a.updatedAt;
        const dateB = b.completedAt || b.updatedAt;
        return dateB.localeCompare(dateA);
      });
  }, [responsibilities, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Completed History</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Archived record of all completed tasks and personal milestones.
          </p>
        </div>

        <div className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg self-start sm:self-auto">
          {completedItems.length} {completedItems.length === 1 ? 'task completed' : 'tasks completed'}
        </div>
      </div>

      {/* Search completed items */}
      {responsibilities.some((r) => r.isCompleted) && (
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search completed tasks..."
            aria-label="Search completed responsibilities"
            className="w-full pl-9 pr-4 py-2 text-sm text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder:text-slate-400 bg-white"
          />
        </div>
      )}

      {/* Completed items list */}
      {completedItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {completedItems.map((item) => (
            <ResponsibilityCard
              key={item.id}
              responsibility={item}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : searchQuery.trim() ? (
        <EmptyState
          title="No completed items match your search"
          description="Try adjusting your search query to find completed items in history."
          actionLabel="Clear Search"
          onAction={() => setSearchQuery('')}
        />
      ) : (
        <EmptyState
          title="No completed responsibilities yet"
          description="When you finish a task, click the circle icon next to it to mark it completed. It will be safely recorded here."
          actionLabel="View Active Tasks"
          onAction={onSwitchToAll}
        />
      )}
    </div>
  );
};
