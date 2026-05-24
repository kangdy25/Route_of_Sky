<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    precipitation?: number
  }>(),
  {
    precipitation: 0.0,
  },
)

const precipitationText = computed(() => {
  if (props.precipitation === 0) return '없음'
  if (props.precipitation < 2.5) return '약한 비'
  if (props.precipitation < 7.6) return '보통 비'
  return '강한 비'
})
</script>

<template>
  <div
    class="flex flex-col items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 p-3 text-center shadow-inner"
  >
    <span class="text-sm font-bold tracking-wider text-slate-500 uppercase">강수량</span>
    <div class="my-2 flex flex-col items-center gap-1">
      <svg class="h-10 w-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        >{{ precipitation }} <span class="text-xs font-normal text-slate-400">mm/h</span></span
      >
    </div>
    <span class="text-sm font-bold tracking-tighter text-cyan-400 uppercase">{{
      precipitationText
    }}</span>
  </div>
</template>
