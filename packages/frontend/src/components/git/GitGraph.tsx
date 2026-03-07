import { useState, useRef, useEffect, forwardRef } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useGitStore } from '@/stores/gitStore';
import { useEditorStore } from '@/stores/editorStore';
import * as api from '@/lib/api';
import type { GitLogEntry } from '@openloom/shared';

interface CommitDetail {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  email: string;
  date: string;
  body: string;
  files: { file: string; stats: string }[];
}

export default function GitGraph({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { log, branch } = useGitStore();
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [detail, setDetail] = useState<CommitDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // 记录 hover 的 Commit 数据和坐标，以便在顶层渲染 Tooltip
  const [hoveredEntry, setHoveredEntry] = useState<{
    entry: GitLogEntry;
    top: number;
    left: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = async (hash: string) => {
    if (selectedHash === hash) {
      setSelectedHash(null);
      setDetail(null);
      return;
    }
    setSelectedHash(hash);
    setLoading(true);
    try {
      const data = await api.gitShow(hash);
      if (data.hash) setDetail(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-0 h-full relative" ref={containerRef} onMouseLeave={() => setHoveredEntry(null)}>
      <div
        className="flex items-center justify-between h-[22px] px-2 cursor-pointer select-none hover:bg-surface0 text-subtext0 text-xs shrink-0 sticky top-0 bg-base z-10"
        onClick={onToggle}
      >
        <div className="flex items-center gap-1">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="font-medium">图形</span>
        </div>
      </div>

      {open && (
        <div className="text-xs relative">
          {log.map((entry) => (
            <div key={entry.hash}>
              <GraphRow
                entry={entry}
                currentBranch={branch?.current}
                isSelected={selectedHash === entry.hash}
                onSelect={handleSelect}
                onHoverChange={(entryData, rowRect) => {
                  if (entryData && rowRect) {
                    // 获取最外层的 sidebar container 来进行定位
                    const sidebar = document.querySelector('[data-sidebar-container]');
                    if (sidebar) {
                      const sidebarRect = sidebar.getBoundingClientRect();
                      // 计算相对视口的 Y 坐标
                      const top = rowRect.top + rowRect.height / 2;
                      // X 坐标固定在侧边栏右侧外部
                      const left = sidebarRect.right;
                      setHoveredEntry({ entry: entryData, top, left });
                    }
                  } else {
                    setHoveredEntry(null);
                  }
                }}
              />
              {selectedHash === entry.hash && detail && (
                <CommitFiles
                  detail={detail}
                  onFileClick={(file) => {
                    useEditorStore.getState().openCommitDiff(detail.hash, detail.shortHash, file);
                  }}
                />
              )}
              {selectedHash === entry.hash && loading && (
                <div className="pl-8 py-1 text-overlay0">加载中...</div>
              )}
            </div>
          ))}

          {/* 全局悬浮面板（通过 Portal 或直接 fixed 挂载） */}
          {hoveredEntry && (
            <div 
              className="fixed z-[100] w-72 p-3 bg-base border border-surface1 rounded-lg shadow-xl pointer-events-none transition-opacity duration-150"
              style={{
                top: hoveredEntry.top,
                left: hoveredEntry.left + 8, // 加 8px 间距
                transform: 'translateY(-50%)'
              }}
            >
              {/* 左侧小箭头 */}
              <div className="absolute top-1/2 -left-[6px] -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[6px] border-r-surface1" />
              <div className="absolute top-1/2 -left-[5px] -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[5px] border-r-base" />
              
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-text truncate leading-tight">
                    {hoveredEntry.entry.message}
                  </span>
                  <span className="text-[10px] font-mono text-overlay0 bg-surface0 px-1.5 py-0.5 rounded shrink-0">
                    {hoveredEntry.entry.shortHash}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-subtext0">
                  <span className="font-medium text-subtext1">{hoveredEntry.entry.author}</span>
                  <span className="text-overlay0">•</span>
                  <span className="text-overlay0">{formatDate(hoveredEntry.entry.date)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function parseRefs(refs: string): { branches: string[]; tags: string[] } {
  if (!refs.trim()) return { branches: [], tags: [] };
  const parts = refs.split(',').map((s) => s.trim());
  const branches: string[] = [];
  const tags: string[] = [];
  for (const p of parts) {
    if (p.startsWith('tag:')) {
      tags.push(p.replace('tag:', '').trim());
    } else if (p === 'HEAD') {
      // skip standalone HEAD
    } else {
      // "HEAD -> main" or "origin/main"
      const name = p.replace('HEAD -> ', '').trim();
      if (name) branches.push(name);
    }
  }
  return { branches, tags };
}

function GraphRow({
  entry,
  currentBranch,
  isSelected,
  onSelect,
  onHoverChange,
}: {
  entry: GitLogEntry;
  currentBranch?: string;
  isSelected: boolean;
  onSelect: (hash: string) => void;
  onHoverChange: (entry: GitLogEntry | null, rect: DOMRect | null) => void;
}) {
  const { branches, tags } = parseRefs(entry.refs);
  const bg = isSelected ? 'bg-surface1 shadow-sm' : '';
  const rowRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      if (rowRef.current) {
        onHoverChange(entry, rowRef.current.getBoundingClientRect());
      }
    }, 400); // 延迟 400ms 显示
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    onHoverChange(null, null);
  };

  // 清理 timer
  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  return (
    <div
      ref={rowRef}
      className={`relative flex items-center h-[24px] px-2 hover:bg-surface0 group cursor-pointer transition-all duration-150 ${bg}`}
      onClick={() => onSelect(entry.hash)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 图形线 + 节点 */}
      <div className="flex items-center w-5 shrink-0 justify-center">
        <svg width="16" height="24" viewBox="0 0 16 24">
          <line x1="8" y1="0" x2="8" y2="24" stroke="currentColor" className="text-accent" strokeWidth="1.5" />
          <circle cx="8" cy="12" r="3.5" fill="currentColor" className="text-accent" />
        </svg>
      </div>

      {/* 提交信息 */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 ml-1">
        <span className="truncate text-subtext1">{entry.message}</span>
      </div>

      {/* 分支/标签标识 */}
      <div className="flex items-center gap-1 shrink-0 ml-1">
        {branches.map((b) => (
          <BranchBadge key={b} name={b} isCurrent={b === currentBranch} />
        ))}
        {tags.map((t) => (
          <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-yellow/20 text-yellow font-medium">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function BranchBadge({ name, isCurrent }: { name: string; isCurrent: boolean }) {
  const isRemote = name.startsWith('origin/');
  const bg = isCurrent ? 'bg-accent/20' : isRemote ? 'bg-blue/15' : 'bg-surface1';
  const text = isCurrent ? 'text-accent' : isRemote ? 'text-blue' : 'text-subtext0';

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${bg} ${text} whitespace-nowrap`}>
      {name}
    </span>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} 小时前`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay} 天前`;
    return d.toLocaleDateString('zh-CN');
  } catch {
    return dateStr;
  }
}

function CommitFiles({
  detail,
  onFileClick,
}: {
  detail: CommitDetail;
  onFileClick: (file: string) => void;
}) {
  return (
    <div className="text-xs">
      {detail.files.map((f) => {
        const parts = f.file.replace(/\\/g, '/').split('/');
        const name = parts.pop() || f.file;
        const dir = parts.join('/');

        return (
          <div
            key={f.file}
            className="flex items-center h-[22px] pl-8 pr-2 hover:bg-surface0 cursor-pointer"
            onClick={() => onFileClick(f.file)}
          >
            <CommitFileIcon fileName={name} />
            <span className="truncate text-subtext1 ml-1.5">{name}</span>
            {dir && (
              <span className="truncate text-overlay0 ml-1">{dir}</span>
            )}
            <span className="ml-auto shrink-0 text-overlay0 font-mono pl-2">
              {f.stats}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CommitFileIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  let color = 'text-overlay1';
  let text = '';
  switch (ext) {
    case 'ts': case 'tsx': color = 'text-blue'; text = 'TS'; break;
    case 'js': case 'jsx': color = 'text-yellow'; text = 'JS'; break;
    case 'json': color = 'text-yellow'; text = '{}'; break;
    case 'css': color = 'text-blue'; text = '#'; break;
    case 'html': color = 'text-red'; text = '<>'; break;
    case 'md': color = 'text-subtext0'; text = 'M'; break;
    default: text = '·'; break;
  }
  return (
    <span className={`${color} font-mono text-[10px] w-4 text-center shrink-0`}>
      {text}
    </span>
  );
}
