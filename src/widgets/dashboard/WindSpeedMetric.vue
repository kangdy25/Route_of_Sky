<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'

const props = defineProps<{
  windSpeed: number
  windDirectionDegrees: number
}>()

const normalizedDirection = computed(() => {
  return ((Math.round(props.windDirectionDegrees) % 360) + 360) % 360
})

const windDirectionLabel = computed(() => {
  const labels = [
    '북풍',
    '북북동풍',
    '북동풍',
    '동북동풍',
    '동풍',
    '동남동풍',
    '남동풍',
    '남남동풍',
    '남풍',
    '남남서풍',
    '남서풍',
    '서남서풍',
    '서풍',
    '서북서풍',
    '북서풍',
    '북북서풍',
  ]
  const index = Math.round(normalizedDirection.value / 22.5) % labels.length
  return labels[index]
})

const windNeedleStyle = computed<CSSProperties>(() => ({
  pointerEvents: 'none',
  transform: `rotate(${normalizedDirection.value}deg)`,
}))

const windSpeedPercent = computed(() => {
  return `${Math.min(100, Math.max(0, (props.windSpeed / 15) * 100))}%`
})

const windSpeedLabel = computed(() => {
  if (props.windSpeed < 0.5) return '고요'
  if (props.windSpeed < 3.4) return '실바람'
  if (props.windSpeed < 5.5) return '남실바람'
  if (props.windSpeed < 8) return '산들바람'
  if (props.windSpeed < 10.8) return '건들바람'
  return '강한 바람'
})

const windSpeedEnglishLabel = computed(() => {
  if (props.windSpeed < 0.5) return 'Calm'
  if (props.windSpeed < 3.4) return 'Light Air'
  if (props.windSpeed < 5.5) return 'Light Breeze'
  if (props.windSpeed < 8) return 'Gentle Breeze'
  if (props.windSpeed < 10.8) return 'Moderate Breeze'
  return 'Strong Breeze'
})

const windSummary = computed(() => {
  if (props.windSpeed < 0.5) return '거의 무풍 →'
  if (props.windSpeed < 5.5) return '안정 풍속 ↗'
  if (props.windSpeed < 10.8) return '주의 풍속 ↗'
  return '강풍 영향 ↗'
})

const windDescription = computed(() => {
  if (props.windSpeed < 0.5) {
    return '바람 영향이 거의 없어 강수 입자는 수직에 가깝게 떨어집니다.'
  }
  if (props.windSpeed < 5.5) {
    return '현재 풍량은 비행 고도에서 안정적이며 강수 이동도 완만합니다.'
  }
  if (props.windSpeed < 10.8) {
    return '풍속이 올라 강수 입자가 뚜렷하게 기울고 횡풍 영향이 커집니다.'
  }
  return '강한 바람으로 눈과 비가 빠르게 휘날리며 시정 저하가 커질 수 있습니다.'
})
</script>

<template>
  <div class="spec-section">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div
          class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
        ></div>
        <span class="text-base font-bold text-cyan-50 uppercase">풍속</span>
      </div>
      <span class="text-right text-sm font-semibold text-emerald-400 italic sm:text-base">{{
        windSummary
      }}</span>
    </div>
    <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
      <!-- Compass / Wind speed circular indicator -->
      <div
        class="relative mx-auto flex h-32 w-32 shrink-0 items-center justify-center sm:mx-0 sm:h-36 sm:w-36"
      >
        <!-- Circular Outer Ring -->
        <svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            stroke-width="5"
            class="text-cyan-950/80"
          />
        </svg>

        <!-- Compass Labels -->
        <span class="absolute top-2 text-xs font-black text-slate-300">N</span>
        <span class="absolute bottom-2 text-xs font-black text-slate-300">S</span>
        <span class="absolute left-2 text-xs font-black text-slate-300">W</span>
        <span class="absolute right-2 text-xs font-black text-slate-300">E</span>

        <!-- Compass Needle (glowing rotated line/arrow inside the dial) -->
        <div
          class="absolute h-20 w-1 origin-center rounded-full bg-gradient-to-b from-emerald-400 via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.6)] transition-transform duration-700 sm:h-24"
          :style="windNeedleStyle"
        ></div>

        <!-- Center Value overlay -->
        <div
          class="absolute flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full border border-cyan-300/20 bg-slate-950/85 shadow-[inset_0_0_14px_rgba(34,211,238,0.12)] sm:h-20 sm:w-20"
        >
          <span class="text-2xl font-black text-white">{{ windSpeed }}</span>
          <span class="text-xs font-bold text-slate-200 uppercase">m/s</span>
        </div>
      </div>

      <!-- Specs Info -->
      <div class="flex-1 space-y-4">
        <div class="flex flex-col gap-2 px-1">
          <span class="text-xl font-black text-emerald-400"
            >{{ windDirectionLabel }}
            <span class="ml-2 font-mono text-xl font-semibold text-slate-200"
              >{{ normalizedDirection }}°</span
            ></span
          >
          <span class="text-base font-bold text-slate-200 uppercase"
            >{{ windSpeedLabel }} <br />
            ({{ windSpeedEnglishLabel }})</span
          >
        </div>
        <div class="h-6 w-full rounded-lg border border-cyan-300/10 bg-cyan-950/40 p-1.5">
          <!-- A small wind progress bar based on windSpeed (e.g. max 15 m/s) -->
          <div
            class="h-full rounded-md bg-gradient-to-r from-emerald-500/60 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] transition-all duration-1000"
            :style="{ width: windSpeedPercent }"
          ></div>
        </div>
        <p class="px-1 text-sm leading-relaxed font-medium text-slate-200">
          {{ windDescription }}
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
