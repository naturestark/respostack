import { RecurrenceRule, RecurrenceEditScope } from '../features/recurrence/recurrence.types';

export type ResponsibilityCategory =
  | 'Personal'
  | 'Bills'
  | 'Documents'
  | 'Health'
  | 'Education'
  | 'Other';

export const CATEGORIES: readonly ResponsibilityCategory[] = [
  'Personal',
  'Bills',
  'Documents',
  'Health',
  'Education',
  'Other',
] as const;

export interface Responsibility {
  id: string;
  /**
   * Unique identifier shared by all occurrences belonging to the same recurring series.
   * Omitted or undefined for one-time responsibilities.
   */
  seriesId?: string;
  /**
   * Recurrence configuration rule.
   * Present on recurring series occurrences, undefined on one-time responsibilities.
   */
  recurrence?: RecurrenceRule;
  title: string;
  category: ResponsibilityCategory;
  /**
   * Calendar due date stored strictly in 'YYYY-MM-DD' format.
   * Storing as a date-only string prevents timezone shifts and off-by-one calendar display bugs.
   */
  dueDate?: string;
  /**
   * Optional reminder instant stored strictly as an ISO 8601 UTC timestamp (e.g. '2026-10-30T09:00:00.000Z').
   * Used for in-app deadline awareness and optional browser notifications.
   */
  reminderAt?: string;
  notes?: string;
  amount?: number;
  /**
   * Currency code adhering to ISO 4217 (3 uppercase letters, e.g., 'USD', 'EUR', 'GBP').
   * Required only when amount is specified and non-zero.
   */
  currency?: string;
  isCompleted: boolean;
  createdAt: string; // ISO 8601 string in UTC
  completedAt?: string; // ISO 8601 string in UTC
  updatedAt: string; // ISO 8601 string in UTC
}

export interface ResponsibilityFormData {
  title: string;
  category: ResponsibilityCategory;
  dueDate?: string;
  reminderAt?: string;
  notes?: string;
  amount?: number | '';
  currency?: string;
  seriesId?: string;
  recurrence?: RecurrenceRule;
  editScope?: RecurrenceEditScope;
}

export type DueDateStatus = 'overdue' | 'due-today' | 'upcoming' | 'none';

export type SortOption =
  | 'urgency'
  | 'dueDateAsc'
  | 'dueDateDesc'
  | 'recent'
  | 'titleAsc';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}
