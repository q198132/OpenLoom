import { Client } from 'ssh2';
import SFTPClient from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';
import type { SSHConnection, SSHSession, FileNode } from '@openloom/shared';
import { parseSSHConfig, expandHome } from './sshConfigParser.js';

interface ActiveConnection {
  client: Client;
  sftp: SFTPClient;
  connection: SSHConnection;
}

class SSHService {
  private connections: Map<string, SSHConnection> = new Map();
  private activeConnection: ActiveConnection | null = null;
  private configPath: string;

  constructor() {
    // 存储手动添加的连接配置
    this.configPath = path.join(process.cwd(), '.ssh-connections.json');
    this.loadConnections();
  }

  /**
   * 加载所有连接配置
   */
  private loadConnections(): void {
    // 加载手动添加的连接
    if (fs.existsSync(this.configPath)) {
      try {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const saved: SSHConnection[] = JSON.parse(data);
        for (const conn of saved) {
          conn.source = 'manual';
          this.connections.set(conn.id, conn);
        }
      } catch (error) {
        console.error('[ssh] Failed to load connections:', error);
      }
    }

    // 加载 ~/.ssh/config 中的连接
    const configHosts = parseSSHConfig();
    for (const host of configHosts) {
      const id = `config-${host.name}`;
      this.connections.set(id, {
        id,
        name: host.name,
        host: host.host,
        port: host.port,
        username: host.username,
        authType: host.identityFile ? 'key' : 'password',
        privateKeyPath: host.identityFile,
        source: 'config',
      });
    }
  }

  /**
   * 保存手动添加的连接
   */
  private saveConnections(): void {
    const manualConnections = Array.from(this.connections.values()).filter(
      (c) => c.source === 'manual'
    );
    fs.writeFileSync(this.configPath, JSON.stringify(manualConnections, null, 2));
  }

  /**
   * 获取所有连接配置
   */
  getConnections(): SSHConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 添加新连接
   */
  addConnection(conn: Omit<SSHConnection, 'id' | 'source'>): SSHConnection {
    const id = `manual-${Date.now()}`;
    const newConn: SSHConnection = {
      ...conn,
      id,
      source: 'manual',
    };
    this.connections.set(id, newConn);
    this.saveConnections();
    return newConn;
  }

  /**
   * 删除连接
   */
  removeConnection(id: string): boolean {
    const conn = this.connections.get(id);
    if (conn && conn.source === 'manual') {
      this.connections.delete(id);
      this.saveConnections();
      return true;
    }
    return false;
  }

  /**
   * 更新连接
   */
  updateConnection(id: string, updates: Partial<SSHConnection>): SSHConnection | null {
    const conn = this.connections.get(id);
    if (!conn || conn.source !== 'manual') {
      return null;
    }

    const updated = { ...conn, ...updates, id, source: 'manual' as const };
    this.connections.set(id, updated);
    this.saveConnections();
    return updated;
  }

  /**
   * 建立 SSH 连接
   */
  async connect(id: string): Promise<SSHSession> {
    const conn = this.connections.get(id);
    if (!conn) {
      throw new Error('Connection not found');
    }

    // 断开现有连接
    if (this.activeConnection) {
      this.disconnect();
    }

    const client = new Client();
    const sftp = new SFTPClient();

    return new Promise((resolve, reject) => {
      const config: ConstructorParameters<typeof Client>[0] = {
        host: conn.host,
        port: conn.port,
        username: conn.username,
        readyTimeout: 30000,
      };

      // 认证方式
      if (conn.authType === 'key' && conn.privateKeyPath) {
        const keyPath = expandHome(conn.privateKeyPath);
        try {
          config.privateKey = fs.readFileSync(keyPath);
        } catch {
          reject(new Error(`Failed to read private key: ${keyPath}`));
          return;
        }
      } else if (conn.password) {
        config.password = conn.password;
      }

      client
        .on('ready', async () => {
          try {
            await sftp.connect(config);
            this.activeConnection = { client, sftp, connection: conn };
            console.log(`[ssh] Connected to ${conn.name}`);

            resolve({
              connectionId: id,
              status: 'connected',
              connectedAt: new Date().toISOString(),
            });
          } catch (error) {
            client.end();
            reject(error);
          }
        })
        .on('error', (err) => {
          reject(err);
        })
        .connect(config);
    });
  }

  /**
   * 断开当前连接
   */
  disconnect(): void {
    if (this.activeConnection) {
      this.activeConnection.sftp.end().catch(() => {});
      this.activeConnection.client.end();
      this.activeConnection = null;
      console.log('[ssh] Disconnected');
    }
  }

  /**
   * 获取当前会话信息
   */
  getSession(): SSHSession | null {
    if (!this.activeConnection) {
      return null;
    }
    return {
      connectionId: this.activeConnection.connection.id,
      status: 'connected',
      connectedAt: new Date().toISOString(),
    };
  }

  /**
   * 获取当前连接（用于 PTY）
   */
  getActiveClient(): Client | null {
    return this.activeConnection?.client || null;
  }

  /**
   * 获取远程文件树
   */
  async getRemoteFileTree(remotePath?: string): Promise<FileNode[]> {
    if (!this.activeConnection) {
      throw new Error('No active SSH connection');
    }

    const targetPath = remotePath || '.';
    const entries = await this.activeConnection.sftp.list(targetPath);

    const nodes: FileNode[] = [];
    for (const entry of entries) {
      // 跳过隐藏文件（可选）
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.posix.join(targetPath, entry.name);
      nodes.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.type === 'd',
        children: entry.type === 'd' ? [] : undefined,
      });
    }

    // 排序：文件夹优先
    nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  }

  /**
   * 读取远程文件
   */
  async readRemoteFile(remotePath: string): Promise<string> {
    if (!this.activeConnection) {
      throw new Error('No active SSH connection');
    }

    const content = await this.activeConnection.sftp.get(remotePath);
    return content.toString('utf-8');
  }

  /**
   * 写入远程文件
   */
  async writeRemoteFile(remotePath: string, content: string): Promise<void> {
    if (!this.activeConnection) {
      throw new Error('No active SSH connection');
    }

    await this.activeConnection.sftp.put(Buffer.from(content), remotePath);
  }

  /**
   * 删除远程文件
   */
  async deleteRemoteFile(remotePath: string): Promise<void> {
    if (!this.activeConnection) {
      throw new Error('No active SSH connection');
    }

    await this.activeConnection.sftp.delete(remotePath);
  }

  /**
   * 创建远程目录
   */
  async createRemoteDirectory(remotePath: string): Promise<void> {
    if (!this.activeConnection) {
      throw new Error('No active SSH connection');
    }

    await this.activeConnection.sftp.mkdir(remotePath, true);
  }

  /**
   * 重命名远程文件或目录
   */
  async renameRemoteFile(oldPath: string, newPath: string): Promise<void> {
    if (!this.activeConnection) {
      throw new Error('No active SSH connection');
    }

    await this.activeConnection.sftp.rename(oldPath, newPath);
  }

  /**
   * 删除远程目录（递归）
   */
  async deleteRemoteDirectory(remotePath: string): Promise<void> {
    if (!this.activeConnection) {
      throw new Error('No active SSH connection');
    }

    await this.activeConnection.sftp.rmdir(remotePath, true);
  }
}

export const sshService = new SSHService();
