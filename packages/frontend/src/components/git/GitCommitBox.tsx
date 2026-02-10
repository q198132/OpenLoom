import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';
import * as api from '@/lib/api';

export default function GitCommitBox() {
  const { files, commitMessage, setCommitMessage, commit, stageAll, ahead, behind, hasRemote, syncing, sync } = useGitStore();
  const [generating, setGenerating] = useState(false);

  const hasStagedFiles = files.some((f) => f.staged);
  const hasUnstagedFiles = files.some((f) => !f.staged);

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    if (!hasStagedFiles && hasUnstagedFiles) {
      await stageAll();
    }
    await commit();
  };

  const generateCommitMessage = async () => {
    setGenerating(true);
    try {
      // 没有暂存文件但有未暂存更改时，先自动暂存全部
      const currentFiles = useGitStore.getState().files;
      const hasStaged = currentFiles.some((f) => f.staged);
      const hasUnstaged = currentFiles.some((f) => !f.staged);

      if (!hasStaged && hasUnstaged) {
        try {
          await useGitStore.getState().stageAll();
        } catch (e) {
          console.warn('自动暂存失败，尝试继续:', e);
        }
      }

      // 1. 获取暂存区 diff
      const { stat, diff, files: diffFiles } = await api.gitStagedDiff();

      if (!stat && !diff) { setGenerating(false); return; }

      // 2. 尝试 AI 生成
      try {
        const { message } = await api.generateCommitMessage(diff, stat);
        if (message) { setCommitMessage(message); setGenerating(false); return; }
      } catch (err: any) {
        console.error('AI 生成失败:', err);
        // AI 不可用，走 fallback
      }

      // 3. 规则生成 fallback
      const msg = generateByRule(stat, diffFiles);
      setCommitMessage(msg);
    } catch (err) {
      console.error('生成提交信息失败:', err);
    }
    setGenerating(false);
  };

  return (
    <div className="px-3 py-2 border-b border-surface0">
      <div className="flex items-center justify-end mb-1">
        <button
          onClick={generateCommitMessage}
          disabled={generating}
          className="flex items-center gap-1 px-2 py-0.5 text-xs rounded hover:bg-surface0 text-subtext0 hover:text-accent disabled:opacity-40 transition-colors"
          title="自动生成提交信息"
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          <span>{generating ? '生成中...' : '生成'}</span>
        </button>
      </div>
      <textarea
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        placeholder="提交信息..."
        className="w-full h-16 px-2 py-1.5 text-xs bg-crust text-text border border-surface0 rounded resize-none focus:outline-none focus:border-accent placeholder:text-overlay0"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleCommit();
          }
        }}
      />
      <button
        onClick={handleCommit}
        disabled={!commitMessage.trim()}
        className="w-full mt-1.5 py-1 text-xs font-medium rounded bg-accent text-crust hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        提交 (Ctrl+Enter)
      </button>
      {hasRemote && (
        <button
          onClick={sync}
          disabled={syncing}
          className="w-full mt-1 py-1 text-xs font-medium rounded bg-surface1 text-subtext1 hover:bg-surface2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          <span>
            {syncing ? '同步中...' : ahead > 0 || behind > 0 ? '同步更改' : '已同步'}
            {ahead > 0 && ` ${ahead}\u2191`}
            {behind > 0 && ` ${behind}\u2193`}
          </span>
        </button>
      )}
    </div>
  );
}

function generateByRule(
  _stat: string,
  files: { status: string; path: string }[],
): string {
  if (!files || files.length === 0) return 'chore: update files';

  // 推断 type
  const statuses = files.map((f) => f.status);
  const allAdded = statuses.every((s) => s === 'A');
  const allDeleted = statuses.every((s) => s === 'D');
  const type = allAdded ? 'feat' : allDeleted ? 'chore' : 'update';

  // 推断 scope：共同父目录
  const paths = files.map((f) => f.path);
  const segments = paths.map((p) => p.replace(/\\/g, '/').split('/'));
  let common: string[] = [];
  if (segments.length > 0) {
    common = [...segments[0]];
    for (let i = 1; i < segments.length; i++) {
      let j = 0;
      while (j < common.length && j < segments[i].length && common[j] === segments[i][j]) j++;
      common = common.slice(0, j);
    }
  }
  // 去掉文件名，只保留目录
  const scope = common.length > 0 ? common.join('/') : '';

  // 描述：列出主要修改文件名
  const names = paths.map((p) => p.split('/').pop() || p);
  const desc = names.length <= 3
    ? names.join(', ')
    : `${names.slice(0, 3).join(', ')} 等 ${names.length} 个文件`;

  const scopePart = scope ? `(${scope})` : '';
  return `${type}${scopePart}: ${desc}`;
}
