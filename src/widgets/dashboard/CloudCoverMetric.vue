<script setup lang="ts">
import { computed } from 'vue'
import { getCloudCoverLabel } from '@/features/weather/lib/weatherLabels'

const props = withDefaults(
  defineProps<{
    cloudCover?: number
  }>(),
  {
    cloudCover: 45,
  },
)

const cloudText = computed(() => {
  return getCloudCoverLabel(props.cloudCover)
})
</script>

<template>
  <div
    class="flex min-w-0 flex-col items-center justify-between rounded-lg border border-cyan-300/20 bg-slate-950/60 p-2 text-center shadow-[inset_0_0_18px_rgba(34,211,238,0.10)] sm:p-3"
  >
    <span class="text-sm font-bold text-cyan-50 uppercase sm:text-base">운량</span>
    <div class="relative my-2 flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
      <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          stroke-width="8"
          class="text-cyan-950/80"
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
          class="drop-shadow-[0_0_8px_rgba(34,211,238,0.45)] transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
        </defs>
      </svg>
      <span class="text-lg font-black text-white sm:text-xl">{{ cloudCover }}%</span>
    </div>
    <span class="text-sm font-bold text-cyan-300 uppercase sm:text-base">{{ cloudText }}</span>
  </div>
</template>
