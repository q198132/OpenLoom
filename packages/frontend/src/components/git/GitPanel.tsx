import { useEffect, useState, useCallback, useRef } from 'react';
import { GitBranch, RefreshCw, X } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';
import GitFileList from './GitFileList';
import GitCommitBox from './GitCommitBox';
import GitActions from './GitActions';
import GitGraph from './GitGraph';

// 模块级变量，切换面板时不会丢失
let _graphOpen = true;
let _graphRatio = 0.4;

export default function GitPanel() {
  const { branch, error, clearError, fetchStatus, fetchBranch, fetchLog, fetchSyncStatus } = useGitStore();
  const [refreshing, setRefreshing] = useState(false);
  const [graphOpen, _setGraphOpen] = useState(_graphOpen);
  const [graphRatio, _setGraphRatio] = useState(_graphRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  // 保存事件处理函数的引用，用于清理
  const dragHandlersRef = useRef<{ onMove: ((ev: MouseEvent) => void) | null; onUp: (() => void) | null }>({
    onMove: null,
    onUp: null,
  });

  const setGraphOpen = useCallback((v: boolean) => { _graphOpen = v; _setGraphOpen(v); }, []);
  const setGraphRatio = useCallback((v: number) => { _graphRatio = v; _setGraphRatio(v); }, []);

  useEffect(() => {
    fetchStatus();
    fetchBranch();
    fetchLog();
    fetchSyncStatus();
  }, [fetchStatus, fetchBranch, fetchLog, fetchSyncStatus]);

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
    </div>
  );
}
