<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  temperature: number
}>()

const minTemperature = 24.5
const maxTemperature = 32.0
const rangeMin = 18
const rangeMax = 36

const temperaturePercent = computed(() => {
  const normalized = ((props.temperature - rangeMin) / (rangeMax - rangeMin)) * 100
  return Math.min(100, Math.max(0, normalized))
})
</script>

<template>
  <div class="spec-section mb-10">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.6)]"
        ></div>
        <span class="text-base font-bold text-cyan-50 uppercase">기온</span>
      </div>
      <span class="text-base font-semibold text-orange-400 italic">따뜻함, 맑음 ↗</span>
    </div>

    <div class="flex items-center gap-8">
      <div
        class="relative flex h-36 w-36 shrink-0 flex-col items-center justify-center rounded-2xl border-3 border-orange-300/30 bg-gradient-to-br from-slate-950/75 via-cyan-950/25 to-orange-950/25 shadow-[inset_0_0_24px_rgba(251,146,60,0.10),0_0_18px_rgba(251,146,60,0.08)]"
      >
        <div
          class="absolute top-3 right-3 h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_10px_rgba(251,191,36,0.65)]"
        ></div>
        <span class="text-4xl leading-none font-black text-white"> {{ temperature }}° </span>
        <span
          class="mt-3 rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-sm font-bold text-orange-300"
        >
          상승 중
        </span>
      </div>

      <div class="flex flex-1 flex-col justify-center space-y-4">
        <div class="flex items-center justify-between gap-3 px-1">
          <div>
            <span class="block text-sm font-semibold text-blue-300">최저 기온</span>
            <span class="mt-1 block font-mono text-lg font-black text-slate-100">
              {{ minTemperature }}°
            </span>
          </div>
          <div class="text-right">
            <span class="block text-sm font-semibold text-orange-300">최고 기온</span>
            <span class="mt-1 block font-mono text-lg font-black text-slate-100">
              {{ maxTemperature }}°
            </span>
          </div>
        </div>

        <div class="space-y-2">
          <div
            class="relative h-7 w-full rounded-lg border border-cyan-300/10 bg-cyan-950/40 p-1.5"
          >
            <div
              class="h-full rounded-md bg-gradient-to-r from-cyan-400/75 via-amber-300/90 to-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.34)] transition-all duration-700"
              :style="{ width: `${temperaturePercent}%` }"
            ></div>
          </div>
          <div class="flex justify-between px-1 font-mono text-sm font-bold text-slate-300">
            <span>{{ rangeMin }}°</span>
            <span>{{ rangeMax }}°</span>
          </div>
        </div>

        <p class="px-1 text-sm leading-relaxed font-medium text-slate-200">
          현재 고도에서 열 변화가 안정적으로 유지되고 있습니다.
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
