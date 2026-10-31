import { describe, it, expect } from 'vitest';
import { Responsibility } from '../types/responsibility';
import {
  computeMetrics,
  filterResponsibilities,
  sortResponsibilities,
} from '../utils/filterSortUtils';

describe('Filter & Sorting Logic', () => {
  const FIXED_TODAY = '2026-10-29';

  const mockItems: Responsibility[] = [
    {
      id: 'item-1',
      title: 'Pay Electric Utility Bill',
      category: 'Bills',
      dueDate: '2026-10-25', // Active Overdue
      notes: 'Account #987654',
      isCompleted: false,
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'item-2',
      title: 'Dentist Checkup & Cleaning',
      category: 'Health',
      dueDate: '2026-10-29', // Active Due Today
      notes: 'Bring insurance card and referral slip',
      isCompleted: false,
      createdAt: '2026-10-05T10:00:00Z',
      updatedAt: '2026-10-05T10:00:00Z',
    },
    {
      id: 'item-3',
      title: 'Renew Passport for Summer Travel',
      category: 'Documents',
      dueDate: '2026-11-20', // Active Upcoming
      notes: 'Requires 2 updated passport photos',
      isCompleted: false,
      createdAt: '2026-10-10T10:00:00Z',
      updatedAt: '2026-10-10T10:00:00Z',
    },
    {
      id: 'item-4',
      title: 'Schedule HVAC Service Inspection',
      category: 'Personal',
      // Active No due date
      notes: 'Order replacement 16x25x1 filters',
      isCompleted: false,
      createdAt: '2026-10-12T10:00:00Z',
      updatedAt: '2026-10-12T10:00:00Z',
    },
    {
      id: 'item-5',
      title: 'File State Tax Return Voucher',
      category: 'Bills',
      dueDate: '2026-10-15', // Past due date BUT isCompleted === true
      notes: 'Completed and submitted electronically',
      isCompleted: true,
      completedAt: '2026-10-15T15:00:00Z',
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-10-15T15:00:00Z',
    },
  ];

  describe('filterResponsibilities', () => {
    it('filters by status: active', () => {
      const active = filterResponsibilities(mockItems, { completionStatus: 'active' });
      expect(active).toHaveLength(4);
      expect(active.every((i) => !i.isCompleted)).toBe(true);
    });

    it('filters by status: completed', () => {
      const completed = filterResponsibilities(mockItems, { completionStatus: 'completed' });
      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('item-5');
    });

    it('filters by category', () => {
      const bills = filterResponsibilities(mockItems, { category: 'Bills' });
      expect(bills).toHaveLength(2);
      expect(bills.map((b) => b.id)).toEqual(['item-1', 'item-5']);
    });

    it('combines category and status filters', () => {
      const activeBills = filterResponsibilities(mockItems, {
        category: 'Bills',
        completionStatus: 'active',
      });
      expect(activeBills).toHaveLength(1);
      expect(activeBills[0].id).toBe('item-1');
    });

    it('searches by title case-insensitively and handles leading/trailing whitespace', () => {
      const searchRes = filterResponsibilities(mockItems, {
        searchQuery: '   ELECTRIC   ',
      });
      expect(searchRes).toHaveLength(1);
      expect(searchRes[0].id).toBe('item-1');
    });

    it('searches by notes text content', () => {
      const searchRes = filterResponsibilities(mockItems, {
        searchQuery: 'passport photos',
      });
      expect(searchRes).toHaveLength(1);
      expect(searchRes[0].id).toBe('item-3');
    });

    it('returns empty array when search matches nothing', () => {
      const searchRes = filterResponsibilities(mockItems, {
        searchQuery: 'non-existent keyword xyz',
      });
      expect(searchRes).toHaveLength(0);
    });
  });

  describe('sortResponsibilities', () => {
    it('sorts active items by urgency: overdue -> due-today -> upcoming -> no-date', () => {
      const activeItems = mockItems.filter((i) => !i.isCompleted);
      const sorted = sortResponsibilities(activeItems, 'urgency', FIXED_TODAY);
      expect(sorted.map((i) => i.id)).toEqual(['item-1', 'item-2', 'item-3', 'item-4']);
    });

    it('places completed items AFTER all active items in urgency sort', () => {
      const sorted = sortResponsibilities(mockItems, 'urgency', FIXED_TODAY);
      // item-5 has a past due date (2026-10-15), but because it is completed, it MUST NOT appear at the top!
      expect(sorted[sorted.length - 1].id).toBe('item-5');
      expect(sorted[0].id).toBe('item-1'); // Active overdue
    });

    it('guarantees stable sorting when multiple items share the identical due date', () => {
      const duplicateDateItems: Responsibility[] = [
        {
          id: 'b-second-created',
          title: 'Task B',
          category: 'Personal',
          dueDate: '2026-11-01',
          isCompleted: false,
          createdAt: '2026-10-01T12:00:00Z',
          updatedAt: '2026-10-01T12:00:00Z',
        },
        {
          id: 'a-first-created',
          title: 'Task A',
          category: 'Personal',
          dueDate: '2026-11-01', // Same due date
          isCompleted: false,
          createdAt: '2026-10-01T14:00:00Z', // Created later (newest first)
          updatedAt: '2026-10-01T14:00:00Z',
        },
      ];

      const sorted = sortResponsibilities(duplicateDateItems, 'urgency', FIXED_TODAY);
      expect(sorted[0].id).toBe('a-first-created');
      expect(sorted[1].id).toBe('b-second-created');
    });

    it('sorts by dueDateAsc and places undated items at the end', () => {
      const activeItems = mockItems.filter((i) => !i.isCompleted);
      const sorted = sortResponsibilities(activeItems, 'dueDateAsc', FIXED_TODAY);
      expect(sorted.map((i) => i.id)).toEqual(['item-1', 'item-2', 'item-3', 'item-4']);
    });

    it('sorts by dueDateDesc', () => {
      const activeItems = mockItems.filter((i) => !i.isCompleted);
      const sorted = sortResponsibilities(activeItems, 'dueDateDesc', FIXED_TODAY);
      expect(sorted[0].id).toBe('item-3'); // 2026-11-20
      expect(sorted[1].id).toBe('item-2'); // 2026-10-29
      expect(sorted[2].id).toBe('item-1'); // 2026-10-25
      expect(sorted[3].id).toBe('item-4'); // No date at end
    });

    it('sorts by titleAsc alphabetically', () => {
      const sorted = sortResponsibilities(mockItems.slice(0, 3), 'titleAsc', FIXED_TODAY);
      expect(sorted.map((i) => i.title)).toEqual([
        'Dentist Checkup & Cleaning',
        'Pay Electric Utility Bill',
        'Renew Passport for Summer Travel',
      ]);
    });
  });

  describe('computeMetrics', () => {
    it('accurately derives counts from actual saved records', () => {
      const metrics = computeMetrics(mockItems, FIXED_TODAY);
      expect(metrics.total).toBe(5);
      expect(metrics.active).toBe(4);
      expect(metrics.completed).toBe(1);
      expect(metrics.overdue).toBe(1); // Only active item-1
      expect(metrics.dueToday).toBe(1); // Only active item-2
      expect(metrics.upcoming).toBe(1); // Only active item-3
    });

    it('does not count completed overdue items as active overdue', () => {
      const completedOverdueItem: Responsibility = {
        id: 'comp-1',
        title: 'Old bill',
        category: 'Bills',
        dueDate: '2026-01-01', // Months overdue
        isCompleted: true,
        completedAt: '2026-01-02T10:00:00Z',
        createdAt: '2025-12-01T10:00:00Z',
        updatedAt: '2026-01-02T10:00:00Z',
      };

      const metrics = computeMetrics([completedOverdueItem], FIXED_TODAY);
      expect(metrics.total).toBe(1);
      expect(metrics.active).toBe(0);
      expect(metrics.completed).toBe(1);
      expect(metrics.overdue).toBe(0); // MUST BE 0!
    });
  });
});
