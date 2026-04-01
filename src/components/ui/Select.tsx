/**
 * Select.tsx — Native <select> styled to match the dark theme.
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = '', ...rest }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-gh-fg-muted">{label}</label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={[
              'w-full h-8 rounded-md border border-gh-border bg-gh-overlay',
              'text-sm text-gh-fg appearance-none',
              'pl-3 pr-8',
              'focus:outline-none focus:border-gh-accent focus:ring-1 focus:ring-gh-accent/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'cursor-pointer',
              className,
            ].join(' ')}
            {...rest}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value} className="bg-gh-overlay">
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gh-fg-subtle pointer-events-none"
          />
        </div>
      </div>
    );
  },
);

Select.displayName = 'Select';
