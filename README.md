<div align="center">

# OpenLoom

### AI Coding 时代的轻量级代码查看器

**看代码 · 管 Git · 其余交给 AI**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

> "AI 时代，你不需要一个什么都能做的 IDE。你只需要看清代码、管好提交，剩下的交给终端里的 AI。"

---

## 什么是 OpenLoom？

在 AI Coding 时代，Claude Code、OpenCode 等终端 AI 工具已经能帮你写代码、改 Bug、做重构。**你真正需要的不再是一个臃肿的全功能 IDE，而是一个轻量的界面来做两件事：看代码和管 Git。**

OpenLoom 就是为此而生的。

它是一个**极简的 Web 代码查看器**，直接在浏览器中运行。没有 Electron，没有插件系统，没有调试器——这些你不需要，因为 AI 在终端里帮你搞定了。

### 与传统 IDE 的区别

| | VS Code / Cursor | OpenLoom |
|---|---|---|
| 定位 | 全功能 IDE | AI 时代的轻量伴侣 |
| 体积 | 数百 MB | 几 MB |
| 写代码 | 手动编写 + AI 辅助 | 交给终端中的 AI |
| 你做什么 | 一切 | **看代码 + 管 Git** |
| AI 集成 | 内置 AI 面板 | 终端直连 Claude Code / OpenCode |

### 工作流

```
终端中的 AI（Claude Code / OpenCode）→ 写代码、改代码
OpenLoom                              → 看变更、审 Diff、提交 Git
```

你只需要打开 OpenLoom，观察 AI 在终端中实时修改的文件，审查 Diff，然后一键提交。

- 功能完整的 **Monaco Editor**（与 VS Code 同款引擎）
- 集成**终端**，支持真实 PTY
- **文件树**，支持右键菜单——新建、重命名、删除
- **Git 管理**——状态、暂存、提交、分支切换、提交图
- **全局搜索**（Ctrl+Shift+F）——跨文件全文搜索
- **快速打开**（Ctrl+P）——模糊匹配快速定位文件
- **Diff 审查**——审查 AI 生成的代码变更后再接受
- **AI 提交信息生成**——基于暂存区 diff 自动生成语义化 commit message
- **深色/浅色主题**——内置 Catppuccin Mocha 和 Latte
- **工作区切换**——在多个项目间无缝跳转

---

## 目录

