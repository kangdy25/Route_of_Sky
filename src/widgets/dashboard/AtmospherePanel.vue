<script setup lang="ts">
import { computed } from 'vue'
import Panel from '@/shared/ui/Panel.vue'

const props = defineProps<{
  aqi: number
}>()

const normalizedAqi = computed(() => Math.min(300, Math.max(0, props.aqi)))
const aqiPercent = computed(() => `${(normalizedAqi.value / 300) * 100}%`)
const aqiLevel = computed(() => {
  if (normalizedAqi.value <= 50) return '매우 좋음'
  if (normalizedAqi.value <= 100) return '보통'
  if (normalizedAqi.value <= 150) return '민감군 주의'
  if (normalizedAqi.value <= 200) return '나쁨'
  if (normalizedAqi.value <= 250) return '매우 나쁨'
  return '매우 나쁨'
})
const aqiRange = computed(() => {
  if (normalizedAqi.value <= 50) return '정상 범위'
  if (normalizedAqi.value <= 100) return '관리 범위'
  if (normalizedAqi.value <= 150) return '주의 범위'
  if (normalizedAqi.value <= 200) return '시정 저하'
  if (normalizedAqi.value <= 250) return '위험 범위'
  return '강한 연무'
})
const aqiAccentClass = computed(() => {
  if (normalizedAqi.value <= 50) return 'text-cyan-300'
  if (normalizedAqi.value <= 100) return 'text-lime-300'
  if (normalizedAqi.value <= 150) return 'text-yellow-300'
  if (normalizedAqi.value <= 200) return 'text-orange-300'
  if (normalizedAqi.value <= 250) return 'text-red-400'
  return 'text-zinc-500'
})
const aqiBarClass = computed(() => {
  if (normalizedAqi.value <= 50) return 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
  if (normalizedAqi.value <= 100) return 'bg-lime-400 shadow-[0_0_10px_#a3e635]'
  if (normalizedAqi.value <= 150) return 'bg-yellow-400 shadow-[0_0_10px_#facc15]'
  if (normalizedAqi.value <= 200) return 'bg-orange-400 shadow-[0_0_10px_#fb923c]'
  if (normalizedAqi.value <= 250) return 'bg-red-500 shadow-[0_0_10px_#ef4444]'
  return 'bg-zinc-800 shadow-[0_0_10px_rgba(39,39,42,0.9)]'
})
</script>

<template>
  <Panel title="대기질 정보" full-height>
    <div class="mb-6 flex items-end justify-between">
      <div>
        <span class="block text-base font-bold text-cyan-100/80 uppercase">대기질 지수</span>
        <span class="mt-2 block text-4xl font-black text-white"
          >지수: <span class="text-cyan-400">{{ aqi }}</span></span
        >
      </div>
      <div class="flex flex-col items-end">
        <span class="text-2xl font-black" :class="aqiAccentClass">{{ aqiLevel }}</span>
        <span class="text-sm font-bold text-cyan-100/70 uppercase">{{ aqiRange }}</span>
      </div>
    </div>
    <div class="relative h-2 w-full rounded-full border border-cyan-300/10 bg-cyan-950/50">
      <div
        class="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
        :class="aqiBarClass"
        :style="{ width: aqiPercent }"
      ></div>
    </div>
  </Panel>
</template>
