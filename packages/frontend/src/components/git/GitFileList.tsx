import { useState } from 'react';
import { Plus, Minus, ChevronRight, ChevronDown } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';
import { useEditorStore } from '@/stores/editorStore';

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
  const { files, stageFiles, unstageFiles } = useGitStore();

  const staged = files.filter((f) => f.staged);
  const unstaged = files.filter((f) => !f.staged);

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
        />
      )}
      {files.length === 0 && (
        <div className="px-3 py-4 text-center text-overlay0">
          没有变更
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
}: {
  title: string;
  count: number;
  files: { path: string; status: string }[];
  action: 'stage' | 'unstage';
  onAction: (path: string) => void;
  staged: boolean;
  defaultOpen?: boolean;
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
}: {
  filePath: string;
  status: string;
  action: 'stage' | 'unstage';
  onAction: (path: string) => void;
  staged: boolean;
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
