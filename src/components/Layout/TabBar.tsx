/**
 * TabBar.tsx
 * Horizontal row of open tabs with close buttons.
 * Double-click a tab to rename it (future extensibility).
 */

import React from 'react';
import { X, Plus, Send, Braces, Bookmark, Database, Regex, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { TabType } from '../../types';

const TAB_ICONS: Record<TabType, React.ReactNode> = {
  'api-tester': <Send size={12} />,
  'json-tools': <Braces size={12} />,
  snippets: <Bookmark size={12} />,
  database: <Database size={12} />,
  'regex-tester': <Regex size={12} />,
  encoder: <ShieldCheck size={12} />,
};

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, addTab } = useAppStore();

  return (
    <div className="flex items-center h-9 bg-gh-canvas border-b border-gh-border shrink-0 overflow-x-auto">
      {/* Tab list */}
      <div className="flex items-stretch h-full">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'group flex items-center gap-1.5 px-3 h-full',
                'text-xs cursor-pointer select-none whitespace-nowrap',
                'border-r border-gh-border transition-colors duration-100',
                active
                  ? 'bg-gh-overlay text-gh-fg border-t-2 border-t-gh-accent'
                  : 'text-gh-fg-muted hover:text-gh-fg hover:bg-gh-subtle/60',
              ].join(' ')}
            >
              <span className="opacity-60 shrink-0">{TAB_ICONS[tab.type]}</span>
              <span className="max-w-[120px] truncate">{tab.title}</span>

              {/* Close button — only show on hover or when active */}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  aria-label={`Close ${tab.title}`}
                  className={[
                    'ml-0.5 p-0.5 rounded',
                    'text-gh-fg-subtle hover:text-gh-fg hover:bg-gh-border',
                    'opacity-0 group-hover:opacity-100 focus:opacity-100',
                    active ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New tab button */}
      <button
        onClick={() => addTab('api-tester')}
        aria-label="New API Tester tab"
        title="New tab (Ctrl+N)"
        className="flex items-center justify-center w-8 h-full text-gh-fg-subtle hover:text-gh-fg hover:bg-gh-subtle transition-colors shrink-0"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
