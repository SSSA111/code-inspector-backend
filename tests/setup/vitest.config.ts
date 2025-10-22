import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/test-helpers.ts'],
    testTimeout: 30000, // 30s for API calls
  },
})