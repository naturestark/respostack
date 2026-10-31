import React from 'react';
import { Header } from './Header';
import { Navigation, TabId } from './Navigation';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { PwaInstallBanner } from '../pwa/PwaInstallBanner';
import { PwaUpdateBanner } from '../pwa/PwaUpdateBanner';

interface LayoutProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onNewResponsibility: () => void;
  counts: {
    urgentToday: number;
    active: number;
    completed: number;
  };
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onSelectTab,
  onNewResponsibility,
  counts,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-20 sm:pb-12">
      {/* Offline Status Pill */}
      <OfflineIndicator />

      {/* Top Header */}
      <Header onNewResponsibility={onNewResponsibility} />

      {/* PWA Update Banner (Appears when waiting service worker is detected) */}
      <PwaUpdateBanner />

      {/* PWA Installation Banner (Appears if install prompt is available and not in standalone) */}
      <PwaInstallBanner />

      {/* Primary Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        counts={counts}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Respostack — 100% Local &amp; Private Progressive Web App</span>
          <span>No accounts • No cloud sync • Full offline capability</span>
        </div>
      </footer>
    </div>
  );
};
