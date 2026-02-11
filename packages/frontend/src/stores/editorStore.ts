import { create } from 'zustand';
import type { EditorTab, ViewType } from '@openloom/shared';
import * as api from '@/lib/api';
import { useSSHStore } from './sshStore';

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

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico'];
const DOCX_EXTS = ['docx'];

function getViewType(path: string): ViewType {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (DOCX_EXTS.includes(ext)) return 'docx';
  if (ext === 'md') return 'markdown';
  return 'code';
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

    const viewType = getViewType(path);
    const name = path.split('/').pop() || path;
    let content = '';

    // 检查是否为远程模式
    const sshSession = useSSHStore.getState().session;
    const isRemote = sshSession?.status === 'connected';

    if (isRemote) {
      // 远程模式：使用 SSH API
      if (viewType === 'image' || viewType === 'docx') {
        // 远程模式暂不支持二进制文件
        return;
      } else {
        try {
          content = await api.sshReadFile(path);
        } catch {
          return;
        }
      }
    } else {
      // 本地模式
      if (viewType === 'image' || viewType === 'docx') {
        const data = await api.readFileBinary(path) as { data: string; path: string };
        if (!data.data) return;
        content = data.data; // base64
      } else {
        const data = await api.readFile(path) as { content: string; path: string };
        if (!data.content && data.content !== '') return;
        content = data.content;
      }
    }

    const tab: EditorTab = {
      path,
      name,
      language: getLanguage(path),
      isDirty: false,
      viewType,
    };

    const next = new Map(fileContents);
    next.set(path, content);

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
    try {
      const data = await api.gitFileDiff(hash, file) as any;
      set({
        commitDiff: {
          hash, shortHash, file,
          oldContent: data.oldContent || '',
          newContent: data.newContent || '',
          language: getLanguage(file),
        },
      });
    } catch { /* ignore */ }
  },

  openWorkingDiff: async (file, staged) => {
    try {
      const data = await api.gitWorkingDiff(file, staged) as any;
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
    } catch { /* ignore */ }
  },

  closeCommitDiff: () => set({ commitDiff: null }),

  clearAll: () => set({
    tabs: [],
    activeTab: null,
    fileContents: new Map(),
    commitDiff: null,
  }),
}));
