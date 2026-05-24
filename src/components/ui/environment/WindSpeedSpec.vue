<script setup lang="ts">
defineProps<{
  windSpeed: number
}>()
</script>

<template>
  <div class="spec-section">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
        ></div>
        <span class="text-base font-bold tracking-wider text-slate-200 uppercase">풍속</span>
      </div>
    </div>
    <div class="flex items-center gap-8">
      <!-- Enlarged Wind Value Display -->
      <div
        class="flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/5 bg-slate-950/40 shadow-inner"
      >
        <span class="mt-4 text-6xl leading-none font-black tracking-tighter text-white">
          {{ windSpeed }}
        </span>
        <span class="mt-3 text-sm font-black tracking-[0.3em] text-slate-400 uppercase">M/S</span>
        <div class="mt-4 flex w-full gap-3 whitespace-nowrap">
          <span class="text-base font-black tracking-tight text-emerald-400">남서풍</span>
          <span class="font-mono tracking-tighter text-slate-500">각도: 225°</span>
        </div>
      </div>
      <!-- Enlarged Compass UI -->
      <div class="flex w-full flex-1 flex-col items-center justify-center gap-8">
        <div
          class="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-slate-700/50 bg-slate-950/30 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"
        >
          <span class="absolute -top-4 text-sm font-black text-slate-500">북</span>
          <span class="absolute -bottom-4 text-sm font-black text-slate-500">남</span>
          <span class="absolute -left-4 text-sm font-black text-slate-500">서</span>
          <span class="absolute -right-4 text-sm font-black text-slate-500">동</span>

          <!-- Compass Needle -->
          <div
            class="h-20 w-1 origin-center rotate-[135deg] transform rounded-full bg-gradient-to-b from-emerald-400 via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.5)]"
          ></div>
          <div
            class="absolute h-4 w-4 rounded-full border-2 border-emerald-500/50 bg-slate-950 shadow-lg"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spec-section {
  position: relative;
}
</style>
