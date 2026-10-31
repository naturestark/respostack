import { Responsibility } from '../types/responsibility';
import { getTodayDateString } from '../utils/dateUtils';

/**
 * Generates clearly labelled example responsibilities.
 * Demo records are explicitly tagged with "[Sample]" so users can easily distinguish them.
 * IDs are deterministic to prevent duplicate entries if reloaded.
 */
export function getDemoResponsibilities(refDate: Date = new Date()): Responsibility[] {
  const todayStr = getTodayDateString(refDate);

  const getOffsetDateStr = (offsetDays: number): string => {
    const d = new Date(refDate);
    d.setDate(d.getDate() + offsetDays);
    return getTodayDateString(d);
  };

  const nowIso = new Date().toISOString();

  return [
    {
      id: 'demo-sample-1',
      title: '[Sample] Schedule annual dental exam & cleaning',
      category: 'Health',
      dueDate: getOffsetDateStr(-4), // 4 days overdue
      notes: 'Example note: Call dental clinic to verify annual preventive coverage. (Sample Data)',
      amount: 45,
      currency: 'USD',
      isCompleted: false,
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 'demo-sample-2',
      title: '[Sample] Submit quarterly estimated income tax voucher',
      category: 'Bills',
      dueDate: todayStr, // Due Today
      notes: 'Example note: Review Q3 estimated payment calculation worksheet. (Sample Data)',
      amount: 480,
      currency: 'USD',
      isCompleted: false,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: 'demo-sample-3',
      title: '[Sample] Submit Continuing Education Unit (CEU) certificates',
      category: 'Education',
      dueDate: getOffsetDateStr(2), // In 2 days
      notes: 'Example note: Upload seminar certificates to professional board portal. (Sample Data)',
      isCompleted: false,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: 'demo-sample-4',
      title: '[Sample] Replace furnace & HVAC air filters',
      category: 'Personal',
      dueDate: getOffsetDateStr(8), // In 8 days
      notes: 'Example note: Filter size 16x25x1. Spares stored in hallway closet. (Sample Data)',
      amount: 32.5,
      currency: 'USD',
      isCompleted: false,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: 'demo-sample-5',
      title: '[Sample] Scan and archive updated vehicle insurance card',
      category: 'Documents',
      dueDate: getOffsetDateStr(18), // In 18 days
      notes: 'Example note: Save digital copy locally and keep physical copy in car. (Sample Data)',
      isCompleted: false,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: 'demo-sample-6',
      title: '[Sample] Audit monthly subscriptions and streaming charges',
      category: 'Bills',
      // No due date
      notes: 'Example note: Check bank statement for recurring services no longer in use. (Sample Data)',
      isCompleted: false,
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: 'demo-sample-7',
      title: '[Sample] Renew municipal residential parking permit',
      category: 'Personal',
      dueDate: getOffsetDateStr(-10),
      notes: 'Example note: Completed renewal at city hall service desk. (Sample Data)',
      amount: 60,
      currency: 'USD',
      isCompleted: true,
      completedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'demo-sample-8',
      title: '[Sample] Review monthly utility bills & electric usage',
      category: 'Bills',
      dueDate: getOffsetDateStr(4), // In 4 days
      notes: 'Example note: Recurring monthly review scheduled on the 1st of each month. (Sample Data)',
      amount: 145,
      currency: 'USD',
      isCompleted: false,
      seriesId: 'series-sample-utilities',
      recurrence: {
        frequency: 'monthly',
        interval: 1,
        monthDay: 1,
        monthPolicy: 'same-day',
      },
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
  ];
}
