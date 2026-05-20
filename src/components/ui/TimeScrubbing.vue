<script setup lang="ts">
// Props could be added if needed
</script>

<template>
  <div
    class="relative flex flex-1 flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl"
  >
    <div class="flex justify-between">
      <div>
        <h2 class="text-xs font-bold tracking-widest text-slate-400">TIME SCRUBBING</h2>
        <p class="mt-1 text-xs text-slate-400">
          Drag to playhead to preview the sky at different times.
        </p>
      </div>
      <div class="text-right">
        <span class="block text-sm font-bold text-white">AFTERNOON SUN</span>
        <span class="block text-xs text-slate-400">CLEAR, BRIGHT SKIES</span>
      </div>
    </div>

    <div class="mt-6 flex items-center gap-4">
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-cyan-500"
      >
        ▶
      </button>
      <div class="relative flex-1">
        <input
          type="range"
          min="0"
          max="24"
          step="0.1"
          class="absolute z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div class="relative h-1 w-full rounded-full bg-slate-700">
          <div
            class="absolute top-0 left-0 h-full w-[60%] rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
          ></div>
          <div
            class="absolute top-1/2 left-[60%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-400 shadow-lg"
          ></div>
        </div>
        <div class="mt-3 flex justify-between px-2 text-[10px] text-slate-400">
          <span>06:00<br />Sunrise</span>
          <span>08:00</span>
          <span>10:00</span>
          <span>14:00</span>
          <span class="font-bold text-cyan-400">16:30</span>
          <span>16:00</span>
          <span>20:00<br />Sunset</span>
        </div>
      </div>
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-cyan-500"
      >
        ⏭
      </button>
    </div>
  </div>
</template>
