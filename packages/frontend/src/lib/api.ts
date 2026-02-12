import { invoke } from '@tauri-apps/api/core';
import type { FileNode, GitFileStatus, GitLogEntry, GitBranchInfo } from '@openloom/shared';

// ===== Files =====

export async function getFileTree(dir?: string): Promise<FileNode[]> {
  return invoke('get_file_tree', { dir: dir || null });
}

export async function readFile(path: string): Promise<{ content: string; path: string }> {
  return invoke('read_file', { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke('write_file', { path, content });
}

export async function createFile(path: string): Promise<void> {
  return invoke('create_file', { path });
}

export async function createDir(path: string): Promise<void> {
  return invoke('create_dir', { path });
}

export async function renameNode(oldPath: string, newPath: string): Promise<void> {
  return invoke('rename_node', { oldPath, newPath });
}

export async function deleteNode(path: string): Promise<void> {
  return invoke('delete_node', { path });
}

export async function readFileBinary(path: string): Promise<{ data: string; path: string }> {
  return invoke('read_file_binary', { path });
}

export async function revealInExplorer(path: string): Promise<void> {
  return invoke('reveal_in_explorer', { path });
}

export interface SearchResult {
  path: string;
  line: number;
  column: number;
  content: string;
}

export async function searchFiles(q: string, maxResults?: number): Promise<SearchResult[]> {
  return invoke('search_files', { q, maxResults: maxResults || null });
}

export async function listFiles(): Promise<string[]> {
  return invoke('list_files');
}

// ===== Git =====

export async function gitStatus(): Promise<GitFileStatus[]> {
  return invoke('git_status');
}

export async function gitStage(paths: string[]): Promise<void> {
  return invoke('git_stage', { paths });
}

export async function gitUnstage(paths: string[]): Promise<void> {
  return invoke('git_unstage', { paths });
}

export interface GitCommitResult {
  ok: boolean;
  hash?: string;
  message?: string;
}

export async function gitCommit(message: string): Promise<GitCommitResult> {
  return invoke('git_commit', { message });
}

export async function gitBranches(): Promise<GitBranchInfo> {
  return invoke('git_branches');
}

export async function gitLog(): Promise<GitLogEntry[]> {
  return invoke('git_log');
}

export interface GitShowResult {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  email: string;
  date: string;
  body: string;
  files: { file: string; stats: string }[];
}

export async function gitShow(hash: string): Promise<GitShowResult> {
  return invoke('git_show', { hash });
}

export async function gitFileDiff(hash: string, file: string): Promise<string> {
  return invoke('git_file_diff', { hash, file });
}

export async function gitStagedDiff(): Promise<{ stat: string; diff: string; files: { status: string; path: string }[] }> {
  return invoke('git_staged_diff');
}

export async function gitSyncStatus(): Promise<{ ahead: number; behind: number; hasRemote: boolean }> {
  return invoke('git_sync_status');
}

export async function gitPush(): Promise<{ ok: boolean }> {
  return invoke('git_push');
}

export async function gitPull(): Promise<{ ok: boolean }> {
  return invoke('git_pull');
}

export async function gitWorkingDiff(file: string, staged?: boolean): Promise<string> {
  return invoke('git_working_diff', { file, staged: staged || null });
}

// ===== Workspace =====

export interface WorkspaceInfo {
  path: string;
  projectName: string;
}

export async function getWorkspace(): Promise<WorkspaceInfo> {
  return invoke('get_workspace');
}

export interface OpenWorkspaceResult {
  ok: boolean;
  path: string;
  projectName: string;
}

export async function openWorkspace(path: string): Promise<OpenWorkspaceResult> {
  return invoke('open_workspace', { path });
}

export interface BrowseDirResult {
  current: string;
  parent: string;
  dirs: { name: string; path: string }[];
}

export async function browseDirs(dir?: string): Promise<BrowseDirResult> {
  return invoke('browse_dirs', { dir: dir || null });
}

export async function getRecent(): Promise<string[]> {
  return invoke('get_recent');
}

// ===== AI =====

export async function generateCommitMessage(diff: string, stat: string): Promise<{ message: string }> {
  return invoke('generate_commit_message', { diff, stat });
}

// ===== PTY =====

export async function ptySpawn(): Promise<number> {
  return invoke('pty_spawn');
}

export async function ptyWrite(id: number, data: string) {
  return invoke('pty_write', { id, data });
}

export async function ptyResize(id: number, cols: number, rows: number) {
  return invoke('pty_resize', { id, cols, rows });
}

export async function ptyKill(id: number) {
  return invoke('pty_kill', { id });
}

// ===== Config =====

export interface Shortcuts {
  saveFile: string;
  quickOpen: string;
  globalSearch: string;
  toggleSidebar: string;
  gitCommit: string;
}

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  customPrompt: string;
}

export interface AppConfig {
  terminalFontSize: number;
  shortcuts: Shortcuts;
  ai: AiConfig;
}

export async function getConfig(): Promise<AppConfig> {
  return invoke('get_config');
}

export async function saveConfig(config: AppConfig) {
  return invoke('save_config', { config });
}

// ===== SSH =====

export interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  privateKeyPath?: string;
  password?: string;
  source: 'config' | 'manual';
}

