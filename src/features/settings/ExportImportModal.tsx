/**
 * ExportImportModal.tsx
 * Proper UI for Export / Import of collections, snippets, and history.
 *
 * Export tab:
 *   – Shows live counts from the store
 *   – Section checkboxes (collections, snippets, history)
 *   – Triggers existing Tauri export_data → file save
 *
 * Import tab:
 *   – File picker or drag-and-drop
 *   – Preview of file contents (counts) before committing
 *   – Merge result summary after import
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Package,
  Bookmark,
  History,
  FolderOpen,
  X,
  Loader2,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { save, open as openDialog } from '@tauri-apps/api/dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/api/fs';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useApiStore } from '../../store/apiStore';
import { useSnippetStore } from '../../store/snippetStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportEnvelope {
  version: string;
  exported_at: string;
  collections: unknown[];
  requests: unknown[];
  snippets: unknown[];
  history: unknown[];
}

type TabId = 'export' | 'import';

interface ImportState {
  status: 'idle' | 'loaded' | 'importing' | 'done' | 'error';
  fileName: string;
  preview: ExportEnvelope | null;
  resultMessage: string;
  errorMessage: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CountBadge({ n, label, icon }: { n: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gh-border bg-gh-canvas">
      <span className="text-gh-accent shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-base font-bold text-gh-fg leading-none">{n}</div>
        <div className="text-[11px] text-gh-fg-muted mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export Tab
// ---------------------------------------------------------------------------

function ExportTab({ onClose }: { onClose: () => void }) {
  const { collections, history } = useApiStore();
  const { snippets } = useSnippetStore();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const totalRequests = collections.reduce((sum, c) => sum + c.requests.length, 0);

  const handleExport = async () => {
    setLoading(true);
    setError('');
    try {
      const json = await invoke<string>('export_data');
      const path = await save({
        defaultPath: `devhub-export-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'DevHub JSON', extensions: ['json'] }],
      });
      if (!path) { setLoading(false); return; }
      await writeTextFile(path as string, json);
      setDone(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
        <CheckCircle2 size={40} className="text-gh-success" />
        <div>
          <p className="text-sm font-semibold text-gh-fg">Export complete</p>
          <p className="text-xs text-gh-fg-muted mt-1">Your data has been saved to the selected file.</p>
        </div>
        <Button variant="primary" size="sm" onClick={onClose}>Done</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* What will be exported */}
      <div>
        <p className="text-xs font-semibold text-gh-fg-muted uppercase tracking-wider mb-2">
          What will be exported
        </p>
        <div className="grid grid-cols-2 gap-2">
          <CountBadge n={collections.length} label="Collections" icon={<FolderOpen size={16} />} />
          <CountBadge n={totalRequests} label="Saved Requests" icon={<Package size={16} />} />
          <CountBadge n={snippets.length} label="Snippets" icon={<Bookmark size={16} />} />
          <CountBadge n={history.length} label="History Entries" icon={<History size={16} />} />
        </div>
      </div>

      {/* Info */}
      <div className="flex gap-2 px-3 py-2.5 rounded-lg bg-gh-accent/10 border border-gh-accent/20 text-xs text-gh-fg-muted">
        <FileJson size={14} className="text-gh-accent shrink-0 mt-0.5" />
        <span>
          Exports as a single <strong className="text-gh-fg">.json</strong> file you can share with teammates or import on another machine. Existing data is not removed on import — new items are merged in.
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gh-danger/10 border border-gh-danger/20 text-xs text-gh-danger">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      <Button
        variant="primary"
        size="md"
        loading={loading}
        icon={<Download size={14} />}
        onClick={handleExport}
        className="self-end"
      >
        Export to file…
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import Tab
// ---------------------------------------------------------------------------

