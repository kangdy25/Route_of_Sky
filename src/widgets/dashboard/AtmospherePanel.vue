<script setup lang="ts">
import Panel from '@/shared/ui/Panel.vue'

defineProps<{
  aqi: number
}>()
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
        <span class="text-2xl font-black text-teal-300">매우 좋음</span>
        <span class="text-sm font-bold text-cyan-100/70 uppercase">정상 범위</span>
      </div>
    </div>
    <div class="relative h-2 w-full rounded-full border border-cyan-300/10 bg-cyan-950/50">
      <div
        class="absolute top-0 left-0 h-full w-[45%] rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
      ></div>
    </div>
  </Panel>
</template>
