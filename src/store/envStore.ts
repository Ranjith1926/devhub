/**
 * envStore.ts
 * Zustand store for API Tester environments.
 * Persisted to localStorage so environments survive app restarts.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Environment, EnvVariable } from '../types';

interface EnvState {
  environments: Environment[];
  activeEnvId: string | null;

  // Environment CRUD
  addEnvironment: (name: string) => void;
  duplicateEnvironment: (id: string) => void;
  renameEnvironment: (id: string, name: string) => void;
  removeEnvironment: (id: string) => void;
  setActiveEnv: (id: string | null) => void;

  // Variable CRUD
  addVariable: (envId: string) => void;
  updateVariable: (envId: string, varId: string, patch: Partial<EnvVariable>) => void;
  removeVariable: (envId: string, varId: string) => void;

  // Selectors
  activeEnv: () => Environment | null;
}

export const useEnvStore = create<EnvState>()(
  persist(
    (set, get) => ({
      environments: [],
      activeEnvId: null,

      addEnvironment: (name) => {
        const env: Environment = { id: uuidv4(), name, variables: [] };
        set((s) => ({ environments: [...s.environments, env] }));
      },

      duplicateEnvironment: (id) => {
        const original = get().environments.find((e) => e.id === id);
        if (!original) return;
        const copy: Environment = {
          id: uuidv4(),
          name: `${original.name} (copy)`,
          variables: original.variables.map((v) => ({ ...v, id: uuidv4() })),
        };
        set((s) => ({ environments: [...s.environments, copy] }));
      },

      renameEnvironment: (id, name) =>
        set((s) => ({
          environments: s.environments.map((e) => (e.id === id ? { ...e, name } : e)),
        })),

      removeEnvironment: (id) =>
        set((s) => ({
          environments: s.environments.filter((e) => e.id !== id),
          activeEnvId: s.activeEnvId === id ? null : s.activeEnvId,
        })),

      setActiveEnv: (id) => set({ activeEnvId: id }),

      addVariable: (envId) =>
        set((s) => ({
          environments: s.environments.map((e) =>
            e.id === envId
              ? {
                  ...e,
                  variables: [
                    ...e.variables,
                    { id: uuidv4(), key: '', value: '', enabled: true },
                  ],
                }
              : e,
          ),
        })),

      updateVariable: (envId, varId, patch) =>
        set((s) => ({
          environments: s.environments.map((e) =>
            e.id === envId
              ? {
                  ...e,
                  variables: e.variables.map((v) =>
                    v.id === varId ? { ...v, ...patch } : v,
                  ),
                }
              : e,
          ),
        })),

      removeVariable: (envId, varId) =>
        set((s) => ({
          environments: s.environments.map((e) =>
            e.id === envId
              ? { ...e, variables: e.variables.filter((v) => v.id !== varId) }
              : e,
          ),
        })),

      activeEnv: () => {
        const { environments, activeEnvId } = get();
        return environments.find((e) => e.id === activeEnvId) ?? null;
      },
    }),
    {
      name: 'devhub-environments',
    },
  ),
);
