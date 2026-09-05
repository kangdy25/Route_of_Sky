import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const rootDirectory = fileURLToPath(new URL('./', import.meta.url))

/**
 * 테스트는 Vue SFC 변환만 필요하므로, CSS를 생성하는 Tailwind Vite 플러그인은 포함하지 않습니다.
 * Vite 8의 기본 config bundler가 Tailwind의 네이티브 바이너리를 JavaScript로 읽으려는 문제도 피합니다.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    coverage: {
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.types.ts', 'src/env.d.ts', 'src/main.ts'],
    },
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.{idea,git,cache,output,temp}/**'],
    root: rootDirectory,
  },
})
