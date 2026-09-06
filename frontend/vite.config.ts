import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
// Proxy bersama dev & preview: API ke backend Laravel, WS ke Reverb (same-origin).
const proxy = {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
  '/storage': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
  '/app': {
    target: 'http://127.0.0.1:8080',
    changeOrigin: true,
    ws: true,
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true,
    proxy,
  },
  preview: {
    proxy,
  },
})
