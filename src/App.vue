<script setup lang="ts">
import { ref } from 'vue'

// 샘플 데이터 (나중에 Pinia 스토어와 연결될 값들)
const cityName = ref('Seoul, KR')
const temperature = ref(24)
const condition = ref('Partly Cloudy')
</script>

<template>
  <main
    class="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
  >
    <div class="absolute h-96 w-96 animate-pulse rounded-full bg-blue-500/20 blur-[100px]"></div>
    <div
      class="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-[80px]"
    ></div>

    <section class="relative z-10 w-full max-w-md px-6">
      <div
        class="group overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl transition-all hover:bg-white/15"
      >
        <header class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-medium text-blue-300">Current Location</h2>
            <h1 class="text-2xl font-bold text-white">{{ cityName }}</h1>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
            ☀️
          </div>
        </header>

        <div class="my-10 text-center">
          <span class="text-8xl font-black tracking-tighter text-white"> {{ temperature }}° </span>
          <p class="mt-2 text-lg font-medium text-slate-300">{{ condition }}</p>
        </div>

        <footer class="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
          <div class="text-center">
            <p class="text-xs text-slate-400">Humidity</p>
            <p class="font-semibold text-white">45%</p>
          </div>
          <div class="border-x border-white/10 text-center">
            <p class="text-xs text-slate-400">Wind</p>
            <p class="font-semibold text-white">12km/h</p>
          </div>
          <div class="text-center">
            <p class="text-xs text-slate-400">Visibility</p>
            <p class="font-semibold text-white">10km</p>
          </div>
        </footer>

        <button
          class="mt-8 w-full rounded-xl bg-white py-3 font-bold text-blue-900 transition-transform active:scale-95"
        >
          Refresh Data
        </button>
      </div>

      <p class="mt-6 text-center text-sm font-medium tracking-widest text-white/40 uppercase">
        Route of Sky — Digital Twin Project
      </p>
    </section>
  </main>
</template>

<style scoped>
/* Tailwind v4는 CSS-first이므로 추가적인 복잡한 SCSS 없이도 대부분 처리가 가능합니다. */
</style>
