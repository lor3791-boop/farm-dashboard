import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// 깃허브 Pages 주소: https://lor3791-boop.github.io/farm-dashboard/
export default defineConfig({
  base: './',
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'share-sw.js'],
      manifest: {
        name: '담당농장 대시보드',
        short_name: '농장대시보드',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        // 폰 공유 목록에 '농장대시보드' — 폐사 사진은 폐사 입력, 등판서·출하 엑셀은 출하 올리기로
        share_target: {
          action: './share-target', method: 'POST', enctype: 'multipart/form-data',
          params: { files: [{ name: 'files', accept: ['image/*', '.heic', '.heif', '.xls', '.xlsx', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] }] }
        } as any,
        background_color: '#F4F2EC',
        theme_color: '#1F4E3D',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { importScripts: ['share-sw.js'], cleanupOutdatedCaches: true, clientsClaim: true, skipWaiting: true, globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 }
    })
  ],
  test: { environment: 'node' }
} as any);
