<div align="center">

# OpenLoom

### The Web IDE That Weaves Your Code.

**AI-Native. Lightweight. Open Source.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

> "If VS Code is the Swiss Army knife, OpenLoom is the loom that weaves your entire project together — editor, terminal, Git, file tree, all in one thread."

---

## What is OpenLoom?

OpenLoom is a **lightweight, web-based IDE** built for developers who want a clean, fast, and integrated development environment — right in the browser.

No Electron. No bloat. Just a Node.js backend and a React frontend, woven together.

**Start with what matters. Ship with confidence.**

- Full-featured **Monaco Editor** (the same engine behind VS Code)
- Integrated **terminal** with real PTY support
- **File tree** with right-click context menu — create, rename, delete
- **Git management** — status, staging, commits, branch switching, log graph
- **Global search** (Ctrl+Shift+F) — search across all project files
- **Quick open** (Ctrl+P) — fuzzy-find any file instantly
- **Diff review** — review AI-generated changes before accepting
- **Dark/Light themes** — Catppuccin Mocha & Latte built-in
- **Workspace switching** — jump between projects seamlessly

---

## Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/your-username/openloom.git
cd openloom

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser. That's it. You're weaving.

---

## Features

### Editor

The heart of OpenLoom. Powered by **Monaco Editor** — the same engine that drives VS Code.

- Syntax highlighting for 50+ languages
- IntelliSense and auto-completion
- Multiple tabs with dirty-state tracking
- Catppuccin Mocha (dark) & Latte (light) themes
- Ctrl+S to save

### File Tree

Your project at a glance. Not just a viewer — a full file manager.

- Right-click context menu: **New File**, **New Folder**, **Rename**, **Delete**
- Inline input for creating and renaming — no popups, no friction
- Auto-refresh on external file changes via WebSocket
- Smart sorting: folders first, alphabetical

### Terminal

A real terminal, not a toy. Full PTY support via `node-pty`.

- WebSocket-based real-time communication
- xterm.js with WebGL rendering
- Auto-fit to panel size
- Web links detection and clickable URLs

### Git Integration

Git built into the sidebar. No more switching to terminal for basic operations.

- File status overview (modified, added, deleted, untracked)
- Stage / unstage individual files
- Commit with message
- Branch switching and creation
- Commit history with visual graph
- Commit diff viewer

### Global Search (Ctrl+Shift+F)

Find anything, anywhere in your project.

- Full-text search across all project files
- Results grouped by file with line numbers
- Keyword highlighting in results
- Click to jump directly to the file

### Quick Open (Ctrl+P)

Navigate your codebase at the speed of thought.

- Fuzzy file name matching
- Keyboard navigation (Arrow keys + Enter)
- Matched characters highlighted
- Top 20 results, instant filtering

### Diff Review

AI writes code. You decide what stays.

- Side-by-side diff viewer
- Accept or reject changes per file
- Batch accept/reject all
- Real-time file snapshot via WebSocket
