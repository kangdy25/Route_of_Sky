<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    cloudCover?: number
  }>(),
  {
    cloudCover: 45,
  },
)

const cloudText = computed(() => {
  if (props.cloudCover < 10) return '맑음'
  if (props.cloudCover < 50) return '구름 조금'
  if (props.cloudCover < 80) return '구름 많음'
  return '흐림'
})
</script>

<template>
  <div
    class="flex flex-col items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 p-3 text-center shadow-inner"
  >
    <span class="text-sm font-bold tracking-wider text-slate-300 uppercase">운량</span>
    <div class="relative my-2 flex h-24 w-24 items-center justify-center">
      <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          stroke-width="8"
          class="text-slate-800"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="url(#cloudGrad)"
          stroke-width="8"
          stroke-dasharray="263.89"
          :stroke-dashoffset="263.89 - (263.89 * cloudCover) / 100"
          stroke-linecap="round"
          class="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
        </defs>
      </svg>
      <span class="text-base font-black text-white">{{ cloudCover }}%</span>
    </div>
    <span class="text-sm font-bold tracking-tighter text-cyan-400 uppercase">{{ cloudText }}</span>
  </div>
</template>
