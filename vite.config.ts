import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  // GitHub Pages 部署时需要设置 base 为仓库名
  // 本地开发和 Electron 打包不受影响（base 默认 '/'）
  base: process.env.GITHUB_PAGES ? '/FactoryDefenseDemo/' : '/',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  server: {
    port: 3000,
    open: true,
  },
});
