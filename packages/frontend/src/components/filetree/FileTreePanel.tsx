import { useState, useEffect, useCallback } from 'react';
import { FolderTree, RefreshCw } from 'lucide-react';
import { useFileTreeStore } from '@/stores/fileTreeStore';
import { useControlSocket } from '@/hooks/useWebSocket';
import FileTreeItem from './FileTreeItem';
import ContextMenu from './ContextMenu';
import InlineInput from './InlineInput';
import type { FileNode, ControlMessage } from '@openloom/shared';

export default function FileTreePanel() {
  const { nodes, loading, refreshRoot, createFile, createDir, renameNode, deleteNode } = useFileTreeStore();

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; node: FileNode | null; isBlank: boolean;
  } | null>(null);

  // 内联编辑状态
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [creatingIn, setCreatingIn] = useState<string | null>(null);
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);

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
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
