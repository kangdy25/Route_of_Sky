<script setup lang="ts">
defineProps<{
  humidity: number
}>()
</script>

<template>
  <div class="spec-section mb-10">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]"></div>
        <span class="text-base font-bold tracking-wider text-slate-100 uppercase">습도</span>
      </div>
      <span class="text-sm font-semibold text-cyan-400 italic">낮은 응결도 ↗</span>
    </div>
    <div class="flex items-center gap-8">
      <!-- Enlarged Circular Gauge -->
      <div class="relative flex h-32 w-32 shrink-0 items-center justify-center">
        <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            stroke-width="6"
            class="text-slate-800"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="url(#humGradient)"
            stroke-width="7"
            stroke-dasharray="276.46"
            stroke-dashoffset="110"
            stroke-linecap="round"
            class="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
          />
          <defs>
            <linearGradient id="humGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#22d3ee" />
              <stop offset="100%" stop-color="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
        <div class="flex flex-col items-center">
          <span class="text-4xl leading-none font-black tracking-tight text-white"
            >{{ humidity }}<span class="ml-1 text-base font-normal text-slate-200">%</span></span
          >
          <span class="mt-2 text-sm font-black tracking-widest text-cyan-400 uppercase">안정</span>
        </div>
      </div>
      <div class="flex-1">
        <div class="grid h-10 grid-cols-5 gap-2">
          <div
            v-for="i in 5"
            :key="i"
            :class="[
              'rounded-md border border-white/5',
              i <= 3 ? 'bg-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-slate-800/30',
            ]"
          ></div>
        </div>
        <div
          class="mt-3 flex justify-between px-1 font-mono text-xs font-black tracking-widest text-slate-300"
        >
          <span>건조</span>
          <span>습함</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spec-section {
  position: relative;
}

svg circle {
  transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
