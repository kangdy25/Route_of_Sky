<script setup lang="ts">
import { computed } from 'vue'
import { getPrecipitationLabel } from '@/features/weather/lib/weatherLabels'

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

const precipitationText = computed(() => {
  return getPrecipitationLabel(props.precipitation, isSnow.value)
})

const metricTitle = computed(() => {
  return isSnow.value ? '강설량' : '강수량'
})

const displayValue = computed(() => {
  if (!isSnow.value) return props.precipitation.toFixed(1)

  // 강수량은 mm/h 물 등가값으로 유지하고, 눈 표시에서는 대략 10:1 snow ratio를 적용해 cm/h 적설 깊이로 보여줍니다.
  return props.precipitation.toFixed(1)
})

const displayUnit = computed(() => {
  return isSnow.value ? 'cm/h' : 'mm/h'
})
</script>

<template>
  <div
    class="flex flex-col items-center justify-between rounded-lg border border-cyan-300/20 bg-slate-950/60 p-3 text-center shadow-[inset_0_0_18px_rgba(34,211,238,0.10)]"
  >
    <span class="text-base font-bold text-cyan-50 uppercase">{{ metricTitle }}</span>
    <div class="my-2 flex flex-col items-center gap-1">
      <svg
        class="h-10 w-10 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 19l-1 2M12 19l-1 2M15 19l-1 2"
        />
      </svg>
      <span class="mt-1 text-xl leading-none font-black text-white"
        >{{ displayValue }}
        <span class="text-sm font-normal text-slate-200">{{ displayUnit }}</span></span
      >
    </div>
    <span class="text-base font-bold text-cyan-300 uppercase">{{ precipitationText }}</span>
  </div>
</template>
