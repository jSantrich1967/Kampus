/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "components/**/*.test.ts"],
    exclude: ["e2e/**", "**/.next/**", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
