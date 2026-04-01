/**
 * Database.tsx
 * MySQL / MongoDB client.
 * Connects via Tauri IPC then lets the user run queries and browse results.
 */

import React, { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Database as DbIcon,
  Play,
  Plug,
  PlugZap,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { CodeEditor } from '../../components/ui/CodeEditor';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../hooks/useToast';
import { DbType, QueryResult } from '../../types';

// ---------------------------------------------------------------------------
// Connection form
// ---------------------------------------------------------------------------

interface ConnFormState {
  type: DbType;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  uri: string; // MongoDB
}

const DEFAULT_CONN: ConnFormState = {
  type: 'mysql',
  host: 'localhost',
  port: '3306',
  database: '',
  username: 'root',
  password: '',
  uri: '',
};

// ---------------------------------------------------------------------------
// Results table
// ---------------------------------------------------------------------------

function ResultsTable({ result }: { result: QueryResult }) {
  if (result.error) {
    return (
      <div className="flex items-start gap-2 p-4 text-gh-danger text-sm">
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        <pre className="font-mono text-xs whitespace-pre-wrap">{result.error}</pre>
      </div>
    );
  }

  if (result.columns.length === 0) {
    return (
      <div className="p-4 text-xs text-gh-fg-muted">
        Query executed. {result.affected_rows != null ? `${result.affected_rows} row(s) affected.` : 'No rows returned.'}
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-xs text-gh-fg border-collapse">
        <thead className="sticky top-0 bg-gh-overlay z-10">
          <tr>
            {result.columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left font-semibold text-gh-fg-muted border-b border-gh-border whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? 'bg-gh-canvas' : 'bg-gh-overlay/60'}
            >
              {result.columns.map((col) => {
                const val = row[col];
                const display =
                  val === null || val === undefined
                    ? <span className="text-gh-fg-subtle italic">NULL</span>
                    : typeof val === 'object'
                    ? <span className="font-mono">{JSON.stringify(val)}</span>
                    : String(val);
                return (
                  <td
                    key={col}
                    className="px-3 py-1.5 border-b border-gh-border/30 max-w-[300px] truncate whitespace-nowrap"
                    title={typeof val === 'string' ? val : undefined}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-1.5 text-[11px] text-gh-fg-subtle border-t border-gh-border bg-gh-overlay sticky bottom-0">
        {result.rows.length} row{result.rows.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connection panel (collapsible)
// ---------------------------------------------------------------------------

interface ConnectionPanelProps {
  conn: ConnFormState;
  onChange: (f: Partial<ConnFormState>) => void;
  onConnect: () => void;
  connecting: boolean;
  connected: boolean;
  statusMsg: string;
}

function ConnectionPanel({
  conn,
  onChange,
  onConnect,
  connecting,
  connected,
  statusMsg,
}: ConnectionPanelProps) {
  const [open, setOpen] = useState(!connected);

  return (
    <div className="border-b border-gh-border shrink-0">
      {/* Header row */}
      <button
        className="flex items-center gap-2 w-full px-4 py-2 text-xs font-semibold text-gh-fg-muted hover:bg-gh-subtle transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Connection
        {connected && (
          <span className="ml-auto flex items-center gap-1 text-gh-success font-medium">
            <PlugZap size={11} />
            {statusMsg}
          </span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <Select
            label="Database type"
            value={conn.type}
            onChange={(e) => onChange({ type: e.target.value as DbType, port: e.target.value === 'mysql' ? '3306' : '' })}
            options={[
              { value: 'mysql', label: 'MySQL' },
              { value: 'mongodb', label: 'MongoDB' },
            ]}
          />

          {conn.type === 'mysql' ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Input
                    label="Host"
                    value={conn.host}
                    onChange={(e) => onChange({ host: e.target.value })}
                    placeholder="localhost"
                  />
                </div>
                <Input
                  label="Port"
                  value={conn.port}
                  onChange={(e) => onChange({ port: e.target.value })}
                  placeholder="3306"
                />
              </div>
              <Input
                label="Database"
                value={conn.database}
                onChange={(e) => onChange({ database: e.target.value })}
                placeholder="mydb"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Username"
                  value={conn.username}
                  onChange={(e) => onChange({ username: e.target.value })}
                  placeholder="root"
                />
                <Input
                  label="Password"
                  type="password"
                  value={conn.password}
                  onChange={(e) => onChange({ password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </>
          ) : (
            <>
              <Input
                label="Connection URI"
                value={conn.uri}
                onChange={(e) => onChange({ uri: e.target.value })}
                placeholder="mongodb://user:pass@host:27017"
              />
              <Input
                label="Database"
                value={conn.database}
                onChange={(e) => onChange({ database: e.target.value })}
                placeholder="mydb"
              />
            </>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              icon={<Plug size={12} />}
              loading={connecting}
              onClick={onConnect}
            >
              {connected ? 'Reconnect' : 'Connect'}
            </Button>
            {statusMsg && !connected && (
              <span className="text-xs text-gh-danger truncate">{statusMsg}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Database root
// ---------------------------------------------------------------------------

export function Database() {
  const toast = useToast();
  const [conn, setConn] = useState<ConnFormState>(DEFAULT_CONN);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const [query, setQuery] = useState('');
  const [mongoCollection, setMongoCollection] = useState('');
  const [mongoFilter, setMongoFilter] = useState('');

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryTime, setQueryTime] = useState<number | null>(null);

  const handleConn = (f: Partial<ConnFormState>) => setConn((c) => ({ ...c, ...f }));

  const connect = async () => {
    setConnecting(true);
    setStatusMsg('');
    try {
      if (conn.type === 'mysql') {
        const msg = await invoke<string>('connect_mysql', {
          params: {
            host: conn.host,
            port: parseInt(conn.port, 10) || 3306,
            database: conn.database,
            username: conn.username,
            password: conn.password,
          },
        });
        setConnected(true);
        setStatusMsg(msg);
        toast.success('Connected to MySQL');
      } else {
        const msg = await invoke<string>('connect_mongodb', {
          params: {
            uri: conn.uri,
            database: conn.database,
          },
        });
        setConnected(true);
        setStatusMsg(msg);
        toast.success('Connected to MongoDB');
      }
    } catch (e) {
      setConnected(false);
      setStatusMsg(String(e));
    } finally {
      setConnecting(false);
    }
  };

  const run = async () => {
    if (!connected) {
      toast.warning('Connect to a database first');
      return;
    }

    setRunning(true);
    setResult(null);
    const start = Date.now();

    try {
      let res: QueryResult;
      if (conn.type === 'mysql') {
        if (!query.trim()) { toast.warning('Enter a SQL query'); setRunning(false); return; }
        res = await invoke<QueryResult>('run_mysql_query', { query });
      } else {
        if (!mongoCollection.trim()) { toast.warning('Enter a collection name'); setRunning(false); return; }
        res = await invoke<QueryResult>('run_mongodb_query', {
          database: conn.database,
          collectionName: mongoCollection,
          filterJson: mongoFilter.trim() || null,
        });
      }
      setQueryTime(Date.now() - start);
      setResult(res);
    } catch (e) {
      setQueryTime(Date.now() - start);
      setResult({ columns: [], rows: [], error: String(e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Connection panel */}
      <ConnectionPanel
        conn={conn}
        onChange={handleConn}
        onConnect={connect}
        connecting={connecting}
        connected={connected}
        statusMsg={connected ? `${conn.type === 'mysql' ? 'MySQL' : 'MongoDB'} · ${conn.database}` : statusMsg}
      />

      {/* Query area */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Query toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gh-border shrink-0">
          <span className="text-xs font-semibold text-gh-fg-muted uppercase tracking-wide">
            {conn.type === 'mysql' ? 'SQL Query' : 'MongoDB Query'}
          </span>
          {conn.type === 'mongodb' && (
            <>
              <Input
                className="w-40"
                placeholder="Collection name"
                value={mongoCollection}
                onChange={(e) => setMongoCollection(e.target.value)}
              />
              <Input
                className="w-48"
                placeholder='Filter: {"field":"value"}'
                value={mongoFilter}
                onChange={(e) => setMongoFilter(e.target.value)}
              />
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            {result && queryTime !== null && (
              <span className="text-xs text-gh-fg-subtle">{queryTime} ms</span>
            )}
            <Button
              variant="primary"
              size="sm"
              icon={running ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
              loading={running}
              onClick={run}
              disabled={!connected}
            >
              Run
            </Button>
          </div>
        </div>

        {/* SQL editor (MySQL only) */}
        {conn.type === 'mysql' && (
          <div className="shrink-0 h-[140px] border-b border-gh-border overflow-hidden">
            <CodeEditor
              value={query}
              onChange={setQuery}
              language="sql"
              height="140px"
              placeholder="SELECT * FROM users LIMIT 100;"
            />
          </div>
        )}

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {result ? (
            <ResultsTable result={result} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gh-fg-subtle">
              <DbIcon size={32} />
              <p className="text-sm">
                {connected
                  ? conn.type === 'mysql'
                    ? 'Write a query above and click Run'
                    : 'Enter a collection name and click Run'
                  : 'Connect to a database to get started'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
