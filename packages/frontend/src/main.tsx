import React from 'react';
import ReactDOM from 'react-dom/client';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import App from './App';
import './app.css';

// 使用本地打包的 Monaco，不从 CDN 加载
loader.config({ monaco });

// 允许 webview 内自定义拖放（默认会被阻止）
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
