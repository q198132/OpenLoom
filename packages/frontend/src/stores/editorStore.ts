import { create } from 'zustand';
import type { EditorTab } from '@openloom/shared';

const EXT_LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  json: 'json', html: 'html', css: 'css', scss: 'scss', less: 'less',
  md: 'markdown', py: 'python', rs: 'rust', go: 'go', java: 'java',
  yaml: 'yaml', yml: 'yaml', xml: 'xml', sql: 'sql', sh: 'shell',
  bash: 'shell', toml: 'ini', env: 'ini', gitignore: 'ini',
};

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return EXT_LANG_MAP[ext] || 'plaintext';
}

interface CommitDiffState {
  hash: string;
  shortHash: string;
  file: string;
  oldContent: string;
  newContent: string;
  language: string;
}

interface EditorState {
  tabs: EditorTab[];
  activeTab: string | null;
  fileContents: Map<string, string>;
  commitDiff: CommitDiffState | null;
  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  getContent: (path: string) => string | undefined;
  openCommitDiff: (hash: string, shortHash: string, file: string) => Promise<void>;
  openWorkingDiff: (file: string, staged: boolean) => Promise<void>;
  closeCommitDiff: () => void;
  clearAll: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTab: null,
  fileContents: new Map(),
  commitDiff: null,

  openFile: async (path: string) => {
    const { tabs, fileContents } = get();

    // 已打开则切换
    if (tabs.find((t) => t.path === path)) {
      set({ activeTab: path });
      return;
    }

    // 获取文件内容
    const res = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (data.error) return;

    const name = path.split('/').pop() || path;
    const tab: EditorTab = {
      path,
      name,
      language: getLanguage(path),
      isDirty: false,
    };

    const next = new Map(fileContents);
    next.set(path, data.content);

    set({
      tabs: [...tabs, tab],
      activeTab: path,
      fileContents: next,
    });
  },

  closeTab: (path: string) => {
    set((s) => {
      const tabs = s.tabs.filter((t) => t.path !== path);
      const next = new Map(s.fileContents);
      next.delete(path);
      const activeTab =
        s.activeTab === path
          ? tabs[tabs.length - 1]?.path ?? null
          : s.activeTab;
      return { tabs, activeTab, fileContents: next };
    });
  },

  setActiveTab: (path) => set({ activeTab: path }),

  updateContent: (path, content) => {
    set((s) => {
      const next = new Map(s.fileContents);
      next.set(path, content);
      const tabs = s.tabs.map((t) =>
        t.path === path ? { ...t, isDirty: true } : t,
      );
      return { fileContents: next, tabs };
    });
  },

  getContent: (path) => get().fileContents.get(path),

  openCommitDiff: async (hash, shortHash, file) => {
    const res = await fetch(`/api/git/file-diff/${hash}?file=${encodeURIComponent(file)}`);
    const data = await res.json();
    if (data.error) return;
    set({
      commitDiff: {
        hash, shortHash, file,
        oldContent: data.oldContent || '',
        newContent: data.newContent || '',
        language: getLanguage(file),
      },
    });
  },

  openWorkingDiff: async (file, staged) => {
    const res = await fetch(
      `/api/git/working-diff?file=${encodeURIComponent(file)}&staged=${staged}`,
    );
    const data = await res.json();
    if (data.error) return;
    set({
      commitDiff: {
        hash: staged ? 'staged' : 'working',
        shortHash: staged ? '暂存区' : '工作区',
        file,
        oldContent: data.oldContent || '',
        newContent: data.newContent || '',
        language: getLanguage(file),
      },
    });
  },

  closeCommitDiff: () => set({ commitDiff: null }),

  clearAll: () => set({
    tabs: [],
    activeTab: null,
    fileContents: new Map(),
    commitDiff: null,
  }),
}));
