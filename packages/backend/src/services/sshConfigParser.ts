import fs from 'fs';
import path from 'path';
import os from 'os';
import type { SSHConfigHost } from '@openloom/shared';

interface ConfigEntry {
  Host?: string;
  HostName?: string;
  Port?: string;
  User?: string;
  IdentityFile?: string;
  [key: string]: string | undefined;
}

/**
 * 解析 ~/.ssh/config 文件
 */
export function parseSSHConfig(): SSHConfigHost[] {
  const configPath = path.join(os.homedir(), '.ssh', 'config');
  const hosts: SSHConfigHost[] = [];

  if (!fs.existsSync(configPath)) {
    return hosts;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const entries = parseConfigContent(content);

    for (const entry of entries) {
      if (entry.Host && entry.Host !== '*') {
        hosts.push({
          name: entry.Host,
          host: entry.HostName || entry.Host,
          port: parseInt(entry.Port || '22', 10),
          username: entry.User || os.userInfo().username,
          identityFile: entry.IdentityFile,
        });
      }
    }
  } catch (error) {
    console.error('[ssh-config] Failed to parse config:', error);
  }

  return hosts;
}

/**
 * 解析 SSH config 内容
 */
function parseConfigContent(content: string): ConfigEntry[] {
  const entries: ConfigEntry[] = [];
  let current: ConfigEntry | null = null;

  const lines = content.split('\n');

  for (let line of lines) {
    // 移除注释
    const commentIndex = line.indexOf('#');
    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex);
    }
    line = line.trim();

    if (!line) continue;

    // 解析键值对
    const match = line.match(/^(\S+)\s+(.+)$/);
    if (match) {
      const [, key, value] = match;

      if (key.toLowerCase() === 'host') {
        // 新的 Host 块
        if (current) {
          entries.push(current);
        }
        current = { Host: value };
      } else if (current) {
        // 添加到当前 Host 块
        current[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  }

  // 添加最后一个块
  if (current) {
    entries.push(current);
  }

  return entries;
}

/**
 * 展开路径中的 ~ 为用户主目录
 */
export function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}
