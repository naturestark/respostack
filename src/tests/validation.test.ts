import { describe, it, expect } from 'vitest';
import {
  validateResponsibility,
  isLeapYear,
  isValidCalendarDate,
  isValidCurrencyCode,
} from '../utils/validation';

describe('Validation Engine', () => {
  describe('isLeapYear', () => {
    it('correctly identifies standard leap years', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2028)).toBe(true);
      expect(isLeapYear(2000)).toBe(true); // Century divisible by 400
    });

    it('correctly identifies non-leap years', () => {
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(2026)).toBe(false);
      expect(isLeapYear(1900)).toBe(false); // Century not divisible by 400
      expect(isLeapYear(2100)).toBe(false);
    });
  });

  describe('isValidCalendarDate', () => {
    it('accepts valid dates in standard months', () => {
      expect(isValidCalendarDate('2026-01-31')).toBe(true);
      expect(isValidCalendarDate('2026-04-30')).toBe(true);
      expect(isValidCalendarDate('2026-12-31')).toBe(true);
    });

    it('accepts Feb 29 only in leap years', () => {
      expect(isValidCalendarDate('2024-02-29')).toBe(true);
      expect(isValidCalendarDate('2028-02-29')).toBe(true);
      expect(isValidCalendarDate('2025-02-29')).toBe(false);
      expect(isValidCalendarDate('2026-02-29')).toBe(false);
    });

    it('rejects impossible dates like Feb 30 and April 31', () => {
      expect(isValidCalendarDate('2026-02-30')).toBe(false);
      expect(isValidCalendarDate('2026-04-31')).toBe(false);
      expect(isValidCalendarDate('2026-06-31')).toBe(false);
      expect(isValidCalendarDate('2026-11-31')).toBe(false);
    });

    it('rejects invalid month numbers', () => {
      expect(isValidCalendarDate('2026-00-15')).toBe(false);
      expect(isValidCalendarDate('2026-13-01')).toBe(false);
    });

    it('rejects invalid day numbers', () => {
      expect(isValidCalendarDate('2026-05-00')).toBe(false);
      expect(isValidCalendarDate('2026-05-32')).toBe(false);
    });

    it('rejects non-4-digit years or malformed strings', () => {
      expect(isValidCalendarDate('26-05-15')).toBe(false);
      expect(isValidCalendarDate('2026/05/15')).toBe(false);
      expect(isValidCalendarDate('not-a-date')).toBe(false);
    });
  });

  describe('isValidCurrencyCode', () => {
    it('accepts valid 3-letter ISO 4217 codes', () => {
      expect(isValidCurrencyCode('USD')).toBe(true);
      expect(isValidCurrencyCode('EUR')).toBe(true);
      expect(isValidCurrencyCode('GBP')).toBe(true);
      expect(isValidCurrencyCode('INR')).toBe(true);
      expect(isValidCurrencyCode('CAD')).toBe(true);
    });

    it('rejects invalid currency codes', () => {
      expect(isValidCurrencyCode('US')).toBe(false);
      expect(isValidCurrencyCode('USDD')).toBe(false);
      expect(isValidCurrencyCode('usd')).toBe(false); // must be uppercase
      expect(isValidCurrencyCode('U$D')).toBe(false);
      expect(isValidCurrencyCode('123')).toBe(false);
      expect(isValidCurrencyCode('')).toBe(false);
    });
  });

  describe('validateResponsibility', () => {
    it('passes for complete valid inputs', () => {
      const result = validateResponsibility({
        title: 'Quarterly property tax',
        category: 'Bills',
        dueDate: '2026-11-15',
        amount: 850.5,
        currency: 'USD',
        notes: 'Account #12345',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('passes for minimal valid inputs', () => {
      const result = validateResponsibility({
        title: 'Call doctor',
        category: 'Health',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('rejects missing, empty, or whitespace-only titles', () => {
      expect(validateResponsibility({ title: '', category: 'Personal' }).isValid).toBe(false);
      expect(validateResponsibility({ title: '   ', category: 'Personal' }).isValid).toBe(false);
    });

    it('rejects title exceeding 200 characters', () => {
      const longTitle = 'a'.repeat(201);
      const res = validateResponsibility({ title: longTitle, category: 'Personal' });
      expect(res.isValid).toBe(false);
      expect(res.errors.title).toBe('Title must be 200 characters or fewer.');
    });

    it('rejects invalid categories', () => {
      const res = validateResponsibility({
        title: 'Valid title',
        // @ts-expect-error Testing invalid runtime category
        category: 'NonExistentCategory',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.category).toBe('Please select a valid category.');
    });

    it('rejects impossible calendar dates', () => {
      const res = validateResponsibility({
        title: 'Valid title',
        category: 'Bills',
        dueDate: '2026-02-30',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.dueDate).toContain('Invalid calendar date');
    });

    it('rejects non-leap year Feb 29', () => {
      const res = validateResponsibility({
        title: 'Valid title',
        category: 'Bills',
        dueDate: '2025-02-29',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.dueDate).toContain('Invalid calendar date');
    });

    it('accepts leap year Feb 29', () => {
      const res = validateResponsibility({
        title: 'Valid title',
        category: 'Bills',
        dueDate: '2024-02-29',
      });
      expect(res.isValid).toBe(true);
    });

    it('rejects negative amounts', () => {
      const res = validateResponsibility({
        title: 'Valid title',
        category: 'Bills',
        amount: -15,
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.amount).toBe('Amount cannot be negative.');
    });

    it('rejects amounts exceeding 1 billion', () => {
      const res = validateResponsibility({
        title: 'Valid title',
        category: 'Bills',
        amount: 2_000_000_000,
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.amount).toBe('Amount cannot exceed 1,000,000,000.');
    });

    it('rejects amounts with more than 2 decimal places', () => {
      const res = validateResponsibility({
        title: 'Valid title',
        category: 'Bills',
        amount: 19.999,
        currency: 'USD',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.amount).toBe('Amount cannot have more than 2 decimal places.');
    });

    it('requires valid 3-letter currency code when amount is specified', () => {
      const missingCurrency = validateResponsibility({
        title: 'Valid title',
        category: 'Bills',
        amount: 50,
        currency: '',
      });
      expect(missingCurrency.isValid).toBe(false);
      expect(missingCurrency.errors.currency).toBe('Currency code is required when specifying an amount.');

      const invalidCode = validateResponsibility({
        title: 'Valid title',
        category: 'Bills',
        amount: 50,
        currency: 'US',
      });
      expect(invalidCode.isValid).toBe(false);
      expect(invalidCode.errors.currency).toContain('3-letter ISO code');
    });
  });
});
