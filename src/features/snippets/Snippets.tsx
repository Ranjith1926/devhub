/**
 * Snippets.tsx
 * Code snippet manager — list, search, filter, create, edit, delete.
 * Persisted in SQLite via Tauri IPC (get_snippets / save_snippet / update_snippet / delete_snippet).
 */

import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Plus,
  Search,
  Tag,
  Trash2,
  Edit2,
  Copy,
  Check,
  X,
  Code2,
} from 'lucide-react';
import { CodeEditor } from '../../components/ui/CodeEditor';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useSnippetStore } from '../../store/snippetStore';
import { useToast } from '../../hooks/useToast';
import { Snippet, LANGUAGES } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import type { EditorLanguage } from '../../components/ui/CodeEditor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LANG_OPTIONS = [
  { value: '', label: 'All languages' },
  ...LANGUAGES.map((l) => ({ value: l, label: l })),
];

const LANG_EDITOR_MAP: Record<string, EditorLanguage> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  rust: 'text',
  sql: 'sql',
  bash: 'text',
  html: 'html',
  css: 'css',
  json: 'json',
  yaml: 'text',
  markdown: 'text',
  text: 'text',
};

function parseTags(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr.filter((x): x is string => typeof x === 'string');
  } catch { /* ignore */ }
  return [];
}

