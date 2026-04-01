/**
 * useToast.ts
 * Thin wrapper around react-hot-toast that matches our design tokens.
 */

import toast from 'react-hot-toast';
import { ToastType } from '../types';

export function useToast() {
  const show = (message: string, type: ToastType = 'info', duration = 3500) => {
    const opts = { duration };
    switch (type) {
      case 'success':
        return toast.success(message, opts);
      case 'error':
        return toast.error(message, { ...opts, duration: 5000 });
      case 'warning':
        return toast(message, {
          ...opts,
          icon: '⚠️',
          style: { background: '#1c1a10', color: '#e3b341', border: '1px solid #6e5a0e' },
        });
      default:
        return toast(message, opts);
    }
  };

  return {
    success: (msg: string) => show(msg, 'success'),
    error: (msg: string) => show(msg, 'error'),
    warning: (msg: string) => show(msg, 'warning'),
    info: (msg: string) => show(msg, 'info'),
  };
}
