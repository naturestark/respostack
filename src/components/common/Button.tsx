import React, { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]';

    const sizeClasses = {
      sm: 'text-xs px-2.5 py-1.5 min-h-[36px] gap-1.5',
      md: 'text-sm px-4 py-2 min-h-[42px] gap-2',
      lg: 'text-base px-5 py-2.5 min-h-[48px] gap-2.5',
    }[size];

    const variantClasses = {
      primary:
        'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 focus-visible:ring-teal-500 shadow-sm',
      secondary:
        'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400',
      outline:
        'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-teal-500 shadow-sm',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500 shadow-sm',
      ghost:
        'text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400',
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
