/**
 * Input.tsx — Single-line text / number input with label support.
 */

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightElement, className = '', ...rest }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-gh-fg-muted">{label}</label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-2.5 text-gh-fg-subtle pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={[
              'w-full h-8 rounded-md border border-gh-border bg-gh-overlay',
              'text-sm text-gh-fg placeholder:text-gh-fg-subtle',
              'px-3 py-1.5',
              leftIcon ? 'pl-8' : '',
              rightElement ? 'pr-20' : '',
              'focus:outline-none focus:border-gh-accent focus:ring-1 focus:ring-gh-accent/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-gh-danger focus:border-gh-danger focus:ring-gh-danger/50' : '',
              className,
            ].join(' ')}
            {...rest}
          />
          {rightElement && (
            <span className="absolute right-1">{rightElement}</span>
          )}
        </div>

        {error && <p className="text-xs text-gh-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-gh-fg-subtle">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

// ---------------------------------------------------------------------------
// Textarea variant
// ---------------------------------------------------------------------------

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...rest }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-gh-fg-muted">{label}</label>
      )}
      <textarea
        ref={ref}
        className={[
          'w-full rounded-md border border-gh-border bg-gh-overlay',
          'text-sm text-gh-fg placeholder:text-gh-fg-subtle',
          'px-3 py-2 font-mono resize-none',
          'focus:outline-none focus:border-gh-accent focus:ring-1 focus:ring-gh-accent/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-gh-danger' : '',
          className,
        ].join(' ')}
        {...rest}
      />
      {error && <p className="text-xs text-gh-danger">{error}</p>}
    </div>
  ),
);

Textarea.displayName = 'Textarea';
