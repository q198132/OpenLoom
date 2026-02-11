import { useEffect, useRef } from 'react';
import { Code2, X } from 'lucide-react';
import Editor, { DiffEditor, type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEditorStore } from '@/stores/editorStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useConfigStore, matchShortcut } from '@/stores/configStore';
import { useSSHStore } from '@/stores/sshStore';
import * as api from '@/lib/api';
import { catppuccinMocha, catppuccinLatte } from '@/themes/catppuccin';
import TabBar from './TabBar';
import DiffReviewBar from './DiffReviewBar';
import DiffReviewPanel from './DiffReviewPanel';
import ImagePreview from './ImagePreview';
import MarkdownPreview from './MarkdownPreview';
import DocxPreview from './DocxPreview';
import { useDiffReviewStore } from '@/stores/diffReviewStore';

export default function EditorPanel() {
  const { tabs, activeTab, fileContents, openFile, updateContent, commitDiff, closeCommitDiff } =
    useEditorStore();
  const theme = useLayoutStore((s) => s.theme);
  const shortcuts = useConfigStore((s) => s.config.shortcuts);
  const pendingReviews = useDiffReviewStore((s) => s.pendingReviews);
  const showDiff = pendingReviews.length > 0;
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);

  const activeContent = activeTab ? fileContents.get(activeTab) : undefined;
  const activeTabInfo = tabs.find((t) => t.path === activeTab);
  const activeLanguage = activeTabInfo?.language ?? 'plaintext';
  const activeViewType = activeTabInfo?.viewType ?? 'code';

  // 监听文件树的 open-file 事件
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent).detail.path;
      openFile(path);
    };
    window.addEventListener('open-file', handler);
    return () => window.removeEventListener('open-file', handler);
  }, [openFile]);

  // 保存文件快捷键
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (matchShortcut(e, shortcuts.saveFile)) {
        e.preventDefault();
        if (!activeTab) return;
        if (activeViewType === 'image' || activeViewType === 'docx') return;
        const content = fileContents.get(activeTab);
        if (content === undefined) return;

        // 检查是否为远程模式
        const sshSession = useSSHStore.getState().session;
        const isRemote = sshSession?.status === 'connected';

        if (isRemote) {
          await api.sshWriteFile(activeTab, content);
        } else {
          await api.writeFile(activeTab, content);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, activeViewType, fileContents, shortcuts.saveFile]);

  // 全局搜索快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchShortcut(e, shortcuts.globalSearch)) {
        e.preventDefault();
        const layout = useLayoutStore.getState();
        layout.setSidebarTab('search');
        if (!layout.sidebarVisible) layout.toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts.globalSearch]);

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

  if (tabs.length === 0 && !showDiff && !commitDiff) {
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
      ) : commitDiff ? (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-9 px-3 bg-mantle border-b border-surface0 shrink-0">
            <span className="text-xs text-subtext0">
              {commitDiff.file}
              <span className="text-overlay0 ml-2">
                ({commitDiff.shortHash})
              </span>
            </span>
            <button
              onClick={closeCommitDiff}
              className="p-1 rounded hover:bg-surface0 text-overlay0 hover:text-text transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <DiffEditor
              original={commitDiff.oldContent}
              modified={commitDiff.newContent}
              language={commitDiff.language}
              theme={theme === 'dark' ? 'catppuccin-mocha' : 'catppuccin-latte'}
              onMount={(_editor, monaco) => {
                monaco.editor.defineTheme('catppuccin-mocha', catppuccinMocha);
                monaco.editor.defineTheme('catppuccin-latte', catppuccinLatte);
                monaco.editor.setTheme(
                  theme === 'dark' ? 'catppuccin-mocha' : 'catppuccin-latte',
                );
              }}
              options={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                readOnly: true,
                renderSideBySide: true,
                scrollBeyondLastLine: false,
                minimap: { enabled: false },
              }}
            />
          </div>
        </div>
      ) : (
        <>
          <TabBar />
          <div className="flex-1 overflow-hidden">
            {activeTab && activeContent !== undefined && (
              activeViewType === 'image' ? (
                <ImagePreview path={activeTab} base64={activeContent} />
              ) : activeViewType === 'markdown' ? (
                <MarkdownPreview
                  content={activeContent}
                  language={activeLanguage}
                  onContentChange={(value) => updateContent(activeTab, value)}
                />
              ) : activeViewType === 'docx' ? (
                <DocxPreview base64={activeContent} />
              ) : (
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
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
