import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';

const apkMimePlugin = () => ({
  name: 'apk-mime-header',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url && req.url.split('?')[0] === '/LyricVault.apk') {
        const apkPath = path.resolve(process.cwd(), 'LyricVault.apk');
        if (fs.existsSync(apkPath)) {
          const stat = fs.statSync(apkPath);
          res.setHeader('Content-Type', 'application/vnd.android.package-archive');
          res.setHeader('Content-Disposition', 'attachment; filename="LyricVault.apk"');
          res.setHeader('Content-Length', stat.size);
          fs.createReadStream(apkPath).pipe(res);
          return;
        }
      }
      next();
    });
  },
  configurePreviewServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url && req.url.split('?')[0] === '/LyricVault.apk') {
        const apkPath = path.resolve(process.cwd(), 'LyricVault.apk');
        if (fs.existsSync(apkPath)) {
          const stat = fs.statSync(apkPath);
          res.setHeader('Content-Type', 'application/vnd.android.package-archive');
          res.setHeader('Content-Disposition', 'attachment; filename="LyricVault.apk"');
          res.setHeader('Content-Length', stat.size);
          fs.createReadStream(apkPath).pipe(res);
          return;
        }
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [
    apkMimePlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'LyricVault - Offline Android Lyrics Manager',
        short_name: 'LyricVault',
        description: 'Offline-first song lyric notebook with LRCLIB & Open Lyrics',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/lrclib\.net\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lrclib-api-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 3000,
    host: true
  },
  preview: {
    port: 3000,
    host: true
  }
});
