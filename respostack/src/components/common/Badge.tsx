import React from 'react';
import { ResponsibilityCategory, DueDateStatus } from '../../types/responsibility';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'category' | 'status' | 'neutral' | 'accent';
  category?: ResponsibilityCategory;
  status?: DueDateStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  category,
  status,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (variant === 'category' && category) {
    switch (category) {
      case 'Bills':
        colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
        break;
      case 'Health':
        colorClasses = 'bg-rose-50 text-rose-800 border-rose-200';
        break;
      case 'Documents':
        colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
        break;
      case 'Education':
        colorClasses = 'bg-purple-50 text-purple-800 border-purple-200';
        break;
      case 'Personal':
        colorClasses = 'bg-teal-50 text-teal-800 border-teal-200';
        break;
      case 'Other':
      default:
        colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
        break;
    }
  } else if (variant === 'status' && status) {
    switch (status) {
      case 'overdue':
        colorClasses = 'bg-rose-100 text-rose-800 border-rose-300 font-semibold';
        break;
      case 'due-today':
        colorClasses = 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
        break;
      case 'upcoming':
        colorClasses = 'bg-teal-50 text-teal-800 border-teal-200';
        break;
      case 'none':
      default:
        colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
    }
  } else if (variant === 'accent') {
    colorClasses = 'bg-teal-600 text-white border-transparent';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border transition-colors ${sizeClasses} ${colorClasses} ${className}`}
    >
      {children}
    </span>
  );
};
