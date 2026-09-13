import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 3000, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    env: { VITE_BACKEND_URL: 'http://localhost:7084' },
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
})