export interface SSHSession {
  connectionId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastError?: string;
  connectedAt?: string;
}

export async function sshGetConnections(): Promise<SSHConnection[]> {
  return invoke('ssh_get_connections');
}

export async function sshAddConnection(conn: {
  name: string;
  host: string;
  port?: number;
  username: string;
  authType: string;
  privateKeyPath?: string;
  password?: string;
}): Promise<SSHConnection> {
  return invoke('ssh_add_connection', {
    name: conn.name,
    host: conn.host,
    port: conn.port,
    username: conn.username,
    authType: conn.authType,
    privateKeyPath: conn.privateKeyPath,
    password: conn.password,
  });
}

export async function sshUpdateConnection(
  id: string,
  updates: Partial<SSHConnection>
): Promise<SSHConnection> {
  return invoke('ssh_update_connection', {
    id,
    name: updates.name,
    host: updates.host,
    port: updates.port,
    username: updates.username,
    authType: updates.authType,
    privateKeyPath: updates.privateKeyPath,
    password: updates.password,
  });
}

export async function sshDeleteConnection(id: string): Promise<void> {
  return invoke('ssh_delete_connection', { id });
}

export async function sshConnect(id: string): Promise<SSHSession> {
  return invoke('ssh_connect', { id });
}

export async function sshConnectWithPassword(id: string, password: string): Promise<SSHSession> {
  return invoke('ssh_connect_with_password', { id, password });
}

export async function sshDisconnect(): Promise<void> {
  return invoke('ssh_disconnect');
}

export async function sshGetSession(): Promise<SSHSession | null> {
  return invoke('ssh_get_session');
}

export async function sshGetFileTree(dir?: string): Promise<any[]> {
  return invoke('ssh_get_file_tree', { dir: dir || null });
}

export async function sshReadFile(path: string): Promise<string> {
  return invoke('ssh_read_file', { path });
}

export async function sshWriteFile(path: string, content: string): Promise<void> {
  return invoke('ssh_write_file', { path, content });
}

// SSH 文件操作
export async function sshCreateDir(path: string): Promise<void> {
  return invoke('ssh_create_dir', { path });
}

export async function sshDeleteFile(path: string): Promise<void> {
  return invoke('ssh_delete_file', { path });
}

export async function sshDeleteDir(path: string): Promise<void> {
  return invoke('ssh_delete_dir', { path });
}

export async function sshRename(oldPath: string, newPath: string): Promise<void> {
  return invoke('ssh_rename', { oldPath, newPath });
}

// SSH 工作目录
export async function sshGetWorkingDir(): Promise<string | null> {
  return invoke('ssh_get_working_dir');
}

export async function sshSetWorkingDir(dir: string): Promise<void> {
  return invoke('ssh_set_working_dir', { dir });
}

// SSH Git 命令
export async function sshGitStatus(): Promise<string> {
  return invoke('ssh_git_status');
}

export async function sshGitLog(): Promise<string> {
  return invoke('ssh_git_log');
}

export async function sshGitBranches(): Promise<string> {
  return invoke('ssh_git_branches');
}

export async function sshGitStage(paths: string[]): Promise<string> {
  return invoke('ssh_git_stage', { paths });
}

export async function sshGitCommit(message: string): Promise<string> {
  return invoke('ssh_git_commit', { message });
}
