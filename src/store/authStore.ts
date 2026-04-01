/**
 * authStore.ts — Zustand store for the authenticated Firebase user.
 * Only serialisable fields are persisted (Firebase User objects aren't plain).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  signout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      signout: () => set({ user: null }),
    }),
    { name: 'devhub-auth' },
  ),
);
