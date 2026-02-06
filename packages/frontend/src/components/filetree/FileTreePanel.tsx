import { useEffect, useCallback } from 'react';
import { FolderTree, RefreshCw } from 'lucide-react';
import { useFileTreeStore } from '@/stores/fileTreeStore';
import { useControlSocket } from '@/hooks/useWebSocket';
import FileTreeItem from './FileTreeItem';
import type { ControlMessage } from '@claudegui/shared';

export default function FileTreePanel() {
  const { nodes, loading, refreshRoot } = useFileTreeStore();

  const onControlMessage = useCallback(
    (msg: ControlMessage) => {
      if (msg.type === 'file-changed') {
        refreshRoot();
      }
    },
    [refreshRoot],
  );

  useControlSocket(onControlMessage);

  useEffect(() => {
    refreshRoot();
  }, [refreshRoot]);

  const handleFileClick = (path: string) => {
    // 后续由 editorStore 处理
    window.dispatchEvent(
      new CustomEvent('open-file', { detail: { path } }),
    );
  };

  return (
    <div className="h-full bg-mantle flex flex-col">
      <div className="flex items-center justify-between h-9 px-3 border-b border-surface0">
        <div className="flex items-center gap-2 text-xs font-medium text-subtext0 uppercase tracking-wider">
          <FolderTree size={14} />
          <span>资源管理器</span>
        </div>
        <button
          onClick={refreshRoot}
          className="p-1 rounded hover:bg-surface0 text-overlay0 hover:text-text transition-colors"
          title="刷新"
        >
          <RefreshCw size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {loading && nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-overlay0">
            加载中...
          </div>
        ) : (
          nodes.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              onFileClick={handleFileClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
