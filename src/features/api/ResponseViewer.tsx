/**
 * ResponseViewer.tsx
 * Right panel: shows HTTP response status, timing, headers, and body.
 */

import React, { useState } from 'react';
import { Copy, Download, Clock, HardDrive, CheckCircle2, XCircle, FlaskConical } from 'lucide-react';
import { CodeEditor, detectLanguage } from '../../components/ui/CodeEditor';
import { Button } from '../../components/ui/Button';
import { useApiStore } from '../../store/apiStore';
import { useToast } from '../../hooks/useToast';
import { writeText } from '@tauri-apps/api/clipboard';
import { save as saveDialog } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function statusColor(code: number): string {
  if (code >= 500) return 'text-gh-danger';
  if (code >= 400) return 'text-gh-attention';
  if (code >= 300) return 'text-cyan-400';
  if (code >= 200) return 'text-gh-success';
  return 'text-gh-fg-muted';
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ResponseTab = 'body' | 'headers' | 'tests';

export function ResponseViewer() {
  const { response, loading, assertionResults, assertions } = useApiStore();
  const toast = useToast();
  const [tab, setTab] = useState<ResponseTab>('body');
  const [pretty, setPretty] = useState(true);

  const handleCopy = async () => {
    if (!response) return;
    try {
      await writeText(pretty ? prettyJson(response.body) : response.body);
      toast.success('Copied to clipboard');
    } catch {
      // Fallback to navigator.clipboard
      navigator.clipboard.writeText(response.body).then(() => toast.success('Copied'));
    }
  };

  const handleDownload = async () => {
    if (!response) return;
    try {
      const path = await saveDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }, { name: 'Text', extensions: ['txt'] }],
        defaultPath: 'response.json',
      });
      if (path) {
        await writeTextFile(path, pretty ? prettyJson(response.body) : response.body);
        toast.success('File saved');
      }
    } catch (e) {
      toast.error(String(e));
    }
  };

  // Determine syntax language from Content-Type header
  const passCount = assertionResults.filter((r) => r.passed).length;
  const failCount = assertionResults.filter((r) => !r.passed).length;
  const enabledAssertions = assertions.filter((a) => a.enabled);
  const hasResults = assertionResults.length > 0;

  // Determine syntax language from Content-Type header
  const contentType = response?.headers?.['content-type'] ?? '';
  const lang = detectLanguage(contentType);
  const displayBody = pretty && lang === 'json' ? prettyJson(response?.body ?? '') : (response?.body ?? '');

  // ---------------------------------------------------------------------------
  // Empty / loading states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gh-fg-subtle">
        <div className="w-8 h-8 border-2 border-gh-border border-t-gh-accent rounded-full animate-spin" />
        <span className="text-sm">Sending request…</span>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-gh-fg-subtle select-none">
        <div className="w-16 h-16 rounded-2xl bg-gh-subtle flex items-center justify-center">
          <span className="text-2xl">📡</span>
        </div>
        <p className="text-sm font-medium text-gh-fg-muted">Enter a URL and click Send</p>
        <p className="text-xs">Response will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-gh-border bg-gh-overlay shrink-0">
        <span className={`text-sm font-semibold ${statusColor(response.status)}`}>
          {response.status}
        </span>
        <span className="text-xs text-gh-fg-muted">{response.status_text}</span>
        <span className="flex items-center gap-1 text-xs text-gh-fg-subtle ml-auto">
          <Clock size={11} />
          {response.time} ms
        </span>
        <span className="flex items-center gap-1 text-xs text-gh-fg-subtle">
          <HardDrive size={11} />
          {formatSize(response.size)}
        </span>
        <Button variant="ghost" size="xs" icon={<Copy size={11} />} onClick={handleCopy}>
          Copy
        </Button>
        <Button variant="ghost" size="xs" icon={<Download size={11} />} onClick={handleDownload}>
          Save
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gh-border shrink-0 px-3">
        {(['body', 'headers', 'tests'] as ResponseTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-3 py-1.5 text-xs capitalize border-b-2 transition-colors',
              tab === t
                ? 'border-gh-accent text-gh-fg'
                : 'border-transparent text-gh-fg-muted hover:text-gh-fg',
            ].join(' ')}
          >
            {t}
            {t === 'headers' && (
              <span className="ml-1 text-[10px] text-gh-fg-subtle">
                ({Object.keys(response.headers).length})
              </span>
            )}
            {t === 'tests' && hasResults && (
              <span
                className={[
                  'ml-1 text-[10px] font-semibold',
                  failCount > 0 ? 'text-gh-danger' : 'text-gh-success',
                ].join(' ')}
              >
                {passCount}/{enabledAssertions.length}
              </span>
            )}
          </button>
        ))}

        {/* Pretty toggle — only show for body tab */}
        {tab === 'body' && lang === 'json' && (
          <button
            onClick={() => setPretty((p) => !p)}
            className={[
              'ml-auto px-2 py-1.5 text-xs border-b-2 transition-colors',
              pretty
                ? 'border-gh-accent text-gh-accent'
                : 'border-transparent text-gh-fg-muted hover:text-gh-fg',
            ].join(' ')}
          >
            Pretty
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'body' ? (
          <CodeEditor
            value={displayBody}
            language={lang}
            readOnly
            height="100%"
            className="rounded-none border-none"
          />
        ) : tab === 'tests' ? (
          <div className="overflow-auto h-full p-3">
            {assertionResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-gh-fg-subtle">
                <FlaskConical size={24} className="opacity-30" />
                <p className="text-xs">No test results yet. Send a request to run assertions.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {assertionResults.map((result) => {
                  const assertion = assertions.find((a) => a.id === result.assertionId);
                  return (
                    <div
                      key={result.assertionId}
                      className={[
                        'flex items-start gap-2 rounded p-2 text-xs border',
                        result.passed
                          ? 'bg-gh-success/5 border-gh-success/20'
                          : 'bg-gh-danger/5 border-gh-danger/20',
                      ].join(' ')}
                    >
                      {result.passed ? (
                        <CheckCircle2 size={13} className="text-gh-success mt-0.5 shrink-0" />
                      ) : (
                        <XCircle size={13} className="text-gh-danger mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gh-fg">{result.message}</p>
                        {!result.passed && result.actual && (
                          <p className="text-gh-fg-muted mt-0.5">
                            Actual:{' '}
                            <span className="font-mono text-gh-attention">{result.actual}</span>
                          </p>
                        )}
                        {assertion && (
                          <p className="text-gh-fg-subtle mt-0.5 font-mono">
                            {assertion.target}{assertion.targetArg ? `.${assertion.targetArg}` : ''}{' '}
                            <span className="text-gh-fg-muted">{assertion.operator}</span>{' '}
                            {assertion.expected}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-auto h-full p-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gh-fg-subtle uppercase tracking-wide border-b border-gh-border">
                  <th className="text-left py-1.5 px-2 font-medium w-1/2">Header</th>
                  <th className="text-left py-1.5 px-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(response.headers).map(([k, v]) => (
                  <tr key={k} className="border-b border-gh-border/50 hover:bg-gh-subtle/50">
                    <td className="py-1 px-2 font-mono text-gh-accent">{k}</td>
                    <td className="py-1 px-2 font-mono text-gh-fg break-all">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
