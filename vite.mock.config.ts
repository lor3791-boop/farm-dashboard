// 목업 빌드 — 로그인 없이 이 브라우저에만 저장되는 단일 HTML 파일 (npm run build:mock → dist-mock/index.html)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

process.env.VITE_PREVIEW = '1';
process.env.VITE_MOCK = '1';
export default defineConfig({
  base: './',
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'dist-mock', emptyOutDir: true }
});
