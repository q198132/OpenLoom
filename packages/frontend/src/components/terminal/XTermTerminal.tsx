import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface XTermTerminalProps {
  id: string;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  className?: string;
}

const XTermTerminal: React.FC<XTermTerminalProps> = ({
  id,
  onData,
  onResize,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // 链接点击处理函数
  const handleLinkClick = useCallback((url: string) => {
    console.log('终端中点击链接:', url);
    window.open(url, '_blank');
  }, []);

  // 初始化终端
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    // 创建终端实例
    const terminal = new Terminal({
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      fontSize: 14,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
      },
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      allowTransparency: false,
    });

    // 创建fit插件
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    // 创建web links插件 - 使用默认的链接处理
    const webLinksAddon = new WebLinksAddon(
      (event: MouseEvent, uri: string) => {
        event.preventDefault();
        handleLinkClick(uri);
      },
    );
    terminal.loadAddon(webLinksAddon);

    // 打开终端
    terminal.open(containerRef.current);

    // 适配大小
    fitAddon.fit();

    // 绑定数据事件
    terminal.onData((data) => {
      onData?.(data);
    });

    // 绑定调整大小事件
    terminal.onResize(({ cols, rows }) => {
      onResize?.(cols, rows);
    });

    // 保存引用
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // 初始调整大小
    const { cols, rows } = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
    onResize?.(cols, rows);

    // 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      const { cols, rows } = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
      onResize?.(cols, rows);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // 清理函数
    return () => {
      resizeObserver.disconnect();
      webLinksAddon.dispose();
      fitAddon.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [id, onData, onResize, handleLinkClick]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    />
  );
};

export default XTermTerminal;