# Mac 终端问题诊断和修复

## 问题描述

Mac 用户反馈：
- ✅ 在 Mac 系统自带终端（Terminal.app）中可以运行 `opencode` 命令
- ❌ 在 OpenLoom IDE 的内置终端中运行 `opencode` 会卡住

## 根本原因

### 1. 登录 Shell vs 非登录 Shell

**Mac 系统终端**：
- 默认创建的是**登录 shell（Login Shell）**
- 启动时会依次加载：
  1. `/etc/profile`（系统级）
  2. `~/.bash_profile`（bash）或 `~/.zprofile`（zsh）（用户级）
  3. `~/.bashrc` 或 `~/.zshrc`（如果被引用）
- 环境变量和 PATH 配置完整

**IDE 内置终端（之前的实现）**：
- 创建的是**非登录 shell（Non-login Shell）**
- 只加载 `~/.bashrc` 或 `~/.zshrc`
- **不会加载** `~/.bash_profile` 或 `~/.zprofile`
- 如果某些命令（如 opencode）依赖登录 shell 中配置的 PATH，就会找不到或行为异常

### 2. PTY 环境下的 spawn 行为

某些 CLI 工具在 PTY 环境中的行为可能与真实终端不同，特别是：
- `stdio: 'inherit'` 在 PTY 中的管道处理
- `shell: true` 创建的中间进程可能导致挂起

## 解决方案

### ✅ 修复 1：使用登录 Shell（已实施）

修改了 `packages/backend/src/pty/ptyManager.ts`：

```typescript
// 之前：非登录 shell
const shell = process.env.SHELL || '/bin/bash';
this.process = pty.spawn(shell, [], { ... });

// 现在：登录 shell
const shell = process.env.SHELL || '/bin/bash';
const isBash = shell.includes('bash');
const args = isBash ? ['-l'] : []; // bash 需要显式 -l 参数
this.process = pty.spawn(shell, args, { ... });
```

**为什么这样修复？**
- **bash**：需要显式的 `-l` 参数来启动登录 shell
- **zsh**：默认就是登录 shell，不需要额外参数（但加上也没问题）

这样修改后，IDE 终端会加载完整的环境变量，行为与系统终端一致。

### 🔍 诊断工具

添加了终端环境诊断工具，帮助排查问题：

```bash
# 在项目根目录运行
npm run diagnose
```

诊断工具会：
1. 显示基本信息（平台、架构、Node 版本）
2. 显示 Shell 配置
3. 显示关键环境变量（PATH、NODE_PATH、NVM_DIR 等）
4. 测试常用命令的可用性
5. 提供修复建议

## 用户如何验证修复

### 步骤 1：重新构建项目

```bash
# 在项目根目录
npm run build
npm run tauri:dev
```

### 步骤 2：运行诊断

在 IDE 内置终端中运行：

```bash
npm run diagnose
```

检查输出中的 `PATH` 和命令可用性。

### 步骤 3：测试 opencode 命令

在 IDE 内置终端中运行：

```bash
opencode --version
```

如果仍然卡住，继续步骤 4。

### 步骤 4：手动排查（如果仍有问题）

1. **在系统终端中找到 opencode 路径**：

   ```bash
   which opencode
   # 输出示例: /Users/yourname/.npm-global/bin/opencode
   ```

2. **在 IDE 终端中检查 PATH**：

   ```bash
   echo $PATH
   ```

3. **对比两个 PATH，找出差异**

4. **添加缺失的路径到配置文件**：

   **如果使用 bash**（编辑 `~/.bashrc`）：
   ```bash
   echo 'export PATH="/Users/yourname/.npm-global/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

   **如果使用 zsh**（编辑 `~/.zshrc`）：
   ```bash
   echo 'export PATH="/Users/yourname/.npm-global/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

5. **重启 IDE**，让新的终端会话加载更新后的配置

## 其他可能的解决方案

### 方案 A：添加环境变量到 IDE 配置

如果不想修改 shell 配置文件，可以在 OpenLoom 中添加环境变量配置功能（需要修改后端代码）。

### 方案 B：使用绝对路径

临时解决方案：使用 opencode 的绝对路径：

```bash
/Users/yourname/.npm-global/bin/opencode
```

## 技术细节

### bash vs zsh 的登录 shell 行为

| Shell | 配置文件加载顺序（登录 shell） | 配置文件加载顺序（非登录 shell） |
|-------|---------------------------|---------------------------|
| bash  | `/etc/profile` → `~/.bash_profile` → `~/.bashrc`（如果被引用） | `~/.bashrc` only |
| zsh   | `/etc/zprofile` → `~/.zprofile` → `~/.zshrc` | `~/.zshrc` only |

### node-pty 的 shell 启动参数

node-pty 的 `spawn` 函数接受 shell 参数：

```typescript
pty.spawn(shell, args, options)
```

- `shell`: Shell 程序路径（如 `/bin/bash`）
- `args`: 传递给 shell 的参数（如 `['-l']` 表示登录 shell）
- `options`: 配置选项（cols、rows、cwd、env 等）

## 相关 Issue

如果用户报告类似问题，请指向此文档。

## 后续改进

- [ ] 添加 IDE 内置终端环境变量配置界面
- [ ] 添加终端健康检查提示（如果检测到关键命令不可用）
- [ ] 考虑支持自定义 shell 启动参数
