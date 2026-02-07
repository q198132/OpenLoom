import { invoke } from '@tauri-apps/api/core';

// ===== Files =====

export async function getFileTree(dir?: string) {
  return invoke('get_file_tree', { dir: dir || null });
}

export async function readFile(path: string) {
  return invoke('read_file', { path });
}

export async function writeFile(path: string, content: string) {
  return invoke('write_file', { path, content });
}

export async function createFile(path: string) {
  return invoke('create_file', { path });
}

export async function createDir(path: string) {
  return invoke('create_dir', { path });
}

export async function renameNode(oldPath: string, newPath: string) {
  return invoke('rename_node', { oldPath, newPath });
}

export async function deleteNode(path: string) {
  return invoke('delete_node', { path });
}

export async function searchFiles(q: string, maxResults?: number) {
  return invoke('search_files', { q, maxResults: maxResults || null });
}

export async function listFiles(): Promise<string[]> {
  return invoke('list_files');
}

// ===== Git =====

export async function gitStatus() {
  return invoke('git_status');
}

export async function gitStage(paths: string[]) {
  return invoke('git_stage', { paths });
}

export async function gitUnstage(paths: string[]) {
  return invoke('git_unstage', { paths });
}

export async function gitCommit(message: string) {
  return invoke('git_commit', { message });
}

export async function gitBranches() {
  return invoke('git_branches');
}

export async function gitLog() {
  return invoke('git_log');
}

export async function gitShow(hash: string): Promise<any> {
  return invoke('git_show', { hash });
}

export async function gitFileDiff(hash: string, file: string) {
  return invoke('git_file_diff', { hash, file });
}

export async function gitStagedDiff(): Promise<{ stat: string; diff: string; files: { status: string; path: string }[] }> {
  return invoke('git_staged_diff');
}

export async function gitPush() {
  return invoke('git_push');
}

export async function gitPull() {
  return invoke('git_pull');
}

export async function gitWorkingDiff(file: string, staged?: boolean) {
  return invoke('git_working_diff', { file, staged: staged || null });
}

// ===== Workspace =====

export async function getWorkspace() {
  return invoke('get_workspace');
}

export async function openWorkspace(path: string) {
  return invoke('open_workspace', { path });
}

export async function browseDirs(dir?: string): Promise<any> {
  return invoke('browse_dirs', { dir: dir || null });
}

export async function getRecent() {
  return invoke('get_recent');
}

// ===== AI =====

export async function getAiSettings() {
  return invoke('get_ai_settings');
}

export async function saveAiSettings(settings: {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}) {
  return invoke('save_ai_settings', {
    baseUrl: settings.baseUrl || null,
    apiKey: settings.apiKey || null,
    model: settings.model || null,
  });
}

export async function generateCommitMessage(diff: string, stat: string): Promise<{ message: string }> {
  return invoke('generate_commit_message', { diff, stat });
}

// ===== PTY =====

export async function ptySpawn() {
  return invoke('pty_spawn');
}

export async function ptyWrite(data: string) {
  return invoke('pty_write', { data });
}

export async function ptyResize(cols: number, rows: number) {
  return invoke('pty_resize', { cols, rows });
}
