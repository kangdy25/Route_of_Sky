<script setup lang="ts">
import { computed } from 'vue'
import { getVisibilityLabel } from '@/features/weather/lib/weatherLabels'

const props = withDefaults(
  defineProps<{
    visibility?: number
  }>(),
  {
    visibility: 15.0,
  },
)

const visibilityText = computed(() => {
  return getVisibilityLabel(props.visibility)
})
</script>

<template>
  <div
    class="flex min-w-0 flex-col items-center justify-between rounded-lg border border-cyan-300/20 bg-slate-950/60 p-2 text-center shadow-[inset_0_0_18px_rgba(34,211,238,0.10)] sm:p-3"
  >
    <span class="text-sm font-bold text-cyan-50 uppercase sm:text-base">가시 거리</span>
    <div class="my-2 flex flex-col items-center gap-1">
      <svg
        class="h-8 w-8 text-teal-300 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)] sm:h-10 sm:w-10"
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
      <span class="mt-1 text-lg leading-none font-black text-white sm:text-xl"
        >{{ visibility }} <span class="text-sm font-normal text-slate-200">km</span></span
      >
    </div>
    <span class="text-sm font-bold text-teal-300 uppercase sm:text-base">{{ visibilityText }}</span>
  </div>
</template>
