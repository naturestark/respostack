import React, { useState, useEffect } from 'react';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500 text-slate-950 text-xs px-3 py-1 font-semibold flex items-center justify-center gap-1.5 shadow-xs"
    >
      <span aria-hidden="true">⚡</span>
      <span>
        Offline Mode — All responsibilities remain fully accessible and saved locally in IndexedDB
      </span>
    </div>
  );
};