function tagsToJson(tags: string[]): string {
  return JSON.stringify(tags);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// SnippetEditor modal-like panel
// ---------------------------------------------------------------------------

interface EditorPanelProps {
  snippet: Snippet | null; // null = new
  onClose: () => void;
  onSaved: (s: Snippet) => void;
}

function SnippetEditorPanel({ snippet, onClose, onSaved }: EditorPanelProps) {
  const toast = useToast();
  const [name, setName] = useState(snippet?.name ?? '');
  const [description, setDescription] = useState(snippet?.description ?? '');
  const [language, setLanguage] = useState(snippet?.language ?? 'javascript');
  const [code, setCode] = useState(snippet?.code ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(() =>
    snippet ? parseTags(snippet.tags) : [],
  );
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const handleSave = async () => {
    if (!name.trim()) { toast.warning('Name is required'); return; }
    if (!code.trim()) { toast.warning('Code cannot be empty'); return; }
    setSaving(true);
    try {
      if (snippet) {
        await invoke('update_snippet', {
          id: snippet.id,
          name: name.trim(),
          description: description.trim(),
          code,
          language,
          tags: tagsToJson(tags),
        });
        const updated: Snippet = {
          ...snippet,
          name: name.trim(),
          description: description.trim(),
          code,
          language,
          tags: tagsToJson(tags),
          updated_at: new Date().toISOString(),
        };
        onSaved(updated);
        toast.success('Snippet updated');
      } else {
        const saved = await invoke<Snippet>('save_snippet', {
          name: name.trim(),
          description: description.trim(),
          code,
          language,
          tags: tagsToJson(tags),
        });
        onSaved(saved);
        toast.success('Snippet saved');
      }
      onClose();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gh-overlay border-l border-gh-border min-w-0 w-[480px] shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gh-border shrink-0">
        <span className="text-sm font-semibold text-gh-fg">
          {snippet ? 'Edit Snippet' : 'New Snippet'}
        </span>
        <button
          onClick={onClose}
          className="text-gh-fg-subtle hover:text-gh-fg p-1 rounded"
        >
          <X size={14} />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My snippet"
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />
        <Select
          label="Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          options={LANGUAGES.map((l) => ({ value: l, label: l }))}
        />

        {/* Tags */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gh-fg-muted">Tags</label>
          <div className="flex gap-1.5">
            <input
              className="flex-1 h-8 rounded-md border border-gh-border bg-gh-overlay text-sm text-gh-fg px-3 focus:outline-none focus:border-gh-accent focus:ring-1 focus:ring-gh-accent/50"
              placeholder="Add tag, press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button size="sm" variant="secondary" onClick={addTag}>Add</Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gh-accent/15 text-gh-accent text-xs"
                >
                  {t}
                  <button onClick={() => removeTag(t)} className="hover:text-gh-danger">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Code editor */}
        <div className="flex flex-col gap-1 flex-1 min-h-0">
          <label className="text-xs font-medium text-gh-fg-muted">Code</label>
          <div className="flex-1 min-h-[200px] rounded-md border border-gh-border overflow-hidden">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={LANG_EDITOR_MAP[language] ?? 'text'}
              height="280px"
              placeholder="Paste your code here…"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gh-border shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
          {snippet ? 'Update' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Snippet row
// ---------------------------------------------------------------------------

interface SnippetRowProps {
  snippet: Snippet;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SnippetRow({ snippet, selected, onSelect, onEdit, onDelete }: SnippetRowProps) {
  const [copied, setCopied] = useState(false);

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const tags = parseTags(snippet.tags);

  return (
    <div
      onClick={onSelect}
      className={[
        'group flex flex-col gap-1 px-3 py-2.5 cursor-pointer border-b border-gh-border/50',
        'transition-colors',
        selected
          ? 'bg-gh-accent/10 border-l-2 border-l-gh-accent'
          : 'hover:bg-gh-subtle/60',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gh-subtle border border-gh-border text-gh-fg-muted shrink-0">
            {snippet.language}
          </span>
          <span className="text-sm font-medium text-gh-fg truncate">{snippet.name}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
          <button
            onClick={copy}
            className="p-1 rounded text-gh-fg-subtle hover:text-gh-fg hover:bg-gh-border"
            title="Copy code"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 rounded text-gh-fg-subtle hover:text-gh-fg hover:bg-gh-border"
            title="Edit"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded text-gh-fg-subtle hover:text-gh-danger hover:bg-gh-border"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {snippet.description && (
        <p className="text-xs text-gh-fg-muted truncate">{snippet.description}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gh-subtle text-gh-fg-subtle">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Snippets root
// ---------------------------------------------------------------------------

export function Snippets() {
  const {
    snippets,
    setSnippets,
    addSnippet,
    updateSnippet,
    removeSnippet,
    searchQuery,
    setSearchQuery,
    selectedLanguage,
    setSelectedLanguage,
    filteredSnippets,
    editingSnippet,
    isEditorOpen,
    openEditor,
    closeEditor,
  } = useSnippetStore();

  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewSnippet, setPreviewSnippet] = useState<Snippet | null>(null);

  // Load snippets on mount
  useEffect(() => {
    setLoading(true);
    invoke<Snippet[]>('get_snippets')
      .then(setSnippets)
      .catch((e) => toast.error(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await invoke('delete_snippet', { id });
      removeSnippet(id);
      if (selectedId === id) { setSelectedId(null); setPreviewSnippet(null); }
      toast.success('Snippet deleted');
    } catch (e) {
      toast.error(String(e));
    }
  }, [selectedId, removeSnippet]);

  const handleSaved = useCallback((s: Snippet) => {
    if (editingSnippet) {
      updateSnippet(s);
    } else {
      addSnippet(s);
    }
  }, [editingSnippet, updateSnippet, addSnippet]);

  const filtered = filteredSnippets();

  return (
    <div className="flex h-full min-h-0">
      {/* Left: list */}
      <div className="flex flex-col w-72 shrink-0 border-r border-gh-border bg-gh-overlay">
        {/* Search + filter */}
        <div className="p-3 border-b border-gh-border flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                leftIcon={<Search size={12} />}
                placeholder="Search snippets…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="primary"
              icon={<Plus size={12} />}
              onClick={() => openEditor()}
              title="New snippet"
            />
          </div>
          <Select
            options={LANG_OPTIONS}
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-center text-xs text-gh-fg-subtle py-8">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gh-fg-subtle">
              <Code2 size={24} />
              <p className="text-xs">
                {snippets.length === 0
                  ? 'No snippets yet. Click + to create one.'
                  : 'No snippets match your search.'}
              </p>
            </div>
          ) : (
            filtered.map((s) => (
              <SnippetRow
                key={s.id}
                snippet={s}
                selected={selectedId === s.id}
                onSelect={() => { setSelectedId(s.id); setPreviewSnippet(s); }}
                onEdit={() => openEditor(s)}
                onDelete={() => handleDelete(s.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gh-border shrink-0">
          <span className="text-xs text-gh-fg-subtle">
            {filtered.length} snippet{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Middle: preview */}
      <div className="flex-1 min-w-0 flex flex-col">
        {previewSnippet && !isEditorOpen ? (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gh-border shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gh-subtle border border-gh-border text-gh-fg-muted shrink-0">
                  {previewSnippet.language}
                </span>
                <span className="font-semibold text-sm text-gh-fg truncate">
                  {previewSnippet.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-gh-fg-subtle">
                  {formatDate(previewSnippet.updated_at)}
                </span>
                <Button
                  size="xs"
                  variant="ghost"
                  icon={<Edit2 size={11} />}
                  onClick={() => openEditor(previewSnippet)}
                >
                  Edit
                </Button>
              </div>
            </div>
            {previewSnippet.description && (
              <div className="px-4 py-2 border-b border-gh-border/50 text-xs text-gh-fg-muted shrink-0">
                {previewSnippet.description}
              </div>
            )}
            {parseTags(previewSnippet.tags).length > 0 && (
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gh-border/50 shrink-0">
                <Tag size={11} className="text-gh-fg-subtle" />
                {parseTags(previewSnippet.tags).map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-gh-accent/15 text-gh-accent"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-hidden">
              <CodeEditor
                value={previewSnippet.code}
                language={LANG_EDITOR_MAP[previewSnippet.language] ?? 'text'}
                readOnly
                height="100%"
              />
            </div>
          </>
        ) : !isEditorOpen ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gh-fg-subtle">
            <Code2 size={32} />
            <p className="text-sm">Select a snippet to preview</p>
          </div>
        ) : null}
      </div>

      {/* Right: editor */}
      {isEditorOpen && (
        <SnippetEditorPanel
          snippet={editingSnippet}
          onClose={closeEditor}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
