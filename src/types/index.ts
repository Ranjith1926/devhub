// TypeScript types shared across the entire DevHub frontend.

// ---------------------------------------------------------------------------
// HTTP / API Tester
// ---------------------------------------------------------------------------

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/** A key-value pair with a unique id and an enable/disable toggle. */
export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

/** An API collection groups related requests. */
export interface ApiCollection {
  id: string;
  name: string;
  description: string;
  requests: SavedRequest[];
  created_at: string;
  updated_at: string;
}

/** A saved HTTP request persisted in SQLite via the Rust layer. */
export interface SavedRequest {
  id: string;
  collection_id: string;
  name: string;
  method: HttpMethod;
  url: string;
  /** JSON-serialised KeyValuePair[] */
  headers: string;
  /** JSON-serialised KeyValuePair[] */
  params: string;
  body: string;
  body_type: BodyType;
  created_at: string;
  updated_at: string;
}

export type BodyType = 'none' | 'json' | 'text' | 'form';

/** HTTP response returned from the Rust reqwest command. */
export interface ApiResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  /** Round-trip ms */
  time: number;
  /** Body size in bytes */
  size: number;
}

/** Lightweight record stored after every outgoing request. */
export interface HistoryEntry {
  id: string;
  method: HttpMethod;
  url: string;
  status: number;
  response_time: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// JSON Tools
// ---------------------------------------------------------------------------

export type JsonToolTab = 'formatter' | 'ts-generator';

// ---------------------------------------------------------------------------
// Snippets
// ---------------------------------------------------------------------------

export interface Snippet {
  id: string;
  name: string;
  description: string;
  code: string;
  language: string;
  /** JSON-serialised string[] */
  tags: string;
  created_at: string;
  updated_at: string;
}

export const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'rust',
  'sql',
  'bash',
  'html',
  'css',
  'json',
  'yaml',
  'markdown',
  'text',
] as const;

export type Language = (typeof LANGUAGES)[number];

// ---------------------------------------------------------------------------
// Database Tool
// ---------------------------------------------------------------------------

export type DbType = 'mysql' | 'mongodb';

export interface DbConnectionConfig {
  id: string;
  name: string;
  type: DbType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  uri?: string; // MongoDB connection string
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  affected_rows?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Request Assertions (Tests)
// ---------------------------------------------------------------------------

export type AssertionTarget =
  | 'status'          // HTTP status code  (number)
  | 'status_text'     // e.g. "OK"
  | 'response_time'   // ms
  | 'body'            // full body string
  | 'body_json'       // JSONPath-style: body.user.id
  | 'header';         // specific response header value

export type AssertionOperator =
  | 'eq'     // ==
  | 'ne'     // !=
  | 'gt'     // >
  | 'gte'    // >=
  | 'lt'     // <
  | 'lte'    // <=
  | 'contains'
  | 'not_contains'
  | 'exists'
  | 'not_exists'
  | 'matches'; // regex

export interface Assertion {
  id: string;
  enabled: boolean;
  target: AssertionTarget;
  /** For target=header: the header name. For body_json: dot-path like "data.user.id" */
  targetArg: string;
  operator: AssertionOperator;
  expected: string;
}

export interface AssertionResult {
  assertionId: string;
  passed: boolean;
  message: string;
  actual: string;
}

// ---------------------------------------------------------------------------
// Environments
// ---------------------------------------------------------------------------

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvVariable[];
}

// ---------------------------------------------------------------------------
// Application tabs
// ---------------------------------------------------------------------------

export type TabType = 'api-tester' | 'json-tools' | 'snippets' | 'database' | 'regex-tester' | 'encoder';

export interface AppTab {
  id: string;
  type: TabType;
  title: string;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'info' | 'warning';
