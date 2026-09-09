<script setup lang="ts">
import { computed } from 'vue'
import { formatSingleDecimal } from '@/shared/lib/formatMetricValue'

const props = defineProps<{
  temperature: number
  temperatureMin: number
  temperatureMax: number
}>()

const temperaturePercent = computed(() => {
  const temperatureRange = props.temperatureMax - props.temperatureMin
  // 최저 기온과 최고 기온이 같거나 비정상 데이터인 경우 중립(50%)으로 표시
  if (temperatureRange <= 0) return 50

  const normalized = ((props.temperature - props.temperatureMin) / temperatureRange) * 100
  return Math.min(100, Math.max(0, normalized))
})

const temperatureSummary = computed(() => {
  if (props.temperature <= 0) return '결빙 위험 ↘'
  if (props.temperature < 10) return '차가운 공기 ↘'
  if (props.temperature > 30) return '고온 상승 ↗'
  return '쾌적한 기온 ↗'
})

const temperatureStatus = computed(() => {
  if (props.temperature <= 0) return '결빙'
  if (props.temperature < 10) return '저온'
  if (props.temperature > 30) return '고온'
  return '안정'
})

const displayedTemperature = computed(() => formatSingleDecimal(props.temperature))
const displayedTempMax = computed(() => formatSingleDecimal(props.temperatureMax))
const displayedTempMin = computed(() => formatSingleDecimal(props.temperatureMin))

const temperatureDescription = computed(() => {
  if (props.temperature <= 0) {
    return '영하권 기온으로 강수가 눈으로 바뀌며 결빙 가능성이 높습니다.'
  }
  if (props.temperature < 10) {
    return '낮은 기온으로 공기 밀도가 높고 체감 조건이 차갑게 유지됩니다.'
  }
  if (props.temperature > 30) {
    return '높은 기온으로 열 상승과 지표 난류가 강해질 수 있습니다.'
  }
  return '현재 고도에서 열 변화가 안정적으로 유지되고 있습니다.'
})
</script>

<template>
  <div class="relative mb-8 sm:mb-10">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.6)]"></div>
        <span class="text-base font-bold text-cyan-50 uppercase">기온</span>
      </div>
      <span class="text-right text-sm font-semibold text-orange-400 italic sm:text-base">
        {{ temperatureSummary }}
      </span>
    </div>

    <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
      <!-- 메인 기온 카드 (현재 수치 및 상태 뱃지) -->
      <div
        class="relative mx-auto flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-2xl border-3 border-orange-300/30 bg-linear-to-br from-slate-950/75 via-cyan-950/25 to-orange-950/25 shadow-[inset_0_0_24px_rgba(251,146,60,0.10),0_0_18px_rgba(251,146,60,0.08)] sm:mx-0 sm:h-36 sm:w-36"
      >
        <div
          class="absolute top-3 right-3 h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_10px_rgba(251,191,36,0.65)]"
        ></div>
        <span class="text-3xl leading-none font-black text-white sm:text-4xl"> {{ displayedTemperature }}° </span>
        <span
          class="mt-3 rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-sm font-bold text-orange-300"
        >
          {{ temperatureStatus }}
        </span>
      </div>

      <!-- 상세 지표 영역 (최저/최고 수치, 온도 범위 게이지 바, 설명 문구) -->
      <div class="flex flex-1 flex-col justify-center space-y-4">
        <div class="flex items-center justify-between gap-3 px-1">
          <div>
            <span class="block text-sm font-semibold text-blue-300">최저 기온</span>
            <span class="mt-1 block font-mono text-lg font-black text-slate-100"> {{ displayedTempMin }}° </span>
          </div>
          <div class="text-right">
            <span class="block text-sm font-semibold text-orange-300">최고 기온</span>
            <span class="mt-1 block font-mono text-lg font-black text-slate-100"> {{ displayedTempMax }}° </span>
          </div>
        </div>

        <!-- 기온 범위 프로그레스 바 & 하단 수치 라벨 -->
        <div class="space-y-2">
          <div class="relative h-7 w-full rounded-lg border border-cyan-300/10 bg-cyan-950/40 p-1.5">
            <div
              class="h-full rounded-md bg-linear-to-r from-cyan-400/75 via-amber-300/90 to-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.34)]"
              :style="{ width: `${temperaturePercent}%` }"
            ></div>
          </div>
          <div class="flex justify-between px-1 font-mono text-sm font-bold text-slate-300">
            <span>{{ displayedTempMin }}°</span>
            <span>{{ displayedTempMax }}°</span>
          </div>
        </div>

        <p class="px-1 text-sm leading-relaxed font-medium text-slate-200">
          {{ temperatureDescription }}
        </p>
      </div>
    </div>
  </div>
</template>
