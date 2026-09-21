import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const loopManifest = JSON.parse(readFileSync('./public/loops/manifest.json', 'utf8')) as {
  loops: Array<{ starter: boolean; files: { flac?: string; wav: string }; hash: string }>;
};
const starterEntries = loopManifest.loops
  .filter((loop) => loop.starter)
  .map((loop) => ({ url: loop.files.flac ?? loop.files.wav, revision: loop.hash }));

// https://vite.dev/config/
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'tone', test: /node_modules[\\/]tone/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'LoopPocket',
        short_name: 'LoopPocket',
        description: '처음 여는 순간 바로 소리를 만드는 모바일 웹 DAW',
        theme_color: '#0E0F13',
        background_color: '#0E0F13',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        additionalManifestEntries: starterEntries,
        runtimeCaching: [{
          urlPattern: /\/loops\/.*\.(flac|opus|wav)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'loop-audio-v1',
            expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 60 },
            cacheableResponse: { statuses: [0, 200] },
          },
        }],
      },
    }),
  ],
});
