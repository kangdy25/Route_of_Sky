<script setup lang="ts">
import { computed } from 'vue'
import { getCloudCoverLabel } from '@/features/weather/lib/weatherLabels'
import { formatInteger } from '@/shared/lib/formatMetricValue'

const props = withDefaults(
  defineProps<{
    cloudCover?: number
  }>(),
  {
    cloudCover: 45,
  },
)

// r=42 기준 원 둘레 (2 * π * 42 ≈ 263.89)
const GAUGE_CIRCUMFERENCE = 263.89

const normalizedCloudCover = computed(() => {
  return Math.min(100, Math.max(0, props.cloudCover))
})

const gaugeDashOffset = computed(() => {
  return GAUGE_CIRCUMFERENCE * (1 - normalizedCloudCover.value / 100)
})

const cloudText = computed(() => {
  return getCloudCoverLabel(props.cloudCover)
})

const displayedCloudCover = computed(() => formatInteger(normalizedCloudCover.value))
</script>

<template>
  <!-- 원형 SVG 게이지 및 운량 수치 -->
  <div
    class="flex min-w-0 flex-col items-center justify-between rounded-lg border border-cyan-300/20 bg-slate-950/60 p-2 text-center shadow-[inset_0_0_18px_rgba(34,211,238,0.10)] sm:p-3"
  >
    <span class="text-sm font-bold text-cyan-50 uppercase sm:text-base">운량</span>
    <div class="relative my-2 flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
      <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
        <!-- 배경 트랙 원 -->
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="8" class="text-cyan-950/80" />
        <!-- 운량 비례 진행 바 원 -->
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="url(#cloudGrad)"
          stroke-width="8"
          stroke-dasharray="GAUGE_CIRCUMFERENCE"
          :stroke-dashoffset="gaugeDashOffset"
          stroke-linecap="round"
          class="drop-shadow-[0_0_8px_rgba(34,211,238,0.45)] transition-[stroke-dashoffset] duration-500 ease-out"
        />
        <!-- 재사용 시각 리소스 정의 (게이지 전경 그라데이션) -->
        <defs>
          <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
        </defs>
      </svg>
      <span class="text-lg font-black text-white sm:text-xl">{{ displayedCloudCover }}%</span>
    </div>
    <span class="text-sm font-bold text-cyan-300 uppercase sm:text-base">{{ cloudText }}</span>
  </div>
</template>
