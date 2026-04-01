/**
 * ApiTester.tsx
 * Main container for the API Tester feature.
 * Lays out Collections panel | RequestBuilder | ResponseViewer side by side.
 * Handles the actual HTTP call via Tauri IPC.
 */

import React, { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { FolderOpen, History, Trash2, RotateCcw } from 'lucide-react';
import { RequestBuilder } from './RequestBuilder';
import { ResponseViewer } from './ResponseViewer';
import { Collections } from './Collections';
import { Button } from '../../components/ui/Button';
import { MethodBadge } from '../../components/ui/Badge';
import { useApiStore } from '../../store/apiStore';
import { useToast } from '../../hooks/useToast';
import { ApiResponse, HistoryEntry } from '../../types';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// History side-panel
// ---------------------------------------------------------------------------

function HistoryPanel() {
  const { history, clearHistory, loadRequest: _load, request } = useApiStore();
  const toast = useToast();
  const { setUrl, setMethod } = useApiStore();

  const handleClear = async () => {
    try {
      await invoke('clear_history');
      clearHistory();
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <div className="flex flex-col h-full w-56 bg-gh-overlay border-l border-gh-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gh-border shrink-0">
        <span className="text-xs font-semibold text-gh-fg-muted uppercase tracking-wider">
          History
        </span>
        <Button
          variant="ghost"
          size="xs"
          icon={<Trash2 size={10} />}
          onClick={handleClear}
          title="Clear history"
          disabled={history.length === 0}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-center text-xs text-gh-fg-subtle py-6">No history yet</p>
        ) : (
          history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-gh-subtle cursor-pointer border-b border-gh-border/30"
              onClick={() => {
                setMethod(entry.method as any);
                setUrl(entry.url);
              }}
              title={`${entry.method} ${entry.url}`}
            >
              <MethodBadge method={entry.method} />
              <span className="text-[11px] text-gh-fg truncate flex-1">{entry.url}</span>
              <span
                className={[
                  'text-[10px] font-mono shrink-0',
                  entry.status >= 400 ? 'text-gh-danger' : 'text-gh-success',
                ].join(' ')}
              >
                {entry.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ApiTester() {
  const {
    request,
    setResponse,
    setLoading,
    loading,
    collectionsOpen,
    toggleCollections,
    prependHistory,
    history,
    setHistory,
    resetRequest,
  } = useApiStore();
  const toast = useToast();
  const [historyOpen, setHistoryOpen] = React.useState(false);

  // Load history from DB on mount (always refresh to reflect imports)
  React.useEffect(() => {
    invoke<any[]>('get_request_history')
      .then((h) => setHistory(h))
      .catch(() => {});
  }, []);

  const sendRequest = useCallback(async () => {
    if (!request.url.trim()) {
      toast.warning('Please enter a URL');
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      // Only pass enabled, non-empty key-value pairs
      const headers = request.headers
        .filter((h) => h.enabled && h.key.trim())
        .map((h) => [h.key, h.value] as [string, string]);

      const params = request.params
        .filter((p) => p.enabled && p.key.trim())
        .map((p) => [p.key, p.value] as [string, string]);

      // Inject auth
      const { auth } = request;
      if (auth.type === 'bearer' && auth.token.trim()) {
        headers.push(['Authorization', `Bearer ${auth.token.trim()}`]);
      } else if (auth.type === 'basic' && (auth.username || auth.password)) {
        const encoded = btoa(`${auth.username}:${auth.password}`);
        headers.push(['Authorization', `Basic ${encoded}`]);
      } else if (auth.type === 'api-key' && auth.apiKeyName.trim() && auth.apiKeyValue.trim()) {
        if (auth.apiKeyIn === 'header') {
          headers.push([auth.apiKeyName.trim(), auth.apiKeyValue.trim()]);
        } else {
          params.push([auth.apiKeyName.trim(), auth.apiKeyValue.trim()]);
        }
      }

      const resp = await invoke<ApiResponse>('make_http_request', {
        config: {
          method: request.method,
          url: request.url,
          headers,
          params,
          body: (request.bodyType !== 'none' && request.bodyType !== 'form') ? request.body : null,
          body_type: request.bodyType,
          // form fields sent as [[key, value], ...] for multipart encoding in Rust
          form_fields: request.bodyType === 'form'
            ? (() => {
                try {
                  const fields: { id: string; key: string; value: string; enabled: boolean }[] =
                    JSON.parse(request.body || '[]');
                  return fields
                    .filter((f) => f.enabled && f.key.trim())
                    .map((f) => [f.key, f.value] as [string, string]);
                } catch { return []; }
              })()
            : [],
        },
      });

      setResponse(resp);

      // Persist to history
      const entry: HistoryEntry = {
        id: uuidv4(),
        method: request.method,
        url: request.url,
        status: resp.status,
        response_time: resp.time,
        created_at: new Date().toISOString(),
      };
      prependHistory(entry);

      await invoke('save_history_entry', {
        method: entry.method,
        url: entry.url,
        status: entry.status,
        responseTime: entry.response_time,
      }).catch(() => {}); // best-effort
    } catch (e) {
      toast.error(`Request failed: ${e}`);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, [request, setResponse, setLoading, prependHistory, toast]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Collections panel */}
      {collectionsOpen && <Collections />}

      {/* Center: request + response in a resizable split */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gh-border bg-gh-canvas shrink-0">
          <Button
            variant={collectionsOpen ? 'primary' : 'ghost'}
            size="xs"
            icon={<FolderOpen size={13} />}
            onClick={toggleCollections}
            title="Toggle collections"
          >
            Collections
          </Button>
          <Button
            variant={historyOpen ? 'primary' : 'ghost'}
            size="xs"
            icon={<History size={13} />}
            onClick={() => setHistoryOpen((v) => !v)}
            title="Toggle history"
          >
            History
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="xs"
            icon={<RotateCcw size={13} />}
            onClick={() => { resetRequest(); setResponse(null); }}
            title="Reset request"
          >
            Reset
          </Button>
        </div>

        {/* Split: builder left | viewer right */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Request Builder */}
          <div className="w-1/2 border-r border-gh-border overflow-hidden flex flex-col">
            <RequestBuilder onSend={sendRequest} />
          </div>

          {/* Response Viewer */}
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <ResponseViewer />
          </div>
        </div>
      </div>

      {/* History panel */}
      {historyOpen && <HistoryPanel />}
    </div>
  );
}
