import * as pty from 'node-pty';
import os from 'os';

export class PtyManager {
  private process: pty.IPty | null = null;
  private dataListeners: ((data: string) => void)[] = [];
  private exitListeners: ((code: number) => void)[] = [];

  spawn(cols = 80, rows = 24, cwd?: string): void {
    let shell: string;
    let args: string[];

    if (os.platform() === 'win32') {
      shell = 'powershell.exe';
      args = [];
    } else {
      // Mac/Linux: 使用登录 shell 以加载完整的环境变量
      // 注意：bash 需要 -l 参数，zsh 自动就是登录 shell
      shell = process.env.SHELL || '/bin/bash';
      const isBash = shell.includes('bash');
      args = isBash ? ['-l'] : []; // bash 需要显式 -l 参数
    }

    this.process = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: cwd || process.cwd(),
      env: process.env as Record<string, string>,
    });

    this.process.onData((data) => {
      for (const listener of this.dataListeners) {
        listener(data);
      }
    });

    this.process.onExit(({ exitCode }) => {
      for (const listener of this.exitListeners) {
        listener(exitCode);
      }
    });
  }

  write(data: string): void {
    this.process?.write(data);
  }

  resize(cols: number, rows: number): void {
    try {
      console.log(`[pty] resize: ${cols}x${rows}`);
      this.process?.resize(cols, rows);
    } catch {
      // ignore resize errors
    }
  }

  onData(listener: (data: string) => void): () => void {
    this.dataListeners.push(listener);
    return () => {
      const idx = this.dataListeners.indexOf(listener);
      if (idx !== -1) this.dataListeners.splice(idx, 1);
    };
  }

  onExit(listener: (code: number) => void): () => void {
    this.exitListeners.push(listener);
    return () => {
      const idx = this.exitListeners.indexOf(listener);
      if (idx !== -1) this.exitListeners.splice(idx, 1);
    };
  }

  kill(): void {
    this.process?.kill();
    this.process = null;
  }

  get pid(): number | undefined {
    return this.process?.pid;
  }
}