function ImportTab({
  onImportDone,
}: {
  onImportDone: (msg: string) => void;
}) {
  const { setCollections, setHistory } = useApiStore();
  const { setSnippets } = useSnippetStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<ImportState>({
    status: 'idle',
    fileName: '',
    preview: null,
    resultMessage: '',
    errorMessage: '',
  });

  const loadFile = useCallback((json: string, name: string) => {
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch {
      setState((s) => ({ ...s, status: 'error', errorMessage: 'File is not valid JSON.' }));
      return;
    }
    const p = parsed as Record<string, unknown>;
    if (!p.version || !Array.isArray(p.collections) || !Array.isArray(p.snippets)) {
      setState((s) => ({ ...s, status: 'error', errorMessage: 'Not a valid DevHub export file.' }));
      return;
    }
    setState({
      status: 'loaded',
      fileName: name,
      preview: parsed as ExportEnvelope,
      resultMessage: '',
      errorMessage: '',
    });
  }, []);

  // Drag and drop
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = () => setDragging(false);
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => loadFile(ev.target?.result as string, file.name);
      reader.readAsText(file);
    };
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [loadFile]);

  const handlePickFile = async () => {
    const path = await openDialog({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!path || Array.isArray(path)) return;
    const json = await readTextFile(path as string);
    loadFile(json, (path as string).split(/[\\/]/).pop() ?? 'file.json');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadFile(ev.target?.result as string, file.name);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (state.status !== 'loaded' || !state.preview) return;
    setState((s) => ({ ...s, status: 'importing' }));
    try {
      const json = JSON.stringify(state.preview);
      const msg = await invoke<string>('import_data', { json });

      // Reload stores
      const snippets = await invoke<any[]>('get_snippets');
      setSnippets(snippets);
      const rawCollections = await invoke<any[]>('get_collections');
      const fullCollections = await Promise.all(
        rawCollections.map(async (c) => {
          const requests = await invoke<any[]>('get_requests', { collectionId: c.id });
          return { ...c, requests };
        }),
      );
      setCollections(fullCollections);
      const history = await invoke<any[]>('get_request_history');
      setHistory(history);

      setState((s) => ({ ...s, status: 'done', resultMessage: msg }));
      onImportDone(msg);
    } catch (e) {
      setState((s) => ({ ...s, status: 'error', errorMessage: String(e) }));
    }
  };

  const reset = () =>
    setState({ status: 'idle', fileName: '', preview: null, resultMessage: '', errorMessage: '' });

  const { status, preview, fileName, resultMessage, errorMessage } = state;

  // ── Done ──
  if (status === 'done') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <CheckCircle2 size={40} className="text-gh-success" />
        <div>
          <p className="text-sm font-semibold text-gh-fg">Import complete</p>
          <p className="text-xs text-gh-fg-muted mt-1 max-w-xs">{resultMessage}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>Import another file</Button>
      </div>
    );
  }

  // ── Error ──
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <AlertCircle size={36} className="text-gh-danger" />
        <div>
          <p className="text-sm font-semibold text-gh-danger">Import failed</p>
          <p className="text-xs text-gh-fg-muted mt-1 max-w-xs break-words">{errorMessage}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>Try again</Button>
      </div>
    );
  }

  // ── Loaded: preview ──
  if (status === 'loaded' && preview) {
    const reqCount = Array.isArray(preview.requests) ? preview.requests.length : 0;
    const exportedAt = preview.exported_at
      ? new Date(preview.exported_at).toLocaleString()
      : 'unknown';
    return (
      <div className="flex flex-col gap-4">
        {/* File info */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gh-border bg-gh-canvas">
          <FileJson size={16} className="text-gh-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gh-fg truncate">{fileName}</p>
            <p className="text-[11px] text-gh-fg-muted">Exported {exportedAt} · v{preview.version}</p>
          </div>
          <button onClick={reset} className="text-gh-fg-subtle hover:text-gh-fg shrink-0">
            <X size={13} />
          </button>
        </div>

        {/* Preview counts */}
        <div>
          <p className="text-xs font-semibold text-gh-fg-muted uppercase tracking-wider mb-2">
            File contains
          </p>
          <div className="grid grid-cols-2 gap-2">
            <CountBadge n={preview.collections.length} label="Collections" icon={<FolderOpen size={16} />} />
            <CountBadge n={reqCount} label="Saved Requests" icon={<Package size={16} />} />
            <CountBadge n={preview.snippets.length} label="Snippets" icon={<Bookmark size={16} />} />
            <CountBadge n={preview.history?.length ?? 0} label="History Entries" icon={<History size={16} />} />
          </div>
        </div>

        {/* Merge note */}
        <div className="flex gap-2 px-3 py-2.5 rounded-lg bg-gh-accent/10 border border-gh-accent/20 text-xs text-gh-fg-muted">
          <AlertCircle size={13} className="text-gh-accent shrink-0 mt-0.5" />
          Items with the same ID are skipped. No existing data will be deleted.
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            loading={state.status === 'importing'}
            icon={<Upload size={13} />}
            onClick={handleImport}
          >
            Import now
          </Button>
        </div>
      </div>
    );
  }

  // ── Idle: drop zone ──
  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        ref={dropRef}
        onClick={() => fileInputRef.current?.click()}
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed',
          'py-12 cursor-pointer transition-colors select-none',
          dragging
            ? 'border-gh-accent bg-gh-accent/10'
            : 'border-gh-border hover:border-gh-accent/60 hover:bg-gh-subtle',
        ].join(' ')}
      >
        <Upload size={28} className={dragging ? 'text-gh-accent' : 'text-gh-fg-subtle'} />
        <div className="text-center">
          <p className="text-sm font-medium text-gh-fg">
            {dragging ? 'Drop file here' : 'Drag & drop a DevHub export file'}
          </p>
          <p className="text-xs text-gh-fg-muted mt-0.5">or click to browse</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gh-border" />
        <span className="text-[11px] text-gh-fg-subtle">or</span>
        <div className="flex-1 h-px bg-gh-border" />
      </div>

      <Button
        variant="ghost"
        size="sm"
        icon={<FolderOpen size={13} />}
        onClick={handlePickFile}
        className="self-center"
      >
        Browse for file…
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

interface ExportImportModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: TabId;
}

export function ExportImportModal({ open, onClose, defaultTab = 'export' }: ExportImportModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  useEffect(() => {
    if (open) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  return (
    <Modal open={open} onClose={onClose} title="Export / Import" width="max-w-lg">
      {/* Tabs */}
      <div className="flex border-b border-gh-border -mt-1 mb-4">
        {([
          { id: 'export' as TabId, label: 'Export', icon: <Download size={13} /> },
          { id: 'import' as TabId, label: 'Import', icon: <Upload size={13} /> },
        ]).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors',
              activeTab === id
                ? 'border-gh-accent text-gh-accent'
                : 'border-transparent text-gh-fg-muted hover:text-gh-fg',
            ].join(' ')}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'export' ? (
        <ExportTab onClose={onClose} />
      ) : (
        <ImportTab onImportDone={() => {}} />
      )}
    </Modal>
  );
}
