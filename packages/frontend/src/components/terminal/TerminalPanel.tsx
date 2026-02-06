import { useEffect, useRef } from 'react';
import { TerminalSquare, Circle } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { AttachAddon } from '@xterm/addon-attach';
import '@xterm/xterm/css/xterm.css';
import { WS_PTY_PATH } from '@claudegui/shared';
import { useTerminalStore } from '@/stores/terminalStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useControlSocket } from '@/hooks/useWebSocket';

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
  const { send } = useControlSocket();

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
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    // 连接 PTY WebSocket
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}${WS_PTY_PATH}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      const attachAddon = new AttachAddon(ws);
      term.loadAddon(attachAddon);
      setConnected(true);

      // 发送初始 resize
      const dims = fitAddon.proposeDimensions();
      if (dims) {
        send({ type: 'pty-resize', cols: dims.cols, rows: dims.rows });
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    // ResizeObserver 监听容器变化
    const observer = new ResizeObserver(() => {
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims) {
        send({ type: 'pty-resize', cols: dims.cols, rows: dims.rows });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      ws.close();
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
