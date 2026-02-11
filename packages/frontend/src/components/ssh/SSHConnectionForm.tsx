import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSSHStore } from '@/stores/sshStore';
import type { SSHConnection } from '@openloom/shared';

interface Props {
  connection: SSHConnection | null;
  onClose: () => void;
}

export default function SSHConnectionForm({ connection, onClose }: Props) {
  const { addConnection, updateConnection } = useSSHStore();

  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('');
  const [authType, setAuthType] = useState<'password' | 'key'>('password');
  const [privateKeyPath, setPrivateKeyPath] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = !!connection;

  useEffect(() => {
    if (connection) {
      setName(connection.name);
      setHost(connection.host);
      setPort(connection.port);
      setUsername(connection.username);
      setAuthType(connection.authType as 'password' | 'key');
      setPrivateKeyPath(connection.privateKeyPath || '');
      // 密码不回填
    }
  }, [connection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !host || !username) {
      alert('请填写名称、主机和用户名');
      return;
    }

    if (authType === 'password' && !password && !isEditing) {
      alert('请填写密码');
      return;
    }

    if (authType === 'key' && !privateKeyPath) {
      alert('请填写私钥路径');
      return;
    }

    try {
      setSaving(true);

      if (isEditing) {
        await updateConnection(connection.id, {
          name,
          host,
          port,
          username,
          authType,
          privateKeyPath: authType === 'key' ? privateKeyPath : undefined,
          password: authType === 'password' ? password : undefined,
        });
      } else {
        await addConnection({
          name,
          host,
          port,
          username,
          authType,
          privateKeyPath: authType === 'key' ? privateKeyPath : undefined,
          password: authType === 'password' ? password : undefined,
        });
      }

      onClose();
    } catch (error: any) {
      alert('保存失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base border border-surface0 rounded-lg w-[400px] max-h-[90vh] overflow-auto">
        {/* 标题 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface0">
          <span className="text-sm font-medium text-text">
            {isEditing ? '编辑 SSH 连接' : '新建 SSH 连接'}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface0 text-overlay0 hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 名称 */}
          <div>
            <label className="block text-xs text-overlay0 mb-1">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Server"
              className="w-full bg-surface0 text-text text-sm px-3 py-2 rounded border border-surface1 focus:border-accent outline-none"
            />
          </div>

          {/* 主机 */}
          <div>
            <label className="block text-xs text-overlay0 mb-1">主机</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="192.168.1.100"
              className="w-full bg-surface0 text-text text-sm px-3 py-2 rounded border border-surface1 focus:border-accent outline-none"
            />
          </div>

          {/* 端口 & 用户名 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-overlay0 mb-1">端口</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value) || 22)}
                className="w-full bg-surface0 text-text text-sm px-3 py-2 rounded border border-surface1 focus:border-accent outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-overlay0 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="root"
                className="w-full bg-surface0 text-text text-sm px-3 py-2 rounded border border-surface1 focus:border-accent outline-none"
              />
            </div>
          </div>

          {/* 认证方式 */}
          <div>
            <label className="block text-xs text-overlay0 mb-1">认证方式</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="authType"
                  checked={authType === 'key'}
                  onChange={() => setAuthType('key')}
                  className="accent-accent"
                />
                <span className="text-sm text-text">私钥</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="authType"
                  checked={authType === 'password'}
                  onChange={() => setAuthType('password')}
                  className="accent-accent"
                />
                <span className="text-sm text-text">密码</span>
              </label>
            </div>
          </div>

          {/* 私钥路径 */}
          {authType === 'key' && (
            <div>
              <label className="block text-xs text-overlay0 mb-1">私钥路径</label>
              <input
                type="text"
                value={privateKeyPath}
                onChange={(e) => setPrivateKeyPath(e.target.value)}
                placeholder="~/.ssh/id_rsa"
                className="w-full bg-surface0 text-text text-sm px-3 py-2 rounded border border-surface1 focus:border-accent outline-none"
              />
            </div>
          )}

          {/* 密码 */}
          {authType === 'password' && (
            <div>
              <label className="block text-xs text-overlay0 mb-1">
                密码 {isEditing && <span className="text-overlay1">(留空保持不变)</span>}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface0 text-text text-sm px-3 py-2 rounded border border-surface1 focus:border-accent outline-none"
              />
            </div>
          )}

          {/* 按钮 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-overlay0 hover:text-text"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-accent text-crust rounded hover:bg-accent/80 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
