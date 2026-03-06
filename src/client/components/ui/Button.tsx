'use client';

import { cn } from '@/shared/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn('button', `button-${variant}`, `button-${size}`, className)}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        border: 'none',
        transition: 'background-color 0.15s, opacity 0.15s',
        // Variant styles
        backgroundColor:
          variant === 'primary'
            ? 'var(--primary)'
            : variant === 'danger'
              ? 'var(--error)'
              : 'var(--muted)',
        color:
          variant === 'primary' || variant === 'danger'
            ? 'var(--primary-foreground)'
            : 'var(--foreground)',
        // Size styles
        padding:
          size === 'sm'
            ? '0.375rem 0.75rem'
            : size === 'lg'
              ? '0.75rem 1.5rem'
              : '0.5rem 1rem',
        fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '1rem',
      }}
      {...props}
    >
      {children}
    </button>
  );
}
