<script setup lang="ts">
import { computed } from 'vue'
import { formatInteger } from '@/shared/lib/formatMetricValue'
import Panel from '@/shared/ui/Panel.vue'

// prettier-ignore
const AQI_THRESHOLDS = [
  { max: 40, level: '매우 좋음', range: '정상 범위', 
    accentClass: 'text-cyan-300', barClass: 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' },
  { max: 80, level: '보통', range: '관리 범위', 
  accentClass: 'text-lime-300', barClass: 'bg-lime-400 shadow-[0_0_10px_#a3e635]' },
  { max: 120, level: '민감군 주의', range: '주의 범위', 
  accentClass: 'text-yellow-300', barClass: 'bg-yellow-400 shadow-[0_0_10px_#facc15]' },
  { max: 160, level: '나쁨', range: '시정 저하', 
  accentClass: 'text-orange-300', barClass: 'bg-orange-400 shadow-[0_0_10px_#fb923c]' },
  { max: 200,  level: '매우 나쁨', range: '위험 범위', 
  accentClass: 'text-red-400', barClass: 'bg-red-500 shadow-[0_0_10px_#ef4444]' },
  { max: Infinity, level: '최악', range: '심각 범위', 
  accentClass: 'text-zinc-500', barClass: 'bg-zinc-800 shadow-[0_0_10px_rgba(39,39,42,0.9)]' },
] as const

// 데이터 누락/비정상 시 사용할 중립 fallback
const UNKNOWN_AQI_META = {
  level: '측정 중',
  range: '확인 불가',
  accentClass: 'text-slate-400',
  barClass: 'bg-slate-600 shadow-none',
} as const

const props = defineProps<{
  aqi: number
}>()

// 유효한 숫자가 아닐 경우 0으로 안전하게 fallback 처리 후 0~300 클램프
const isValidAqi = computed(() => typeof props.aqi === 'number' && !Number.isNaN(props.aqi))
const normalizedAqi = computed(() => {
  if (!isValidAqi.value) return 0
  return Math.min(300, Math.max(0, props.aqi))
})

const displayedAqi = computed(() => {
  if (!isValidAqi.value) return '-'
  return formatInteger(normalizedAqi.value)
})

const aqiPercent = computed(() => {
  if (!isValidAqi.value) return 0
  return (normalizedAqi.value / 300) * 100
})

// 현재 AQI 값에 매칭되는 상태 메타데이터 탐색
const aqiMeta = computed(() => {
  if (!isValidAqi.value) return UNKNOWN_AQI_META
  return AQI_THRESHOLDS.find((threshold) => normalizedAqi.value <= threshold.max) ?? UNKNOWN_AQI_META
})
</script>

<template>
  <Panel title="대기질 정보" full-height>
    <div class="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <!-- 좌측: 지표명 및 측정 지수 -->
      <div>
        <span class="block text-base font-bold text-cyan-100/80 uppercase">대기질 지수</span>
        <span class="mt-2 block text-3xl font-black text-white sm:text-4xl">
          지수: <span class="text-cyan-400">{{ displayedAqi }}</span>
        </span>
      </div>
      <!-- 우측: 등급 라벨 및 관리 범위 -->
      <div class="flex flex-col items-start sm:items-end">
        <span class="text-xl font-black sm:text-2xl" :class="aqiMeta.accentClass">
          {{ aqiMeta.level }}
        </span>
        <span class="text-sm font-bold text-cyan-100/70 uppercase">
          {{ aqiMeta.range }}
        </span>
      </div>
    </div>
    <!-- AQI 레벨 게이지 바 (배경 트랙 및 동적 컬러 바) -->
    <div class="relative h-2 w-full rounded-full border border-cyan-300/10 bg-cyan-950/50">
      <div
        class="absolute top-0 left-0 h-full rounded-full transition-[width] duration-500 ease-out"
        :class="aqiMeta.barClass"
        :style="{ width: `${aqiPercent}%` }"
      />
    </div>
  </Panel>
</template>
