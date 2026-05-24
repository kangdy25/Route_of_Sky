<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    cloudCover?: number
    precipitation?: number
    visibility?: number
  }>(),
  {
    cloudCover: 45,
    precipitation: 0.0,
    visibility: 15.0,
  },
)

const visibilityText = computed(() => {
  if (props.visibility >= 10) return '선명함'
  if (props.visibility >= 5) return '연무'
  if (props.visibility >= 2) return '박무'
  return '안개'
})

const precipitationText = computed(() => {
  if (props.precipitation === 0) return '없음'
  if (props.precipitation < 2.5) return '약한 비'
  if (props.precipitation < 7.6) return '보통 비'
  return '강한 비'
})

const cloudText = computed(() => {
  if (props.cloudCover < 10) return '맑음'
  if (props.cloudCover < 50) return '구름 조금'
  if (props.cloudCover < 80) return '구름 많음'
  return '흐림'
})
</script>

<template>
  <div
    class="sky-conditions-container flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl"
  >
    <div>
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-base font-black tracking-[0.2em] text-slate-400 uppercase">하늘 상태</h2>
        <div class="h-2 w-12 rounded-full bg-cyan-500/30"></div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <!-- Cloud Cover Section -->
        <div
          class="flex flex-col items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 p-3 text-center shadow-inner"
        >
          <span class="text-sm font-bold tracking-wider text-slate-500 uppercase">운량</span>
          <div class="relative my-2 flex h-24 w-24 items-center justify-center">
            <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                stroke-width="8"
                class="text-slate-800"
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
                class="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#38bdf8" />
                  <stop offset="100%" stop-color="#0284c7" />
                </linearGradient>
              </defs>
            </svg>
            <span class="text-base font-black text-white">{{ cloudCover }}%</span>
          </div>
          <span class="text-sm font-bold tracking-tighter text-cyan-400 uppercase">{{
            cloudText
          }}</span>
        </div>

        <!-- Precipitation Section -->
        <div
          class="flex flex-col items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 p-3 text-center shadow-inner"
        >
          <span class="text-sm font-bold tracking-wider text-slate-500 uppercase">강수량</span>
          <div class="my-2 flex flex-col items-center gap-1">
            <svg
              class="h-10 w-10 text-cyan-400"
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
            <span class="mt-1 text-base leading-none font-black text-white"
              >{{ precipitation }}
              <span class="text-xs font-normal text-slate-400">mm/h</span></span
            >
          </div>
          <span class="text-sm font-bold tracking-tighter text-cyan-400 uppercase">{{
            precipitationText
          }}</span>
        </div>

        <!-- Visibility Section -->
        <div
          class="flex flex-col items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 p-3 text-center shadow-inner"
        >
          <span class="text-sm font-bold tracking-wider text-slate-500 uppercase">가시 거리</span>
          <div class="my-2 flex flex-col items-center gap-1">
            <svg
              class="h-10 w-10 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span class="mt-1 text-base leading-none font-black text-white"
              >{{ visibility }} <span class="text-xs font-normal text-slate-400">km</span></span
            >
          </div>
          <span class="text-sm font-bold tracking-tighter text-emerald-400 uppercase">{{
            visibilityText
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sky-conditions-container {
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
}
</style>
