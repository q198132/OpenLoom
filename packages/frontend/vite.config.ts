import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    // Monaco 的 worker 在 dep optimizer 下偶尔会生成缺失的 json.worker.js
    // 直接排除，让它走正常打包流程，避免 dev 起不来
    exclude: ['monaco-editor', '@monaco-editor/react'],
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor', '@monaco-editor/react'],
          xterm: [
            '@xterm/xterm',
            '@xterm/addon-fit',
            '@xterm/addon-attach',
            '@xterm/addon-web-links',
          ],
        },
      },
    },
  },
});
