#!/usr/bin/env node
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..', '..');

// 解析目标项目路径
const targetDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : process.cwd();

console.log('========================================');
console.log('  OpenLoom - Web IDE');
console.log('========================================');
console.log();
console.log(`Project: ${targetDir}`);
console.log();

// 设置环境变量
const env = { ...process.env, PROJECT_ROOT: targetDir };

// 启动后端 + 前端
const child = spawn('npm', ['run', 'dev'], {
  cwd: rootDir,
  env,
  stdio: 'inherit',
  shell: true,
});

// 延迟打开浏览器
setTimeout(() => {
  const url = 'http://localhost:5173';
  console.log(`\nOpening ${url} ...\n`);

  const platform = process.platform;
  if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', url], { shell: true });
  } else if (platform === 'darwin') {
    spawn('open', [url]);
  } else {
    spawn('xdg-open', [url]);
  }
}, 5000);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
