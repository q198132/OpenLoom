import { useEffect, useState, useCallback, useRef } from 'react';
import { GitBranch, RefreshCw, X, GitPullRequest, FolderGit2 } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';
import GitFileList from './GitFileList';
import GitCommitBox from './GitCommitBox';
import GitActions from './GitActions';
import GitGraph from './GitGraph';

// 模块级变量，切换面板时不会丢失
let _graphOpen = true;
let _graphRatio = 0.4;

export default function GitPanel() {
  const { branch, error, clearError, fetchStatus, fetchBranch, fetchLog, fetchSyncStatus, init } = useGitStore();
  const [refreshing, setRefreshing] = useState(false);
  const [graphOpen, _setGraphOpen] = useState(_graphOpen);
  const [graphRatio, _setGraphRatio] = useState(_graphRatio);
  const [initializing, setInitializing] = useState(false);
  const [hasGitRepo, setHasGitRepo] = useState<boolean | null>(null); // null 表示正在检测
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  // 保存事件处理函数的引用，用于清理
  const dragHandlersRef = useRef<{ onMove: ((ev: MouseEvent) => void) | null; onUp: (() => void) | null }>({
    onMove: null,
    onUp: null,
  });

  const setGraphOpen = useCallback((v: boolean) => { _graphOpen = v; _setGraphOpen(v); }, []);
  const setGraphRatio = useCallback((v: number) => { _graphRatio = v; _setGraphRatio(v); }, []);

  // 检测是否有 Git 仓库
  const checkGitRepo = useCallback(async () => {
    try {
      await fetchStatus();
      // 如果能成功获取状态，说明有 Git 仓库
      setHasGitRepo(true);
    } catch (e: any) {
      if (e.message?.includes('Not a git repository')) {
        setHasGitRepo(false);
      } else {
        // 其他错误，假设有 Git 仓库
        setHasGitRepo(true);
      }
    }
  }, [fetchStatus]);

  useEffect(() => {
    checkGitRepo();
  }, [checkGitRepo]);

  useEffect(() => {
    if (hasGitRepo) {
      fetchStatus();
      fetchBranch();
      fetchLog();
      fetchSyncStatus();
    }
  }, [hasGitRepo, fetchStatus, fetchBranch, fetchLog, fetchSyncStatus]);

  // 组件卸载时清理拖拽事件监听器
  useEffect(() => {
    return () => {
      if (dragHandlersRef.current.onMove) {
        window.removeEventListener('mousemove', dragHandlersRef.current.onMove);
      }
      if (dragHandlersRef.current.onUp) {
        window.removeEventListener('mouseup', dragHandlersRef.current.onUp);
      }
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStatus(), fetchBranch(), fetchLog(), fetchSyncStatus()]);
    setRefreshing(false);
  }, [fetchStatus, fetchBranch, fetchLog, fetchSyncStatus]);

  const handleInitGit = useCallback(async () => {
    setInitializing(true);
    const success = await init();
    if (success) {
      setHasGitRepo(true);
    }
    setInitializing(false);
  }, [init]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    // 清理旧的事件监听器
    if (dragHandlersRef.current.onMove) {
      window.removeEventListener('mousemove', dragHandlersRef.current.onMove);
    }
    if (dragHandlersRef.current.onUp) {
      window.removeEventListener('mouseup', dragHandlersRef.current.onUp);
    }

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const y = ev.clientY - rect.top;
      const ratio = 1 - y / rect.height;
      setGraphRatio(Math.max(0.15, Math.min(0.75, ratio)));
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      dragHandlersRef.current.onMove = null;
      dragHandlersRef.current.onUp = null;
    };

    dragHandlersRef.current.onMove = onMove;
    dragHandlersRef.current.onUp = onUp;

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [setGraphRatio]);

  return (
    <div className="h-full bg-mantle flex flex-col">
      <div className="flex items-center justify-between h-9 px-3 border-b border-surface0">
        <div className="flex items-center gap-2 text-xs font-medium text-subtext0 uppercase tracking-wider">
          <GitBranch size={14} />
          <span>源代码管理</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1 rounded hover:bg-surface0 text-overlay0 hover:text-text transition-colors"
          title="刷新"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 检测中 */}
      {hasGitRepo === null && (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw size={20} className="animate-spin text-subtext0" />
        </div>
      )}

      {/* 没有 Git 仓库，显示引导界面 */}
      {hasGitRepo === false && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <FolderGit2 size={48} className="text-overlay0 mb-4" />
          <h3 className="text-sm font-medium text-text mb-2">初始化 Git 仓库</h3>
          <p className="text-xs text-subtext0 mb-6 leading-relaxed">
            当前文件夹尚未初始化 Git 仓库。<br />
            初始化后即可使用版本控制功能。
          </p>
          <button
            onClick={handleInitGit}
            disabled={initializing}
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-crust text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            {initializing ? '初始化中...' : '初始化仓库'}
          </button>
          {error && (
            <div className="mt-4 text-xs text-red flex items-center gap-1">
              <X size={12} />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* 有 Git 仓库，显示正常界面 */}
      {hasGitRepo === true && (
        <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
          {/* 上半区：分支信息 + 提交 + 文件列表 */}
          <div
            className="overflow-y-auto min-h-0"
            style={{ flex: graphOpen ? 1 - graphRatio : 1 }}
          >
            {branch && (
              <div className="flex items-center justify-between px-3 py-1.5 text-xs text-subtext0 border-b border-surface0">
                <span>分支: <span className="text-accent">{branch.current}</span></span>
                <GitActions />
              </div>
            )}

            <GitCommitBox />

            {error && (
              <div className="flex items-start gap-1.5 px-3 py-1.5 bg-red/10 border-b border-red/20 text-xs text-red">
                <span className="flex-1 break-all">{error}</span>
                <button onClick={clearError} className="shrink-0 p-0.5 hover:bg-red/20 rounded">
                  <X size={12} />
                </button>
              </div>
            )}

            <GitFileList />
          </div>

          {/* 拖拽分隔条：仅展开时显示 */}
          {graphOpen && (
            <div
              className="h-1 shrink-0 cursor-row-resize hover:bg-accent/30 active:bg-accent/50 transition-colors border-t border-surface0"
              onMouseDown={handleDragStart}
            />
          )}

          {/* 下半区：图形 */}
          <div
            className={graphOpen ? 'overflow-y-auto min-h-0' : 'shrink-0'}
            style={graphOpen ? { flex: graphRatio } : undefined}
          >
            <GitGraph open={graphOpen} onToggle={() => setGraphOpen(!graphOpen)} />
          </div>
        </div>
      )}
    </div>
  );
}
