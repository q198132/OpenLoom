import { useState, useMemo } from 'react';
import { Search, File } from 'lucide-react';
import { useSearchStore } from '@/stores/searchStore';

export default function SearchPanel() {
  const { query, results, loading, search, clear } = useSearchStore();
  const [inputValue, setInputValue] = useState(query);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search(inputValue);
    }
  };

  const handleClickResult = (file: string) => {
    window.dispatchEvent(
      new CustomEvent('open-file', { detail: { path: file } }),
    );
  };

  // 按文件分组
  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>();
    for (const r of results) {
      const list = map.get(r.file) || [];
      list.push(r);
      map.set(r.file, list);
    }
    return map;
  }, [results]);

  return (
    <div className="h-full bg-mantle flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between h-9 px-3 border-b border-surface0">
        <div className="flex items-center gap-2 text-xs font-medium text-subtext0 uppercase tracking-wider">
          <Search size={14} />
          <span>搜索</span>
        </div>
      </div>

      {/* 搜索输入框 */}
      <div className="px-3 py-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索文件内容..."
          className="w-full px-2 py-1.5 text-xs bg-surface0 border border-surface1 rounded text-text placeholder:text-overlay0 focus:outline-none focus:border-accent"
          autoFocus
        />
      </div>

      {/* 结果列表 */}
      <div className="flex-1 overflow-y-auto px-1">
        {loading && (
          <div className="px-3 py-2 text-xs text-overlay0">搜索中...</div>
        )}
        {!loading && query && results.length === 0 && (
          <div className="px-3 py-2 text-xs text-overlay0">无匹配结果</div>
        )}
        {!loading && [...grouped.entries()].map(([file, matches]) => (
          <FileGroup
            key={file}
            file={file}
            matches={matches}
            query={query}
            onClick={handleClickResult}
          />
        ))}
      </div>
    </div>
  );
}

function FileGroup({
  file, matches, query, onClick,
}: {
  file: string;
  matches: { line: string; lineNumber: number; column: number }[];
  query: string;
  onClick: (file: string) => void;
}) {
  return (
    <div className="mb-1">
      <button
        className="flex items-center gap-1.5 w-full px-2 py-1 text-xs text-accent hover:bg-surface0 rounded transition-colors truncate"
        onClick={() => onClick(file)}
      >
        <File size={12} className="shrink-0" />
        <span className="truncate">{file}</span>
        <span className="ml-auto text-overlay0 shrink-0">{matches.length}</span>
      </button>
      {matches.map((m, i) => (
        <button
          key={i}
          className="flex items-center w-full px-2 pl-6 py-0.5 text-xs text-subtext1 hover:bg-surface0 rounded transition-colors"
          onClick={() => onClick(file)}
        >
          <span className="text-overlay0 mr-2 shrink-0">{m.lineNumber}</span>
          <HighlightLine text={m.line} query={query} />
        </button>
      ))}
    </div>
  );
}

function HighlightLine({ text, query }: { text: string; query: string }) {
  if (!query) return <span className="truncate">{text}</span>;

  const idx = text.indexOf(query);
  if (idx === -1) return <span className="truncate">{text}</span>;

  return (
    <span className="truncate">
      {text.substring(0, idx)}
      <span className="bg-yellow/30 text-yellow">{text.substring(idx, idx + query.length)}</span>
      {text.substring(idx + query.length)}
    </span>
  );
}
