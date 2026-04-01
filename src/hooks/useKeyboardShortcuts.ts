/**
 * useKeyboardShortcuts.ts
 * Registers global keyboard shortcuts for common actions.
 * Usage: call once in App.tsx.
 */

import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

type Shortcut = {
  ctrl?: boolean;
  shift?: boolean;
  key: string;
  handler: () => void;
  description: string;
};

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        const ctrlOk = s.ctrl ? e.ctrlKey || e.metaKey : true;
        const shiftOk = s.shift ? e.shiftKey : !e.shiftKey;
        if (ctrlOk && shiftOk && e.key.toLowerCase() === s.key.toLowerCase()) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts]);
}

/** Pre-wired app-level shortcuts. */
export function useAppShortcuts(handlers: {
  newTab?: () => void;
  closeTab?: () => void;
  sendRequest?: () => void;
  exportData?: () => void;
  importData?: () => void;
}) {
  const { openFeature, tabs, activeTabId, closeTab } = useAppStore();

  const shortcuts: Shortcut[] = [
    {
      ctrl: true,
      key: 'n',
      description: 'New API Tester tab',
      handler: () => handlers.newTab?.(),
    },
    {
      ctrl: true,
      key: 'w',
      description: 'Close current tab',
      handler: () => {
        if (handlers.closeTab) handlers.closeTab();
        else closeTab(activeTabId);
      },
    },
    {
      ctrl: true,
      key: 'Enter',
      description: 'Send current API request',
      handler: () => handlers.sendRequest?.(),
    },
    {
      ctrl: true,
      key: '1',
      description: 'Switch to API Tester',
      handler: () => openFeature('api-tester'),
    },
    {
      ctrl: true,
      key: '2',
      description: 'Switch to JSON Tools',
      handler: () => openFeature('json-tools'),
    },
    {
      ctrl: true,
      key: '3',
      description: 'Switch to Snippets',
      handler: () => openFeature('snippets'),
    },
    {
      ctrl: true,
      key: '4',
      description: 'Switch to Database',
      handler: () => openFeature('database'),
    },
    {
      ctrl: true,
      shift: true,
      key: 'e',
      description: 'Export data',
      handler: () => handlers.exportData?.(),
    },
    {
      ctrl: true,
      shift: true,
      key: 'i',
      description: 'Import data',
      handler: () => handlers.importData?.(),
    },
  ];

  useKeyboardShortcuts(shortcuts);
}
