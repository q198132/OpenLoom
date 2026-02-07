import { create } from 'zustand';

interface SearchResult {
  file: string;
  line: string;
  lineNumber: number;
  column: number;
}

interface SearchState {
  query: string;
  results: SearchResult[];
  loading: boolean;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  loading: false,

  search: async (query: string) => {
    if (!query.trim()) {
      set({ query: '', results: [], loading: false });
      return;
    }
    set({ query, loading: true });
    try {
      const res = await fetch(
        `/api/files/search?q=${encodeURIComponent(query)}&maxResults=100`,
      );
      const data = await res.json();
      set({ results: data.results || [], loading: false });
    } catch {
      set({ results: [], loading: false });
    }
  },

  clear: () => set({ query: '', results: [], loading: false }),
}));
