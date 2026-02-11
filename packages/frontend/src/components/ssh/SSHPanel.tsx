import { useEffect, useState } from 'react';
import { Plus, Server, Trash2, Plug, PlugZap, Loader2, Settings, Key, FolderOpen } from 'lucide-react';
import { useSSHStore } from '@/stores/sshStore';
import { useFileTreeStore } from '@/stores/fileTreeStore';
import SSHConnectionForm from './SSHConnectionForm';
import type { SSHConnection } from '@openloom/shared';

// 密码输入弹窗组件
function PasswordDialog({
  conn,
  onSubmit,
  onCancel,
}: {
  conn: SSHConnection;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    await onSubmit(password);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base border border-surface0 rounded-lg w-[320px]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface0">
          <Key size={16} className="text-accent" />
          <span className="text-sm font-medium text-text">输入密码</span>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="text-xs text-overlay0">
            连接到 <span className="text-text">{conn.name}</span>
            <div className="mt-1 text-overlay1">
              {conn.username}@{conn.host}:{conn.port}
            </div>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            autoFocus
            className="w-full bg-surface0 text-text text-sm px-3 py-2 rounded border border-surface1 focus:border-accent outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-overlay0 hover:text-text"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!password || loading}
              className="px-3 py-1.5 text-sm bg-accent text-crust rounded hover:bg-accent/80 disabled:opacity-50"
            >
              {loading ? '连接中...' : '连接'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SSHPanel() {
  const {
    connections,
    session,
    workingDir,
    isLoading,
    error,
    loadConnections,
    removeConnection,
    connect,
    connectWithPassword,
    disconnect,
    setWorkingDir,
    clearError,
  } = useSSHStore();

  const { refreshRoot } = useFileTreeStore();

  const [showForm, setShowForm] = useState(false);
  const [editingConn, setEditingConn] = useState<SSHConnection | null>(null);
  const [quickConnect, setQuickConnect] = useState('');
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<SSHConnection | null>(null);
  const [dirInput, setDirInput] = useState('');
  const [showDirInput, setShowDirInput] = useState(false);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // 当工作目录变化时，刷新文件树
  useEffect(() => {
    if (workingDir && session?.status === 'connected') {
      refreshRoot();
    }
  }, [workingDir, session?.status, refreshRoot]);

  const handleConnect = async (conn: SSHConnection) => {
    // 如果明确是密码认证，弹出密码输入框
    if (conn.authType === 'password') {
      setPasswordDialog(conn);
      return;
    }

    // 尝试连接（auto 和 key 类型都先尝试）
    try {
      setConnectingId(conn.id);
      clearError();
      await connect(conn.id);
    } catch (e: any) {
      console.error('Connect failed:', e);
      // 连接失败，弹出密码框让用户尝试密码认证
      setPasswordDialog(conn);
    } finally {
      setConnectingId(null);
    }
  };

  const handlePasswordConnect = async (password: string) => {
    if (!passwordDialog) return;

    try {
      setConnectingId(passwordDialog.id);
      clearError();
      await connectWithPassword(passwordDialog.id, password);
      setPasswordDialog(null);
    } catch (e: any) {
      console.error('Password connect failed:', e);
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定删除此连接配置？')) {
      await removeConnection(id);
    }
  };

  const handleQuickConnect = async () => {
    const match = quickConnect.match(/^(\S+)@(\S+)(?::(\d+))?$/);
    if (!match) {
      alert('格式错误，请使用: user@host[:port]');
      return;
    }
    alert('快捷连接需要密码或密钥，请使用添加连接功能');
  };

  const isConnected = session?.status === 'connected';
  const activeConnection = isConnected
    ? connections.find((c) => c.id === session?.connectionId)
    : null;

  return (
    <div className="h-full flex flex-col bg-base">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface0">
        <span className="text-sm font-medium text-text">SSH 连接</span>
        <button
          onClick={() => {
            setEditingConn(null);
            setShowForm(true);
          }}
          className="p-1 rounded hover:bg-surface0 text-overlay0 hover:text-text"
          title="添加连接"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-3 mt-2 p-2 bg-red/20 text-red text-xs rounded">
          {error}
          <button onClick={clearError} className="ml-2 underline">
            关闭
          </button>
        </div>
      )}

      {/* 当前连接状态 */}
      {isConnected && activeConnection && (
        <div className="mx-3 mt-2 p-2 bg-green/10 border border-green/30 rounded">
          <div className="flex items-center gap-2 text-green text-sm">
            <Plug size={14} />
            <span className="font-medium">{activeConnection.name}</span>
          </div>
          <div className="text-xs text-overlay0 mt-1">
            {activeConnection.username}@{activeConnection.host}:{activeConnection.port}
          </div>

          {/* 工作目录 */}
          <div className="mt-2 pt-2 border-t border-green/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-overlay0">工作目录:</span>
              <button
                onClick={() => {
                  setDirInput(workingDir || '~');
                  setShowDirInput(true);
                }}
                className="p-0.5 rounded hover:bg-surface0 text-overlay0 hover:text-text"
                title="切换目录"
              >
                <FolderOpen size={12} />
              </button>
            </div>
            <div className="text-xs text-text truncate mt-1" title={workingDir || ''}>
              {workingDir || '~'}
            </div>
          </div>

          {/* 目录输入框 */}
          {showDirInput && (
            <div className="mt-2 flex gap-1">
              <input
                type="text"
                value={dirInput}
                onChange={(e) => setDirInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    let path = dirInput.trim();
                    if (path && !path.startsWith('/')) {
                      path = (workingDir || '/') + '/' + path;
                    }
                    await setWorkingDir(path);
                    setShowDirInput(false);
                  } else if (e.key === 'Escape') {
                    setShowDirInput(false);
                  }
                }}
                placeholder="相对或绝对路径"
                className="flex-1 bg-surface0 text-text text-xs px-2 py-1 rounded border border-surface1 focus:border-accent outline-none"
                autoFocus
              />
              <button
                onClick={async () => {
                  let path = dirInput.trim();
                  if (path && !path.startsWith('/')) {
                    path = (workingDir || '/') + '/' + path;
                  }
                  await setWorkingDir(path);
                  setShowDirInput(false);
                }}
                className="px-2 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30"
              >
                确定
              </button>
            </div>
          )}

          <button
            onClick={handleDisconnect}
            className="mt-2 text-xs text-red hover:underline"
          >
            断开连接
          </button>
        </div>
      )}

      {/* 连接列表 */}
      <div className="flex-1 overflow-auto px-3 py-2">
        <div className="text-xs text-overlay0 mb-2">连接列表</div>
        {connections.length === 0 ? (
          <div className="text-xs text-overlay0 text-center py-4">
            暂无连接配置
          </div>
        ) : (
          <div className="space-y-1">
            {connections.map((conn) => {
              const isActive = session?.connectionId === conn.id && isConnected;
              const isConnecting = connectingId === conn.id;

              return (
                <div
                  key={conn.id}
                  className={`p-2 rounded border ${
                    isActive
                      ? 'border-green/50 bg-green/5'
                      : 'border-surface0 hover:border-surface1'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Server
                      size={14}
                      className={isActive ? 'text-green' : 'text-overlay0'}
                    />
                    <span className="text-sm text-text flex-1 truncate">
                      {conn.name}
                    </span>
                    {conn.source === 'config' && (
                      <span className="text-[10px] px-1 bg-surface0 text-overlay0 rounded">
                        config
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-overlay0 mt-1 truncate">
                    {conn.username}@{conn.host}:{conn.port}
                    {conn.privateKeyPath && (
                      <span className="ml-2 text-accent/70" title={conn.privateKeyPath}>
                        🔑
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {isActive ? (
                      <button
                        onClick={handleDisconnect}
                        className="flex-1 text-xs py-1 px-2 rounded bg-red/20 text-red hover:bg-red/30"
                      >
                        断开
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(conn)}
                        disabled={isConnecting || isLoading}
                        className="flex-1 text-xs py-1 px-2 rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            连接中
                          </>
                        ) : (
                          <>
                            <PlugZap size={12} />
                            连接
                          </>
                        )}
                      </button>
                    )}
                    {conn.source === 'manual' && (
                      <>
                        <button
                          onClick={() => {
                            setEditingConn(conn);
                            setShowForm(true);
                          }}
                          className="p-1 rounded hover:bg-surface0 text-overlay0 hover:text-text"
                          title="编辑"
                        >
                          <Settings size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(conn.id)}
                          className="p-1 rounded hover:bg-surface0 text-overlay0 hover:text-red"
                          title="删除"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 快捷连接 */}
      <div className="px-3 py-2 border-t border-surface0">
        <div className="text-xs text-overlay0 mb-2">快捷连接</div>
        <div className="flex gap-1">
          <input
            type="text"
            value={quickConnect}
            onChange={(e) => setQuickConnect(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickConnect()}
            placeholder="user@host[:port]"
            className="flex-1 bg-surface0 text-text text-xs px-2 py-1 rounded border border-surface1 focus:border-accent outline-none"
          />
          <button
            onClick={handleQuickConnect}
            className="px-2 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30"
          >
            连接
          </button>
        </div>
      </div>

      {/* 密码输入弹窗 */}
      {passwordDialog && (
        <PasswordDialog
          conn={passwordDialog}
          onSubmit={handlePasswordConnect}
          onCancel={() => setPasswordDialog(null)}
        />
      )}

      {/* 添加/编辑连接弹窗 */}
      {showForm && (
        <SSHConnectionForm
          connection={editingConn}
          onClose={() => {
            setShowForm(false);
            setEditingConn(null);
          }}
        />
      )}
    </div>
  );
}
