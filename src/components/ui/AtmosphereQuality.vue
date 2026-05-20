<script setup lang="ts">
defineProps<{
  aqi: number
}>()
</script>

<template>
  <div
    class="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl"
  >
    <div>
      <h2 class="mb-4 text-xs font-bold tracking-widest text-slate-400">ATMOSPHERE QUALITY</h2>
      <div class="mb-4 flex items-end justify-between">
        <div>
          <span class="block text-xs text-slate-400">AIR QUALITY INDEX</span>
          <span class="mt-1 block text-xl font-bold text-white"
            >AQI: <span class="text-cyan-400">{{ aqi }}</span></span
          >
        </div>
        <span class="text-lg font-bold text-emerald-400">Good</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        class="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-400"
      />
    </div>
    <p class="mt-4 text-[10px] leading-relaxed text-slate-400">
      Dynamically adjusts the density of Fog in the interactive 3D main viewport.
    </p>
  </div>
</template>
