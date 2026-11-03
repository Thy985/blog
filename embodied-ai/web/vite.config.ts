import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * 站点基址。本地默认为根路径 '/';
 * 部署到子路径（如 GitHub Pages 的 /embodied-ai/）时用 SITE_BASE 环境变量覆盖即可。
 */
const SITE_BASE = process.env.SITE_BASE ?? '/';

export default defineConfig({
  base: SITE_BASE,
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    manifest: true,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
  },
});
