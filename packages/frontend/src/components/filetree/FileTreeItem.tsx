import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileCode2,
  FileJson2,
  FileText,
  FileImage,
  FileArchive,
  FileCog,
  Shield,
  Package,
  Settings2,
  Image as ImageIcon,
} from 'lucide-react';
import type { FileNode, GitFileStatus } from '@openloom/shared';
import { useFileTreeStore } from '@/stores/fileTreeStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSSHStore } from '@/stores/sshStore';
import InlineInput from './InlineInput';
import { showError } from '@/stores/errorStore';

// 模块级变量：存储当前正在拖拽的文件树节点信息
// 兼容终端拖拽：旧逻辑使用字符串 dragSourcePath，
// 新逻辑在此基础上增加 DragSource 对象（用于文件树内部移动等）。
export interface DragSource {
  treePath: string;
  terminalPath: string;
  isDirectory: boolean;
}

export let dragSource: DragSource | null = null;
export const setDragSource = (value: DragSource | null) => { dragSource = value; };

export let dragSourcePath: string | null = null;
export const setDragSourcePath = (p: string | null) => { dragSourcePath = p; };

const TREE_PATH_MIME = 'application/x-openloom-tree-path';

type IconInfo = { icon?: any; color: string; tone?: string; kind?: 'glyph' | 'document' };

const FILE_ICON_MAP: Record<string, IconInfo> = {
  ts: { icon: FileCode2, color: 'text-blue', tone: 'from-blue/18 to-sky/10' },
  tsx: { icon: FileCode2, color: 'text-blue', tone: 'from-blue/18 to-sky/10' },
  js: { icon: FileCode2, color: 'text-yellow', tone: 'from-yellow/18 to-peach/10' },
  jsx: { icon: FileCode2, color: 'text-yellow', tone: 'from-yellow/18 to-peach/10' },
  mjs: { icon: FileCode2, color: 'text-yellow', tone: 'from-yellow/18 to-peach/10' },
  cjs: { icon: FileCode2, color: 'text-yellow', tone: 'from-yellow/18 to-peach/10' },
  json: { icon: FileJson2, color: 'text-yellow', tone: 'from-yellow/18 to-yellow/8' },
  yaml: { icon: FileCog, color: 'text-peach', tone: 'from-peach/18 to-red/10' },
  yml: { icon: FileCog, color: 'text-peach', tone: 'from-peach/18 to-red/10' },
  toml: { icon: FileCog, color: 'text-peach', tone: 'from-peach/18 to-red/10' },
  xml: { icon: FileCode2, color: 'text-peach', tone: 'from-peach/18 to-red/10' },
  html: { icon: FileCode2, color: 'text-peach', tone: 'from-peach/18 to-red/10' },
  css: { icon: FileCode2, color: 'text-blue', tone: 'from-blue/18 to-sapphire/10' },
  scss: { icon: FileCode2, color: 'text-peach', tone: 'from-pink/18 to-peach/10' },
  less: { icon: FileCode2, color: 'text-blue', tone: 'from-blue/18 to-sapphire/10' },
  rs: { icon: FileCode2, color: 'text-peach', tone: 'from-peach/18 to-yellow/10' },
  py: { icon: FileCode2, color: 'text-blue', tone: 'from-blue/18 to-yellow/10' },
  md: { icon: FileText, color: 'text-blue', tone: 'from-blue/18 to-blue/8' },
  txt: { icon: FileText, color: 'text-subtext0', tone: 'from-surface1/70 to-surface0/60' },
  sh: { icon: FileCode2, color: 'text-green', tone: 'from-green/18 to-teal/10' },
  bash: { icon: FileCode2, color: 'text-green', tone: 'from-green/18 to-teal/10' },
  ps1: { icon: FileCode2, color: 'text-blue', tone: 'from-blue/18 to-teal/10' },
  bat: { icon: FileCode2, color: 'text-green', tone: 'from-green/18 to-teal/10' },
  png: { icon: FileImage, color: 'text-mauve', tone: 'from-mauve/18 to-pink/10' },
  jpg: { icon: FileImage, color: 'text-mauve', tone: 'from-mauve/18 to-pink/10' },
  jpeg: { icon: FileImage, color: 'text-mauve', tone: 'from-mauve/18 to-pink/10' },
  gif: { icon: FileImage, color: 'text-mauve', tone: 'from-mauve/18 to-pink/10' },
  svg: { icon: ImageIcon, color: 'text-yellow', tone: 'from-yellow/18 to-sapphire/10' },
  ico: { icon: FileImage, color: 'text-mauve', tone: 'from-mauve/18 to-pink/10' },
  lock: { icon: Shield, color: 'text-subtext0', tone: 'from-surface1/70 to-surface0/60' },
  env: { icon: FileCog, color: 'text-yellow', tone: 'from-yellow/18 to-peach/10' },
  zip: { icon: FileArchive, color: 'text-peach', tone: 'from-peach/18 to-surface1/10' },
  gz: { icon: FileArchive, color: 'text-peach', tone: 'from-peach/18 to-surface1/10' },
};

