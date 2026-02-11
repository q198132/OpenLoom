import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { listen } from '@tauri-apps/api/event';
import * as api from '@/lib/api';
import { useTerminalStore } from '@/stores/terminalStore';
import { useLayoutStore } from '@/stores/layoutStore';

const DARK_THEME = {
  background: '#11111b',
  foreground: '#cdd6f4',
  cursor: '#f5e0dc',
  selectionBackground: '#585b70',
  black: '#45475a',
  red: '#f38ba8',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  blue: '#89b4fa',
  magenta: '#cba6f7',
  cyan: '#94e2d5',
  white: '#bac2de',
  brightBlack: '#585b70',
  brightRed: '#f38ba8',
  brightGreen: '#a6e3a1',
  brightYellow: '#f9e2af',
  brightBlue: '#89b4fa',
  brightMagenta: '#cba6f7',
  brightCyan: '#94e2d5',
  brightWhite: '#a6adc8',
};

const LIGHT_THEME = {
  background: '#eff1f5',
  foreground: '#4c4f69',
  cursor: '#dc8a78',
  selectionBackground: '#9ca0b0',
  black: '#4c4f69',
  red: '#d20f39',
  green: '#40a02b',
  yellow: '#df8e1d',
  blue: '#1e66f5',
  magenta: '#8839ef',
  cyan: '#179299',
  white: '#dce0e8',
  brightBlack: '#7c7f93',
  brightRed: '#d20f39',
  brightGreen: '#40a02b',
  brightYellow: '#df8e1d',
  brightBlue: '#1e66f5',
  brightMagenta: '#8839ef',
  brightCyan: '#179299',
  brightWhite: '#eff1f5',
};

interface TerminalInstanceProps {
  id: number;
  visible: boolean;
}

export default function TerminalInstance({ id, visible }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [dragging, setDragging] = useState(false);
  const setConnected = useTerminalStore((s) => s.setConnected);
  const theme = useLayoutStore((s) => s.theme);

  // 全局拖拽检测：window 级别监听，避免 xterm canvas 拦截事件
  useEffect(() => {
    let counter = 0;
    const onDragEnter = () => { counter++; setDragging(true); };
    const onDragLeave = () => { counter--; if (counter <= 0) { counter = 0; setDragging(false); } };
    const onDrop = () => { counter = 0; setDragging(false); };
    const onDragEnd = () => { counter = 0; setDragging(false); };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('dragend', onDragEnd);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('dragend', onDragEnd);
    };
  }, []);

  // 初始化 xterm 实例并连接 PTY
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Menlo, Consolas, monospace",
      fontSize: 15,
      lineHeight: 1.25,
      letterSpacing: 0,
      fontWeight: '400',
      fontWeightBold: '600',
      theme: DARK_THEME,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);

    let webglAddon: WebglAddon | null = null;

    const loadWebgl = () => {
      try {
        webglAddon = new WebglAddon();
        webglAddon.onContextLoss(() => {
          webglAddon?.dispose();
          webglAddon = null;
          loadWebgl();
        });
        term.loadAddon(webglAddon);
      } catch {
        webglAddon = null;
      }
    };

    loadWebgl();

    termRef.current = term;
    fitRef.current = fitAddon;

    let lastCols = 0;
    let lastRows = 0;
    let resizeTimer: ReturnType<typeof setTimeout>;

    const doFitAndResize = () => {
      try {
        fitAddon.fit();
      } catch { return; }
      const { cols, rows } = term;
      if (cols !== lastCols || rows !== lastRows) {
        lastCols = cols;
        lastRows = rows;
        api.ptyResize(id, cols, rows).catch(() => {});
        // 清除 WebGL 纹理缓存并强制重绘，避免残影
        requestAnimationFrame(() => {
          if (webglAddon) {
            try { webglAddon.clearTextureAtlas(); } catch {}
          }
          term.refresh(0, term.rows - 1);
        });
      }
    };

    const debouncedFit = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doFitAndResize, 80);
    };

    // 监听 PTY 输出事件（按 id 过滤）
    let unlistenOutput: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    const setup = async () => {
      unlistenOutput = await listen<{ id: number; data: string }>('pty-output', (event) => {
        if (event.payload.id === id) {
          term.write(event.payload.data);
        }
      });

      unlistenExit = await listen<{ id: number }>('pty-exit', (event) => {
        if (event.payload.id === id) {
          setConnected(id, false);
        }
      });

      // 终端输入 → PTY
      term.onData((data) => {
        api.ptyWrite(id, data).catch(() => {});
      });

      requestAnimationFrame(() => {
        doFitAndResize();
        setTimeout(doFitAndResize, 200);
      });
    };

    setup();

    // 手动处理滚轮事件，避免 WebGL canvas 拦截导致滚动失效
    const container = containerRef.current;
    let scrollAccumulator = 0;
    const onWheel = (e: WheelEvent) => {
      if (term.buffer.active.length > term.rows) {
        e.preventDefault();
        scrollAccumulator += e.deltaY;
        // macOS 触控板 deltaY 很小（1~5），需要累积；鼠标滚轮 deltaY 较大（100+）
        const lines = Math.trunc(scrollAccumulator / 25);
        if (lines !== 0) {
          scrollAccumulator -= lines * 25;
          term.scrollLines(lines);
        }
      }
    };
    container.addEventListener('wheel', onWheel, { passive: false });

    const observer = new ResizeObserver(debouncedFit);
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
      container.removeEventListener('wheel', onWheel);
      if (unlistenOutput) unlistenOutput();
      if (unlistenExit) unlistenExit();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 主题切换联动
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = theme === 'dark' ? DARK_THEME : LIGHT_THEME;
    }
  }, [theme]);

  // visible 变化时重新 fit
  useEffect(() => {
    if (visible && fitRef.current) {
      requestAnimationFrame(() => {
        try { fitRef.current?.fit(); } catch {}
      });
    }
  }, [visible]);

  // 监听 Tauri 原生文件拖放事件（支持文件和文件夹路径）
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<string[]>('tauri://file-drop', (event) => {
      if (visible && event.payload.length > 0) {
        setDragging(false);
        const paths = event.payload.map(p => p.includes(' ') ? `"${p}"` : p).join(' ');
        api.ptyWrite(id, paths).catch(() => {});
      }
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [id, visible]);

  const handleOverlayDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleOverlayDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    // 应用内部拖拽（文件树）通过 web dataTransfer 传递路径
    const filePath = e.dataTransfer.getData('text/plain');
    if (filePath) {
      api.ptyWrite(id, filePath).catch(() => {});
    }
    // 系统文件管理器拖入的文件/文件夹由 tauri://file-drop 事件处理
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ display: visible ? 'block' : 'none' }}
    >
      <div ref={containerRef} className="h-full w-full" />
      {dragging && visible && (
        <div
          className="absolute inset-0 z-50 bg-accent/10 border-2 border-dashed border-accent flex items-center justify-center"
          onDragOver={handleOverlayDragOver}
          onDrop={handleOverlayDrop}
        >
          <span className="text-accent text-sm font-medium">释放以粘贴文件路径</span>
        </div>
      )}
    </div>
  );
}
