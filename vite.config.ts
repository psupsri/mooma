import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // The Go API (mooma-api) has no CORS support, so the browser talks to
      // the Vite dev server and requests under /api are forwarded to it.
      // /api/movie/ -> http://localhost:3000/movie/
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
