import { Responsibility, ResponsibilityCategory, SortOption } from '../types/responsibility';
import { classifyDueDate, getTodayDateString } from './dateUtils';

export interface FilterOptions {
  searchQuery?: string;
  category?: ResponsibilityCategory | 'ALL';
  completionStatus?: 'all' | 'active' | 'completed';
}

export function filterResponsibilities(
  items: Responsibility[],
  options: FilterOptions
): Responsibility[] {
  const query = (options.searchQuery || '').trim().toLowerCase();
  const categoryFilter = options.category || 'ALL';
  const statusFilter = options.completionStatus || 'all';

  return items.filter((item) => {
    // 1. Completion status filter
    if (statusFilter === 'active' && item.isCompleted) {
      return false;
    }
    if (statusFilter === 'completed' && !item.isCompleted) {
      return false;
    }

    // 2. Category filter
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
      return false;
    }

    // 3. Search query (matches title or notes)
    if (query) {
      const matchTitle = item.title ? item.title.toLowerCase().includes(query) : false;
      const matchNotes = item.notes ? item.notes.toLowerCase().includes(query) : false;
      if (!matchTitle && !matchNotes) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts responsibilities predictably and deterministically.
 *
 * Urgency Order:
 * 1. Active Overdue (oldest due date first)
 * 2. Active Due Today
 * 3. Active Upcoming (soonest due date first)
 * 4. Active with No Due Date (newest created first)
 * 5. Completed responsibilities (newest completed first)
 *
 * Tie-breaker:
 * When due dates are identical, items are sorted by createdAt descending,
 * with id as the final tie-breaker to ensure stable sorting across all engines.
 */
export function sortResponsibilities(
  items: Responsibility[],
  sortBy: SortOption,
  todayStr: string = getTodayDateString()
): Responsibility[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'urgency': {
        // Step 1: Active items always take priority over completed items in urgency
        if (!a.isCompleted && b.isCompleted) return -1;
        if (a.isCompleted && !b.isCompleted) return 1;

        if (a.isCompleted && b.isCompleted) {
          const dateA = a.completedAt || a.updatedAt;
          const dateB = b.completedAt || b.updatedAt;
          const cmp = dateB.localeCompare(dateA);
          return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
        }

        // Both are active items: classify urgency status
        const statusA = classifyDueDate(a.dueDate, todayStr, a.isCompleted);
        const statusB = classifyDueDate(b.dueDate, todayStr, b.isCompleted);

        const statusRank = (status: string) => {
          if (status === 'overdue') return 1;
          if (status === 'due-today') return 2;
          if (status === 'upcoming') return 3;
          return 4; // 'none'
        };

        const rankA = statusRank(statusA);
        const rankB = statusRank(statusB);

        if (rankA !== rankB) {
          return rankA - rankB;
        }

        // Within same urgency tier:
        // If both have due dates, sort earliest due date first
        if (a.dueDate && b.dueDate) {
          const dateDiff = a.dueDate.localeCompare(b.dueDate);
          if (dateDiff !== 0) return dateDiff;
        } else if (a.dueDate && !b.dueDate) {
          return -1;
        } else if (!a.dueDate && b.dueDate) {
          return 1;
        }

        // Secondary tie-breaker: createdAt descending (newest created first)
        const createdDiff = b.createdAt.localeCompare(a.createdAt);
        if (createdDiff !== 0) return createdDiff;

        // Final deterministic tie-breaker: unique ID
        return a.id.localeCompare(b.id);
      }

      case 'dueDateAsc': {
        // Active items with due dates first
        if (a.dueDate && b.dueDate) {
          const diff = a.dueDate.localeCompare(b.dueDate);
          if (diff !== 0) return diff;
        } else if (a.dueDate && !b.dueDate) {
          return -1;
        } else if (!a.dueDate && b.dueDate) {
          return 1;
        }

        const createdDiff = b.createdAt.localeCompare(a.createdAt);
        if (createdDiff !== 0) return createdDiff;
        return a.id.localeCompare(b.id);
      }

      case 'dueDateDesc': {
        if (a.dueDate && b.dueDate) {
          const diff = b.dueDate.localeCompare(a.dueDate);
          if (diff !== 0) return diff;
        } else if (a.dueDate && !b.dueDate) {
          return -1;
        } else if (!a.dueDate && b.dueDate) {
          return 1;
        }

        const createdDiff = b.createdAt.localeCompare(a.createdAt);
        if (createdDiff !== 0) return createdDiff;
        return a.id.localeCompare(b.id);
      }

      case 'recent': {
        const updateDiff = b.updatedAt.localeCompare(a.updatedAt);
        if (updateDiff !== 0) return updateDiff;
        return a.id.localeCompare(b.id);
      }

      case 'titleAsc': {
        const titleDiff = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        if (titleDiff !== 0) return titleDiff;
        return a.id.localeCompare(b.id);
      }

      default:
        return 0;
    }
  });

  return sorted;
}

export interface ResponsibilityMetrics {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  dueToday: number;
  upcoming: number;
}

/**
 * Computes live operational metrics strictly derived from saved records.
 * Overdue, Due Today, and Upcoming metrics apply ONLY to active (uncompleted) items.
 */
export function computeMetrics(
  items: Responsibility[],
  todayStr: string = getTodayDateString()
): ResponsibilityMetrics {
  let active = 0;
  let completed = 0;
  let overdue = 0;
  let dueToday = 0;
  let upcoming = 0;

  for (const item of items) {
    if (item.isCompleted) {
      completed++;
    } else {
      active++;
      const status = classifyDueDate(item.dueDate, todayStr, item.isCompleted);
      if (status === 'overdue') {
        overdue++;
      } else if (status === 'due-today') {
        dueToday++;
      } else if (status === 'upcoming') {
        upcoming++;
      }
    }
  }

  return {
    total: items.length,
    active,
    completed,
    overdue,
    dueToday,
    upcoming,
  };
}
