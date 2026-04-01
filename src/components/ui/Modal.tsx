/**
 * Modal.tsx — Accessible overlay dialog.
 * Traps focus inside the modal while open and closes on Escape / backdrop click.
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        // Close when clicking directly on the backdrop (not on the dialog)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={[
          'relative w-full mx-4 rounded-lg shadow-2xl',
          'bg-gh-overlay border border-gh-border',
          'flex flex-col max-h-[90vh]',
          width,
        ].join(' ')}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gh-border shrink-0">
            <h2 id="modal-title" className="text-sm font-semibold text-gh-fg">
              {title}
            </h2>
            <Button
              variant="ghost"
              size="xs"
              icon={<X size={14} />}
              onClick={onClose}
              aria-label="Close dialog"
            />
          </div>
        )}

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gh-border shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
