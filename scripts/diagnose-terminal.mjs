#!/usr/bin/env node
/**
 * 终端环境诊断工具
 * 用于排查 IDE 内置终端和系统终端的差异
 */

import { spawn } from 'child_process';
import os from 'os';

console.log('========================================');
console.log('  OpenLoom 终端环境诊断工具');
console.log('========================================');
console.log();

// 1. 基本信息
console.log('📋 基本信息:');
console.log(`  平台: ${os.platform()}`);
console.log(`  架构: ${os.arch()}`);
console.log(`  Node 版本: ${process.version}`);
console.log();

// 2. Shell 信息
console.log('🐚 Shell 信息:');
console.log(`  SHELL: ${process.env.SHELL || '未设置'}`);
console.log(`  是登录 Shell: ${process.env.SHLVL ? '是 (level ' + process.env.SHLVL + ')' : '未知'}`);
console.log();

// 3. 关键环境变量
console.log('🔑 关键环境变量:');
const importantVars = ['PATH', 'NODE_PATH', 'NVM_DIR', 'USER', 'HOME'];
importantVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName === 'PATH') {
      const paths = value.split(':').slice(0, 5); // 只显示前5个
      console.log(`  ${varName}: ${paths.join(':')}... (${value.split(':').length} 个路径)`);
    } else {
      console.log(`  ${varName}: ${value}`);
    }
  } else {
    console.log(`  ${varName}: (未设置)`);
  }
});
console.log();

// 4. 测试命令可用性
console.log('🔍 命令可用性测试:');
const commands = ['node', 'npm', 'opencode', 'claudecode', 'code', 'git'];

async function testCommand(cmd) {
  return new Promise((resolve) => {
    const test = spawn(os.platform() === 'win32' ? 'where' : 'which', [cmd], {
      shell: true
    });

    test.on('close', (code) => {
      resolve(code === 0);
    });

    test.on('error', () => {
      resolve(false);
    });
  });
}

const results = await Promise.all(
  commands.map(async cmd => ({ cmd, available: await testCommand(cmd) }))
);

results.forEach(({ cmd, available }) => {
  console.log(`  ${cmd.padEnd(15)} ${available ? '✅ 可用' : '❌ 不可用'}`);
});
console.log();

// 5. npm 路径诊断
console.log('📦 npm 配置:');
try {
  const npmPath = await new Promise<string>((resolve) => {
    const npmWhich = spawn('npm', ['config', 'get', 'prefix'], { shell: true });
    let output = '';
    npmWhich.stdout.on('data', (data) => { output += data.toString(); });
    npmWhich.on('close', () => { resolve(output.trim()); });
  });
  console.log(`  npm 前缀: ${npmPath}`);
} catch {
  console.log(`  npm 前缀: (无法获取)`);
}
console.log();

// 6. 诊断建议
console.log('💡 诊断建议:');
const shellPath = process.env.SHELL || '';
const isBash = shellPath.includes('bash');
const isZsh = shellPath.includes('zsh');

if (os.platform() === 'darwin') {
  if (isBash) {
    console.log('  • 使用 bash shell');
    console.log('  • IDE 内置终端会以 -l (login) 模式启动');
    console.log('  • 会加载 ~/.bash_profile 和 ~/.bashrc');
    console.log('  • 如果 opencode 不可用，检查 ~/.bash_profile 中的 PATH 配置');
  } else if (isZsh) {
    console.log('  • 使用 zsh shell');
    console.log('  • IDE 内置终端会以登录模式启动');
    console.log('  • 会加载 ~/.zprofile 和 ~/.zshrc');
    console.log('  • 如果 opencode 不可用，检查 ~/.zprofile 中的 PATH 配置');
  }

  console.log();
  console.log('🔧 修复建议:');
  console.log('  1. 在系统终端运行: which opencode');
  console.log('  2. 如果能找到，记录路径');
  console.log('  3. 在 IDE 终端运行: echo $PATH');
  console.log('  4. 对比两个 PATH，找出差异');
  console.log('  5. 将缺失的路径添加到 ~/.bashrc 或 ~/.zshrc');
}

console.log();
console.log('========================================');
console.log('  诊断完成');
console.log('========================================');
