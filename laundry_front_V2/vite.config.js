import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Public customer site only — talks to backend via /api/public/* and /uploads/*.
// No staff routes, no WebSocket, no auth endpoints needed.
export default defineConfig({
  plugins: [react()],

  build: {
    outDir: 'dist',
    sourcemap: false,
  },

  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
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
