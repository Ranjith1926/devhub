/**
 * Badge.tsx — Small status pill / tag chip.
 */

import React from 'react';

type BadgeVariant = 'default' | 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'pink';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  onClick?: () => void;
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-gh-subtle text-gh-fg-muted border-gh-border',
  blue:    'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400',
  green:   'bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400',
  orange:  'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
  red:     'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400',
  purple:  'bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400',
  pink:    'bg-pink-500/15 text-pink-700 border-pink-500/30 dark:text-pink-400',
};

/** HTTP method → colour variant */
export const METHOD_VARIANT: Record<string, BadgeVariant> = {
  GET:     'green',
  POST:    'blue',
  PUT:     'orange',
  PATCH:   'orange',
  DELETE:  'red',
  HEAD:    'purple',
  OPTIONS: 'pink',
};

export function Badge({ children, variant = 'default', className = '', onClick }: BadgeProps) {
  return (
    <span
      onClick={onClick}
      className={[
        'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold',
        'border uppercase tracking-wide leading-none select-none',
        onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : '',
        VARIANTS[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

/** Convenience badge that picks the right colour from an HTTP method string. */
export function MethodBadge({ method }: { method: string }) {
  const variant = METHOD_VARIANT[method.toUpperCase()] ?? 'default';
  return <Badge variant={variant}>{method}</Badge>;
}
