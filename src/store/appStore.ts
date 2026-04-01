/**
 * appStore.ts
 * Global application state: open tabs, active tab, sidebar collapse state.
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { AppTab, TabType } from '../types';

interface AppState {
  tabs: AppTab[];
  activeTabId: string;
  sidebarCollapsed: boolean;

  addTab: (type: TabType, title?: string) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  toggleSidebar: () => void;
  /** Switch to the first tab of a given type, creating one if absent. */
  openFeature: (type: TabType) => void;
}

const DEFAULT_TAB_TITLES: Record<TabType, string> = {
  'api-tester': 'API Tester',
  'json-tools': 'JSON Tools',
  snippets: 'Snippets',
  database: 'Database',
};

/** Four permanent tabs — one per feature — shown on first launch. */
const INITIAL_TABS: AppTab[] = [
  { id: 'tab-api', type: 'api-tester', title: 'API Tester' },
  { id: 'tab-json', type: 'json-tools', title: 'JSON Tools' },
  { id: 'tab-snippets', type: 'snippets', title: 'Snippets' },
  { id: 'tab-database', type: 'database', title: 'Database' },
];

export const useAppStore = create<AppState>((set, get) => ({
  tabs: INITIAL_TABS,
  activeTabId: 'tab-api',
  sidebarCollapsed: false,

  addTab: (type, title) => {
    const id = uuidv4();
    const newTab: AppTab = {
      id,
      type,
      title: title ?? DEFAULT_TAB_TITLES[type],
    };
    set((s) => ({ tabs: [...s.tabs, newTab], activeTabId: id }));
    return id;
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) return; // Always keep at least one tab

    const idx = tabs.findIndex((t) => t.id === id);
    const remaining = tabs.filter((t) => t.id !== id);

    // If we closed the active tab, move focus to the adjacent one
    const newActiveId =
      activeTabId === id
        ? remaining[Math.max(0, idx - 1)].id
        : activeTabId;

    set({ tabs: remaining, activeTabId: newActiveId });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  openFeature: (type) => {
    const { tabs, addTab, setActiveTab } = get();
    const existing = tabs.find((t) => t.type === type);
    if (existing) {
      setActiveTab(existing.id);
    } else {
      addTab(type);
    }
  },
}));
