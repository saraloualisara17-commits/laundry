import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          router: ['react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          charts: ['recharts'],
          icons: ['lucide-react'],
        },
      },
    },
  },

  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/ws': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/auth': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/admin': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
        bypass: (req) => {
          // Browser page navigations (Accept: text/html) are SPA routes — serve index.html
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
      '/livreur': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
      '/employe': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) return '/index.html'
        },
      },
      '/uploads': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
