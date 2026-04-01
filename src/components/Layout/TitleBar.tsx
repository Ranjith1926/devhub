/**
 * TitleBar.tsx — Custom themed titlebar that replaces the native OS titlebar.
 * Uses Tauri's window API for drag / minimize / maximize / close.
 */

import React, { useEffect, useState } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    appWindow.isMaximized().then(setMaximized).catch(() => {});
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized).catch(() => {});
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-8 px-3 bg-gh-canvas border-b border-gh-border shrink-0 select-none"
    >
      {/* App name */}
      <div className="flex items-center gap-2 pointer-events-none" data-tauri-drag-region>
        <div className="w-4 h-4 rounded bg-gh-accent flex items-center justify-center">
          <span className="text-white font-bold text-[9px] leading-none">D</span>
        </div>
        <span className="text-xs font-semibold text-gh-fg-muted">DevHub</span>
      </div>

      {/* Window controls */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => appWindow.minimize()}
          className="flex items-center justify-center w-8 h-7 rounded text-gh-fg-subtle hover:text-gh-fg hover:bg-gh-subtle transition-colors"
          aria-label="Minimize"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="flex items-center justify-center w-8 h-7 rounded text-gh-fg-subtle hover:text-gh-fg hover:bg-gh-subtle transition-colors"
          aria-label={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? <Square size={11} /> : <Maximize2 size={11} />}
        </button>
        <button
          onClick={() => appWindow.close()}
          className="flex items-center justify-center w-8 h-7 rounded text-gh-fg-subtle hover:text-white hover:bg-gh-danger transition-colors"
          aria-label="Close"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
