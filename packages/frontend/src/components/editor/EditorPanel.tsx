import { useEffect, useRef } from 'react';
import { Code2 } from 'lucide-react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEditorStore } from '@/stores/editorStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { catppuccinMocha, catppuccinLatte } from '@/themes/catppuccin';
import TabBar from './TabBar';
import DiffReviewBar from './DiffReviewBar';
import DiffReviewPanel from './DiffReviewPanel';
import { useDiffReviewStore } from '@/stores/diffReviewStore';

export default function EditorPanel() {
  const { tabs, activeTab, fileContents, openFile, updateContent } =
    useEditorStore();
  const theme = useLayoutStore((s) => s.theme);
  const pendingReviews = useDiffReviewStore((s) => s.pendingReviews);
  const showDiff = pendingReviews.length > 0;
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);

  const activeContent = activeTab ? fileContents.get(activeTab) : undefined;
  const activeLanguage =
    tabs.find((t) => t.path === activeTab)?.language ?? 'plaintext';

  // 监听文件树的 open-file 事件
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent).detail.path;
      openFile(path);
    };
    window.addEventListener('open-file', handler);
    return () => window.removeEventListener('open-file', handler);
  }, [openFile]);

  // Ctrl+S 保存
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!activeTab) return;
        const content = fileContents.get(activeTab);
        if (content === undefined) return;
        fetch('/api/files/write', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: activeTab, content }),
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, fileContents]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.defineTheme('catppuccin-mocha', catppuccinMocha);
    monaco.editor.defineTheme('catppuccin-latte', catppuccinLatte);
    monaco.editor.setTheme(
      theme === 'dark' ? 'catppuccin-mocha' : 'catppuccin-latte',
    );
  };

  // 主题切换
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(
        theme === 'dark' ? 'catppuccin-mocha' : 'catppuccin-latte',
      );
    }
  }, [theme]);

  if (tabs.length === 0 && !showDiff) {
    return (
      <div className="h-full bg-base flex flex-col items-center justify-center text-overlay0 gap-3">
        <Code2 size={48} strokeWidth={1} />
        <span className="text-sm">打开文件开始编辑</span>
      </div>
    );
  }

  return (
    <div className="h-full bg-base flex flex-col">
      <DiffReviewBar />
      {showDiff ? (
        <div className="flex-1 overflow-hidden">
          <DiffReviewPanel />
        </div>
      ) : (
        <>
          <TabBar />
          <div className="flex-1 overflow-hidden">
            {activeTab && activeContent !== undefined && (
              <Editor
                language={activeLanguage}
                value={activeContent}
                theme={theme === 'dark' ? 'catppuccin-mocha' : 'catppuccin-latte'}
                onMount={handleMount}
                onChange={(value) => {
                  if (value !== undefined && activeTab) {
                    updateContent(activeTab, value);
                  }
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
        </>
      )}
    </div>
  );
}
