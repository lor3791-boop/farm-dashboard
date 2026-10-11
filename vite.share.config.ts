// 농장 공유 사이트 빌드 — dist-share/ 에 대시보드 코드 없이 공유 화면만 담는다.
// 결과물은 lor3791-boop/farm-view 저장소에 올린다 (npm run build:share).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
  base: './',
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  plugins: [react(), { name: 'share-index', enforce: 'post', generateBundle(_, bundle) { const f = bundle['share.html']; if (f) { (f as any).fileName = 'index.html'; } } }],
  build: { outDir: 'dist-share', emptyOutDir: true, rollupOptions: { input: path.resolve(__dirname, 'share.html') } }
});
