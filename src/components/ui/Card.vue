<script setup lang="ts">
import { ref } from 'vue'

const cityName = ref('Seoul, KR')
const temperature = ref(24)
const condition = ref('Partly Cloudy')
</script>

<template>
  <section
    class="pointer-events-none relative z-10 flex h-full w-full items-center justify-center px-6"
  >
    <div
      class="group pointer-events-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl transition-all hover:bg-white/15"
    >
      <header class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-medium text-blue-300">Current Location</h2>
          <h1 class="text-2xl font-bold text-white">{{ cityName }}</h1>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
          ☁️
        </div>
      </header>

      <div class="my-10 text-center">
        <span class="text-8xl font-black tracking-tighter text-white">{{ temperature }}°</span>
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
  </section>
</template>
