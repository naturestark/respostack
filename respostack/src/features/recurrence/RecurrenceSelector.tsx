import React from 'react';
import {
  RecurrenceRule,
  RecurrenceFrequency,
  RecurrenceEditScope,
  WEEKDAYS,
} from './recurrence.types';

interface RecurrenceSelectorProps {
  value?: RecurrenceRule;
  onChange: (rule?: RecurrenceRule) => void;
  isEditingExistingSeries?: boolean;
  editScope?: RecurrenceEditScope;
  onChangeEditScope?: (scope: RecurrenceEditScope) => void;
  initialDueDate?: string;
}

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  value,
  onChange,
  isEditingExistingSeries = false,
  editScope = 'occurrence',
  onChangeEditScope,
  initialDueDate,
}) => {
  const isRecurring = Boolean(value);
  const frequency: RecurrenceFrequency = value?.frequency || 'daily';
  const interval = value?.interval || 1;
  const weekdays = value?.weekdays || [];
  const endDate = value?.endDate || '';

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'none') {
      onChange(undefined);
    } else {
      const freq = val as RecurrenceFrequency;
      const initialMonthDay =
        freq === 'monthly' && initialDueDate
          ? parseInt(initialDueDate.split('-')[2], 10)
          : undefined;

      onChange({
        frequency: freq,
        interval: 1,
        weekdays: freq === 'weekly' ? [new Date().getDay()] : undefined,
        monthPolicy: freq === 'monthly' ? 'same-day' : undefined,
        monthDay: initialMonthDay,
        endDate: undefined,
      });
    }
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Math.max(1, parseInt(e.target.value, 10) || 1);
    if (!value) return;
    onChange({
      ...value,
      interval: num,
    });
  };

  const handleWeekdayToggle = (dayValue: number) => {
    if (!value) return;
    const currentDays = value.weekdays || [];
    let nextDays: number[];
    if (currentDays.includes(dayValue)) {
      // Don't allow deselecting all days
      if (currentDays.length > 1) {
        nextDays = currentDays.filter((d) => d !== dayValue);
      } else {
        return;
      }
    } else {
      nextDays = [...currentDays, dayValue].sort((a, b) => a - b);
    }
    onChange({
      ...value,
      weekdays: nextDays,
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!value) return;
    const val = e.target.value.trim();
    onChange({
      ...value,
      endDate: val || undefined,
    });
  };

  const intervalUnitLabel = {
    daily: interval === 1 ? 'day' : 'days',
    weekly: interval === 1 ? 'week' : 'weeks',
    monthly: interval === 1 ? 'month' : 'months',
    yearly: interval === 1 ? 'year' : 'years',
  }[frequency];

  return (
    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
      {/* Frequency selector */}
      <div>
        <label
          htmlFor="recurrence-frequency"
          className="block font-semibold uppercase tracking-wider text-slate-700 mb-1"
        >
          Repeat Schedule
        </label>
        <select
          id="recurrence-frequency"
          value={isRecurring ? frequency : 'none'}
          onChange={handleFrequencyChange}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="none">Does not repeat (One-time)</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {/* Recurrence options when repeating */}
      {isRecurring && value && (
        <div className="space-y-3 pt-2 border-t border-slate-200/60">
          {/* Interval */}
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Every</span>
            <input
              type="number"
              min="1"
              max="365"
              value={interval}
              onChange={handleIntervalChange}
              aria-label="Repeat interval"
              className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-300 text-center font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-slate-700 font-medium">{intervalUnitLabel}</span>
          </div>

          {/* Weekly Day Selector */}
          {frequency === 'weekly' && (
            <div>
              <span className="block text-slate-600 font-medium mb-1.5">Repeat on:</span>
              <div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Select repeat weekdays">
                {WEEKDAYS.map((w) => {
                  const isSelected = weekdays.includes(w.value);
                  return (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => handleWeekdayToggle(w.value)}
                      aria-pressed={isSelected}
                      className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {w.short}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly Info */}
          {frequency === 'monthly' && (
            <p className="text-[11px] text-slate-500 leading-snug">
              Monthly dates scheduled on the 29th, 30th, or 31st clamp to the last day of shorter months (such as February).
            </p>
          )}

          {/* End Date */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
            <label htmlFor="recurrence-end-date" className="text-slate-600 font-medium">
              End Date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="recurrence-end-date"
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                className="px-2.5 py-1 rounded-md border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {endDate && (
                <button
                  type="button"
                  onClick={() => onChange({ ...value, endDate: undefined })}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium px-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Editing scope choice if editing an existing recurring series */}
          {isEditingExistingSeries && onChangeEditScope && (
            <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
              <span className="block font-semibold text-slate-700">Apply changes to:</span>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="editScope"
                    value="occurrence"
                    checked={editScope === 'occurrence'}
                    onChange={() => onChangeEditScope('occurrence')}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>This occurrence only (preserves future series schedule)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="editScope"
                    value="series"
                    checked={editScope === 'series'}
                    onChange={() => onChangeEditScope('series')}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>This and all future occurrences (Series)</span>
                </label>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Historical completed occurrences are always protected and will not be changed.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
