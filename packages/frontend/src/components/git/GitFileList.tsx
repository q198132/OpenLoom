import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Minus, ChevronRight, ChevronDown, EyeOff } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';
import { useEditorStore } from '@/stores/editorStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import * as api from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  modified: 'text-yellow',
  added: 'text-green',
  deleted: 'text-red',
  untracked: 'text-overlay1',
  renamed: 'text-blue',
};

const STATUS_LABELS: Record<string, string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  untracked: 'U',
  renamed: 'R',
};

export default function GitFileList() {
  const { files, stageFiles, unstageFiles, fetchStatus } = useGitStore();
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; filePath: string } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  const staged = files.filter((f) => f.staged);
  const unstaged = files.filter((f) => !f.staged);

  // 点击外部关闭菜单
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ctxMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent, filePath: string) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, filePath });
  }, []);

  const addToGitignore = useCallback(async (filePath: string) => {
    const root = useWorkspaceStore.getState().currentPath;
    if (!root) return;
    const sep = root.includes('/') ? '/' : '\\';
    const ignorePath = root + sep + '.gitignore';
    let content = '';
    try {
      const res = await api.readFile(ignorePath);
      content = res.content;
    } catch { /* .gitignore 不存在，新建 */ }
    const entry = filePath.replace(/\\/g, '/');
    if (content.split('\n').some((l) => l.trim() === entry)) return;
    const newContent = content.endsWith('\n') || content === '' ? content + entry + '\n' : content + '\n' + entry + '\n';
    await api.writeFile(ignorePath, newContent);
    await fetchStatus();
    setCtxMenu(null);
  }, [fetchStatus]);

  return (
    <div className="text-xs">
      {staged.length > 0 && (
        <FileSection
          title="已暂存的更改"
          count={staged.length}
          files={staged}
          action="unstage"
          onAction={(path) => unstageFiles([path])}
          staged
          defaultOpen
          onContextMenu={handleContextMenu}
        />
      )}
      {unstaged.length > 0 && (
        <FileSection
          title="更改"
          count={unstaged.length}
          files={unstaged}
          action="stage"
          onAction={(path) => stageFiles([path])}
          staged={false}
          defaultOpen
          onContextMenu={handleContextMenu}
        />
      )}
      {files.length === 0 && (
        <div className="px-3 py-4 text-center text-overlay0">
          没有变更
        </div>
      )}

      {/* 右键菜单 */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 50 }}
          className="bg-base border border-surface0 rounded-md shadow-lg py-1 min-w-[160px]"
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left text-text hover:bg-surface0 transition-colors"
            onClick={() => addToGitignore(ctxMenu.filePath)}
          >
            <EyeOff size={14} />
            添加到 .gitignore
          </button>
        </div>
      )}
    </div>
  );
}

function FileSection({
  title,
  count,
  files,
  action,
  onAction,
  staged,
  defaultOpen = true,
  onContextMenu,
}: {
  title: string;
  count: number;
  files: { path: string; status: string }[];
  action: 'stage' | 'unstage';
  onAction: (path: string) => void;
  staged: boolean;
  defaultOpen?: boolean;
  onContextMenu: (e: React.MouseEvent, filePath: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <div
        className="flex items-center justify-between h-[22px] px-2 cursor-pointer select-none hover:bg-surface0 text-subtext0"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-1">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="font-medium">{title}</span>
          <span className="text-overlay0 ml-1">{count}</span>
        </div>
      </div>

      {open &&
        files.map((f) => (
          <GitFileRow
            key={f.path}
            filePath={f.path}
            status={f.status}
            action={action}
            onAction={onAction}
            staged={staged}
            onContextMenu={onContextMenu}
          />
        ))}
    </div>
  );
}

function GitFileRow({
  filePath,
  status,
  action,
  onAction,
  staged,
  onContextMenu,
}: {
  filePath: string;
  status: string;
  action: 'stage' | 'unstage';
  onAction: (path: string) => void;
  staged: boolean;
  onContextMenu: (e: React.MouseEvent, filePath: string) => void;
}) {
  // 分离文件名和目录路径（用 / 或 \ 分割）
  const parts = filePath.replace(/\\/g, '/').split('/');
  const fileName = parts.pop() || filePath;
  const dirPath = parts.join('/');

  const color = STATUS_COLORS[status] || 'text-text';
  const label = STATUS_LABELS[status] || '?';

  return (
    <div
      className="flex items-center h-[22px] pl-6 pr-2 hover:bg-surface0 group cursor-pointer"
      onClick={() => useEditorStore.getState().openWorkingDiff(filePath, staged)}
      onContextMenu={(e) => onContextMenu(e, filePath)}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <FileIcon fileName={fileName} />
        <span className="shrink-0 text-subtext1">{fileName}</span>
        {dirPath && (
          <span className="truncate text-overlay0 ml-0.5">{dirPath}</span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-1">
        <button
          onClick={(e) => { e.stopPropagation(); onAction(filePath); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface1 transition-opacity"
          title={action === 'stage' ? '暂存' : '取消暂存'}
        >
          {action === 'stage' ? (
            <Plus size={14} className="text-green" />
          ) : (
            <Minus size={14} className="text-red" />
          )}
        </button>
        <span className={`font-mono w-4 text-right ${color}`}>{label}</span>
      </div>
    </div>
  );
}

function FileIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  let color = 'text-overlay1';
  let text = '';

  switch (ext) {
    case 'ts': case 'tsx': color = 'text-blue'; text = 'TS'; break;
    case 'js': case 'jsx': color = 'text-yellow'; text = 'JS'; break;
    case 'json': color = 'text-yellow'; text = '{}'; break;
    case 'css': color = 'text-blue'; text = '#'; break;
    case 'html': color = 'text-red'; text = '<>'; break;
    case 'md': color = 'text-subtext0'; text = 'M'; break;
    default: text = '·'; break;
  }

  return (
    <span className={`${color} font-mono text-[10px] w-4 text-center shrink-0 leading-none`}>
      {text}
    </span>
  );
}
