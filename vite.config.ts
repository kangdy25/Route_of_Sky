import { defineConfig } from 'vitest/config' // 'vite' 대신 'vitest/config' 사용
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import cesium from 'vite-plugin-cesium'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), tailwindcss(), cesium()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    coverage: {
      all: true,
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.types.ts', 'src/env.d.ts', 'src/main.ts'],
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    root: fileURLToPath(new URL('./', import.meta.url)),
  },
})
