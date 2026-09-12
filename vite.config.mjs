import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Preserve the gh-pages deploy path (krisl.github.io/tale)
  base: '/tale/',
  build: {
    outDir: 'build',
  },
  server: {
    port: 3000,
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
  },
})
