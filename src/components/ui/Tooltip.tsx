/**
 * Tooltip.tsx — Simple CSS-based tooltip wrapper.
 * Shows a small dark box above/below/left/right of the child element.
 */

import React, { useState } from 'react';

type Position = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  position?: Position;
  children: React.ReactElement;
  delay?: number;
}

const ARROW_CLASSES: Record<Position, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full  left-1/2 -translate-x-1/2 mt-1.5',
  left:   'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right:  'left-full  top-1/2 -translate-y-1/2 ml-1.5',
};

export function Tooltip({
  content,
  position = 'right',
  children,
  delay = 400,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {visible && (
        <div
          role="tooltip"
          className={[
            'absolute z-50 whitespace-nowrap pointer-events-none',
            'px-2 py-1 rounded text-[11px] font-medium',
            'bg-gh-inset text-gh-fg border border-gh-border shadow-lg',
            ARROW_CLASSES[position],
          ].join(' ')}
        >
          {content}
        </div>
      )}
    </div>
  );
}
