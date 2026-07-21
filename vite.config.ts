import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // dev: forward /api to the local backend (compose publishes it on :3000)
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
})
