/**
 * RequestBuilder.tsx
 * Left panel of the API Tester: method selector, URL bar, and tabbed
 * editors for Query Params, Headers, and Body.
 */

import React from 'react';
import { Plus, Trash2, Send, ShieldCheck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CodeEditor } from '../../components/ui/CodeEditor';
import { useApiStore, AuthType } from '../../store/apiStore';
import { BodyType, HttpMethod, KeyValuePair } from '../../types';

// ---------------------------------------------------------------------------
// HTTP method selector
// ---------------------------------------------------------------------------

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:     'text-green-600 dark:text-green-400',
  POST:    'text-blue-600 dark:text-blue-400',
  PUT:     'text-amber-600 dark:text-amber-400',
  PATCH:   'text-amber-600 dark:text-amber-400',
  DELETE:  'text-red-600 dark:text-red-400',
  HEAD:    'text-purple-600 dark:text-purple-400',
  OPTIONS: 'text-pink-600 dark:text-pink-400',
};

function MethodSelect() {
  const { request, setMethod } = useApiStore();
  return (
    <div className="relative shrink-0">
      <select
        value={request.method}
        onChange={(e) => setMethod(e.target.value as HttpMethod)}
        className={[
          'h-9 pl-2 pr-6 rounded-l-md border border-r-0 border-gh-border',
          'bg-gh-subtle text-xs font-semibold appearance-none cursor-pointer',
          'focus:outline-none focus:border-gh-accent',
          METHOD_COLORS[request.method],
        ].join(' ')}
      >
        {METHODS.map((m) => (
          <option key={m} value={m} className="bg-gh-overlay text-gh-fg">
            {m}
          </option>
        ))}
      </select>
      {/* Dropdown arrow */}
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gh-fg-subtle text-xs">
        ▾
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Key-value table (headers / params)
// ---------------------------------------------------------------------------

interface KVTableProps {
  rows: KeyValuePair[];
  onChange: (rows: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

function KVTable({ rows, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }: KVTableProps) {
  const addRow = () =>
    onChange([...rows, { id: uuidv4(), key: '', value: '', enabled: true }]);

  const updateRow = (id: string, patch: Partial<KeyValuePair>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) =>
    onChange(rows.filter((r) => r.id !== id));

  return (
    <div className="flex flex-col gap-1">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-1">
          {/* Enable toggle */}
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => updateRow(row.id, { enabled: e.target.checked })}
            className="w-3.5 h-3.5 accent-gh-accent cursor-pointer"
            title="Enable this header"
          />
          <input
            value={row.key}
            onChange={(e) => updateRow(row.id, { key: e.target.value })}
            placeholder={keyPlaceholder}
            className="flex-1 h-7 px-2 rounded-md border border-gh-border bg-gh-overlay text-xs text-gh-fg placeholder:text-gh-fg-subtle focus:outline-none focus:border-gh-accent"
          />
          <input
            value={row.value}
            onChange={(e) => updateRow(row.id, { value: e.target.value })}
            placeholder={valuePlaceholder}
            className="flex-1 h-7 px-2 rounded-md border border-gh-border bg-gh-overlay text-xs text-gh-fg placeholder:text-gh-fg-subtle focus:outline-none focus:border-gh-accent"
          />
          <button
            onClick={() => removeRow(row.id)}
            className="text-gh-fg-subtle hover:text-gh-danger transition-colors shrink-0"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      <Button
        variant="ghost"
        size="xs"
        icon={<Plus size={11} />}
        onClick={addRow}
        className="self-start mt-1"
      >
        Add row
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auth editor
// ---------------------------------------------------------------------------

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'none',    label: 'No Auth' },
  { value: 'bearer',  label: 'Bearer Token' },
  { value: 'basic',   label: 'Basic Auth' },
  { value: 'api-key', label: 'API Key' },
];

function AuthEditor() {
  const { request, setAuth } = useApiStore();
  const { auth } = request;

  return (
    <div className="flex flex-col gap-4">
      {/* Type selector */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gh-fg-muted">Auth Type</label>
        <div className="flex gap-0.5 border border-gh-border rounded-md overflow-hidden self-start">
          {AUTH_TYPES.map((at) => (
            <button
              key={at.value}
              onClick={() => setAuth({ type: at.value })}
              className={[
                'px-3 py-1.5 text-xs transition-colors whitespace-nowrap',
                auth.type === at.value
                  ? 'bg-gh-accent text-white'
                  : 'text-gh-fg-muted hover:text-gh-fg hover:bg-gh-subtle',
              ].join(' ')}
            >
              {at.label}
            </button>
          ))}
        </div>
      </div>

      {/* None */}
      {auth.type === 'none' && (
        <p className="text-xs text-gh-fg-subtle">
          No authentication will be sent with this request.
        </p>
      )}

      {/* Bearer */}
      {auth.type === 'bearer' && (
        <div className="flex flex-col gap-3">
          <Input
            label="Token"
            value={auth.token}
            onChange={(e) => setAuth({ token: e.target.value })}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
            rightElement={
              <span className="text-[10px] text-gh-fg-subtle font-mono pr-1">Bearer</span>
            }
          />
          <p className="text-[11px] text-gh-fg-subtle">
            Adds <code className="bg-gh-subtle px-1 rounded">Authorization: Bearer &lt;token&gt;</code> header.
          </p>
        </div>
      )}

      {/* Basic */}
      {auth.type === 'basic' && (
        <div className="flex flex-col gap-3">
          <Input
            label="Username"
            value={auth.username}
            onChange={(e) => setAuth({ username: e.target.value })}
            placeholder="username"
          />
          <Input
            label="Password"
            type="password"
            value={auth.password}
            onChange={(e) => setAuth({ password: e.target.value })}
            placeholder="••••••••"
          />
          <p className="text-[11px] text-gh-fg-subtle">
            Adds <code className="bg-gh-subtle px-1 rounded">Authorization: Basic &lt;base64&gt;</code> header.
          </p>
        </div>
      )}

      {/* API Key */}
      {auth.type === 'api-key' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label="Key name"
                value={auth.apiKeyName}
                onChange={(e) => setAuth({ apiKeyName: e.target.value })}
                placeholder="X-API-Key"
              />
            </div>
            <div className="flex-1">
              <Input
                label="Value"
                value={auth.apiKeyValue}
                onChange={(e) => setAuth({ apiKeyValue: e.target.value })}
                placeholder="your-key-here"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gh-fg-muted">Add to</label>
            <div className="flex gap-0.5 border border-gh-border rounded-md overflow-hidden self-start">
              {(['header', 'query'] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setAuth({ apiKeyIn: loc })}
                  className={[
                    'px-3 py-1.5 text-xs transition-colors capitalize',
                    auth.apiKeyIn === loc
                      ? 'bg-gh-accent text-white'
                      : 'text-gh-fg-muted hover:text-gh-fg hover:bg-gh-subtle',
                  ].join(' ')}
                >
                  {loc === 'header' ? 'Header' : 'Query Param'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Body editor tabs
// ---------------------------------------------------------------------------

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
  { value: 'form', label: 'Form Data' },
];

function BodyEditor() {
  const { request, setBody, setBodyType } = useApiStore();

  // Parse / serialise form fields stored as JSON in request.body
  const formFields: KeyValuePair[] = React.useMemo(() => {
    if (request.bodyType !== 'form') return [];
    try {
      const parsed = JSON.parse(request.body || '[]');
      if (Array.isArray(parsed)) return parsed;
    } catch { /* ignore */ }
    return [{ id: uuidv4(), key: '', value: '', enabled: true }];
  }, [request.body, request.bodyType]);

  const handleFormChange = (rows: KeyValuePair[]) => {
    setBody(JSON.stringify(rows));
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Body type selector */}
      <div className="flex gap-0.5 border border-gh-border rounded-md overflow-hidden shrink-0 self-start">
        {BODY_TYPES.map((bt) => (
          <button
            key={bt.value}
            onClick={() => {
              setBodyType(bt.value);
              if (bt.value === 'form') {
                setBody(JSON.stringify([{ id: uuidv4(), key: '', value: '', enabled: true }]));
              } else if (bt.value !== request.bodyType) {
                setBody('');
              }
            }}
            className={[
              'px-2.5 py-1 text-xs transition-colors',
              request.bodyType === bt.value
                ? 'bg-gh-accent text-white'
                : 'text-gh-fg-muted hover:text-gh-fg hover:bg-gh-subtle',
            ].join(' ')}
          >
            {bt.label}
          </button>
        ))}
      </div>

      {/* Form Data — KV table */}
      {request.bodyType === 'form' && (
        <div className="flex-1 overflow-y-auto">
          <KVTable
            rows={formFields}
            onChange={handleFormChange}
            keyPlaceholder="Field name"
            valuePlaceholder="Value"
          />
        </div>
      )}

      {/* Code editor for JSON / text */}
      {(request.bodyType === 'json' || request.bodyType === 'text') && (
        <div className="flex-1 min-h-0">
          <CodeEditor
            value={request.body}
            onChange={setBody}
            language={request.bodyType === 'json' ? 'json' : 'text'}
            height="100%"
            placeholder={
              request.bodyType === 'json'
                ? '{\n  "key": "value"\n}'
                : 'Enter request body...'
            }
          />
        </div>
      )}

      {/* None */}
      {request.bodyType === 'none' && (
        <div className="flex items-center justify-center flex-1 text-xs text-gh-fg-subtle">
          No body for this request
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const REQUEST_TABS = ['Params', 'Headers', 'Body', 'Auth'] as const;
type RequestTab = (typeof REQUEST_TABS)[number];

interface RequestBuilderProps {
  onSend: () => void;
}

export function RequestBuilder({ onSend }: RequestBuilderProps) {
  const {
    request,
    setUrl,
    setHeaders,
    setParams,
    activeRequestTab,
    setActiveRequestTab,
    loading,
  } = useApiStore();

  const activeParams = request.params.filter((p) => p.enabled && p.key).length;
  const activeHeaders = request.headers.filter((h) => h.enabled && h.key).length;
  const authActive = request.auth.type !== 'none';

  return (
    <div className="flex flex-col h-full">
      {/* URL bar */}
      <div className="flex items-center gap-0 p-3 pb-2 shrink-0">
        <MethodSelect />
        <input
          value={request.url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
          placeholder="https://api.example.com/endpoint"
          className="flex-1 h-9 px-3 border border-gh-border bg-gh-overlay text-sm text-gh-fg placeholder:text-gh-fg-subtle focus:outline-none focus:border-gh-accent font-mono"
          spellCheck={false}
        />
        <Button
          variant="primary"
          size="md"
          loading={loading}
          icon={<Send size={13} />}
          onClick={onSend}
          className="rounded-l-none rounded-r-md h-9"
          title="Send (Ctrl+Enter)"
        >
          Send
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gh-border shrink-0 px-3">
        {REQUEST_TABS.map((tab) => {
          const count =
            tab === 'Params' ? activeParams :
            tab === 'Headers' ? activeHeaders : 0;
          const authBadge = tab === 'Auth' && authActive;
          const active = activeRequestTab === tab.toLowerCase();
          return (
            <button
              key={tab}
              onClick={() => setActiveRequestTab(tab.toLowerCase() as 'params' | 'headers' | 'body' | 'auth')}
              className={[
                'px-3 py-1.5 text-xs border-b-2 transition-colors',
                active
                  ? 'border-gh-accent text-gh-fg'
                  : 'border-transparent text-gh-fg-muted hover:text-gh-fg',
              ].join(' ')}
            >
              {tab === 'Auth' ? (
                <span className="flex items-center gap-1">
                  <ShieldCheck size={11} className={authActive ? 'text-gh-success' : ''} />
                  Auth
                  {authActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gh-success inline-block" />
                  )}
                </span>
              ) : tab}
              {count > 0 && (
                <span className="ml-1 px-1 py-0.5 rounded-full bg-gh-accent/15 text-gh-accent text-[10px] leading-none">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-3 min-h-0">
        {activeRequestTab === 'params' && (
          <KVTable
            rows={request.params}
            onChange={setParams}
            keyPlaceholder="param"
            valuePlaceholder="value"
          />
        )}
        {activeRequestTab === 'headers' && (
          <KVTable
            rows={request.headers}
            onChange={setHeaders}
            keyPlaceholder="Header-Name"
            valuePlaceholder="value"
          />
        )}
        {activeRequestTab === 'body' && <BodyEditor />}
        {activeRequestTab === 'auth' && <AuthEditor />}
      </div>
    </div>
  );
}
