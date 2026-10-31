import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkIsStandalone, detectPwaPlatform } from '../hooks/usePwaInstall';

describe('PWA Installation & Platform Detection', () => {
  const originalNavigator = window.navigator;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkIsStandalone', () => {
    it('returns true when display-mode matches standalone', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(checkIsStandalone()).toBe(true);
    });

    it('returns false in normal browser tab mode', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(checkIsStandalone()).toBe(false);
    });
  });

  describe('detectPwaPlatform', () => {
    it('detects iOS platform from user agent', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)',
        configurable: true,
      });

      expect(detectPwaPlatform()).toBe('ios');
    });

    it('detects Android platform from user agent', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36',
        configurable: true,
      });

      expect(detectPwaPlatform()).toBe('android');
    });

    it('detects desktop platform from desktop user agent', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        configurable: true,
      });

      expect(detectPwaPlatform()).toBe('desktop');
    });
  });
});
