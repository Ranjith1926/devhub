/**
 * RequestBuilder.tsx
 * Left panel of the API Tester: method selector, URL bar, and tabbed
 * editors for Query Params, Headers, and Body.
 */

import React from 'react';
import { Plus, Trash2, Send, ShieldCheck, FlaskConical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CodeEditor } from '../../components/ui/CodeEditor';
import { useApiStore, AuthType } from '../../store/apiStore';
import { useEnvStore } from '../../store/envStore';
import { interpolate, extractVariableNames } from '../../lib/interpolate';
import { BodyType, HttpMethod, KeyValuePair, Assertion, AssertionTarget, AssertionOperator } from '../../types';

// ---------------------------------------------------------------------------
// Tests (assertions) editor
// ---------------------------------------------------------------------------

const TARGET_OPTIONS: { value: AssertionTarget; label: string }[] = [
  { value: 'status',        label: 'Status Code' },
  { value: 'response_time', label: 'Response Time (ms)' },
  { value: 'body',          label: 'Body (text)' },
  { value: 'body_json',     label: 'Body JSON path' },
  { value: 'header',        label: 'Header' },
  { value: 'status_text',   label: 'Status Text' },
];

const OPERATOR_OPTIONS: { value: AssertionOperator; label: string; numeric?: boolean }[] = [
  { value: 'eq',           label: '== equals' },
  { value: 'ne',           label: '!= not equals' },
  { value: 'gt',           label: '> greater than',    numeric: true },
  { value: 'gte',          label: '>= greater or equal', numeric: true },
  { value: 'lt',           label: '< less than',       numeric: true },
  { value: 'lte',          label: '<= less or equal',  numeric: true },
  { value: 'contains',     label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'matches',      label: 'matches regex' },
  { value: 'exists',       label: 'exists' },
  { value: 'not_exists',   label: 'does not exist' },
];

const NO_EXPECTED: AssertionOperator[] = ['exists', 'not_exists'];

