<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    visibility?: number
  }>(),
  {
    visibility: 15.0,
  },
)

const visibilityText = computed(() => {
  if (props.visibility >= 10) return '선명함'
  if (props.visibility >= 5) return '연무'
  if (props.visibility >= 2) return '박무'
  return '안개'
})
</script>

<template>
  <div
    class="flex flex-col items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 p-3 text-center shadow-inner"
  >
    <span class="text-sm font-bold tracking-wider text-slate-500 uppercase">가시 거리</span>
    <div class="my-2 flex flex-col items-center gap-1">
      <svg class="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
</template>
