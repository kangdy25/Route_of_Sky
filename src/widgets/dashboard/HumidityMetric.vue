<script setup lang="ts">
import { computed } from 'vue'
import { formatInteger } from '@/shared/lib/formatMetricValue'

const props = defineProps<{
  humidity: number
}>()

// r=44 기준 원 둘레 (2 * π * 44 ≈ 276.46)
const GAUGE_CIRCUMFERENCE = 276.46

const normalizedHumidity = computed(() => Math.min(100, Math.max(0, props.humidity)))

const gaugeDashOffset = computed(() => {
  return GAUGE_CIRCUMFERENCE * (1 - normalizedHumidity.value / 100)
})

const activeBarCount = computed(() => Math.min(5, Math.max(0, Math.round(normalizedHumidity.value / 20))))

const humidityStatus = computed(() => {
  if (normalizedHumidity.value < 35) return '건조'
  if (normalizedHumidity.value > 75) return '습함'
  return '안정'
})

const displayedHumidity = computed(() => formatInteger(props.humidity))

const condensationLabel = computed(() => {
  if (normalizedHumidity.value < 35) return '낮은 수분도 ↗'
  if (normalizedHumidity.value > 75) return '높은 응결도 ↗'
  return '안정 응결도 ↗'
})
</script>

<template>
  <div class="relative mb-8 sm:mb-10">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]"></div>
        <span class="text-base font-bold text-cyan-50 uppercase">습도</span>
      </div>
      <span class="text-right text-sm font-semibold text-cyan-400 italic sm:text-base">
        {{ condensationLabel }}
      </span>
    </div>
    <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
      <!-- 원형 SVG 게이지 및 중앙 습도 수치 -->
      <div class="relative mx-auto flex h-32 w-32 shrink-0 items-center justify-center sm:mx-0 sm:h-36 sm:w-36">
        <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
          <!-- 배경 트랙 원 -->
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="6" class="text-cyan-950/80" />
          <!-- 습도 비례 진행 바 원 -->
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="url(#humGradient)"
            stroke-width="7"
            stroke-dasharray="276.46"
            :stroke-dashoffset="gaugeDashOffset"
            stroke-linecap="round"
            class="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
          />
          <!-- 재사용 시각 리소스 정의 (게이지 전경 그라데이션) -->
          <defs>
            <linearGradient id="humGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#22d3ee" />
              <stop offset="100%" stop-color="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>

        <!-- 게이지 중앙 습도 수치 및 상태 라벨 -->
        <div class="flex flex-col items-center">
          <span class="text-3xl leading-none font-black text-white sm:text-4xl">
            {{ displayedHumidity }}<span class="ml-1 text-lg font-normal text-slate-200 sm:text-xl">%</span>
          </span>
          <span class="mt-2 text-base font-black text-cyan-400 uppercase">
            {{ humidityStatus }}
          </span>
        </div>
      </div>

      <!-- 5단계 세그먼트 바 인디케이터 (20% 단위 구간 표시) -->
      <div class="flex-1">
        <div class="grid h-10 grid-cols-5 gap-2">
          <div
            v-for="i in 5"
            :key="i"
            :class="[
              'rounded-md border border-cyan-300/10',
              i <= activeBarCount ? 'bg-cyan-400/45 shadow-[0_0_10px_rgba(34,211,238,0.28)]' : 'bg-cyan-950/35',
            ]"
          ></div>
        </div>
        <div class="mt-3 flex justify-between px-1 font-mono text-sm font-black text-slate-300">
          <span>건조</span>
          <span>습함</span>
        </div>
      </div>
    </div>
  </div>
</template>
