import { create } from 'zustand';
import * as api from '@/lib/api';

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
      const data = await api.searchFiles(query, 100) as any;
      set({ results: data.results || [], loading: false });
    } catch {
      set({ results: [], loading: false });
    }
  },

  clear: () => set({ query: '', results: [], loading: false }),
}));
