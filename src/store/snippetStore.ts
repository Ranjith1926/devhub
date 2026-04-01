/**
 * snippetStore.ts
 * State for the Snippet Manager: list of snippets + search / filter state.
 */

import { create } from 'zustand';
import { Snippet } from '../types';

interface SnippetState {
  snippets: Snippet[];
  searchQuery: string;
  selectedLanguage: string;
  selectedTag: string;
  editingSnippet: Snippet | null;
  isEditorOpen: boolean;

  setSnippets: (snippets: Snippet[]) => void;
  addSnippet: (s: Snippet) => void;
  updateSnippet: (s: Snippet) => void;
  removeSnippet: (id: string) => void;

  setSearchQuery: (q: string) => void;
  setSelectedLanguage: (lang: string) => void;
  setSelectedTag: (tag: string) => void;

  openEditor: (snippet?: Snippet) => void;
  closeEditor: () => void;

  /** Return only snippets matching current search/filter. */
  filteredSnippets: () => Snippet[];

  /** Unique tags across all snippets. */
  allTags: () => string[];
  /** Unique languages across all snippets. */
  allLanguages: () => string[];
}

export const useSnippetStore = create<SnippetState>((set, get) => ({
  snippets: [],
  searchQuery: '',
  selectedLanguage: '',
  selectedTag: '',
  editingSnippet: null,
  isEditorOpen: false,

  setSnippets: (snippets) => set({ snippets }),
  addSnippet: (s) => set((st) => ({ snippets: [s, ...st.snippets] })),
  updateSnippet: (s) =>
    set((st) => ({
      snippets: st.snippets.map((x) => (x.id === s.id ? s : x)),
    })),
  removeSnippet: (id) =>
    set((st) => ({ snippets: st.snippets.filter((x) => x.id !== id) })),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),
  setSelectedTag: (selectedTag) => set({ selectedTag }),

  openEditor: (snippet) =>
    set({ editingSnippet: snippet ?? null, isEditorOpen: true }),
  closeEditor: () => set({ isEditorOpen: false, editingSnippet: null }),

  filteredSnippets: () => {
    const { snippets, searchQuery, selectedLanguage, selectedTag } = get();
    const q = searchQuery.toLowerCase();
    return snippets.filter((s) => {
      const tags = safeParseTags(s.tags);
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        tags.some((t) => t.toLowerCase().includes(q));
      const matchesLang = !selectedLanguage || s.language === selectedLanguage;
      const matchesTag = !selectedTag || tags.includes(selectedTag);
      return matchesQuery && matchesLang && matchesTag;
    });
  },

  allTags: () => {
    const { snippets } = get();
    const set = new Set<string>();
    snippets.forEach((s) => safeParseTags(s.tags).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  },

  allLanguages: () => {
    const { snippets } = get();
    return Array.from(new Set(snippets.map((s) => s.language))).sort();
  },
}));

function safeParseTags(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === 'string');
  } catch {
    // ignore
  }
  return [];
}
