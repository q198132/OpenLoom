import { useEffect, useRef } from 'react';
import { TerminalSquare, Circle } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
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
  background: '#dce0e8',
  foreground: '#4c4f69',
  cursor: '#dc8a78',
  selectionBackground: '#acb0be',
  black: '#5c5f77',
  red: '#d20f39',
  green: '#40a02b',
  yellow: '#df8e1d',
  blue: '#1e66f5',
  magenta: '#8839ef',
  cyan: '#179299',
  white: '#acb0be',
  brightBlack: '#6c6f85',
  brightRed: '#d20f39',
  brightGreen: '#40a02b',
  brightYellow: '#df8e1d',
  brightBlue: '#1e66f5',
  brightMagenta: '#8839ef',
  brightCyan: '#179299',
  brightWhite: '#bcc0cc',
};

export default function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const { connected, setConnected } = useTerminalStore();
  const theme = useLayoutStore((s) => s.theme);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 14,
      theme: DARK_THEME,
      cursorBlink: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(containerRef.current);

    termRef.current = term;
    fitRef.current = fitAddon;

    // 防抖 fit + resize
    let resizeTimer: ReturnType<typeof setTimeout>;
    let lastCols = 0;
    let lastRows = 0;

    const doFitAndResize = () => {
      try {
        fitAddon.fit();
      } catch { return; }
      const { cols, rows } = term;
      if (cols !== lastCols || rows !== lastRows) {
        lastCols = cols;
        lastRows = rows;
        api.ptyResize(cols, rows).catch(() => {});
      }
    };

    const debouncedFit = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doFitAndResize, 50);
    };

    // 启动 Tauri PTY 并监听输出事件
    let unlistenFn: (() => void) | null = null;

    const startPty = async () => {
      try {
        await api.ptySpawn();
        setConnected(true);

        // 监听 PTY 输出事件
        const unlisten = await listen<string>('pty-output', (event) => {
          term.write(event.payload);
        });
        unlistenFn = unlisten;

        // 终端输入 → PTY
        term.onData((data) => {
          api.ptyWrite(data).catch(() => {});
        });

        requestAnimationFrame(() => {
          doFitAndResize();
          setTimeout(doFitAndResize, 200);
        });
      } catch {
        setConnected(false);
      }
    };

    startPty();

    // ResizeObserver 监听容器变化（防抖）
    const observer = new ResizeObserver(debouncedFit);
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
      if (unlistenFn) unlistenFn();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 主题切换联动
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = theme === 'dark' ? DARK_THEME : LIGHT_THEME;
    }
  }, [theme]);

  return (
    <div className="h-full bg-crust flex flex-col">
      <div className="flex items-center gap-2 h-8 px-3 bg-mantle border-b border-surface0">
        <TerminalSquare size={14} className="text-subtext0" />
        <span className="text-xs text-subtext0">终端</span>
        <Circle
          size={8}
          className={connected ? 'fill-green text-green' : 'fill-red text-red'}
        />
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
