import React, { useState, useCallback, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/tauri';
import { save, open as openDialog } from '@tauri-apps/api/dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/api/fs';
import { Sidebar } from './components/Layout/Sidebar';
import { TabBar } from './components/Layout/TabBar';
import { TitleBar } from './components/Layout/TitleBar';
import { ApiTester } from './features/api';
import { JsonTools } from './features/json-tools/JsonTools';
import { Snippets } from './features/snippets/Snippets';
import { Database } from './features/database/Database';
import { AuthPage } from './features/auth/AuthPage';
import { Modal } from './components/ui/Modal';
import { useAppStore } from './store/appStore';
import { useSnippetStore } from './store/snippetStore';
import { useApiStore } from './store/apiStore';
import { useAuthStore } from './store/authStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useToast } from './hooks/useToast';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  Send, Braces, Bookmark, Database as DbIcon,
  Keyboard, Info, Moon, Sun,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Settings modal
// ---------------------------------------------------------------------------

const SHORTCUTS = [
  { keys: 'Ctrl+1', desc: 'Open API Tester' },
  { keys: 'Ctrl+2', desc: 'Open JSON Tools' },
  { keys: 'Ctrl+3', desc: 'Open Snippets' },
  { keys: 'Ctrl+4', desc: 'Open Database' },
  { keys: 'Ctrl+Shift+E', desc: 'Export data' },
  { keys: 'Ctrl+Shift+I', desc: 'Import data' },
  { keys: 'Escape', desc: 'Close dialog / modal' },
];

type ThemeMode = 'dark' | 'light';

function SettingsModal({
  open,
  onClose,
  theme,
  onThemeChange,
}: {
  open: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Settings" width="max-w-md">
      {/* Appearance */}
      <section className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          {theme === 'dark' ? <Moon size={14} className="text-gh-accent" /> : <Sun size={14} className="text-gh-accent" />}
          <span className="text-xs font-semibold text-gh-fg uppercase tracking-wider">
            Appearance
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onThemeChange('dark')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-sm transition-colors',
              theme === 'dark'
                ? 'bg-gh-accent text-white border-gh-accent'
                : 'bg-gh-overlay border-gh-border text-gh-fg hover:bg-gh-subtle',
            ].join(' ')}
          >
            <Moon size={13} />
            Dark
          </button>
          <button
            onClick={() => onThemeChange('light')}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-sm transition-colors',
              theme === 'light'
                ? 'bg-gh-accent text-white border-gh-accent'
                : 'bg-gh-overlay border-gh-border text-gh-fg hover:bg-gh-subtle',
            ].join(' ')}
          >
            <Sun size={13} />
            Light
          </button>
        </div>
      </section>

      {/* Keyboard shortcuts */}
      <section className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Keyboard size={14} className="text-gh-accent" />
          <span className="text-xs font-semibold text-gh-fg uppercase tracking-wider">
            Keyboard Shortcuts
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div
              key={keys}
              className="flex items-center justify-between px-3 py-1.5 rounded-md hover:bg-gh-subtle"
            >
              <span className="text-sm text-gh-fg">{desc}</span>
              <kbd className="flex gap-1">
                {keys.split('+').map((k) => (
                  <span
                    key={k}
                    className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-gh-canvas border border-gh-border text-gh-fg-muted"
                  >
                    {k}
                  </span>
                ))}
              </kbd>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} className="text-gh-accent" />
          <span className="text-xs font-semibold text-gh-fg uppercase tracking-wider">
            Features
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <Send size={14} />, label: 'API Tester', desc: 'HTTP client with collections & history' },
            { icon: <Braces size={14} />, label: 'JSON Tools', desc: 'Format, validate & generate TS types' },
            { icon: <Bookmark size={14} />, label: 'Snippets', desc: 'Save & search reusable code snippets' },
            { icon: <DbIcon size={14} />, label: 'Database', desc: 'Connect to MySQL & MongoDB' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="flex flex-col gap-1 p-3 rounded-md bg-gh-subtle border border-gh-border">
              <div className="flex items-center gap-2 text-gh-accent">{icon}<span className="text-xs font-semibold text-gh-fg">{label}</span></div>
              <p className="text-[11px] text-gh-fg-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-gh-subtle border border-gh-border">
          <div className="w-6 h-6 rounded-md bg-gh-accent flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-[10px]">D</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gh-fg">DevHub v0.1.0</p>
            <p className="text-[11px] text-gh-fg-muted">All-in-one developer productivity tool</p>
          </div>
        </div>
      </section>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const { tabs, activeTabId, openFeature } = useAppStore();
  const { setSnippets } = useSnippetStore();
  const { setCollections } = useApiStore();
  const { user, setUser } = useAuthStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('devhub-theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const toast = useToast();

  // Sync Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
      } else {
        setUser(null);
      }
      setAuthReady(true);
    });
    return unsub;
  }, [setUser]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
    localStorage.setItem('devhub-theme', theme);
  }, [theme]);

  // ---- Export ----
  const handleExport = useCallback(async () => {
    try {
      const json = await invoke<string>('export_data');
      const path = await save({
        defaultPath: `devhub-export-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!path) return;
      await writeTextFile(path, json);
      toast.success('Data exported successfully');
    } catch (e) {
      toast.error(`Export failed: ${e}`);
    }
  }, []);

  // ---- Import ----
  const handleImport = useCallback(async () => {
    try {
      const path = await openDialog({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!path || Array.isArray(path)) return;
      const json = await readTextFile(path as string);
      const msg = await invoke<string>('import_data', { json });
      const [collections, snippets] = await Promise.all([
        invoke<any[]>('get_collections'),
        invoke<any[]>('get_snippets'),
      ]);
      setCollections(collections);
      setSnippets(snippets);
      toast.success(msg);
    } catch (e) {
      toast.error(`Import failed: ${e}`);
    }
  }, [setCollections, setSnippets]);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    { ctrl: true, key: '1', handler: () => openFeature('api-tester'), description: 'Open API Tester' },
    { ctrl: true, key: '2', handler: () => openFeature('json-tools'), description: 'Open JSON Tools' },
    { ctrl: true, key: '3', handler: () => openFeature('snippets'), description: 'Open Snippets' },
    { ctrl: true, key: '4', handler: () => openFeature('database'), description: 'Open Database' },
    { ctrl: true, shift: true, key: 'E', handler: handleExport, description: 'Export data' },
    { ctrl: true, shift: true, key: 'I', handler: handleImport, description: 'Import data' },
  ]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Wait for Firebase to restore session before deciding what to render
  if (!authReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gh-canvas">
        <div className="w-6 h-6 rounded-full border-2 border-gh-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  // Show auth page when no user is logged in
  if (!user) {
    return <AuthPage />;
  }

  function renderPanel() {
    if (!activeTab) return null;
    switch (activeTab.type) {
      case 'api-tester':
        return <ApiTester />;
      case 'json-tools':
        return <JsonTools />;
      case 'snippets':
        return <Snippets />;
      case 'database':
        return <Database />;
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gh-canvas text-gh-fg font-sans">
      {/* Custom themed titlebar */}
      <TitleBar />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: theme === 'light' ? '#ffffff' : '#161b22',
            color: theme === 'light' ? '#1f2328' : '#e6edf3',
            border: theme === 'light' ? '1px solid #d0d7de' : '1px solid #30363d',
            fontSize: '13px',
          },
        }}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Sidebar + main */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          onExport={handleExport}
          onImport={handleImport}
          onSettings={() => setSettingsOpen(true)}
        />

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0">
          <TabBar />
          <main className="flex-1 overflow-hidden">
            {renderPanel()}
          </main>
        </div>
      </div>
    </div>
  );
}
