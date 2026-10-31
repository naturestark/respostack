import React, { useState, useEffect } from 'react';
import {
  CATEGORIES,
  Responsibility,
  ResponsibilityFormData,
} from '../../types/responsibility';
import { validateResponsibility } from '../../utils/validation';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { isoToDatetimeLocal, datetimeLocalToIso } from '../../features/reminders/reminder.service';
import { RecurrenceSelector } from '../../features/recurrence/RecurrenceSelector';
import { RecurrenceRule, RecurrenceEditScope } from '../../features/recurrence/recurrence.types';
import { validateRecurrenceRule } from '../../features/recurrence/recurrence.validation';

interface ResponsibilityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ResponsibilityFormData) => Promise<void>;
  initialData?: Responsibility | null;
}

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CHF'];

export const ResponsibilityFormModal: React.FC<ResponsibilityFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const isEditing = !!initialData;
  const isExistingRecurring = Boolean(initialData?.seriesId && initialData?.recurrence);

  const [formData, setFormData] = useState<ResponsibilityFormData>({
    title: '',
    category: 'Personal',
    dueDate: '',
    reminderAt: '',
    notes: '',
    amount: '',
    currency: 'USD',
    seriesId: undefined,
    recurrence: undefined,
    editScope: 'occurrence',
  });

  const [reminderLocalInput, setReminderLocalInput] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        category: initialData.category || 'Personal',
        dueDate: initialData.dueDate || '',
        reminderAt: initialData.reminderAt || '',
        notes: initialData.notes || '',
        amount: initialData.amount !== undefined ? initialData.amount : '',
        currency: initialData.currency || 'USD',
        seriesId: initialData.seriesId,
        recurrence: initialData.recurrence,
        editScope: 'occurrence',
      });
      setReminderLocalInput(isoToDatetimeLocal(initialData.reminderAt));
    } else {
      setFormData({
        title: '',
        category: 'Personal',
        dueDate: '',
        reminderAt: '',
        notes: '',
        amount: '',
        currency: 'USD',
        seriesId: undefined,
        recurrence: undefined,
        editScope: 'occurrence',
      });
      setReminderLocalInput('');
    }
    setErrors({});
    setIsSubmitting(false);
  }, [initialData, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleReminderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const localVal = e.target.value;
    setReminderLocalInput(localVal);
    const isoVal = datetimeLocalToIso(localVal) || '';
    setFormData((prev) => ({
      ...prev,
      reminderAt: isoVal,
    }));

    if (errors.reminderAt) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.reminderAt;
        return next;
      });
    }
  };

  const handleClearReminder = () => {
    setReminderLocalInput('');
    setFormData((prev) => ({
      ...prev,
      reminderAt: '',
    }));
  };

  const handleRecurrenceChange = (rule?: RecurrenceRule) => {
    setFormData((prev) => ({
      ...prev,
      recurrence: rule,
    }));
    if (errors.recurrence) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.recurrence;
        return next;
      });
    }
  };

  const handleEditScopeChange = (scope: RecurrenceEditScope) => {
    setFormData((prev) => ({
      ...prev,
      editScope: scope,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    // Validate standard fields
    const validation = validateResponsibility(formData);
    const combinedErrors: Record<string, string> = { ...validation.errors };

    // Validate recurrence rule if active
    if (formData.recurrence) {
      const recValidation = validateRecurrenceRule(formData.recurrence, formData.dueDate);
      if (!recValidation.isValid) {
        Object.assign(combinedErrors, recValidation.errors);
      }
    }

    if (Object.keys(combinedErrors).length > 0) {
      setErrors(combinedErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save responsibility:', err);
      const message = err instanceof Error ? err.message : 'Failed to save responsibility. Please try again.';
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={isEditing ? 'Edit Responsibility' : 'New Responsibility'}
      description={
        isEditing
          ? 'Update details, due date, recurrence, or reminders for this responsibility.'
          : 'Add a personal responsibility to track in your private local manager.'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.form && (
          <div
            role="alert"
            className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg font-medium"
          >
            {errors.form}
          </div>
        )}

        {/* Title */}
        <div>
          <label
            htmlFor="resp-title"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
          >
            Title <span className="text-rose-500" aria-hidden="true">*</span>
          </label>
          <input
            id="resp-title"
            name="title"
            type="text"
            required
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Pay rent, Take out recycling, Renew passport"
            aria-required="true"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'title-error' : undefined}
            className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${
              errors.title
                ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                : 'border-slate-300 focus:ring-teal-500 focus:border-teal-500'
            }`}
          />
          {errors.title && (
            <p id="title-error" role="alert" className="mt-1 text-xs text-rose-600 font-medium">
              {errors.title}
            </p>
          )}
        </div>

        {/* Category & Due Date Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label
              htmlFor="resp-category"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Category <span className="text-rose-500" aria-hidden="true">*</span>
            </label>
            <select
              id="resp-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? 'category-error' : undefined}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <p id="category-error" role="alert" className="mt-1 text-xs text-rose-600 font-medium">
                {errors.category}
              </p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label
              htmlFor="resp-dueDate"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Due Date <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="resp-dueDate"
              name="dueDate"
              type="date"
              value={formData.dueDate || ''}
              onChange={handleChange}
              aria-invalid={!!errors.dueDate}
              aria-describedby={errors.dueDate ? 'dueDate-error' : undefined}
              className={`w-full px-3.5 py-2 rounded-lg border text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                errors.dueDate
                  ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                  : 'border-slate-300 focus:ring-teal-500 focus:border-teal-500'
              }`}
            />
            {errors.dueDate && (
              <p id="dueDate-error" role="alert" className="mt-1 text-xs text-rose-600 font-medium">
                {errors.dueDate}
              </p>
            )}
          </div>
        </div>

        {/* Recurrence Selector */}
        <RecurrenceSelector
          value={formData.recurrence}
          onChange={handleRecurrenceChange}
          isEditingExistingSeries={isExistingRecurring}
          editScope={formData.editScope}
          onChangeEditScope={handleEditScopeChange}
          initialDueDate={formData.dueDate}
        />
        {errors.frequency && (
          <p role="alert" className="text-xs text-rose-600 font-medium">
            {errors.frequency}
          </p>
        )}
        {errors.interval && (
          <p role="alert" className="text-xs text-rose-600 font-medium">
            {errors.interval}
          </p>
        )}
        {errors.weekdays && (
          <p role="alert" className="text-xs text-rose-600 font-medium">
            {errors.weekdays}
          </p>
        )}
        {errors.endDate && (
          <p role="alert" className="text-xs text-rose-600 font-medium">
            {errors.endDate}
          </p>
        )}

        {/* Reminder Date & Time Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="resp-reminderAt"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Reminder <span className="text-slate-400 font-normal lowercase">(optional notification instant)</span>
            </label>
            {reminderLocalInput && (
              <button
                type="button"
                onClick={handleClearReminder}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                Clear reminder
              </button>
            )}
          </div>
          <input
            id="resp-reminderAt"
            name="reminderAt"
            type="datetime-local"
            value={reminderLocalInput}
            onChange={handleReminderChange}
            aria-invalid={!!errors.reminderAt}
            aria-describedby={errors.reminderAt ? 'reminderAt-error' : 'reminderAt-hint'}
            className={`w-full px-3.5 py-2 rounded-lg border text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              errors.reminderAt
                ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                : 'border-slate-300 focus:ring-teal-500 focus:border-teal-500'
            }`}
          />
          <p id="reminderAt-hint" className="mt-1 text-[11px] text-slate-500">
            For repeating responsibilities, the reminder time-of-day carries forward to future occurrences.
          </p>
          {errors.reminderAt && (
            <p id="reminderAt-error" role="alert" className="mt-1 text-xs text-rose-600 font-medium">
              {errors.reminderAt}
            </p>
          )}
        </div>

        {/* Amount & Currency Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="resp-amount"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Amount <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              id="resp-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'amount-error' : undefined}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                errors.amount
                  ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                  : 'border-slate-300 focus:ring-teal-500 focus:border-teal-500'
              }`}
            />
            {errors.amount && (
              <p id="amount-error" role="alert" className="mt-1 text-xs text-rose-600 font-medium">
                {errors.amount}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="resp-currency"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Currency
            </label>
            <select
              id="resp-currency"
              name="currency"
              value={formData.currency || 'USD'}
              onChange={handleChange}
              disabled={formData.amount === '' || formData.amount === undefined}
              aria-invalid={!!errors.currency}
              aria-describedby={errors.currency ? 'currency-error' : undefined}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              {COMMON_CURRENCIES.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
            {errors.currency && (
              <p id="currency-error" role="alert" className="mt-1 text-xs text-rose-600 font-medium">
                {errors.currency}
              </p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="resp-notes"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
          >
            Notes <span className="text-slate-400 font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="resp-notes"
            name="notes"
            rows={3}
            value={formData.notes || ''}
            onChange={handleChange}
            placeholder="Add relevant instructions, policy numbers, steps, or reference links..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {isEditing ? 'Save Changes' : 'Create Responsibility'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
