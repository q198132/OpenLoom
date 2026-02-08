import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import type { FileNode } from '@openloom/shared';
import { useFileTreeStore } from '@/stores/fileTreeStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import InlineInput from './InlineInput';

interface Props {
  node: FileNode;
  depth: number;
  onFileClick: (path: string) => void;
  onContextMenu?: (e: React.MouseEvent, node: FileNode) => void;
  renamingPath?: string | null;
  creatingIn?: string | null;
  creatingType?: 'file' | 'folder' | null;
  onRenameConfirm?: (oldPath: string, newName: string) => void;
  onCreateConfirm?: (parentDir: string, name: string) => void;
  onEditCancel?: () => void;
}

export default function FileTreeItem({
  node, depth, onFileClick, onContextMenu,
  renamingPath, creatingIn, creatingType,
  onRenameConfirm, onCreateConfirm, onEditCancel,
}: Props) {
  const { expandedPaths, toggleExpand, selectedPath, setSelected, fetchChildren } =
    useFileTreeStore();
  const [children, setChildren] = useState<FileNode[]>([]);
  const [loaded, setLoaded] = useState(false);

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;

  useEffect(() => {
    if (isExpanded && node.isDirectory && !loaded) {
      fetchChildren(node.path).then((nodes) => {
        setChildren(nodes);
        setLoaded(true);
      });
    }
  }, [isExpanded, node.isDirectory, node.path, loaded, fetchChildren]);

  const handleClick = () => {
    if (node.isDirectory) {
      toggleExpand(node.path);
    } else {
      setSelected(node.path);
      onFileClick(node.path);
    }
  };

  // 刷新时重新加载子节点
  const refreshChildren = () => {
    if (node.isDirectory && loaded) {
      fetchChildren(node.path).then(setChildren);
    }
  };

  // 监听 expandedPaths 变化来触发刷新
  useEffect(() => {
    if (isExpanded && loaded) {
      refreshChildren();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div
        className={`flex items-center h-7 cursor-pointer select-none hover:bg-surface0 transition-colors ${
          isSelected ? 'bg-surface0 text-accent' : 'text-subtext1'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        draggable={!node.isDirectory}
        onDragStart={(e) => {
          if (node.isDirectory) return;
          const root = useWorkspaceStore.getState().currentPath;
          const abs = root ? `${root}/${node.path}` : node.path;
          e.dataTransfer.setData('text/plain', abs);
          e.dataTransfer.effectAllowed = 'copy';
        }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu?.(e, node)}
      >
        {node.isDirectory ? (
          <>
            {isExpanded ? (
              <ChevronDown size={14} className="shrink-0 mr-1 text-overlay0" />
            ) : (
              <ChevronRight size={14} className="shrink-0 mr-1 text-overlay0" />
            )}
            {isExpanded ? (
              <FolderOpen size={14} className="shrink-0 mr-1.5 text-accent" />
            ) : (
              <Folder size={14} className="shrink-0 mr-1.5 text-accent" />
            )}
          </>
        ) : (
          <>
            <span className="w-[14px] shrink-0 mr-1" />
            <File size={14} className="shrink-0 mr-1.5 text-overlay1" />
          </>
        )}
        {renamingPath === node.path ? (
          <InlineInput
            defaultValue={node.name}
            depth={0}
            onConfirm={(newName) => onRenameConfirm?.(node.path, newName)}
            onCancel={() => onEditCancel?.()}
          />
        ) : (
          <span className="text-xs truncate">{node.name}</span>
        )}
      </div>

      {isExpanded && node.isDirectory && (
        <div>
          {creatingIn === node.path && creatingType && (
            <InlineInput
              depth={depth + 1}
              onConfirm={(name) => onCreateConfirm?.(node.path, name)}
              onCancel={() => onEditCancel?.()}
            />
          )}
          {children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
              renamingPath={renamingPath}
              creatingIn={creatingIn}
              creatingType={creatingType}
              onRenameConfirm={onRenameConfirm}
              onCreateConfirm={onCreateConfirm}
              onEditCancel={onEditCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
