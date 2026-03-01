import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/debug': {
        target: 'https://luciememory.zeabur.app',
        changeOrigin: true,
      },
      '/admin': {
        target: 'https://luciememory.zeabur.app',
        changeOrigin: true,
      },
      '/import': {
        target: 'https://luciememory.zeabur.app',
        changeOrigin: true,
      },
    }
  }
})