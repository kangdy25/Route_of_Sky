<script setup lang="ts">
import { computed } from 'vue'
import { getPrecipitationLabel } from '@/features/weather/lib/weatherLabels'
import { formatSingleDecimal } from '@/shared/lib/formatMetricValue'

const props = withDefaults(
  defineProps<{
    precipitation?: number
    temperature?: number
  }>(),
  {
    precipitation: 0.0,
    temperature: 18,
  },
)

const isSnow = computed(() => props.precipitation > 0 && props.temperature <= 0)
const isThunderstorm = computed(() => !isSnow.value && props.precipitation >= 12)

const precipitationText = computed(() => {
  return getPrecipitationLabel(props.precipitation, isSnow.value)
})

const metricTitle = computed(() => {
  return isSnow.value ? '강설량' : '강수량'
})

// 1mm 강우량 = 약 1cm 적설 깊이 (10:1 물 등가 비율 환산)
const displayValue = computed(() => {
  return formatSingleDecimal(props.precipitation)
})

const displayUnit = computed(() => {
  return isSnow.value ? 'cm/h' : 'mm/h'
})
</script>

<template>
  <div
    class="flex min-w-0 flex-col items-center justify-between rounded-lg border border-cyan-300/20 bg-slate-950/60 p-2 text-center shadow-[inset_0_0_18px_rgba(34,211,238,0.10)] sm:p-3"
  >
    <span class="text-sm font-bold text-cyan-50 uppercase sm:text-base">{{ metricTitle }}</span>

    <!-- 강수 상태 SVG 아이콘 및 수치 영역 -->
    <div class="my-2 flex flex-col items-center gap-1">
      <svg
        class="h-8 w-8 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] sm:h-10 sm:w-10"
        :class="isThunderstorm ? 'text-amber-200' : 'text-cyan-300'"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <!-- 기본 구름 외곽선 -->
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
        />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19l-1 2M12 19l-1 2M15 19l-1 2" />
        <!-- 뇌우 시 표시되는 번개 형상 오버레이 -->
        <path
          v-if="isThunderstorm"
          fill="currentColor"
          stroke-linejoin="round"
          stroke-width="0"
          d="M13.4 10.2h4.2l-4.7 5.2h3.3L9.8 23l1.6-5.3H8.2l2.9-7.5h2.3z"
        />
      </svg>
      <span class="mt-1 text-lg leading-none font-black text-white sm:text-xl"
        >{{ displayValue }} <span class="text-sm font-normal text-slate-200">{{ displayUnit }}</span></span
      >
    </div>
    <span
      class="text-sm font-bold uppercase sm:text-base"
      :class="isThunderstorm ? 'text-amber-200' : 'text-cyan-300'"
      >{{ precipitationText }}</span
    >
  </div>
</template>
