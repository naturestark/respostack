import React from 'react';
import { usePwaUpdate } from '../../hooks/usePwaUpdate';
import { Button } from '../common/Button';

export const PwaUpdateBanner: React.FC = () => {
  const { needRefresh, updateServiceWorker, dismissUpdate } = usePwaUpdate();

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-slate-900 text-white px-4 py-3 sm:px-6 shadow-md transition-all sticky top-16 z-40"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xl flex-shrink-0" aria-hidden="true">
            🔄
          </span>
          <div>
            <p className="text-xs sm:text-sm font-semibold">
              An update to Respostack is available
            </p>
            <p className="text-xs text-slate-300">
              Reload when ready to apply the latest version. Your saved responsibilities in IndexedDB will be preserved.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissUpdate}
            className="text-xs text-slate-300 hover:text-white hover:bg-slate-800"
          >
            Later
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={updateServiceWorker}
            className="text-xs bg-teal-500 hover:bg-teal-600 text-white font-semibold shadow-xs"
          >
            Update Now
          </Button>
        </div>
      </div>
    </div>
  );
};
