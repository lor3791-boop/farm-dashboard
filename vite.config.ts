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
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: '담당농장 대시보드',
        short_name: '농장대시보드',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#F4F2EC',
        theme_color: '#1F4E3D',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 }
    })
  ],
  test: { environment: 'node' }
} as any);
