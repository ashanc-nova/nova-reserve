import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Nova Queue',
        short_name: 'Nova',
        theme_color: '#050816',
        background_color: '#050816',
        display: 'standalone',
        icons: [
          { src: '/nova-icon.png', sizes: '192x192', type: 'image/png' },
          { src: '/nova-icon.png', sizes: '512x512', type: 'image/png' },
          { src: '/nova-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0', // Listen on all interfaces
    // Allow LAN access via nip.io wildcard domains and direct IP access
    allowedHosts: [
      'default.192.168.2.143.nip.io',
      'default.192.168.1.26.nip.io',
      '192.168.2.143',
      '192.168.1.26',
      'localhost',
    ],
  },
})
