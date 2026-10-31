import React from 'react';

export type TabId = 'today' | 'all' | 'completed' | 'settings';

interface NavigationProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  counts: {
    urgentToday: number;
    active: number;
    completed: number;
  };
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  counts,
}) => {
  const tabs: {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    badgeCount?: number;
    badgeVariant?: 'danger' | 'neutral';
  }[] = [
    {
      id: 'today',
      label: 'Today',
      badgeCount: counts.urgentToday > 0 ? counts.urgentToday : undefined,
      badgeVariant: 'danger',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: 'all',
      label: 'All Responsibilities',
      badgeCount: counts.active,
      badgeVariant: 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
    },
    {
      id: 'completed',
      label: 'Completed',
      badgeCount: counts.completed > 0 ? counts.completed : undefined,
      badgeVariant: 'neutral',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Desktop / Tablet Navigation Bar */}
      <nav
        aria-label="Primary navigation"
        className="hidden sm:block border-b border-slate-200 bg-white"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-t-md ${
                  isActive
                    ? 'border-teal-600 text-teal-700 bg-teal-50/40'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <span className={isActive ? 'text-teal-600' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.badgeCount !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                      tab.badgeVariant === 'danger'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1 flex items-center justify-around"
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                isActive ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badgeCount !== undefined && (
                  <span
                    className={`absolute -top-1 -right-2 px-1 py-0.2 text-[10px] font-bold rounded-full leading-tight ${
                      tab.badgeVariant === 'danger'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.badgeCount}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[11px]">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
