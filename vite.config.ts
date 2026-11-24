import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: { target: 'es2022' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // registriert wird in src/pwa.ts (Neuladen nie mitten im Ablauf)
      manifest: {
        name: 'So arbeitet ein KI-Agent',
        short_name: 'KI-Agent',
        lang: 'de',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#f4f6fa',
        background_color: '#f4f6fa',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // keine lokalen Schriften im Build (Systemschriften), daher kein woff2
        globPatterns: ['**/*.{js,css,html,svg,webp,png,ogg}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts'] },
})
