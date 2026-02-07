import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { File } from 'lucide-react';
import { useLayoutStore } from '@/stores/layoutStore';

export default function QuickOpenDialog() {
  const { quickOpenVisible, toggleQuickOpen } = useLayoutStore();
  const [query, setQuery] = useState('');
  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时加载文件列表
  useEffect(() => {
    if (!quickOpenVisible) return;
    setQuery('');
    setSelectedIndex(0);
    fetch('/api/files/list')
      .then((res) => res.json())
      .then((files: string[]) => setAllFiles(files))
      .catch(() => setAllFiles([]));
  }, [quickOpenVisible]);

  // 自动聚焦
  useEffect(() => {
    if (quickOpenVisible) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [quickOpenVisible]);

  // 模糊匹配
  const filtered = useMemo(() => {
    if (!query.trim()) return allFiles.slice(0, 20);
    const lower = query.toLowerCase();
    return allFiles
      .filter((f) => fuzzyMatch(f.toLowerCase(), lower))
      .slice(0, 20);
  }, [query, allFiles]);

  // 选中索引边界修正
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length, query]);

  const openFile = useCallback((filePath: string) => {
    window.dispatchEvent(
      new CustomEvent('open-file', { detail: { path: filePath } }),
    );
    toggleQuickOpen();
  }, [toggleQuickOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        openFile(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      toggleQuickOpen();
    }
  };

  if (!quickOpenVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex justify-center pt-[15vh] z-50"
      onClick={toggleQuickOpen}
    >
      <div
        className="bg-base border border-surface0 rounded-lg shadow-xl w-[500px] max-h-[360px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-surface0">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入文件名搜索..."
            className="w-full px-2 py-1.5 text-sm bg-surface0 border border-surface1 rounded text-text placeholder:text-overlay0 focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-xs text-overlay0">无匹配文件</div>
          )}
          {filtered.map((file, i) => (
            <FileItem
              key={file}
              file={file}
              query={query}
              isSelected={i === selectedIndex}
              onClick={() => openFile(file)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FileItem({
  file, query, isSelected, onClick,
}: {
  file: string;
  query: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const name = file.split('/').pop() || file;
  const dir = file.substring(0, file.length - name.length);

  return (
    <button
      className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs transition-colors ${
        isSelected ? 'bg-surface0 text-accent' : 'text-text hover:bg-surface0/50'
      }`}
      onClick={onClick}
    >
      <File size={14} className="shrink-0 text-overlay1" />
      <span className="truncate">
        <HighlightMatch text={name} query={query} />
      </span>
      {dir && (
        <span className="ml-auto text-overlay0 truncate text-[10px]">{dir}</span>
      )}
    </button>
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let qi = 0;
  for (let i = 0; i < text.length; i++) {
    if (qi < qLower.length && lower[i] === qLower[qi]) {
      parts.push(
        <span key={i} className="text-accent font-semibold">{text[i]}</span>
      );
      qi++;
    } else {
      parts.push(text[i]);
    }
  }
  return <>{parts}</>;
}

function fuzzyMatch(text: string, pattern: string): boolean {
  let pi = 0;
  for (let i = 0; i < text.length && pi < pattern.length; i++) {
    if (text[i] === pattern[pi]) pi++;
  }
  return pi === pattern.length;
}
