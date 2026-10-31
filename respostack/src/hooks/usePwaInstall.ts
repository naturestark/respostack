import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type PwaPlatform = 'ios' | 'android' | 'desktop' | 'other';

export interface PwaInstallState {
  isStandalone: boolean;
  canInstall: boolean;
  isInstallSupported: boolean;
  platform: PwaPlatform;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export function detectPwaPlatform(): PwaPlatform {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) {
    return 'desktop';
  }
  return 'other';
}

export function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isAndroidReferrer = document.referrer.includes('android-app://');

  return isStandaloneMedia || isIosStandalone || isAndroidReferrer;
}

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [platform, setPlatform] = useState<PwaPlatform>('other');

  useEffect(() => {
    setIsStandalone(checkIsStandalone());
    setPlatform(detectPwaPlatform());

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent automatic browser banner
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) {
      return 'unavailable';
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstall(false);
        setDeferredPrompt(null);
        return 'accepted';
      }
      return 'dismissed';
    } catch (err) {
      console.error('Error invoking installation prompt:', err);
      return 'unavailable';
    }
  }, [deferredPrompt]);

  return {
    isStandalone,
    canInstall: canInstall && !isStandalone,
    isInstallSupported: canInstall || platform === 'ios',
    platform,
    promptInstall,
  };
}
