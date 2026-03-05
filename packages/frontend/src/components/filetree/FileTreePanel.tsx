import { useState, useEffect, useCallback, useRef } from 'react';
import { FolderTree, RefreshCw, FilePlus, FolderPlus, ChevronsDownUp, Server, FolderOpen } from 'lucide-react';
import { useFileTreeStore } from '@/stores/fileTreeStore';
import { useSSHStore } from '@/stores/sshStore';
import * as api from '@/lib/api';
import { useGitStore } from '@/stores/gitStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useControlSocket } from '@/hooks/useWebSocket';
import FileTreeItem from './FileTreeItem';
import ContextMenu from './ContextMenu';
import InlineInput from './InlineInput';
import type { FileNode, ControlMessage } from '@openloom/shared';

export default function FileTreePanel() {
  const { nodes, loading, isRemote, remoteRoot, refreshRoot, collapseAll, createFile, createDir, renameNode, deleteNode } = useFileTreeStore();
  const { files: gitFiles, fetchStatus: fetchGitStatus } = useGitStore();
  const currentPath = useWorkspaceStore((s) => s.currentPath);
  const sshSession = useSSHStore((s) => s.session);
  const sshConnections = useSSHStore((s) => s.connections);
  const sshWorkingDir = useSSHStore((s) => s.workingDir);
  const setWorkingDir = useSSHStore((s) => s.setWorkingDir);

  // 使用 ref 跟踪上一次的状态，避免重复刷新
  const prevPathRef = useRef(currentPath);
  const prevSessionIdRef = useRef(sshSession?.connectionId);
  const isRefreshingRef = useRef(false);
  const mountedRef = useRef(false);

  // 远程目录输入状态
  const [showDirInput, setShowDirInput] = useState(false);
  const [dirInput, setDirInput] = useState('');

  // 获取当前连接名称
  const activeConnection = sshSession?.status === 'connected'
    ? sshConnections.find(c => c.id === sshSession.connectionId)
    : null;

  // 打开远程文件夹
  const handleOpenRemoteFolder = async () => {
    let path = dirInput.trim();
    if (!path) return;

    // 如果不是绝对路径，自动添加当前工作目录前缀
    if (!path.startsWith('/')) {
      const currentDir = sshWorkingDir || '/';
      path = currentDir.endsWith('/')
        ? currentDir + path
        : currentDir + '/' + path;
    }

    console.log('[FileTree] Opening remote folder:', path);
    await setWorkingDir(path);
    setShowDirInput(false);
  };

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; node: FileNode | null; isBlank: boolean;
  } | null>(null);

  // 内联编辑状态
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [creatingIn, setCreatingIn] = useState<string | null>(null);
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);

  // 统一的刷新函数，带防抖
  const refreshAll = useCallback(async () => {
    // 防止重复刷新
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      await Promise.all([
        refreshRoot(),
        fetchGitStatus(),
      ]);
    } finally {
      // 延迟重置，防止快速连续调用
      setTimeout(() => {
        isRefreshingRef.current = false;
      }, 100);
    }
  }, [refreshRoot, fetchGitStatus]);

  const onControlMessage = useCallback(
    (msg: ControlMessage) => {
      if (msg.type === 'file-changed') {
        refreshAll();
      }
    },
    [refreshAll],
  );

  useControlSocket(onControlMessage);

  // 监听文件树刷新事件
  useEffect(() => {
    const handleRefresh = () => {
      refreshAll();
    };
    window.addEventListener('file-tree-refresh', handleRefresh);
    return () => window.removeEventListener('file-tree-refresh', handleRefresh);
  }, [refreshAll]);

  // 初始化加载（只在组件挂载时执行一次）
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      refreshAll();
    }
  }, [refreshAll]);

  // 合并工作区切换和 SSH 连接状态变化的监听
  useEffect(() => {
    const pathChanged = prevPathRef.current !== currentPath && currentPath;
    const sessionChanged = prevSessionIdRef.current !== sshSession?.connectionId;

    // 更新 ref
    prevPathRef.current = currentPath;
    prevSessionIdRef.current = sshSession?.connectionId;

    // 如果有任何变化，刷新
    if (pathChanged || sessionChanged) {
      refreshAll();
    }
  }, [currentPath, sshSession?.connectionId, refreshAll]);

  const handleFileClick = (path: string) => {
    window.dispatchEvent(
      new CustomEvent('open-file', { detail: { path } }),
    );
  };

  const clearEdit = () => {
    setRenamingPath(null);
    setCreatingIn(null);
    setCreatingType(null);
  };

  const handleNodeContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node, isBlank: false });
  };

  const handleBlankContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-tree-item]')) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node: null, isBlank: true });
  };

  const handleNewFile = () => {
    const parentDir = contextMenu?.node?.isDirectory
      ? contextMenu.node.path
      : contextMenu?.node
        ? contextMenu.node.path.substring(0, contextMenu.node.path.lastIndexOf('/')) || ''
        : '';
    setCreatingIn(parentDir || '');
    setCreatingType('file');
    setContextMenu(null);
  };

  const handleNewFolder = () => {
    const parentDir = contextMenu?.node?.isDirectory
      ? contextMenu.node.path
      : contextMenu?.node
        ? contextMenu.node.path.substring(0, contextMenu.node.path.lastIndexOf('/')) || ''
        : '';
    setCreatingIn(parentDir || '');
    setCreatingType('folder');
    setContextMenu(null);
  };

  const handleRename = () => {
    if (contextMenu?.node) {
      setRenamingPath(contextMenu.node.path);
    }
    setContextMenu(null);
  };

  const handleDelete = async () => {
    if (!contextMenu?.node) return;
    const name = contextMenu.node.name;
    setContextMenu(null);
    if (confirm(`确定删除 "${name}" 吗？`)) {
      await deleteNode(contextMenu.node.path);
    }
  };

  const handleReveal = () => {
    if (!contextMenu?.node) return;
    api.revealInExplorer(contextMenu.node.path).catch(() => {});
    setContextMenu(null);
  };

  const handleRenameConfirm = async (oldPath: string, newName: string) => {
    const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = parentDir ? parentDir + '/' + newName : newName;
    await renameNode(oldPath, newPath);
    clearEdit();
  };

  const handleCreateConfirm = async (parentDir: string, name: string) => {
    const fullPath = parentDir ? parentDir + '/' + name : name;
    if (creatingType === 'folder') {
      await createDir(fullPath);
    } else {
      await createFile(fullPath);
    }
    clearEdit();
  };

  return (
    <div className="h-full bg-mantle flex flex-col">
      <div className="flex items-center justify-between h-9 px-3 border-b border-surface0">
        <div className="flex items-center gap-2 text-xs font-medium text-subtext0 uppercase tracking-wider">
          {isRemote ? (
            <>
              <Server size={14} className="text-green" />
              <span className="text-green">SSH: {activeConnection?.name || '远程'}</span>
            </>
          ) : (
            <>
              <FolderTree size={14} />
              <span>资源管理器</span>
            </>
          )}
        </div>
        {isRemote && (
          <button
            onClick={() => {
              setDirInput(sshWorkingDir || '~');
              setShowDirInput(true);
            }}
            className="p-1 rounded hover:bg-surface0 text-overlay0 hover:text-text"
            title="打开远程文件夹"
          >
            <FolderOpen size={14} />
          </button>
        )}
      </div>

      {/* 远程工作目录显示和切换 */}
      {isRemote && (
        <div className="px-3 py-1.5 border-b border-surface0 bg-surface0/30">
          {showDirInput ? (
            <div className="flex gap-1">
              <input
                type="text"
                value={dirInput}
                onChange={(e) => setDirInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleOpenRemoteFolder();
                  if (e.key === 'Escape') setShowDirInput(false);
                }}
                placeholder="输入远程目录路径"
                className="flex-1 bg-surface0 text-text text-xs px-2 py-1 rounded-lg border border-surface1 focus:border-accent outline-none input-glow transition-all duration-200"
                autoFocus
              />
              <button
                onClick={handleOpenRemoteFolder}
                className="px-2 py-1 text-xs bg-accent/20 text-accent rounded-lg hover:bg-accent/30 active:scale-95 transition-all duration-200"
              >
                打开
              </button>
            </div>
          ) : (
            <div
              className="text-xs text-overlay1 truncate cursor-pointer hover:text-text"
              onClick={() => {
                setDirInput(sshWorkingDir || '~');
                setShowDirInput(true);
              }}
              title={sshWorkingDir || '点击设置目录'}
            >
              📁 {sshWorkingDir || '~'}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between h-7 px-3 group">
        <span className="text-[11px] font-semibold text-subtext1 uppercase tracking-wider">文件</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setCreatingIn(''); setCreatingType('file'); }}
            className="p-0.5 rounded hover:bg-surface0 text-overlay0 hover:text-text transition-colors"
            title="新建文件"
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={() => { setCreatingIn(''); setCreatingType('folder'); }}
            className="p-0.5 rounded hover:bg-surface0 text-overlay0 hover:text-text transition-colors"
            title="新建文件夹"
          >
            <FolderPlus size={14} />
          </button>
          <button
            onClick={() => { refreshRoot(); fetchGitStatus(); }}
            className="p-0.5 rounded hover:bg-surface0 text-overlay0 hover:text-text transition-colors"
            title="刷新"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={collapseAll}
            className="p-0.5 rounded hover:bg-surface0 text-overlay0 hover:text-text transition-colors"
            title="折叠全部"
          >
            <ChevronsDownUp size={14} />
          </button>
        </div>
      </div>
      <div
        className="flex-1 overflow-y-auto py-1"
        onContextMenu={handleBlankContextMenu}
      >
        {loading && nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-overlay0">
            加载中...
          </div>
        ) : (
          <>
            {creatingIn === '' && creatingType && (
              <InlineInput
                depth={0}
                onConfirm={(name) => handleCreateConfirm('', name)}
                onCancel={clearEdit}
              />
            )}
            {nodes.map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                depth={0}
                onFileClick={handleFileClick}
                onContextMenu={handleNodeContextMenu}
                renamingPath={renamingPath}
                creatingIn={creatingIn}
                creatingType={creatingType}
                onRenameConfirm={handleRenameConfirm}
                onCreateConfirm={handleCreateConfirm}
                onEditCancel={clearEdit}
                gitFiles={gitFiles}
              />
            ))}
          </>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isDirectory={contextMenu.node?.isDirectory ?? false}
          isBlank={contextMenu.isBlank}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
          onReveal={handleReveal}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
