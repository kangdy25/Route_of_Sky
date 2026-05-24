<script setup lang="ts">
defineProps<{
  temperature: number
}>()
</script>

<template>
  <div class="spec-section mb-10">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.6)]"
        ></div>
        <span class="text-base font-bold tracking-wider text-slate-200 uppercase">기온</span>
      </div>
      <span class="text-sm font-semibold text-orange-400 italic">따뜻함, 맑음 ↗</span>
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
            stroke="url(#tempGradient)"
            stroke-width="7"
            stroke-dasharray="276.46"
            stroke-dashoffset="70"
            stroke-linecap="round"
            class="drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]"
          />
          <defs>
            <linearGradient id="tempGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#fb923c" />
              <stop offset="100%" stop-color="#f87171" />
            </linearGradient>
          </defs>
        </svg>
        <div class="flex flex-col items-center">
          <span class="text-4xl leading-none font-black tracking-tight text-white"
            >{{ temperature
            }}<span class="ml-1 text-base font-normal text-slate-400">°C</span></span
          >
          <span class="mt-2 text-sm font-black tracking-widest text-orange-400 uppercase"
            >상승 중</span
          >
        </div>
      </div>
      <!-- Specs Info -->
      <div class="flex-1 space-y-4">
        <div class="flex flex-col gap-1 px-1">
          <span class="font-mono text-sm font-bold tracking-tighter text-slate-500 uppercase"
            ><span class="text-blue-400">최저 기온</span> 24.5</span
          >
          <span class="font-mono text-sm font-bold tracking-tighter text-slate-500 uppercase"
            ><span class="text-orange-400">최고 기온</span> 32.0</span
          >
        </div>
        <div class="h-6 w-full rounded-lg border border-white/5 bg-slate-950/50 p-1.5">
          <div
            class="h-full w-[70%] rounded-md bg-gradient-to-r from-orange-500/60 to-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.3)]"
          ></div>
        </div>
        <p class="px-1 text-sm leading-relaxed font-medium text-slate-400">
          현재 고도에서 열 변화가 안정적으로 유지되고 있습니다.
        </p>
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
