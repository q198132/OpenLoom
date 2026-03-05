import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import type { FileNode, GitFileStatus } from '@openloom/shared';
import { useFileTreeStore } from '@/stores/fileTreeStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSSHStore } from '@/stores/sshStore';
import InlineInput from './InlineInput';

/** 文件类型图标配置：label 显示文字，color 颜色 class */
const FILE_ICON_MAP: Record<string, { label: string; color: string }> = {
  // TypeScript / JavaScript
  ts:    { label: 'TS', color: 'text-blue' },
  tsx:   { label: 'TS', color: 'text-blue' },
  js:    { label: 'JS', color: 'text-yellow' },
  jsx:   { label: 'JS', color: 'text-yellow' },
  mjs:   { label: 'JS', color: 'text-yellow' },
  cjs:   { label: 'JS', color: 'text-yellow' },
  // Web
  html:  { label: '<>', color: 'text-peach' },
  css:   { label: '#',  color: 'text-blue' },
  scss:  { label: '#',  color: 'text-peach' },
  less:  { label: '#',  color: 'text-blue' },
  // Data / Config
  json:  { label: '{}', color: 'text-yellow' },
  yaml:  { label: '!',  color: 'text-red' },
  yml:   { label: '!',  color: 'text-red' },
  toml:  { label: '≡',  color: 'text-peach' },
  xml:   { label: '<>', color: 'text-peach' },
  // Rust
  rs:    { label: 'Rs', color: 'text-peach' },
  // Python
  py:    { label: 'Py', color: 'text-blue' },
  // Markdown / Text
  md:    { label: 'M↓', color: 'text-blue' },
  txt:   { label: 'Tx', color: 'text-overlay1' },
  // Shell
  sh:    { label: '$',  color: 'text-green' },
  bash:  { label: '$',  color: 'text-green' },
  ps1:   { label: '>_', color: 'text-blue' },
  bat:   { label: '>_', color: 'text-green' },
  // Images
  png:   { label: '🖼', color: '' },
  jpg:   { label: '🖼', color: '' },
  jpeg:  { label: '🖼', color: '' },
  gif:   { label: '🖼', color: '' },
  svg:   { label: '◇',  color: 'text-yellow' },
  ico:   { label: '🖼', color: '' },
  // Lock / Config
  lock:  { label: '🔒', color: '' },
  env:   { label: '⚙',  color: 'text-yellow' },
  // Git
  gitignore: { label: 'G',  color: 'text-peach' },
};

/** 特殊文件名完整匹配 */
const SPECIAL_FILE_MAP: Record<string, { label: string; color: string }> = {
  'vite.config.ts':    { label: '⚡', color: 'text-yellow' },
  'vite.config.js':    { label: '⚡', color: 'text-yellow' },
  'tsconfig.json':     { label: '⚙',  color: 'text-blue' },
  'tsconfig.node.json':{ label: '⚙',  color: 'text-blue' },
  'package.json':      { label: '{}', color: 'text-green' },
  'package-lock.json': { label: '{}', color: 'text-overlay1' },
  'Cargo.toml':        { label: '📦', color: '' },
  'Cargo.lock':        { label: '🔒', color: '' },
  '.gitignore':        { label: 'G',  color: 'text-peach' },
  'Dockerfile':        { label: '🐳', color: '' },
  'LICENSE':           { label: '©',  color: 'text-overlay1' },
  'README.md':         { label: 'M↓', color: 'text-blue' },
};

function getFileIcon(name: string): { label: string; color: string } {
  // 先匹配特殊文件名
  if (SPECIAL_FILE_MAP[name]) return SPECIAL_FILE_MAP[name];
  // 再匹配扩展名
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICON_MAP[ext] ?? { label: '📄', color: '' };
}

/** Git 状态 → 颜色 class + 标签字母 */
const GIT_STATUS_MAP: Record<string, { color: string; label: string }> = {
  untracked: { color: 'text-green', label: 'U' },
  added:     { color: 'text-green', label: 'A' },
  modified:  { color: 'text-yellow', label: 'M' },
  deleted:   { color: 'text-red', label: 'D' },
  renamed:   { color: 'text-blue', label: 'R' },
};

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
  gitFiles?: GitFileStatus[];
}

