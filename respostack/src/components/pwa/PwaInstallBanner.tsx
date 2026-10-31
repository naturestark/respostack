import React, { useState, useEffect } from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { Button } from '../common/Button';

export const PwaInstallBanner: React.FC = () => {
  const { isStandalone, canInstall, platform, promptInstall } = usePwaInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if user dismissed the prompt in this session to prevent repeated badgering
    try {
      const dismissed = sessionStorage.getItem('life_admin_install_dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // sessionStorage might be restricted in some iframe sandboxes
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('life_admin_install_dismissed', 'true');
    } catch {
      // fallback
    }
  };

  const handleInstallClick = async () => {
    if (canInstall) {
      const result = await promptInstall();
      if (result === 'dismissed') {
        handleDismiss();
      }
    } else if (platform === 'ios') {
      setShowIosGuide(true);
    }
  };

  // Do not display if already installed as standalone app or dismissed in this session
  if (isStandalone || isDismissed) {
    return null;
  }

  // Only show banner if browser prompt is available or user is on iOS Safari
  if (!canInstall && platform !== 'ios') {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="PWA Installation Notice"
      className="bg-teal-50 border-b border-teal-200 px-4 py-3 sm:px-6 transition-all"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
            📲
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900">
              Install Respostack for fast offline access
            </p>
            <p className="text-xs text-slate-600">
              {platform === 'ios'
                ? 'Add to your Home Screen for a native standalone app experience.'
                : 'Install as a lightweight Progressive Web App on your device.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {platform === 'ios' && !showIosGuide ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIosGuide(true)}
              className="text-xs border-teal-300 text-teal-800 hover:bg-teal-100"
            >
              How to Install
            </Button>
          ) : canInstall ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleInstallClick}
              className="text-xs shadow-xs"
            >
              Install App
            </Button>
          ) : null}

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss installation banner for this session"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-teal-100/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            ✕
          </button>
        </div>
      </div>

      {showIosGuide && (
        <div className="max-w-5xl mx-auto mt-3 pt-3 border-t border-teal-200/80 text-xs text-slate-700 space-y-1">
          <p className="font-semibold text-slate-900">To install on iPhone or iPad:</p>
          <ol className="list-decimal pl-5 space-y-0.5 text-slate-600">
            <li>Tap the <strong>Share</strong> button (📤) in Safari toolbar.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong> (➕).</li>
            <li>Tap <strong>Add</strong> in the top right corner.</li>
          </ol>
        </div>
      )}
    </div>
  );
};
