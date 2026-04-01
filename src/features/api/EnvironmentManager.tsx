/**
 * EnvironmentManager.tsx
 * Modal for creating, editing, and deleting API environments and their variables.
 *
 * Layout:
 *   Left sidebar  — list of environments + add button
 *   Right panel   — variable key-value table for the selected environment
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Pencil,
  X,
  FlaskConical,
  Save,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useEnvStore } from '../../store/envStore';
import { Environment } from '../../types';

// ---------------------------------------------------------------------------
// Inline rename input
// ---------------------------------------------------------------------------

function EnvNameInput({
  value,
  onDone,
}: {
  value: string;
  onDone: (name: string) => void;
}) {
  const [name, setName] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = () => {
    const trimmed = name.trim();
    onDone(trimmed || value);
  };

  return (
    <input
      ref={ref}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onDone(value);
      }}
      className="flex-1 min-w-0 bg-transparent border-b border-gh-accent text-sm text-gh-fg focus:outline-none"
    />
  );
}

// ---------------------------------------------------------------------------
// Variable row
// ---------------------------------------------------------------------------

function VariableRow({
  envId,
  variable,
  onChanged,
}: {
  envId: string;
  variable: { id: string; key: string; value: string; enabled: boolean };
  onChanged: () => void;
}) {
  const { updateVariable, removeVariable } = useEnvStore();

  const update = (patch: Partial<typeof variable>) => {
    updateVariable(envId, variable.id, patch);
    onChanged();
  };

  return (
    <div className="flex items-center gap-1.5 group">
      <input
        type="checkbox"
        checked={variable.enabled}
        onChange={(e) => update({ enabled: e.target.checked })}
        className="w-3.5 h-3.5 accent-gh-accent cursor-pointer shrink-0"
        title="Enable variable"
      />
      <input
        value={variable.key}
        onChange={(e) => update({ key: e.target.value })}
        placeholder="VARIABLE_NAME"
        spellCheck={false}
        className="w-36 h-7 px-2 rounded border border-gh-border bg-gh-canvas text-xs font-mono text-gh-fg placeholder:text-gh-fg-subtle focus:outline-none focus:border-gh-accent"
      />
      <input
        value={variable.value}
        onChange={(e) => update({ value: e.target.value })}
        placeholder="value"
        spellCheck={false}
        className="flex-1 h-7 px-2 rounded border border-gh-border bg-gh-canvas text-xs font-mono text-gh-fg placeholder:text-gh-fg-subtle focus:outline-none focus:border-gh-accent"
      />
      <button
        onClick={() => { removeVariable(envId, variable.id); onChanged(); }}
        className="text-gh-fg-subtle hover:text-gh-danger transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        title="Remove variable"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right panel: variables for the selected environment
// ---------------------------------------------------------------------------

function VariablesPanel({ env }: { env: Environment }) {
  const { addVariable } = useEnvStore();
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChanged = useCallback(() => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  // Reset indicator when env changes
  useEffect(() => {
    setSaved(false);
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, [env.id]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Column headers */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gh-border shrink-0">
        <span className="w-3.5 shrink-0" />
        <span className="w-36 text-[11px] font-semibold text-gh-fg-muted uppercase tracking-wider">
          Variable
        </span>
        <span className="flex-1 text-[11px] font-semibold text-gh-fg-muted uppercase tracking-wider">
          Value
        </span>
        <span className="w-4 shrink-0" />
      </div>

      {/* Variable rows */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1.5">
        {env.variables.length === 0 ? (
          <p className="text-xs text-gh-fg-subtle text-center py-6">
            No variables yet. Add one to get started.
          </p>
        ) : (
          env.variables.map((v) => (
            <VariableRow key={v.id} envId={env.id} variable={v} onChanged={handleChanged} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gh-border shrink-0 flex items-center justify-between">
        <Button
          variant="ghost"
          size="xs"
          icon={<Plus size={12} />}
          onClick={() => { addVariable(env.id); handleChanged(); }}
        >
          Add variable
        </Button>
        <div className="flex items-center gap-3">
          {/* Auto-save indicator */}
          <span
            className={[
              'flex items-center gap-1 text-[11px] transition-all duration-300',
              saved ? 'text-gh-success opacity-100' : 'text-gh-fg-subtle opacity-60',
            ].join(' ')}
          >
            {saved ? (
              <><Check size={11} /><span>Saved</span></>
            ) : (
              <><Save size={11} /><span>Auto-saved</span></>
            )}
          </span>
          <p className="text-[11px] text-gh-fg-subtle">
            Use{' '}
            <code className="font-mono text-gh-accent bg-gh-subtle px-1 rounded">{'{{VARIABLE_NAME}}'}</code>
            {' '}in URL, headers or body
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface EnvironmentManagerProps {
  open: boolean;
  onClose: () => void;
}

export function EnvironmentManager({ open, onClose }: EnvironmentManagerProps) {
  const {
    environments,
    activeEnvId,
    setActiveEnv,
    addEnvironment,
    duplicateEnvironment,
    renameEnvironment,
    removeEnvironment,
  } = useEnvStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newEnvName, setNewEnvName] = useState('');
  const [addingNew, setAddingNew] = useState(false);

  // Auto-select first env when modal opens if nothing is selected
  useEffect(() => {
    if (open && !selectedId && environments.length > 0) {
      setSelectedId(environments[0].id);
    }
  }, [open, environments, selectedId]);

  // Auto-select newly created env
  useEffect(() => {
    if (environments.length > 0 && selectedId === null) {
      setSelectedId(environments[environments.length - 1].id);
    }
  }, [environments.length]);

  const selectedEnv = environments.find((e) => e.id === selectedId) ?? null;

  const handleAddEnvironment = () => {
    const trimmed = newEnvName.trim();
    if (!trimmed) return;
    addEnvironment(trimmed);
    setNewEnvName('');
    setAddingNew(false);
    // Will be selected via the useEffect above
  };

  const handleDelete = (id: string) => {
    removeEnvironment(id);
    if (selectedId === id) {
      const remaining = environments.filter((e) => e.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Environments" width="max-w-3xl" noPadding>
      {/* Fixed-height container — no horizontal scroll, two-column layout */}
      <div className="flex h-[480px] overflow-hidden">

        {/* ── Left sidebar ── */}
        <div className="w-52 shrink-0 border-r border-gh-border flex flex-col overflow-hidden bg-gh-canvas">

          {/* Scrollable env list */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {environments.length === 0 && (
              <p className="text-xs text-gh-fg-subtle text-center pt-8 px-3">
                No environments yet
              </p>
            )}

            {environments.map((env) => (
              <div
                key={env.id}
                onClick={() => setSelectedId(env.id)}
                className={[
                  'group flex items-center gap-2 px-3 py-2 cursor-pointer border-l-2 transition-colors min-w-0',
                  selectedId === env.id
                    ? 'border-gh-accent bg-gh-accent/10 text-gh-fg'
                    : 'border-transparent hover:bg-gh-subtle text-gh-fg-muted hover:text-gh-fg',
                ].join(' ')}
              >
                {/* Active indicator dot */}
                <div
                  className={[
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    activeEnvId === env.id
                      ? 'bg-gh-success'
                      : 'border border-gh-border',
                  ].join(' ')}
                  title={activeEnvId === env.id ? 'Active' : 'Inactive'}
                />

                {renamingId === env.id ? (
                  <EnvNameInput
                    value={env.name}
                    onDone={(name) => {
                      renameEnvironment(env.id, name);
                      setRenamingId(null);
                    }}
                  />
                ) : (
                  <span className="flex-1 text-sm truncate">{env.name}</span>
                )}

                {renamingId !== env.id && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setRenamingId(env.id); }}
                      className="p-0.5 text-gh-fg-subtle hover:text-gh-fg rounded"
                      title="Rename"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); duplicateEnvironment(env.id); }}
                      className="p-0.5 text-gh-fg-subtle hover:text-gh-fg rounded"
                      title="Duplicate"
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(env.id); }}
                      className="p-0.5 text-gh-fg-subtle hover:text-gh-danger rounded"
                      title="Delete"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer: inline add form OR button */}
          <div className="shrink-0 border-t border-gh-border px-3 py-2">
            {addingNew ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddEnvironment();
                    if (e.key === 'Escape') { setAddingNew(false); setNewEnvName(''); }
                  }}
                  placeholder="Environment name"
                  className="flex-1 h-7 px-2 rounded border border-gh-accent bg-gh-overlay text-xs text-gh-fg focus:outline-none min-w-0"
                />
                <button
                  onClick={handleAddEnvironment}
                  className="text-gh-success hover:text-gh-success/80 shrink-0"
                  title="Create"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => { setAddingNew(false); setNewEnvName(''); }}
                  className="text-gh-fg-subtle hover:text-gh-danger shrink-0"
                  title="Cancel"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                icon={<Plus size={12} />}
                onClick={() => setAddingNew(true)}
                className="w-full justify-center"
              >
                New environment
              </Button>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selectedEnv ? (
            <>
              {/* Env header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gh-border shrink-0">
                <div className="flex items-center gap-2">
                  <FlaskConical size={14} className="text-gh-accent" />
                  <span className="text-sm font-semibold text-gh-fg">{selectedEnv.name}</span>
                  {activeEnvId === selectedEnv.id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gh-success/15 text-gh-success font-medium">
                      Active
                    </span>
                  )}
                </div>
                <Button
                  variant={activeEnvId === selectedEnv.id ? 'ghost' : 'primary'}
                  size="xs"
                  onClick={() =>
                    setActiveEnv(activeEnvId === selectedEnv.id ? null : selectedEnv.id)
                  }
                >
                  {activeEnvId === selectedEnv.id ? 'Deactivate' : 'Set Active'}
                </Button>
              </div>

              <VariablesPanel env={selectedEnv} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <FlaskConical size={36} className="text-gh-fg-subtle opacity-30" />
              <p className="text-sm font-medium text-gh-fg-muted">
                Select an environment to manage its variables
              </p>
              <p className="text-xs text-gh-fg-subtle max-w-xs leading-relaxed">
                Create environments like <em>Development</em>, <em>Staging</em>,{' '}
                <em>Production</em> and define variables like{' '}
                <code className="font-mono text-gh-accent bg-gh-subtle px-1 rounded">{'{{baseUrl}}'}</code>{' '}
                or{' '}
                <code className="font-mono text-gh-accent bg-gh-subtle px-1 rounded">{'{{authToken}}'}</code>.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
