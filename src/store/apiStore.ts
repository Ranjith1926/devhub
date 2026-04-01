/**
 * apiStore.ts
 * State for the API Tester feature:
 *  - current request being built
 *  - last response received
 *  - saved collections and their requests
 *  - request history
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiCollection,
  ApiResponse,
  Assertion,
  AssertionResult,
  BodyType,
  HistoryEntry,
  HttpMethod,
  KeyValuePair,
  SavedRequest,
} from '../types';

// ---------------------------------------------------------------------------
// Active (in-flight) request state
// ---------------------------------------------------------------------------

export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key';

export interface AuthConfig {
  type: AuthType;
  /** Bearer token */
  token: string;
  /** Basic auth */
  username: string;
  password: string;
  /** API Key */
  apiKeyName: string;
  apiKeyValue: string;
  /** Where to put the API key: header or query param */
  apiKeyIn: 'header' | 'query';
}

const DEFAULT_AUTH: AuthConfig = {
  type: 'none',
  token: '',
  username: '',
  password: '',
  apiKeyName: 'X-API-Key',
  apiKeyValue: '',
  apiKeyIn: 'header',
};

interface ActiveRequest {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: string;
  bodyType: BodyType;
  auth: AuthConfig;
}

const DEFAULT_REQUEST: ActiveRequest = {
  method: 'GET',
  url: '',
  headers: [{ id: uuidv4(), key: '', value: '', enabled: true }],
  params: [{ id: uuidv4(), key: '', value: '', enabled: true }],
  body: '{\n  \n}',
  bodyType: 'none',
  auth: { ...DEFAULT_AUTH },
};

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface ApiState {
  // Current request editor
  request: ActiveRequest;
  setMethod: (m: HttpMethod) => void;
  setUrl: (url: string) => void;
  setHeaders: (headers: KeyValuePair[]) => void;
  setParams: (params: KeyValuePair[]) => void;
  setBody: (body: string) => void;
  setBodyType: (t: BodyType) => void;
  setAuth: (auth: Partial<AuthConfig>) => void;
  resetRequest: () => void;
  loadRequest: (req: SavedRequest) => void;

  // Response
  response: ApiResponse | null;
  loading: boolean;
  setResponse: (r: ApiResponse | null) => void;
  setLoading: (v: boolean) => void;

  // Collections (loaded from SQLite via Tauri)
  collections: ApiCollection[];
  setCollections: (c: ApiCollection[]) => void;
  addCollection: (c: ApiCollection) => void;
  removeCollection: (id: string) => void;
  addRequestToCollection: (collectionId: string, req: SavedRequest) => void;
  removeRequestFromCollection: (collectionId: string, requestId: string) => void;

  // History
  history: HistoryEntry[];
  setHistory: (h: HistoryEntry[]) => void;
  prependHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;

  // UI state
  collectionsOpen: boolean;
  toggleCollections: () => void;
  activeRequestTab: 'params' | 'headers' | 'body' | 'auth' | 'tests';
  setActiveRequestTab: (t: 'params' | 'headers' | 'body' | 'auth' | 'tests') => void;

  // Assertions
  assertions: Assertion[];
  setAssertions: (a: Assertion[]) => void;
  assertionResults: AssertionResult[];
  setAssertionResults: (r: AssertionResult[]) => void;
}

export const useApiStore = create<ApiState>((set, get) => ({
  // ---- request ----
  request: { ...DEFAULT_REQUEST },
  setMethod: (method) => set((s) => ({ request: { ...s.request, method } })),
  setUrl: (url) => set((s) => ({ request: { ...s.request, url } })),
  setHeaders: (headers) => set((s) => ({ request: { ...s.request, headers } })),
  setParams: (params) => set((s) => ({ request: { ...s.request, params } })),
  setBody: (body) => set((s) => ({ request: { ...s.request, body } })),
  setBodyType: (bodyType) => set((s) => ({ request: { ...s.request, bodyType } })),
  setAuth: (patch) =>
    set((s) => ({ request: { ...s.request, auth: { ...s.request.auth, ...patch } } })),
  resetRequest: () =>
    set({
      request: {
        ...DEFAULT_REQUEST,
        headers: [{ id: uuidv4(), key: '', value: '', enabled: true }],
        params: [{ id: uuidv4(), key: '', value: '', enabled: true }],
        auth: { ...DEFAULT_AUTH },
      },
    }),
  loadRequest: (req) =>
    set({
      request: {
        method: req.method,
        url: req.url,
        headers: safeParseKV(req.headers),
        params: safeParseKV(req.params),
        body: req.body,
        bodyType: req.body_type,
        auth: { ...DEFAULT_AUTH },
      },
    }),

  // ---- response ----
  response: null,
  loading: false,
  setResponse: (response) => set({ response }),
  setLoading: (loading) => set({ loading }),

  // ---- collections ----
  collections: [],
  setCollections: (collections) => set({ collections }),
  addCollection: (c) => set((s) => ({ collections: [...s.collections, c] })),
  removeCollection: (id) =>
    set((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),
  addRequestToCollection: (collectionId, req) =>
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === collectionId ? { ...c, requests: [...c.requests, req] } : c,
      ),
    })),
  removeRequestFromCollection: (collectionId, requestId) =>
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === collectionId
          ? { ...c, requests: c.requests.filter((r) => r.id !== requestId) }
          : c,
      ),
    })),

  // ---- history ----
  history: [],
  setHistory: (history) => set({ history }),
  prependHistory: (entry) =>
    set((s) => ({ history: [entry, ...s.history].slice(0, 200) })),
  clearHistory: () => set({ history: [] }),

  // ---- UI ----
  collectionsOpen: false,
  toggleCollections: () => set((s) => ({ collectionsOpen: !s.collectionsOpen })),
  activeRequestTab: 'params',
  setActiveRequestTab: (activeRequestTab) => set({ activeRequestTab }),

  // ---- assertions ----
  assertions: [],
  setAssertions: (assertions) => set({ assertions }),
  assertionResults: [],
  setAssertionResults: (assertionResults) => set({ assertionResults }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParseKV(json: string): KeyValuePair[] {
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr;
  } catch {
    // ignore
  }
  return [{ id: uuidv4(), key: '', value: '', enabled: true }];
}
