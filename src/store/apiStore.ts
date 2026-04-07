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

function createEmptyRow(): KeyValuePair {
  return { id: uuidv4(), key: '', value: '', enabled: true };
}

function createDefaultRequest(): ActiveRequest {
  return {
    method: 'GET',
    url: '',
    headers: [createEmptyRow()],
    params: [createEmptyRow()],
    body: '{\n  \n}',
    bodyType: 'none',
    auth: { ...DEFAULT_AUTH },
  };
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface ApiState {
  // Requests per tab
  requestsByTabId: Record<string, ActiveRequest>;
  getRequest: (tabId: string) => ActiveRequest;
  setMethod: (tabId: string, m: HttpMethod) => void;
  setUrl: (tabId: string, url: string) => void;
  setHeaders: (tabId: string, headers: KeyValuePair[]) => void;
  setParams: (tabId: string, params: KeyValuePair[]) => void;
  setBody: (tabId: string, body: string) => void;
  setBodyType: (tabId: string, t: BodyType) => void;
  setAuth: (tabId: string, auth: Partial<AuthConfig>) => void;
  resetRequest: (tabId: string) => void;
  loadRequest: (tabId: string, req: SavedRequest) => void;
  initRequestForTab: (tabId: string) => void;

  // Response per tab
  responseByTabId: Record<string, ApiResponse | null>;
  loadingByTabId: Record<string, boolean>;
  getResponse: (tabId: string) => ApiResponse | null;
  isLoading: (tabId: string) => boolean;
  setResponse: (tabId: string, r: ApiResponse | null) => void;
  setLoading: (tabId: string, v: boolean) => void;

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
  // ---- requests per tab ----
  requestsByTabId: {},
  getRequest: (tabId) => {
    const req = get().requestsByTabId[tabId];
    return req ?? createDefaultRequest();
  },
  setMethod: (tabId, method) => set((s) => ({
    requestsByTabId: {
      ...s.requestsByTabId,
      [tabId]: { ...(s.requestsByTabId[tabId] ?? createDefaultRequest()), method },
    },
  })),
  setUrl: (tabId, url) => set((s) => ({
    requestsByTabId: {
      ...s.requestsByTabId,
      [tabId]: { ...(s.requestsByTabId[tabId] ?? createDefaultRequest()), url },
    },
  })),
  setHeaders: (tabId, headers) => set((s) => ({
    requestsByTabId: {
      ...s.requestsByTabId,
      [tabId]: { ...(s.requestsByTabId[tabId] ?? createDefaultRequest()), headers },
    },
  })),
  setParams: (tabId, params) => set((s) => ({
    requestsByTabId: {
      ...s.requestsByTabId,
      [tabId]: { ...(s.requestsByTabId[tabId] ?? createDefaultRequest()), params },
    },
  })),
  setBody: (tabId, body) => set((s) => ({
    requestsByTabId: {
      ...s.requestsByTabId,
      [tabId]: { ...(s.requestsByTabId[tabId] ?? createDefaultRequest()), body },
    },
  })),
  setBodyType: (tabId, bodyType) => set((s) => ({
    requestsByTabId: {
      ...s.requestsByTabId,
      [tabId]: { ...(s.requestsByTabId[tabId] ?? createDefaultRequest()), bodyType },
    },
  })),
  setAuth: (tabId, patch) => set((s) => {
    const request = s.requestsByTabId[tabId] ?? createDefaultRequest();
    return {
      requestsByTabId: {
        ...s.requestsByTabId,
        [tabId]: {
          ...request,
          auth: { ...request.auth, ...patch },
        },
      },
    };
  }),
  resetRequest: (tabId) => set((s) => ({
    requestsByTabId: {
      ...s.requestsByTabId,
      [tabId]: createDefaultRequest(),
    },
  })),
  loadRequest: (tabId, req) => set((s) => ({
    requestsByTabId: {
      ...s.requestsByTabId,
      [tabId]: {
        method: req.method,
        url: req.url,
        headers: safeParseKV(req.headers),
        params: safeParseKV(req.params),
        body: req.body,
        bodyType: req.body_type,
        auth: { ...DEFAULT_AUTH },
      },
    },
  })),
  initRequestForTab: (tabId) => set((s) => {
    if (s.requestsByTabId[tabId]) return {};
    return {
      requestsByTabId: {
        ...s.requestsByTabId,
        [tabId]: createDefaultRequest(),
      },
    };
  }),

  // ---- response per tab ----
  responseByTabId: {},
  loadingByTabId: {},
  getResponse: (tabId) => get().responseByTabId[tabId] ?? null,
  isLoading: (tabId) => get().loadingByTabId[tabId] ?? false,
  setResponse: (tabId, response) => set((s) => ({
    responseByTabId: {
      ...s.responseByTabId,
      [tabId]: response,
    },
  })),
  setLoading: (tabId, loading) => set((s) => ({
    loadingByTabId: {
      ...s.loadingByTabId,
      [tabId]: loading,
    },
  })),

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
