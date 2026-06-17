<script setup lang="ts">
defineProps<{
  windSpeed: number
}>()
</script>

<template>
  <div class="spec-section">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
        ></div>
        <span class="text-base font-bold text-cyan-50 uppercase">풍속</span>
      </div>
      <span class="text-base font-semibold text-emerald-400 italic">적정 풍속 ↗</span>
    </div>
    <div class="flex items-center gap-8">
      <!-- Compass / Wind speed circular indicator -->
      <div class="relative flex h-36 w-36 shrink-0 items-center justify-center">
        <!-- Circular Outer Ring -->
        <svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            stroke-width="5"
            class="text-cyan-950/80"
          />
        </svg>

        <!-- Compass Labels -->
        <span class="absolute top-2 text-xs font-black text-slate-300">N</span>
        <span class="absolute bottom-2 text-xs font-black text-slate-300">S</span>
        <span class="absolute left-2 text-xs font-black text-slate-300">W</span>
        <span class="absolute right-2 text-xs font-black text-slate-300">E</span>

        <!-- Compass Needle (glowing rotated line/arrow inside the dial) -->
        <div
          class="absolute h-24 w-1 origin-center rotate-[225deg] transform rounded-full bg-gradient-to-b from-emerald-400 via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.6)]"
          style="pointer-events: none"
        ></div>

        <!-- Center Value overlay -->
        <div
          class="absolute flex h-20 w-20 flex-col items-center justify-center rounded-full border border-cyan-300/20 bg-slate-950/85 shadow-[inset_0_0_14px_rgba(34,211,238,0.12)]"
        >
          <span class="text-2xl font-black text-white">{{ windSpeed }}</span>
          <span class="text-xs font-bold text-slate-200 uppercase">m/s</span>
        </div>
      </div>

      <!-- Specs Info -->
      <div class="flex-1 space-y-4">
        <div class="flex flex-col gap-2 px-1">
          <span class="text-xl font-black text-emerald-400"
            >남서풍
            <span class="ml-2 font-mono text-xl font-semibold text-slate-200">225°</span></span
          >
          <span class="text-base font-bold text-slate-200 uppercase"
            >산들바람 <br />
            (Light Breeze)</span
          >
        </div>
        <div class="h-6 w-full rounded-lg border border-cyan-300/10 bg-cyan-950/40 p-1.5">
          <!-- A small wind progress bar based on windSpeed (e.g. max 15 m/s) -->
          <div
            class="h-full rounded-md bg-gradient-to-r from-emerald-500/60 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] transition-all duration-1000"
            :style="{ width: Math.min(100, (windSpeed / 15) * 100) + '%' }"
          ></div>
        </div>
        <p class="px-1 text-sm leading-relaxed font-medium text-slate-200">
          현재 비행 고도에서의 풍량은 비행하기에 매우 우호적입니다.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spec-section {
  position: relative;
}
</style>
