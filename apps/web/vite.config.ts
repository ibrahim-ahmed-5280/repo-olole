/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', 'VITE_');
  const apiTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000';
  return {
    envDir: '../../',
    plugins: [react(), tailwindcss()],
    define: {
      __SITE_URL__: JSON.stringify(env.VITE_SITE_URL ?? ''),
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: false },
        '/media': { target: apiTarget, changeOrigin: false },
        '/robots.txt': { target: apiTarget },
        '/sitemap.xml': { target: apiTarget },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': { target: apiTarget },
        '/media': { target: apiTarget },
      },
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-dom/client', 'react-router'],
            query: ['@tanstack/react-query', 'zod'],
            motion: ['motion/react'],
            charts: ['recharts'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
    },
  };
});
