import path from 'path';

type ChangeCallback = (newRoot: string) => void;

const MAX_RECENT = 5;

class WorkspaceManager {
  private currentRoot: string;
  private recentList: string[] = [];
  private changeCallbacks: ChangeCallback[] = [];

  constructor() {
    this.currentRoot = process.env.PROJECT_ROOT || process.cwd();
    this.recentList.push(this.currentRoot);
  }

  getRoot(): string {
    return this.currentRoot;
  }

  getProjectName(): string {
    return path.basename(this.currentRoot);
  }

  setRoot(newPath: string): void {
    const resolved = path.resolve(newPath);
    if (resolved === this.currentRoot) return;

    this.currentRoot = resolved;
    this.addRecent(resolved);

    for (const cb of this.changeCallbacks) {
      cb(resolved);
    }
  }

  getRecent(): string[] {
    return [...this.recentList];
  }

  addRecent(p: string): void {
    const resolved = path.resolve(p);
    this.recentList = this.recentList.filter((r) => r !== resolved);
    this.recentList.unshift(resolved);
    if (this.recentList.length > MAX_RECENT) {
      this.recentList = this.recentList.slice(0, MAX_RECENT);
    }
  }

  onChange(cb: ChangeCallback): void {
    this.changeCallbacks.push(cb);
  }
}

export const workspaceManager = new WorkspaceManager();
