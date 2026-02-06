import { Plus, Minus } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';

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
    <div className="flex-1 overflow-y-auto text-xs">
      {staged.length > 0 && (
        <FileSection
          title="已暂存"
          files={staged}
          action="unstage"
          onAction={(path) => unstageFiles([path])}
        />
      )}
      {unstaged.length > 0 && (
        <FileSection
          title="未暂存"
          files={unstaged}
          action="stage"
          onAction={(path) => stageFiles([path])}
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
  files,
  action,
  onAction,
}: {
  title: string;
  files: { path: string; status: string }[];
  action: 'stage' | 'unstage';
  onAction: (path: string) => void;
}) {
  return (
    <div>
      <div className="px-3 py-1 text-subtext0 font-medium">
        {title} ({files.length})
      </div>
      {files.map((f) => {
        const name = f.path.split('/').pop() || f.path;
        const color = STATUS_COLORS[f.status] || 'text-text';
        const label = STATUS_LABELS[f.status] || '?';

        return (
          <div
            key={f.path}
            className="flex items-center justify-between px-3 py-0.5 hover:bg-surface0 group"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className={`font-mono ${color}`}>{label}</span>
              <span className="truncate text-subtext1" title={f.path}>
                {name}
              </span>
            </div>
            <button
              onClick={() => onAction(f.path)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface1 transition-opacity"
              title={action === 'stage' ? '暂存' : '取消暂存'}
            >
              {action === 'stage' ? (
                <Plus size={13} className="text-green" />
              ) : (
                <Minus size={13} className="text-red" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
