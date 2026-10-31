import React from 'react';

interface StatCounterCardProps {
  label: string;
  count: number;
  description: string;
  variant: 'overdue' | 'due-today' | 'upcoming';
  onClick?: () => void;
  isActive?: boolean;
}

export const StatCounterCard: React.FC<StatCounterCardProps> = ({
  label,
  count,
  description,
  variant,
  onClick,
  isActive = false,
}) => {
  const styles = {
    overdue: {
      border: isActive ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-200/80 hover:border-rose-300',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      countText: count > 0 ? 'text-rose-600' : 'text-slate-700',
      iconBg: 'bg-rose-100 text-rose-600',
    },
    'due-today': {
      border: isActive ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-200/80 hover:border-amber-300',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      countText: count > 0 ? 'text-amber-600' : 'text-slate-700',
      iconBg: 'bg-amber-100 text-amber-600',
    },
    upcoming: {
      border: isActive ? 'border-teal-500 ring-2 ring-teal-200' : 'border-slate-200/80 hover:border-teal-300',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      countText: 'text-slate-800',
      iconBg: 'bg-teal-100 text-teal-700',
    },
  }[variant];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`bg-white rounded-xl p-5 border shadow-sm transition-all duration-150 ${styles.border} ${
        onClick ? 'cursor-pointer select-none active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
          {label}
        </span>
        <span
          className={`w-2 h-2 rounded-full ${
            count > 0
              ? variant === 'overdue'
                ? 'bg-rose-500 animate-pulse'
                : variant === 'due-today'
                ? 'bg-amber-500'
                : 'bg-teal-500'
              : 'bg-slate-300'
          }`}
          aria-hidden="true"
        />
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-3xl font-bold tracking-tight ${styles.countText}`}>
          {count}
        </span>
        <span className="text-xs text-slate-500">
          {count === 1 ? 'item' : 'items'}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-500 leading-snug">
        {description}
      </p>
    </div>
  );
};
