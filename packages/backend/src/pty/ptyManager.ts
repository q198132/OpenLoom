import * as pty from 'node-pty';
import os from 'os';

export type ShellType = 'powershell' | 'cmd';

interface PtyInstance {
  process: pty.IPty;
  shellType: ShellType;
}

export class PtyManager {
  private instances: Map<number, PtyInstance> = new Map();
  private dataListeners: Map<number, ((data: string) => void)[]> = new Map();
  private exitListeners: Map<number, ((code: number) => void)[]> = new Map();
  private nextId = 1;

  spawn(cols = 80, rows = 24, cwd?: string, shellType: ShellType = 'powershell'): number {
    const id = this.nextId++;
    let shell: string;
    let args: string[];

    if (os.platform() === 'win32') {
      // Windows: 支持 PowerShell 和 CMD 选择
      if (shellType === 'cmd') {
        shell = 'cmd.exe';
        args = [];
      } else {
        shell = 'powershell.exe';
        args = [];
      }
    } else {
      // Mac/Linux: 使用登录 shell 以加载完整的环境变量
      // 注意：bash 需要 -l 参数，zsh 自动就是登录 shell
      shell = process.env.SHELL || '/bin/bash';
      const isBash = shell.includes('bash');
      args = isBash ? ['-l'] : []; // bash 需要显式 -l 参数
    }

    const process = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: cwd || process.cwd(),
      env: process.env as Record<string, string>,
      // Windows 10 用户反馈 opencode/claude code 等工具会卡住
      // 尝试禁用 ConPTY，使用 winpty 后端以获得更好的兼容性
      // @ts-expect-error - useConpty 是 Windows 专属选项
      useConpty: false,
    });

    const dataListeners: ((data: string) => void)[] = [];
    const exitListeners: ((code: number) => void)[] = [];

    process.onData((data) => {
      for (const listener of dataListeners) {
        listener(data);
      }
    });

    process.onExit(({ exitCode }) => {
      for (const listener of exitListeners) {
        listener(exitCode);
      }
      // 进程退出后清理
      this.instances.delete(id);
      this.dataListeners.delete(id);
      this.exitListeners.delete(id);
    });

    this.instances.set(id, { process, shellType });
    this.dataListeners.set(id, dataListeners);
    this.exitListeners.set(id, exitListeners);

    return id;
  }

  getInstance(id: number): pty.IPty | null {
    return this.instances.get(id)?.process || null;
  }

  write(id: number, data: string): void {
    this.instances.get(id)?.process.write(data);
  }

  resize(id: number, cols: number, rows: number): void {
    try {
      console.log(`[pty] resize ${id}: ${cols}x${rows}`);
      this.instances.get(id)?.process.resize(cols, rows);
    } catch {
      // ignore resize errors
    }
  }

  onData(id: number, listener: (data: string) => void): () => void {
    const listeners = this.dataListeners.get(id) || [];
    this.dataListeners.set(id, listeners);
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  onExit(id: number, listener: (code: number) => void): () => void {
    const listeners = this.exitListeners.get(id) || [];
    this.exitListeners.set(id, listeners);
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  kill(id: number): void {
    this.instances.get(id)?.process.kill();
    this.instances.delete(id);
    this.dataListeners.delete(id);
    this.exitListeners.delete(id);
  }

  getPid(id: number): number | undefined {
    return this.instances.get(id)?.process.pid;
  }

  get shellType(): ShellType | null {
    // 返回第一个实例的 shell 类型（兼容旧代码）
    for (const [, instance] of this.instances) {
      return instance.shellType;
    }
    return null;
  }

  get pid(): number | undefined {
    // 返回第一个实例的 pid（兼容旧代码）
    for (const [, instance] of this.instances) {
      return instance.process.pid;
    }
    return undefined;
  }
}