export default function FileTreeItem({
  node, depth, onFileClick, onContextMenu,
  renamingPath, creatingIn, creatingType,
  onRenameConfirm, onCreateConfirm, onEditCancel,
  gitFiles = [],
}: Props) {
  const { expandedPaths, toggleExpand, selectedPath, setSelected, fetchChildren, renameNode } =
    useFileTreeStore();
  const [children, setChildren] = useState<FileNode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;

  // 当前节点的 Git 状态
  const gitInfo = useMemo(() => {
    if (node.isDirectory) {
      // 文件夹：检查是否有子文件存在变更（冒泡）
      const prefix = node.path + '/';
      const hasChanges = gitFiles.some((f) => f.path === node.path || f.path.startsWith(prefix));
      return hasChanges ? { color: 'text-green', label: '' } : null;
    }
    const file = gitFiles.find((f) => f.path === node.path);
    return file ? GIT_STATUS_MAP[file.status] ?? null : null;
  }, [node.path, node.isDirectory, gitFiles]);

  useEffect(() => {
    if (isExpanded && node.isDirectory && !loaded) {
      console.log(`[FileTreeItem] Loading children for: ${node.path}`);
      fetchChildren(node.path)
        .then((nodes) => {
          console.log(`[FileTreeItem] Loaded ${nodes?.length || 0} children for: ${node.path}`);
          setChildren(nodes || []);
          setLoaded(true);
        })
        .catch((error) => {
          console.error(`[FileTreeItem] Error loading children for ${node.path}:`, error);
          setChildren([]);
          setLoaded(true);
        });
    }
  }, [isExpanded, node.isDirectory, node.path, loaded, fetchChildren]);

  const handleClick = () => {
    console.log(`[FileTreeItem] handleClick: ${node.path}, isDirectory: ${node.isDirectory}`);
    if (node.isDirectory) {
      console.log(`[FileTreeItem] Toggling expand for: ${node.path}, current isExpanded: ${isExpanded}`);
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

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    if (!node.isDirectory) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!node.isDirectory) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!node.isDirectory) return;
    e.preventDefault();
    // 只有真正离开元素时才取消高亮
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!node.isDirectory) return;
    e.preventDefault();
    setIsDragOver(false);

    const sourcePath = e.dataTransfer.getData('text/plain');
    if (!sourcePath) return;

    // 获取源文件名
    const sourceName = sourcePath.split('/').pop() || sourcePath.split('\\').pop();
    if (!sourceName) return;

    // 构造目标路径
    const isRemote = useFileTreeStore.getState().isRemote;
    let targetPath: string;
    
    if (isRemote) {
      // 远程模式：node.path 已经是绝对路径
      targetPath = node.path.endsWith('/') 
        ? node.path + sourceName 
        : node.path + '/' + sourceName;
    } else {
      // 本地模式：node.path 是相对路径
      targetPath = node.path ? node.path + '/' + sourceName : sourceName;
    }

    // 检查是否拖到自己身上
    if (sourcePath === targetPath) return;

    // 检查是否拖到自己的子文件夹
    if (sourcePath.startsWith(targetPath.substring(0, targetPath.lastIndexOf('/')))) {
      alert('不能将文件移动到自身或其子文件夹');
      return;
    }

    try {
      await renameNode(sourcePath, targetPath);
      // 刷新文件树
      window.dispatchEvent(new CustomEvent('file-tree-refresh'));
    } catch (error: any) {
      console.error('[FileTree] Move failed:', error);
      alert(`移动失败: ${error.message || '未知错误'}`);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center h-7 cursor-pointer select-none transition-all duration-150 ${
          isSelected 
            ? 'bg-accent/10 text-accent border-l-2 border-accent' 
            : isDragOver
              ? 'bg-accent/20 text-accent border-l-2 border-accent'
              : 'text-subtext1 hover:bg-surface0/70 border-l-2 border-transparent'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        draggable
        onDragStart={(e) => {
          // SSH 模式：node.path 已经是远程绝对路径
          // 本地模式：需要拼接工作区路径
          const isRemote = useFileTreeStore.getState().isRemote;
          let path: string;
          if (isRemote) {
            path = node.path;  // 远程模式直接使用绝对路径
          } else {
            const root = useWorkspaceStore.getState().currentPath;
            path = root ? `${root}/${node.path}` : node.path;
          }
          e.dataTransfer.setData('text/plain', path);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
            <span className={`shrink-0 mr-1.5 text-[11px] font-mono font-bold leading-none select-none ${getFileIcon(node.name).color || 'text-overlay1'}`}>
              {getFileIcon(node.name).label}
            </span>
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
          <span className={`text-xs truncate flex-1 ${gitInfo && !node.isDirectory ? gitInfo.color : ''}`}>
            {node.name}
          </span>
        )}
        {gitInfo && (
          node.isDirectory ? (
            <span className="shrink-0 ml-auto mr-2 w-2 h-2 rounded-full bg-green" />
          ) : (
            <span className={`shrink-0 ml-auto mr-2 text-[10px] font-mono leading-none ${gitInfo.color}`}>
              {gitInfo.label}
            </span>
          )
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
              gitFiles={gitFiles}
            />
          ))}
        </div>
      )}
    </div>
  );
}
