import { useState, useEffect, useCallback } from 'react';

export interface PwaUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => Promise<void>;
  dismissUpdate: () => void;
}

export function usePwaUpdate(): PwaUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;

      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setNeedRefresh(true);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version installed and waiting
            setWaitingWorker(newWorker);
            setNeedRefresh(true);
          } else if (newWorker.state === 'activated' && !navigator.serviceWorker.controller) {
            // Content cached for the very first time
            setOfflineReady(true);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const updateServiceWorker = useCallback(async () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }, [waitingWorker]);

  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false);
  }, []);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
    dismissUpdate,
  };
}
