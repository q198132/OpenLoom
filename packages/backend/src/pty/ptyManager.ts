import * as pty from 'node-pty';
import os from 'os';

export class PtyManager {
  private process: pty.IPty | null = null;
  private dataListeners: ((data: string) => void)[] = [];
  private exitListeners: ((code: number) => void)[] = [];

  spawn(cols = 80, rows = 24, cwd?: string): void {
    const shell =
      os.platform() === 'win32'
        ? 'powershell.exe'
        : process.env.SHELL || '/bin/bash';

    this.process = pty.spawn(shell, [], {
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
      this.process?.resize(cols, rows);
    } catch {
      // ignore resize errors
    }
  }

  onData(listener: (data: string) => void): void {
    this.dataListeners.push(listener);
  }

  onExit(listener: (code: number) => void): void {
    this.exitListeners.push(listener);
  }

  kill(): void {
    this.process?.kill();
    this.process = null;
  }

  get pid(): number | undefined {
    return this.process?.pid;
  }
}
