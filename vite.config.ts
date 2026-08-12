import { defineConfig } from 'vitest/config' // 'vite' 대신 'vitest/config' 사용
import { loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import cesium from 'vite-plugin-cesium'
import { fileURLToPath, URL } from 'node:url'

const rootDirectory = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDirectory, '')
  const weatherApiKey = env.WEATHER_API_KEY || ''

  return {
    plugins: [vue(), tailwindcss(), cesium()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api/weather': {
          target: 'https://api.weatherapi.com',
          changeOrigin: true,
          rewrite(path) {
            const incomingUrl = new URL(path, 'http://localhost')
            const upstreamUrl = new URL('/v1/forecast.json', 'http://localhost')

            upstreamUrl.searchParams.set('key', weatherApiKey)
            upstreamUrl.searchParams.set('q', incomingUrl.searchParams.get('q') ?? '')
            upstreamUrl.searchParams.set('days', '1')
            upstreamUrl.searchParams.set('aqi', 'yes')

            return `${upstreamUrl.pathname}${upstreamUrl.search}`
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      coverage: {
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/**/*.spec.ts', 'src/**/*.types.ts', 'src/env.d.ts', 'src/main.ts'],
      },
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/.{idea,git,cache,output,temp}/**',
      ],
      root: rootDirectory,
    },
  }
})
