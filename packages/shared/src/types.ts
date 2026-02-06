// 文件树节点
export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

// WebSocket 控制消息
export type ControlMessage =
  | { type: 'pty-resize'; cols: number; rows: number }
  | { type: 'file-changed'; event: string; path: string }
  | { type: 'file-snapshot'; path: string; oldContent: string; newContent: string }
  | { type: 'diff-accept'; path: string }
  | { type: 'diff-reject'; path: string }
  | { type: 'diff-accept-all' }
  | { type: 'diff-reject-all' };

// Diff 审核项
export interface DiffReviewItem {
  path: string;
  oldContent: string;
  newContent: string;
  timestamp: number;
}

// Git 相关类型
export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
  staged: boolean;
}

export interface GitLogEntry {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  refs: string;
}

export interface GitBranchInfo {
  current: string;
  branches: string[];
}

// 编辑器标签
export interface EditorTab {
  path: string;
  name: string;
  language: string;
  isDirty: boolean;
}
