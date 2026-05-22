import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  define: {
    global: 'window',
  },

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
      },
      '/livreur': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/employe': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