function TestsEditor() {
  const { assertions, setAssertions } = useApiStore();

  const add = () =>
    setAssertions([
      ...assertions,
      { id: uuidv4(), enabled: true, target: 'status', targetArg: '', operator: 'eq', expected: '200' },
    ]);

  const update = (id: string, patch: Partial<Assertion>) =>
    setAssertions(assertions.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const remove = (id: string) => setAssertions(assertions.filter((a) => a.id !== id));

  const selectCls = 'h-7 px-1.5 rounded border border-gh-border bg-gh-overlay text-xs text-gh-fg focus:outline-none focus:border-gh-accent';

  return (
    <div className="flex flex-col h-full gap-2">
      {assertions.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center py-6">
          <FlaskConical size={24} className="text-gh-fg-subtle opacity-40" />
          <p className="text-xs text-gh-fg-subtle">
            No tests yet. Add an assertion to validate the response.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
          {assertions.map((a) => (
            <div key={a.id} className="flex items-center gap-1.5 group">
              {/* Enable */}
              <input
                type="checkbox"
                checked={a.enabled}
                onChange={(e) => update(a.id, { enabled: e.target.checked })}
                className="w-3.5 h-3.5 accent-gh-accent shrink-0"
              />

              {/* Target */}
              <select
                value={a.target}
                onChange={(e) => update(a.id, { target: e.target.value as AssertionTarget, targetArg: '' })}
                className={selectCls}
              >
                {TARGET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* targetArg — header name or JSON path */}
              {(a.target === 'header' || a.target === 'body_json') && (
                <input
                  value={a.targetArg}
                  onChange={(e) => update(a.id, { targetArg: e.target.value })}
                  placeholder={a.target === 'header' ? 'content-type' : 'data.id'}
                  className="w-24 h-7 px-1.5 rounded border border-gh-border bg-gh-overlay text-xs font-mono text-gh-fg placeholder:text-gh-fg-subtle focus:outline-none focus:border-gh-accent"
                />
              )}

              {/* Operator */}
              <select
                value={a.operator}
                onChange={(e) => update(a.id, { operator: e.target.value as AssertionOperator })}
                className={selectCls}
              >
                {OPERATOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Expected value */}
              {!NO_EXPECTED.includes(a.operator) && (
                <input
                  value={a.expected}
                  onChange={(e) => update(a.id, { expected: e.target.value })}
                  placeholder="expected"
                  className="flex-1 h-7 px-1.5 rounded border border-gh-border bg-gh-overlay text-xs font-mono text-gh-fg placeholder:text-gh-fg-subtle focus:outline-none focus:border-gh-accent min-w-0"
                />
              )}

              {/* Delete */}
              <button
                onClick={() => remove(a.id)}
                className="text-gh-fg-subtle hover:text-gh-danger opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="shrink-0">
        <Button variant="ghost" size="xs" icon={<Plus size={11} />} onClick={add}>
          Add assertion
        </Button>
      </div>
    </div>
  );
}

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

function MethodSelect({ tabId }: { tabId: string }) {
  const { getRequest, setMethod } = useApiStore();
  const request = getRequest(tabId);
  return (
    <div className="relative shrink-0">
      <select
        value={request.method}
        onChange={(e) => setMethod(tabId, e.target.value as HttpMethod)}
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

function AuthEditor({ tabId }: { tabId: string }) {
  const { getRequest, setAuth } = useApiStore();
  const request = getRequest(tabId);
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
              onClick={() => setAuth(tabId, { type: at.value })}
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
            onChange={(e) => setAuth(tabId, { token: e.target.value })}
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
            onChange={(e) => setAuth(tabId, { username: e.target.value })}
            placeholder="username"
          />
          <Input
            label="Password"
            type="password"
            value={auth.password}
            onChange={(e) => setAuth(tabId, { password: e.target.value })}
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
                onChange={(e) => setAuth(tabId, { apiKeyName: e.target.value })}
                placeholder="X-API-Key"
              />
            </div>
            <div className="flex-1">
              <Input
                label="Value"
                value={auth.apiKeyValue}
                onChange={(e) => setAuth(tabId, { apiKeyValue: e.target.value })}
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
                  onClick={() => setAuth(tabId, { apiKeyIn: loc })}
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

function BodyEditor({ tabId }: { tabId: string }) {
  const { getRequest, setBody, setBodyType } = useApiStore();
  const request = getRequest(tabId);

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
    setBody(tabId, JSON.stringify(rows));
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Body type selector */}
      <div className="flex gap-0.5 border border-gh-border rounded-md overflow-hidden shrink-0 self-start">
        {BODY_TYPES.map((bt) => (
          <button
            key={bt.value}
            onClick={() => {
              setBodyType(tabId, bt.value);
              if (bt.value === 'form') {
                setBody(tabId, JSON.stringify([{ id: uuidv4(), key: '', value: '', enabled: true }]));
              } else if (bt.value !== request.bodyType) {
                setBody(tabId, '');
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
            onChange={(value) => setBody(tabId, value)}
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

const REQUEST_TABS = ['Params', 'Headers', 'Body', 'Auth', 'Tests'] as const;
type RequestTab = (typeof REQUEST_TABS)[number];

interface RequestBuilderProps {
  tabId: string;
  onSend: () => void;
}

export function RequestBuilder({ tabId, onSend }: RequestBuilderProps) {
  const {
    getRequest,
    setUrl,
    setHeaders,
    setParams,
    assertions,
    activeRequestTab,
    setActiveRequestTab,
    isLoading,
  } = useApiStore();
  const request = getRequest(tabId);
  const loading = isLoading(tabId);
  const { activeEnv } = useEnvStore();
  const env = activeEnv();

  const activeParams = request.params.filter((p) => p.enabled && p.key).length;
  const activeHeaders = request.headers.filter((h) => h.enabled && h.key).length;
  const authActive = request.auth.type !== 'none';
  const activeAssertions = assertions.filter((a) => a.enabled).length;

  // Compute resolved URL for preview
  const urlVars = extractVariableNames(request.url);
  const hasVars = urlVars.length > 0;
  const { result: resolvedUrl, unresolved } = interpolate(request.url, env);
  const showResolvedUrl = hasVars && resolvedUrl !== request.url;
  const hasUnresolved = unresolved.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* URL bar */}
      <div className="flex items-center gap-0 p-3 pb-2 shrink-0">
        <MethodSelect tabId={tabId} />
        <input
          value={request.url}
          onChange={(e) => setUrl(tabId, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
          placeholder="https://api.example.com/endpoint  or  {{baseUrl}}/endpoint"
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

      {/* Resolved URL preview */}
      {showResolvedUrl && (
        <div className={[
          'mx-3 mb-1.5 px-2.5 py-1 rounded text-[11px] font-mono truncate',
          hasUnresolved
            ? 'bg-amber-400/10 border border-amber-400/30 text-amber-400'
            : 'bg-gh-success/10 border border-gh-success/30 text-gh-success',
        ].join(' ')}>
          <span className="text-gh-fg-subtle mr-1.5">→</span>
          {resolvedUrl}
          {hasUnresolved && (
            <span className="ml-2 font-sans text-amber-400/80">
              (unresolved: {unresolved.join(', ')})
            </span>
          )}
        </div>
      )}

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
              onClick={() => setActiveRequestTab(tab.toLowerCase() as 'params' | 'headers' | 'body' | 'auth' | 'tests')}
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
              ) : tab === 'Tests' ? (
                <span className="flex items-center gap-1">
                  <FlaskConical size={11} className={activeAssertions > 0 ? 'text-gh-accent' : ''} />
                  Tests
                  {activeAssertions > 0 && (
                    <span className="ml-0.5 px-1 py-0.5 rounded-full bg-gh-accent/15 text-gh-accent text-[10px] leading-none">
                      {activeAssertions}
                    </span>
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
            onChange={(rows) => setParams(tabId, rows)}
            keyPlaceholder="param"
            valuePlaceholder="value"
          />
        )}
        {activeRequestTab === 'headers' && (
          <KVTable
            rows={request.headers}
            onChange={(rows) => setHeaders(tabId, rows)}
            keyPlaceholder="Header-Name"
            valuePlaceholder="value"
          />
        )}
        {activeRequestTab === 'body' && <BodyEditor tabId={tabId} />}
        {activeRequestTab === 'auth' && <AuthEditor tabId={tabId} />}
        {activeRequestTab === 'tests' && <TestsEditor />}
      </div>
    </div>
  );
}
