/**
 * Button.tsx — Reusable button with variant support.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-gh-accent text-white hover:opacity-90 active:opacity-80 disabled:bg-gh-accent/50 disabled:text-white/60',
  secondary:
    'bg-gh-subtle text-gh-fg border border-gh-border hover:bg-gh-border active:bg-gh-border/70',
  ghost:
    'bg-transparent text-gh-fg-muted hover:bg-gh-subtle hover:text-gh-fg active:bg-gh-subtle/70',
  danger:
    'bg-transparent text-gh-danger border border-gh-danger/40 hover:bg-gh-danger/10 active:bg-gh-danger/20',
  success:
    'bg-transparent text-gh-success border border-gh-success/40 hover:bg-gh-success/10',
};

const SIZE_CLASSES: Record<Size, string> = {
  xs: 'h-6 px-2 text-xs gap-1',
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-8 px-3 text-sm gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      children,
      className = '',
      disabled,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center font-medium rounded-md',
          'transition-colors duration-100 select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent focus-visible:ring-offset-1 focus-visible:ring-offset-gh-canvas',
          'disabled:cursor-not-allowed disabled:opacity-50',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        ].join(' ')}
        {...rest}
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {iconRight && !loading && (
          <span className="shrink-0">{iconRight}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