- [快速开始](#快速开始)
- [功能特性](#功能特性)
- [快捷键](#快捷键)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [参与贡献](#参与贡献)
- [许可证](#许可证)

---

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/your-username/openloom.git
cd openloom

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在浏览器中打开 `http://localhost:5173`，即可开始使用。

### Windows 快速启动

双击项目根目录下的 `start.bat`，自动启动服务并打开浏览器。

### CLI 命令

全局安装 CLI 后，可在任意位置打开项目：

```bash
# 链接 CLI（在项目根目录执行一次）
npm link

# 打开当前目录
openloom

# 打开指定项目
openloom /path/to/your/project
```

---

## 功能特性

![主界面](docs/screenshots/main-interface.png)

### 编辑器

OpenLoom 的核心。基于 **Monaco Editor**——与 VS Code 同款引擎。

- 支持 50+ 语言的语法高亮
- IntelliSense 智能补全
- 多标签页，支持未保存状态追踪
- Catppuccin Mocha（深色）和 Latte（浅色）主题
- Ctrl+S 保存

### 文件树

不只是查看器，更是完整的文件管理器。

![文件树右键菜单](docs/screenshots/file-context-menu.png)

- 右键菜单：**新建文件**、**新建文件夹**、**重命名**、**删除**
- 行内输入，无弹窗干扰
- 通过 WebSocket 自动刷新外部文件变更
- 智能排序：文件夹优先，按字母排列

### 终端

真正的终端，通过 `node-pty` 提供完整 PTY 支持。

- 基于 WebSocket 的实时通信
- xterm.js + WebGL 渲染
- 自动适配面板大小
- 链接检测，可点击 URL

### Git 集成

Git 内置于侧栏，无需再切换到终端执行基本操作。

- 文件状态总览（已修改、已添加、已删除、未跟踪）
- 单文件暂存 / 取消暂存
- 提交并填写信息
- 分支切换与创建
- 提交历史可视化图
- 提交 diff 查看器
- AI 自动生成 commit message（支持 OpenAI 兼容 API）

### 全局搜索（Ctrl+Shift+F）

在项目中搜索任何内容。

- 跨文件全文搜索
- 按文件分组显示结果，附带行号
- 关键词高亮
- 点击直接跳转到对应文件

### 快速打开（Ctrl+P）

快速导航代码库。

- 模糊文件名匹配
- 键盘导航（方向键 + 回车）
- 匹配字符高亮
- 前 20 条结果，即时过滤

### Diff 审查

AI 写代码，你来决定保留什么。

- 并排 diff 查看器
- 按文件接受或拒绝变更
- 批量接受/拒绝全部
- 通过 WebSocket 实时文件快照

### AI 设置

一键配置 AI 服务，让 Git 提交信息自动生成。

![AI 设置](docs/screenshots/ai-settings.png)

- 支持任何 OpenAI 兼容 API（OpenAI、DeepSeek、Ollama 等）
- 配置 Base URL、API Key、Model
- 基于暂存区 diff 自动生成语义化 commit message

### 工作区切换

项目间无缝跳转，多项目开发不再手忙脚乱。

![工作区切换](docs/screenshots/workspace-switcher.png)

- 快速打开文件夹
- 最近打开项目列表
- 一键切换工作区

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+S` | 保存当前文件 |
| `Ctrl+P` | 快速打开文件 |
| `Ctrl+Shift+F` | 全局搜索 |
| `Ctrl+B` | 切换侧栏 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18, TypeScript, Tailwind CSS v4 |
| 编辑器 | Monaco Editor |
| 终端 | xterm.js + node-pty |
| 状态管理 | Zustand |
| 布局 | react-resizable-panels |
| 后端 | Express, Node.js |
| WebSocket | ws |
| 文件监听 | chokidar |
| Monorepo | npm workspaces |

---

## 项目结构

```
openloom/
├── packages/
│   ├── shared/          # 共享类型与常量
│   ├── backend/         # Express + WebSocket 服务端
│   │   └── src/
│   │       ├── api/     # REST API 路由
│   │       ├── ws/      # WebSocket 处理
│   │       ├── pty/     # 终端 PTY 管理
│   │       └── watcher/ # 文件系统监听
│   └── frontend/        # React 单页应用
│       └── src/
│           ├── components/
│           │   ├── editor/     # Monaco 编辑器
│           │   ├── filetree/   # 文件树 + 右键菜单
│           │   ├── git/        # Git 面板 + 提交图
│           │   ├── layout/     # 应用外壳 + 侧栏
│           │   ├── search/     # 全局搜索面板
│           │   ├── quickopen/  # 快速打开对话框
│           │   ├── settings/   # 设置对话框
│           │   ├── terminal/   # 终端面板
│           │   └── workspace/  # 文件夹浏览器
│           ├── stores/         # Zustand 状态管理
│           └── themes/         # Catppuccin 主题
└── package.json
```

---

## 参与贡献

OpenLoom 是开源项目，欢迎贡献。

1. Fork 本仓库
2. 创建功能分支（`git checkout -b feat/amazing-feature`）
3. 提交变更（`git commit -m 'feat: add amazing feature'`）
4. 推送到分支（`git push origin feat/amazing-feature`）
5. 发起 Pull Request

**贡献指南：**
- 每个 PR 聚焦一个功能或修复
- 遵循现有代码风格
- 提交前请测试你的变更

---

## 许可证

MIT 许可证。详见 [LICENSE](LICENSE)。

---

<div align="center">

**OpenLoom** — Weave your code, thread by thread.

Built with passion. Open by nature.

</div>