const SPECIAL_FILE_MAP: Record<string, IconInfo> = {
  'vite.config.ts': { icon: Settings2, color: 'text-yellow', tone: 'from-yellow/18 to-peach/10' },
  'vite.config.js': { icon: Settings2, color: 'text-yellow', tone: 'from-yellow/18 to-peach/10' },
  'tsconfig.json': { icon: Settings2, color: 'text-blue', tone: 'from-blue/18 to-sapphire/10' },
  'tsconfig.node.json': { icon: Settings2, color: 'text-blue', tone: 'from-blue/18 to-sapphire/10' },
  'package.json': { icon: Package, color: 'text-green', tone: 'from-green/18 to-teal/10' },
  'package-lock.json': { icon: Package, color: 'text-subtext0', tone: 'from-surface1/70 to-surface0/60' },
  'Cargo.toml': { icon: Package, color: 'text-peach', tone: 'from-peach/18 to-yellow/10' },
  'Cargo.lock': { icon: Shield, color: 'text-subtext0', tone: 'from-surface1/70 to-surface0/60' },
  '.gitignore': { icon: FileCode2, color: 'text-peach', tone: 'from-peach/18 to-red/10' },
  'Dockerfile': { icon: FileCode2, color: 'text-blue', tone: 'from-blue/18 to-sapphire/10' },
  'LICENSE': { icon: Shield, color: 'text-subtext0', tone: 'from-surface1/70 to-surface0/60' },
  'README.md': { icon: FileText, color: 'text-blue', tone: 'from-blue/18 to-blue/8' },
};

function getFileIcon(name: string): IconInfo {
  if (SPECIAL_FILE_MAP[name]) return SPECIAL_FILE_MAP[name];
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICON_MAP[ext] ?? { color: 'text-subtext0', tone: 'from-surface1/80 to-surface0/60', kind: 'document' };
}

function getNestedDeletedFiles(dirPath: string, deletedGitFiles: GitFileStatus[]): GitFileStatus[] {
  const prefix = dirPath ? `${dirPath}/` : '';
  return deletedGitFiles.filter((file) => {
    if (!file.path.startsWith(prefix)) return false;
    const rest = file.path.slice(prefix.length);
    return !!rest && !rest.includes('/');
  });
}

/** Git 状态 → 颜色 class + 标签字母 */
const GIT_STATUS_MAP: Record<string, { color: string; label: string }> = {
  untracked: { color: 'text-green', label: 'U' },
  added:     { color: 'text-green', label: 'A' },
  modified:  { color: 'text-yellow', label: 'M' },
  deleted:   { color: 'text-red', label: 'D' },
  renamed:   { color: 'text-blue', label: 'R' },
};

const GIT_STATUS_PRIORITY = ['deleted', 'modified', 'added', 'untracked', 'renamed'] as const;

function summarizeDirectoryStatuses(dirPath: string, gitFiles: GitFileStatus[]) {
  const prefix = dirPath + '/';
  const counts = new Map<string, number>();
  for (const file of gitFiles) {
    if (file.path === dirPath || file.path.startsWith(prefix)) {
      counts.set(file.status, (counts.get(file.status) || 0) + 1);
    }
  }
  const ordered = GIT_STATUS_PRIORITY.filter((status) => counts.has(status)).map((status) => ({
    status,
    count: counts.get(status) || 0,
    ...GIT_STATUS_MAP[status],
  }));
  return ordered;
}

