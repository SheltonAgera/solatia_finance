import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Standard Vite port
    proxy: {
      // Optional: Proxies API calls to backend during dev
      // This allows you to write fetch('/api/...') instead of fetch('http://localhost:5000/api/...')
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    }
  }
})