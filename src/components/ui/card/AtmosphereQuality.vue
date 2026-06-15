<script setup lang="ts">
defineProps<{
  aqi: number
}>()
</script>

<template>
  <div
    class="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl"
  >
    <div>
      <h2 class="mb-6 text-xl font-black text-slate-200 uppercase">대기질 정보</h2>
      <div class="mb-6 flex items-end justify-between">
        <div>
          <span class="block text-sm font-bold tracking-wider text-slate-300 uppercase"
            >대기질 지수</span
          >
          <span class="mt-2 block text-4xl font-black text-white"
            >지수: <span class="text-cyan-400">{{ aqi }}</span></span
          >
        </div>
        <div class="flex flex-col items-end">
          <span class="text-2xl font-black text-emerald-400">매우 좋음</span>
          <span class="text-xs font-bold tracking-tighter text-slate-300 uppercase">정상 범위</span>
        </div>
      </div>
      <div class="relative h-2 w-full rounded-full bg-slate-800">
        <div
          class="absolute top-0 left-0 h-full w-[45%] rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
        ></div>
      </div>
    </div>
  </div>
</template>
