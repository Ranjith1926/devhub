/**
 * Sidebar.tsx
 * Narrow icon-based sidebar with Tooltip labels.
 * Clicking an icon opens/creates the matching feature tab.
 */

import React from 'react';
import {
  Send,
  Braces,
  Bookmark,
  Database,
  Settings,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  LogIn,
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { useAppStore } from '../../store/appStore';
import { TabType } from '../../types';

interface NavItem {
  type: TabType;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    type: 'api-tester',
    icon: <Send size={18} />,
    label: 'API Tester',
    shortcut: 'Ctrl+1',
  },
  {
    type: 'json-tools',
    icon: <Braces size={18} />,
    label: 'JSON Tools',
    shortcut: 'Ctrl+2',
  },
  {
    type: 'snippets',
    icon: <Bookmark size={18} />,
    label: 'Snippets',
    shortcut: 'Ctrl+3',
  },
  {
    type: 'database',
    icon: <Database size={18} />,
    label: 'Database',
    shortcut: 'Ctrl+4',
  },
];

interface SidebarProps {
  onExport: () => void;
  onImport: () => void;
  onSettings: () => void;
}

export function Sidebar({ onExport, onImport, onSettings }: SidebarProps) {
  const { tabs, activeTabId, openFeature, sidebarCollapsed, toggleSidebar } =
    useAppStore();

  const activeType = tabs.find((t) => t.id === activeTabId)?.type;

  const iconButton = (
    icon: React.ReactNode,
    label: string,
    shortcut: string,
    onClick: () => void,
    active = false,
  ) => (
    <Tooltip content={`${label}  ${shortcut}`} position="right">
      <button
        onClick={onClick}
        aria-label={label}
        className={[
          'flex items-center justify-center w-10 h-10 rounded-lg',
          'transition-colors duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent',
          active
            ? 'bg-gh-accent/15 text-gh-accent'
            : 'text-gh-fg-subtle hover:text-gh-fg hover:bg-gh-subtle',
        ].join(' ')}
      >
        {icon}
      </button>
    </Tooltip>
  );

  return (
    <aside
      className={[
        'flex flex-col items-center py-3 gap-1',
        'bg-gh-overlay border-r border-gh-border',
        'shrink-0 transition-all duration-200',
        sidebarCollapsed ? 'w-0 overflow-hidden py-0' : 'w-14',
      ].join(' ')}
    >
      {/* Logo mark */}
      <div className="flex items-center justify-center w-10 h-10 mb-2">
        <div className="w-7 h-7 rounded-lg bg-gh-accent flex items-center justify-center shadow">
          <span className="text-white font-bold text-xs leading-none">D</span>
        </div>
      </div>

      {/* Primary navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) =>
          iconButton(
            item.icon,
            item.label,
            item.shortcut,
            () => openFeature(item.type),
            activeType === item.type,
          ),
        )}
      </nav>

      {/* Bottom utilities */}
      <div className="flex flex-col gap-1 mt-auto">
        <Tooltip content="Export data  Ctrl+Shift+E" position="right">
          <button
            onClick={onExport}
            aria-label="Export data"
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gh-fg-subtle hover:text-gh-fg hover:bg-gh-subtle transition-colors"
          >
            <Download size={16} />
          </button>
        </Tooltip>

        <Tooltip content="Import data  Ctrl+Shift+I" position="right">
          <button
            onClick={onImport}
            aria-label="Import data"
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gh-fg-subtle hover:text-gh-fg hover:bg-gh-subtle transition-colors"
          >
            <Upload size={16} />
          </button>
        </Tooltip>

        <Tooltip content="Settings" position="right">
          <button
            onClick={onSettings}
            aria-label="Settings"
            className="flex items-center justify-center w-10 h-10 rounded-lg text-gh-fg-subtle hover:text-gh-fg hover:bg-gh-subtle transition-colors"
          >
            <Settings size={16} />
          </button>
        </Tooltip>

        <Tooltip content="Login  —  Coming Soon" position="right">
          <button
            disabled
            aria-label="Login (Coming Soon)"
            className="relative flex items-center justify-center w-10 h-10 rounded-lg text-gh-fg-subtle/40 cursor-not-allowed"
          >
            <LogIn size={16} />
            <span className="absolute -top-0.5 -right-0.5 text-[8px] font-semibold leading-none bg-gh-accent text-white rounded px-0.5 py-px">
              Soon
            </span>
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