function FileDocumentGlyph({ deleted = false }: { deleted?: boolean }) {
  return (
    <span className={`relative shrink-0 mr-1.5 flex items-center justify-center w-[16px] h-[16px] rounded-[5px] bg-[linear-gradient(180deg,rgba(49,50,68,0.92),rgba(30,30,46,0.92))] ${deleted ? 'ring-1 ring-red/25 opacity-85' : 'ring-1 ring-surface1/70'}`}>
      <span className="absolute inset-[2.2px] rounded-[2px] border border-overlay0/45 bg-[linear-gradient(180deg,rgba(205,214,244,0.14),rgba(166,173,200,0.08))]" />
      <span className="absolute right-[2.2px] top-[2.2px] w-[4px] h-[4px] border-l border-b border-overlay0/45 bg-base/90 [clip-path:polygon(0_0,100%_0,100%_100%)]" />
      <span className="absolute left-[4.5px] right-[4.5px] top-[6px] h-[1px] bg-overlay0/80" />
      <span className="absolute left-[4.5px] right-[5.5px] top-[8.5px] h-[1px] bg-overlay0/55" />
    </span>
  );
}

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
  deletedGitFiles?: GitFileStatus[];
}

export default function FileTreeItem({
  node, depth, onFileClick, onContextMenu,
  renamingPath, creatingIn, creatingType,
  onRenameConfirm, onCreateConfirm, onEditCancel,
  gitFiles = [],
  deletedGitFiles = [],
}: Props) {
  const { expandedPaths, toggleExpand, selectedPath, setSelected, fetchChildren, renameNode } =
    useFileTreeStore();
  const [children, setChildren] = useState<FileNode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;

  // 当前节点的 Git 状态
  const gitInfo = useMemo(() => {
    if (node.isDirectory) {
      // 文件夹：检查是否有子文件存在变更（冒泡）
      const prefix = node.path + '/';
      const hasChanges = [...gitFiles, ...deletedGitFiles].some((f) => f.path === node.path || f.path.startsWith(prefix));
      return hasChanges ? { color: 'text-green', label: '' } : null;
    }
    const file = [...gitFiles, ...deletedGitFiles].find((f) => f.path === node.path);
    return file ? GIT_STATUS_MAP[file.status] ?? null : null;
  }, [node.path, node.isDirectory, gitFiles, deletedGitFiles]);

  const isDeletedPlaceholder = useMemo(
    () => deletedGitFiles.some((f) => f.path === node.path),
    [deletedGitFiles, node.path],
  );

  const directDeletedChildren = useMemo(
    () => (node.isDirectory ? getNestedDeletedFiles(node.path, deletedGitFiles) : []),
    [deletedGitFiles, node.isDirectory, node.path],
  );

  const mergedChildren = useMemo(() => {
    const placeholders = directDeletedChildren
      .filter((file) => !children.some((child) => child.path === file.path))
      .map((file) => ({
        name: file.path.split('/').pop() || file.path,
        path: file.path,
        isDirectory: false,
        children: [],
      }));
    return [...children, ...placeholders].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [children, directDeletedChildren]);

  const directoryStatusSummary = useMemo(
    () => (node.isDirectory ? summarizeDirectoryStatuses(node.path, [...gitFiles, ...deletedGitFiles]) : []),
    [deletedGitFiles, gitFiles, node.isDirectory, node.path],
  );

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
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const types = Array.from(e.dataTransfer.types || []);
    // 只有我们自定义的类型才可以拖拽高亮，防止其他拖拽（比如文本）意外触发
    if (types.includes(TREE_PATH_MIME)) {
      dragCounter.current += 1;
      if (dragCounter.current === 1) {
        setIsDragOver(true);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const types = Array.from(e.dataTransfer.types || []);
    if (types.includes(TREE_PATH_MIME)) {
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragOver(false);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);

    const sourcePath = dragSource?.treePath || e.dataTransfer.getData(TREE_PATH_MIME);
    const sourceIsDirectory = dragSource?.isDirectory ?? false;
    setDragSource(null);
    if (!sourcePath) return;

    // 获取源文件名
    const sourceName = sourcePath.split('/').pop() || sourcePath.split('\\').pop();
    if (!sourceName) return;

    // 构造目标路径：如果是文件夹则移入该文件夹，如果是文件则移入它所在的父文件夹
    const isRemote = useFileTreeStore.getState().isRemote;
    let targetPath: string;
    
    // 如果拖拽到文件上，我们要把目标设为它的父目录
    const parentNodePath = node.isDirectory ? node.path : (node.path.substring(0, node.path.lastIndexOf('/')) || '');

    if (isRemote) {
      // 远程模式：parentNodePath 已经是绝对路径
      if (!parentNodePath) {
        targetPath = sourceName;
      } else {
        targetPath = parentNodePath.endsWith('/') 
          ? parentNodePath + sourceName 
          : parentNodePath + '/' + sourceName;
      }
    } else {
      // 本地模式：parentNodePath 是相对路径
      targetPath = parentNodePath ? parentNodePath + '/' + sourceName : sourceName;
    }

    // 检查是否拖到自己身上，或者移动到当前所在目录（即路径未改变）
    if (sourcePath === targetPath) return;

    // 检查是否把目录拖入自身或其子目录
    if (sourceIsDirectory && (parentNodePath === sourcePath || parentNodePath.startsWith(`${sourcePath}/`))) {
      showError('文件移动失败', '不能将文件夹移动到自身或其子文件夹', '不能将文件夹移动到自身或其子文件夹');
      return;
    }

    try {
      await renameNode(sourcePath, targetPath);
      // 刷新文件树
      window.dispatchEvent(new CustomEvent('file-tree-refresh'));
    } catch (error: any) {
      console.error('[FileTree] Move failed:', error);
      showError('文件移动失败', error, '移动失败');
    }
  };

  // 文件树 → 终端 / 文件树内部拖拽的统一拖拽源，仅绑在“图标”上，避免整行轻微移动就进入拖拽态
  const handleDragStart = (e: React.DragEvent) => {
    // SSH 模式：node.path 已经是远程绝对路径
    // 本地模式：需要拼接工作区路径
    const isRemote = useFileTreeStore.getState().isRemote;
    let path: string;
    if (isRemote) {
      path = node.path;
    } else {
      const root = useWorkspaceStore.getState().currentPath;
      path = root ? `${root}/${node.path}` : node.path;
    }

    const withAlt = e.altKey;
    console.log('[FileTree] dragStart', { treePath: node.path, terminalPath: path, alt: withAlt });

    // 无论是否按 Alt，都允许文件树内部拖拽使用 dragSource
    setDragSource({ treePath: node.path, terminalPath: path, isDirectory: node.isDirectory });

    // 默认提供 MIME type，这样不仅支持拖拽到终端直接粘贴路径，还能跨应用拖拽路径
    setDragSourcePath(path);
    e.dataTransfer.setData(TREE_PATH_MIME, node.path);
    e.dataTransfer.setData('text/plain', path);
    // 允许复制或移动操作
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragEnd = () => {
    console.log('[FileTree] dragEnd');
    setDragSource(null);
    setDragSourcePath(null);
  };

  return (
    <div>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`group flex items-center h-7 cursor-pointer select-none rounded-lg mr-2 transition-all duration-150 ${
          isSelected
            ? 'bg-[linear-gradient(90deg,rgba(137,180,250,0.16),rgba(137,180,250,0.05))] text-accent border-l-2 border-accent shadow-[inset_0_0_0_1px_rgba(137,180,250,0.18)]'
            : isDragOver
              ? 'bg-accent/20 text-accent border-l-2 border-accent'
              : isDeletedPlaceholder
                ? 'text-overlay0 hover:bg-red/5 border-l-2 border-transparent opacity-85'
                : 'text-subtext1 hover:bg-[linear-gradient(90deg,rgba(49,50,68,0.9),rgba(49,50,68,0.32))] border-l-2 border-transparent'
        }`}
        style={{ paddingLeft: `${depth * 16 + 10}px` }}
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
              <ChevronDown size={14} className="shrink-0 mr-1 text-overlay0 group-hover:text-subtext0" />
            ) : (
              <ChevronRight size={14} className="shrink-0 mr-1 text-overlay0 group-hover:text-subtext0" />
            )}
            <span
              className="shrink-0 mr-1.5"
            >
              {isExpanded ? (
                <FolderOpen
                  size={15}
                  className={`${directoryStatusSummary[0]?.status === 'deleted' ? 'text-red' : directoryStatusSummary[0]?.status === 'modified' ? 'text-yellow' : directoryStatusSummary[0]?.status === 'added' || directoryStatusSummary[0]?.status === 'untracked' ? 'text-green' : directoryStatusSummary[0]?.status === 'renamed' ? 'text-blue' : 'text-accent'}`}
                />
              ) : (
                <Folder
                  size={15}
                  className={`${directoryStatusSummary[0]?.status === 'deleted' ? 'text-red' : directoryStatusSummary[0]?.status === 'modified' ? 'text-yellow' : directoryStatusSummary[0]?.status === 'added' || directoryStatusSummary[0]?.status === 'untracked' ? 'text-green' : directoryStatusSummary[0]?.status === 'renamed' ? 'text-blue' : 'text-accent'}`}
                />
              )}
            </span>
          </>
        ) : (
          <>
            <span className="w-[14px] shrink-0 mr-1" />
            {(() => {
              const iconInfo = getFileIcon(node.name);
              if (iconInfo.kind === 'document' || !iconInfo.icon) {
                return (
                  <span
                    className=""
                  >
                    <FileDocumentGlyph deleted={isDeletedPlaceholder} />
                  </span>
                );
              }
              const Icon = iconInfo.icon;
              return (
                <span
                  className={`relative shrink-0 mr-1.5 flex items-center justify-center w-[16px] h-[16px] rounded-[5px] bg-[linear-gradient(180deg,rgba(49,50,68,0.95),rgba(24,24,37,0.92))] ${
                    iconInfo.tone
                      ? `before:absolute before:inset-0 before:rounded-[5px] before:bg-[linear-gradient(135deg,var(--tw-gradient-stops))] before:${iconInfo.tone}`
                      : ''
                  } ${isDeletedPlaceholder ? 'ring-1 ring-red/25' : 'ring-1 ring-surface1/60'}`}
                >
                  <Icon
                    size={11.5}
                    className={`${iconInfo.color} ${isDeletedPlaceholder ? 'opacity-80' : ''}`}
                  />
                </span>
              );
            })()}
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
          <span className={`text-xs truncate flex-1 ${gitInfo && !node.isDirectory ? gitInfo.color : ''} ${isDeletedPlaceholder ? 'line-through decoration-red/50' : ''}`}>
            {node.name}
          </span>
        )}
        {gitInfo && (
          node.isDirectory ? (
            <span className="shrink-0 ml-auto mr-2 flex items-center gap-1 px-1.5 h-[16px] rounded-full bg-base/90 ring-1 ring-surface1/70 shadow-[0_4px_10px_rgba(0,0,0,0.18)]">
              {directoryStatusSummary.slice(0, 3).map((item) => (
                <span key={item.status} className={`flex items-center gap-1 ${item.color}`} title={`${item.label} ${item.count}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'deleted' ? 'bg-red' : item.status === 'modified' ? 'bg-yellow' : item.status === 'added' || item.status === 'untracked' ? 'bg-green' : 'bg-blue'}`} />
                </span>
              ))}
              {directoryStatusSummary.length > 1 && (
                <span className={`text-[9px] font-semibold ${directoryStatusSummary[0].color}`}>
                  {directoryStatusSummary.reduce((sum, item) => sum + item.count, 0)}
                </span>
              )}
            </span>
          ) : (
            <span className={`shrink-0 ml-auto mr-2 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-mono leading-none font-semibold bg-base/90 ring-1 ${isDeletedPlaceholder ? 'ring-red/25' : 'ring-surface1/60'} ${gitInfo.color}`}>
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
          {mergedChildren.map((child) => (
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
              deletedGitFiles={deletedGitFiles}
            />
          ))}
        </div>
      )}
    </div>
  );
}
