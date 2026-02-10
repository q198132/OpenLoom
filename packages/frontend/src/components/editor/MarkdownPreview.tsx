import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Editor from '@monaco-editor/react';
import { useLayoutStore } from '@/stores/layoutStore';
import { catppuccinMocha, catppuccinLatte } from '@/themes/catppuccin';
import { Eye, Code2 } from 'lucide-react';

interface Props {
  content: string;
  language: string;
  onContentChange?: (value: string) => void;
}

export default function MarkdownPreview({ content, language, onContentChange }: Props) {
  const [mode, setMode] = useState<'preview' | 'source'>('preview');
  const theme = useLayoutStore((s) => s.theme);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center h-8 px-3 bg-mantle border-b border-surface0 shrink-0">
        <button
          onClick={() => setMode('preview')}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            mode === 'preview' ? 'bg-surface0 text-accent' : 'text-overlay0 hover:text-text'
          }`}
        >
          <Eye size={12} />
          <span>预览</span>
        </button>
        <button
          onClick={() => setMode('source')}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ml-1 ${
            mode === 'source' ? 'bg-surface0 text-accent' : 'text-overlay0 hover:text-text'
          }`}
        >
          <Code2 size={12} />
          <span>源码</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === 'preview' ? (
          <div className="h-full overflow-auto p-6">
            <article className="prose prose-invert max-w-none markdown-body">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          </div>
        ) : (
          <Editor
            language={language}
            value={content}
            theme={theme === 'dark' ? 'catppuccin-mocha' : 'catppuccin-latte'}
            onMount={(_editor, monaco) => {
              monaco.editor.defineTheme('catppuccin-mocha', catppuccinMocha);
              monaco.editor.defineTheme('catppuccin-latte', catppuccinLatte);
              monaco.editor.setTheme(
                theme === 'dark' ? 'catppuccin-mocha' : 'catppuccin-latte',
              );
            }}
            onChange={(value) => {
              if (value !== undefined) onContentChange?.(value);
            }}
            options={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              padding: { top: 8 },
            }}
          />
        )}
      </div>
    </div>
  );
}
