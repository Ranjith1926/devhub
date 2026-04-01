/**
 * JsonTools.tsx
 * Two-tab panel: JSON Formatter/Validator and TypeScript interface generator.
 * Fully client-side — no Tauri IPC needed.
 */

import React, { useState, useCallback } from 'react';
import { Braces, FileCode, Copy, Check, Wand2, Trash2 } from 'lucide-react';
import { CodeEditor } from '../../components/ui/CodeEditor';
import { Button } from '../../components/ui/Button';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatJson(raw: string): { result: string; error: string | null } {
  if (!raw.trim()) return { result: '', error: null };
  try {
    return { result: JSON.stringify(JSON.parse(raw), null, 2), error: null };
  } catch (e: any) {
    return { result: raw, error: e.message };
  }
}

function inferPrimitive(v: unknown): string {
  if (v === null) return 'null';
  return typeof v;
}

function inferType(v: unknown, depth = 0): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) {
    if (v.length === 0) return 'unknown[]';
    return `${inferType(v[0], depth)}[]`;
  }
  if (typeof v === 'object') {
    const pad = '  '.repeat(depth + 1);
    const lines = Object.entries(v as Record<string, unknown>).map(([k, val]) => {
      const key = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : `"${k}"`;
      return `${pad}${key}: ${inferType(val, depth + 1)};`;
    });
    return lines.length ? `{\n${lines.join('\n')}\n${'  '.repeat(depth)}}` : '{}';
  }
  return inferPrimitive(v);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildInterfaces(
  obj: Record<string, unknown>,
  name: string,
  out: string[],
) {
  const lines = Object.entries(obj).map(([k, v]) => {
    const key = /^[a-zA-Z_$][\w$]*$/.test(k) ? k : `"${k}"`;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const child = name + capitalize(k);
      buildInterfaces(v as Record<string, unknown>, child, out);
      return `  ${key}: ${child};`;
    }
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
      const child = name + capitalize(k) + 'Item';
      buildInterfaces(v[0] as Record<string, unknown>, child, out);
      return `  ${key}: ${child}[];`;
    }
    return `  ${key}: ${inferType(v)};`;
  });
  out.push(`interface ${name} {\n${lines.join('\n')}\n}`);
}

function generateTs(raw: string): { result: string; error: string | null } {
  if (!raw.trim()) return { result: '', error: null };
  try {
    const parsed = JSON.parse(raw);
    const out: string[] = [];
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
        buildInterfaces(parsed[0] as Record<string, unknown>, 'RootItem', out);
        out.push('type Root = RootItem[];');
      } else {
        out.push(`type Root = ${inferType(parsed)};`);
      }
    } else if (typeof parsed === 'object' && parsed !== null) {
      buildInterfaces(parsed as Record<string, unknown>, 'Root', out);
    } else {
      out.push(`type Root = ${inferPrimitive(parsed)};`);
    }
    return { result: out.reverse().join('\n\n'), error: null };
  } catch (e: any) {
    return { result: '', error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Clipboard hook
// ---------------------------------------------------------------------------

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);
  return { copied, copy };
}

// ---------------------------------------------------------------------------
// Formatter tab
// ---------------------------------------------------------------------------

function FormatterTab() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useCopy();

  const handleFormat = () => {
    const { result, error } = formatJson(input);
    setOutput(result);
    setError(error);
  };

  const handleMinify = () => {
    if (!input.trim()) return;
    try {
      setOutput(JSON.stringify(JSON.parse(input)));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" icon={<Wand2 size={12} />} onClick={handleFormat}>
          Format
        </Button>
        <Button size="sm" variant="secondary" onClick={handleMinify}>
          Minify
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<Trash2 size={12} />}
          onClick={() => { setInput(''); setOutput(''); setError(null); }}
        />
        {error && (
          <span className="text-xs text-gh-danger font-mono truncate">{error}</span>
        )}
        {!error && output && (
          <span className="text-xs text-gh-success">Valid JSON</span>
        )}
      </div>

      {/* Editors */}
      <div className="flex flex-1 gap-3 min-h-0">
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <div className="text-xs text-gh-fg-muted mb-1 font-medium">Input</div>
          <div className={[
            'flex-1 min-h-0 rounded-md border overflow-hidden',
            error ? 'border-gh-danger' : 'border-gh-border',
          ].join(' ')}>
            <CodeEditor
              value={input}
              onChange={setInput}
              language="json"
              height="100%"
              placeholder="Paste JSON here…"
            />
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gh-fg-muted font-medium">Output</span>
            {output && (
              <Button
                size="xs"
                variant="ghost"
                icon={copied ? <Check size={10} /> : <Copy size={10} />}
                onClick={() => copy(output)}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 rounded-md border border-gh-border overflow-hidden">
            <CodeEditor
              value={output}
              language="json"
              readOnly
              height="100%"
              placeholder="Formatted output will appear here…"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TS Generator tab
// ---------------------------------------------------------------------------

function TsGeneratorTab() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useCopy();

  const handleGenerate = () => {
    const { result, error } = generateTs(input);
    setOutput(result);
    setError(error);
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" icon={<FileCode size={12} />} onClick={handleGenerate}>
          Generate Types
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<Trash2 size={12} />}
          onClick={() => { setInput(''); setOutput(''); setError(null); }}
        />
        {error && (
          <span className="text-xs text-gh-danger font-mono truncate">{error}</span>
        )}
      </div>

      <div className="flex flex-1 gap-3 min-h-0">
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <div className="text-xs text-gh-fg-muted mb-1 font-medium">JSON Input</div>
          <div className={[
            'flex-1 min-h-0 rounded-md border overflow-hidden',
            error ? 'border-gh-danger' : 'border-gh-border',
          ].join(' ')}>
            <CodeEditor
              value={input}
              onChange={setInput}
              language="json"
              height="100%"
              placeholder="Paste JSON here…"
            />
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gh-fg-muted font-medium">TypeScript Interfaces</span>
            {output && (
              <Button
                size="xs"
                variant="ghost"
                icon={copied ? <Check size={10} /> : <Copy size={10} />}
                onClick={() => copy(output)}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 rounded-md border border-gh-border overflow-hidden">
            <CodeEditor
              value={output}
              language="typescript"
              readOnly
              height="100%"
              placeholder="TypeScript interfaces will appear here…"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// JsonTools root
// ---------------------------------------------------------------------------

type Tab = 'formatter' | 'ts-generator';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'formatter', label: 'Formatter / Validator', icon: <Braces size={13} /> },
  { id: 'ts-generator', label: 'TS Type Generator', icon: <FileCode size={13} /> },
];

export function JsonTools() {
  const [tab, setTab] = useState<Tab>('formatter');

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-0 border-b border-gh-border bg-gh-canvas shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex items-center gap-1.5 px-4 h-9 text-xs font-medium',
              'border-b-2 transition-colors',
              tab === t.id
                ? 'border-gh-accent text-gh-fg bg-gh-overlay'
                : 'border-transparent text-gh-fg-muted hover:text-gh-fg hover:bg-gh-subtle',
            ].join(' ')}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {tab === 'formatter' ? <FormatterTab /> : <TsGeneratorTab />}
      </div>
    </div>
  );
}
