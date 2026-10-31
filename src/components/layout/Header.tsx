import React from 'react';
import { Button } from '../common/Button';

interface HeaderProps {
  onNewResponsibility: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewResponsibility }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm shadow-teal-600/20">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Respostack
              </h1>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                Local-Only
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Privacy-first personal responsibilities manager
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={onNewResponsibility}
            className="shadow-sm"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Responsibility
          </Button>
        </div>
      </div>
    </header>
  );
};
