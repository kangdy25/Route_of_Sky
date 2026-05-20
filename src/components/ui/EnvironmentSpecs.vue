<script setup lang="ts">
defineProps<{
  temperature: number
  humidity: number
  windSpeed: number
}>()
</script>

<template>
  <div
    class="env-spec-container flex flex-col rounded-2xl border border-white/10 bg-slate-900/50 p-4 shadow-2xl backdrop-blur-xl transition-all lg:p-5"
  >
    <h2 class="mb-4 text-xs font-bold tracking-widest text-slate-400 lg:mb-5">ENVIRONMENT SPECS</h2>

    <div class="spec-section mb-4 lg:mb-8">
      <div class="mb-2 flex items-center justify-between lg:mb-3">
        <span class="text-xs font-semibold text-slate-300 lg:text-sm">TEMPERATURE</span>
        <span class="text-[10px] font-bold text-cyan-400 lg:text-xs">WARM, SUNNY ↗</span>
      </div>
      <div class="flex items-center gap-4 lg:gap-6">
        <div
          class="gauge relative flex h-16 w-16 flex-col items-center justify-center rounded-full border-[4px] border-slate-700 border-t-cyan-400 border-l-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] lg:h-24 lg:w-24 lg:border-[6px]"
        >
          <span class="text-lg font-bold text-white lg:text-xl">{{ temperature }}°C</span>
          <span class="text-[10px] text-cyan-400 lg:text-xs">Rising</span>
        </div>
        <div
          class="flex h-12 flex-1 items-end rounded-xl border border-white/5 bg-slate-800/50 p-1 lg:h-16 lg:p-1.5"
        >
          <div class="relative h-1/2 w-full border-t-2 border-cyan-400/50">
            <span
              class="absolute -bottom-4 left-0 text-[8px] text-slate-500 lg:-bottom-5 lg:text-[10px]"
              >24.5</span
            >
            <span
              class="absolute right-0 -bottom-4 text-[8px] text-slate-500 lg:-bottom-5 lg:text-[10px]"
              >28.5</span
            >
          </div>
        </div>
      </div>
    </div>

    <div class="spec-section mb-4 lg:mb-8">
      <div class="mb-2 flex items-center justify-between lg:mb-3">
        <span class="text-xs font-semibold text-slate-300 lg:text-sm">HUMIDITY</span>
        <span class="text-[10px] font-bold text-cyan-400 lg:text-xs">DRY</span>
      </div>
      <div class="flex items-center gap-4 lg:gap-6">
        <div
          class="gauge relative flex h-16 w-16 flex-col items-center justify-center rounded-full border-[4px] border-slate-700 border-l-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)] lg:h-24 lg:w-24 lg:border-[6px]"
        >
          <span class="text-lg font-bold text-white lg:text-xl">{{ humidity }}%</span>
          <span class="text-[10px] text-cyan-400 lg:text-xs">Clear</span>
        </div>
        <div class="h-12 flex-1 rounded-xl border border-white/5 bg-slate-800/50 lg:h-16"></div>
      </div>
    </div>

    <div class="spec-section">
      <div class="mb-2 flex items-center justify-between lg:mb-3">
        <span class="text-xs font-semibold text-slate-300 lg:text-sm">WIND SPEED</span>
      </div>
      <div class="flex items-center gap-4 lg:gap-6">
        <div class="flex h-16 w-16 flex-col items-center justify-center lg:h-24 lg:w-24">
          <span class="text-xl font-bold text-white lg:text-3xl"
            >{{ windSpeed }}
            <span class="text-sm font-normal text-slate-400 lg:text-lg">m/s</span></span
          >
          <span class="mt-0 text-[10px] text-slate-400 lg:mt-1 lg:text-sm">from SW</span>
        </div>
        <div class="relative flex h-16 flex-1 items-center justify-center lg:h-24">
          <div
            class="compass relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-600 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] lg:h-20 lg:w-20"
          >
            <span class="absolute -top-4 text-[10px] font-bold text-slate-400 lg:-top-5 lg:text-xs"
              >N</span
            >
            <span
              class="absolute -bottom-4 text-[10px] font-bold text-slate-400 lg:-bottom-5 lg:text-xs"
              >S</span
            >
            <div
              class="h-10 w-1 origin-center rotate-45 transform rounded-full bg-gradient-to-b from-cyan-400 to-slate-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] lg:h-14 lg:w-1.5"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (max-height: 850px) {
  .env-spec-container {
    padding: 1rem;
  }
  .spec-section {
    margin-bottom: 0.75rem;
  }
  .gauge,
  .compass {
    height: 4rem;
    width: 4rem;
    border-width: 4px;
  }
  .gauge span:first-child {
    font-size: 1.125rem;
  }
}
</style>
