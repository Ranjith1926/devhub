/**
 * EncoderTool.tsx
 * Base64 encode/decode + hash generator (MD5-like CRC32, SHA-1, SHA-256, SHA-512).
 * 100 % client-side — Web Crypto API (SHA-*) + btoa/atob (Base64).
 *
 * Tabs:
 *   Base64   — encode / decode text or file
 *   Hash     — SHA-1 / SHA-256 / SHA-512 of any text input
 *   URL      — encodeURIComponent / decodeURIComponent
 *   HTML     — HTML entity encode / decode
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Upload,
  Lock,
  Link,
  Code,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MainTab = 'base64' | 'hash' | 'url' | 'html';
type Base64Mode = 'encode' | 'decode';
type HashAlgo = 'SHA-1' | 'SHA-256' | 'SHA-512';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hashText(text: string, algo: HashAlgo): Promise<string> {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function safeBase64Encode(text: string): { result: string; error: string | null } {
  try {
    // Support Unicode via TextEncoder → Uint8Array → binary string
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return { result: btoa(binary), error: null };
  } catch (e: any) {
    return { result: '', error: e.message };
  }
}

function safeBase64Decode(b64: string): { result: string; error: string | null } {
  try {
    const binary = atob(b64.trim());
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return { result: new TextDecoder().decode(bytes), error: null };
  } catch (e: any) {
    return { result: '', error: 'Invalid Base64 string' };
  }
}

const HTML_ENCODE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const HTML_DECODE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(HTML_ENCODE_MAP).map(([k, v]) => [v, k]),
);

function htmlEncode(s: string) {
  return s.replace(/[&<>"']/g, (c) => HTML_ENCODE_MAP[c] ?? c);
}
function htmlDecode(s: string) {
  return s.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (ent) => HTML_DECODE_MAP[ent] ?? ent);
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={handle}
      disabled={!text}
      title="Copy"
      className="flex items-center gap-1 text-[11px] text-gh-fg-subtle hover:text-gh-fg disabled:opacity-40 transition-colors"
    >
      {copied ? <Check size={12} className="text-gh-success" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function IOArea({
  label,
  value,
  onChange,
  readOnly,
  placeholder,
  error,
  actions,
  mono = true,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  error?: string | null;
  actions?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-1">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[11px] font-semibold text-gh-fg-muted uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {actions}
          <CopyButton text={value} />
        </div>
      </div>
      <textarea
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        spellCheck={false}
        className={[
          'flex-1 min-h-0 w-full resize-none rounded-md border px-3 py-2 text-sm text-gh-fg placeholder:text-gh-fg-subtle focus:outline-none transition-colors',
          mono ? 'font-mono' : '',
          error
            ? 'border-gh-danger bg-gh-danger/5 focus:border-gh-danger'
            : readOnly
            ? 'border-gh-border bg-gh-canvas'
            : 'border-gh-border bg-gh-overlay focus:border-gh-accent',
        ].join(' ')}
      />
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-gh-danger shrink-0">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Base64 Tab
// ---------------------------------------------------------------------------

function Base64Tab() {
  const [mode, setMode] = useState<Base64Mode>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useCallback((text: string, m: Base64Mode) => {
    if (!text) { setOutput(''); setError(null); return; }
    if (m === 'encode') {
      const { result, error } = safeBase64Encode(text);
      setOutput(result); setError(error);
    } else {
      const { result, error } = safeBase64Decode(text);
      setOutput(result); setError(error);
    }
  }, []);

  const handleInput = (v: string) => { setInput(v); run(v, mode); };
  const handleModeChange = (m: Base64Mode) => { setMode(m); run(input, m); };
  const handleClear = () => { setInput(''); setOutput(''); setError(null); };
  const handleSwap = () => {
    const newMode: Base64Mode = mode === 'encode' ? 'decode' : 'encode';
    setInput(output);
    setMode(newMode);
    run(output, newMode);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = (ev.target?.result as string).split(',')[1] ?? '';
      if (mode === 'encode') {
        setInput(`[File: ${file.name}]`);
        setOutput(b64);
        setError(null);
      } else {
        setInput(b64);
        const { result, error } = safeBase64Decode(b64);
        setOutput(result); setError(error);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      {/* Mode + controls */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex border border-gh-border rounded-md overflow-hidden">
          {(['encode', 'decode'] as Base64Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={[
                'px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                mode === m ? 'bg-gh-accent text-white' : 'text-gh-fg-muted hover:text-gh-fg hover:bg-gh-subtle',
              ].join(' ')}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={handleSwap}
          disabled={!output}
          title="Swap output → input"
          className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-gh-border text-xs text-gh-fg-muted hover:text-gh-fg hover:bg-gh-subtle disabled:opacity-40 transition-colors"
        >
          {mode === 'encode' ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
          Swap
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-gh-border text-xs text-gh-fg-muted hover:text-gh-fg hover:bg-gh-subtle transition-colors"
          title="Encode a file to Base64"
        >
          <Upload size={12} /> File
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
        <div className="flex-1" />
        <Button variant="ghost" size="xs" icon={<RefreshCw size={11} />} onClick={handleClear}>Clear</Button>
      </div>

      {/* IO */}
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <IOArea
          label={mode === 'encode' ? 'Plain Text Input' : 'Base64 Input'}
          value={input}
          onChange={handleInput}
          placeholder={mode === 'encode' ? 'Enter text to encode…' : 'Paste Base64 string to decode…'}
        />
        <IOArea
          label={mode === 'encode' ? 'Base64 Output' : 'Decoded Output'}
          value={output}
          readOnly
          error={error}
          placeholder="Output will appear here…"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hash Tab
// ---------------------------------------------------------------------------

const HASH_ALGOS: HashAlgo[] = ['SHA-1', 'SHA-256', 'SHA-512'];

function HashTab() {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<HashAlgo, string>>({ 'SHA-1': '', 'SHA-256': '', 'SHA-512': '' });
  const [uppercase, setUppercase] = useState(false);

  const compute = useCallback(async (text: string) => {
    if (!text) { setHashes({ 'SHA-1': '', 'SHA-256': '', 'SHA-512': '' }); return; }
    const results = await Promise.all(HASH_ALGOS.map((a) => hashText(text, a)));
    setHashes(Object.fromEntries(HASH_ALGOS.map((a, i) => [a, results[i]])) as Record<HashAlgo, string>);
  }, []);

  const handleInput = (v: string) => { setInput(v); compute(v); };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Input */}
      <div className="flex flex-col gap-1 shrink-0" style={{ minHeight: 120 }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gh-fg-muted uppercase tracking-wider">Input Text</span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gh-fg-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
                className="accent-gh-accent w-3 h-3"
              />
              Uppercase
            </label>
            <Button variant="ghost" size="xs" icon={<RefreshCw size={11} />} onClick={() => handleInput('')}>Clear</Button>
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Enter text to hash…"
          spellCheck={false}
          className="h-24 resize-none rounded-md border border-gh-border bg-gh-overlay px-3 py-2 text-sm font-mono text-gh-fg placeholder:text-gh-fg-subtle focus:outline-none focus:border-gh-accent transition-colors"
        />
      </div>

      {/* Hash outputs */}
      <div className="flex flex-col gap-3 flex-1">
        {HASH_ALGOS.map((algo) => {
          const val = uppercase ? hashes[algo].toUpperCase() : hashes[algo];
          return (
            <div key={algo} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gh-fg-muted uppercase tracking-wider">{algo}</span>
                <CopyButton text={val} />
              </div>
              <div className={[
                'rounded-md border border-gh-border bg-gh-canvas px-3 py-2 text-xs font-mono break-all min-h-[34px]',
                val ? 'text-gh-fg' : 'text-gh-fg-subtle italic',
              ].join(' ')}>
                {val || 'Hash will appear here…'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// URL Tab
// ---------------------------------------------------------------------------

type UrlMode = 'encode' | 'decode';

function UrlTab() {
  const [mode, setMode] = useState<UrlMode>('encode');
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const output = (() => {
    if (!input) return '';
    try {
      setError(null);
      return mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input);
    } catch (e: any) {
      setError('Invalid URI sequence');
      return '';
    }
  })();

  const handleModeChange = (m: UrlMode) => { setMode(m); };

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex border border-gh-border rounded-md overflow-hidden">
          {(['encode', 'decode'] as UrlMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={[
                'px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                mode === m ? 'bg-gh-accent text-white' : 'text-gh-fg-muted hover:text-gh-fg hover:bg-gh-subtle',
              ].join(' ')}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="xs" icon={<RefreshCw size={11} />} onClick={() => setInput('')}>Clear</Button>
      </div>
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <IOArea
          label={mode === 'encode' ? 'Plain URL / Text' : 'Encoded URL'}
          value={input}
          onChange={setInput}
          placeholder={mode === 'encode' ? 'https://example.com/path?q=hello world' : 'https%3A%2F%2Fexample.com%2Fpath%3Fq%3Dhello%20world'}
        />
        <IOArea
          label={mode === 'encode' ? 'URL Encoded' : 'Decoded URL'}
          value={output}
          readOnly
          error={error}
          placeholder="Output will appear here…"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HTML Tab
// ---------------------------------------------------------------------------

type HtmlMode = 'encode' | 'decode';

function HtmlTab() {
  const [mode, setMode] = useState<HtmlMode>('encode');
  const [input, setInput] = useState('');

  const output = !input ? '' : mode === 'encode' ? htmlEncode(input) : htmlDecode(input);

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex border border-gh-border rounded-md overflow-hidden">
          {(['encode', 'decode'] as HtmlMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={[
                'px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                mode === m ? 'bg-gh-accent text-white' : 'text-gh-fg-muted hover:text-gh-fg hover:bg-gh-subtle',
              ].join(' ')}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="xs" icon={<RefreshCw size={11} />} onClick={() => setInput('')}>Clear</Button>
      </div>
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <IOArea
          label={mode === 'encode' ? 'HTML / Text Input' : 'Encoded HTML'}
          value={input}
          onChange={setInput}
          placeholder={mode === 'encode' ? '<div class="hello">World & "friends"</div>' : '&lt;div class=&quot;hello&quot;&gt;World &amp; &quot;friends&quot;&lt;/div&gt;'}
          mono={false}
        />
        <IOArea
          label={mode === 'encode' ? 'HTML Entities' : 'Decoded HTML'}
          value={output}
          readOnly
          placeholder="Output will appear here…"
          mono={mode === 'encode'}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root Component
// ---------------------------------------------------------------------------

const TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
  { id: 'base64', label: 'Base64',  icon: <Lock size={13} /> },
  { id: 'hash',   label: 'Hash',    icon: <Lock size={13} /> },
  { id: 'url',    label: 'URL',     icon: <Link size={13} /> },
  { id: 'html',   label: 'HTML',    icon: <Code size={13} /> },
];

export function EncoderTool() {
  const [activeTab, setActiveTab] = useState<MainTab>('base64');

  return (
    <div className="flex flex-col h-full overflow-hidden text-gh-fg">
      {/* Tab bar */}
      <div className="flex items-center border-b border-gh-border bg-gh-canvas shrink-0 px-2">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
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

      {/* Panel */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'base64' && <Base64Tab />}
        {activeTab === 'hash'   && <HashTab />}
        {activeTab === 'url'    && <UrlTab />}
        {activeTab === 'html'   && <HtmlTab />}
      </div>
    </div>
  );
}
