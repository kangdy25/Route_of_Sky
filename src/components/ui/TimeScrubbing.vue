<script setup lang="ts">
// Props could be added if needed
</script>

<template>
  <div
    class="relative flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl"
  >
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-base font-black tracking-[0.2em] text-slate-400 uppercase">시간대 탐색</h2>
        <p class="mt-2 text-base font-medium text-slate-500">
          재생 헤드를 드래그하여 시간대별<br />
          하늘 상태를 미리 확인하세요.
        </p>
      </div>
      <div class="text-right">
        <span class="block text-2xl font-black tracking-tight text-white">오후 태양</span>
        <span class="block text-sm font-bold tracking-widest text-cyan-400 uppercase"
          >맑고 밝은 하늘</span
        >
      </div>
    </div>

    <div class="mt-10 flex flex-col gap-8">
      <div class="relative w-full px-2">
        <input
          type="range"
          min="0"
          max="24"
          step="0.1"
          class="absolute z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div class="relative h-2 w-full rounded-full bg-slate-800">
          <div
            class="absolute top-0 left-0 h-full w-[60%] rounded-full bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
          ></div>
          <div
            class="absolute top-1/2 left-[60%] h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-400 shadow-xl"
          ></div>
        </div>
        <div
          class="mt-5 flex justify-between px-1 font-mono text-sm font-bold tracking-tighter text-slate-500"
        >
          <span class="text-center"
            >06:00<br /><span class="text-xs text-slate-600">일출</span></span
          >
          <span>08:00</span>
          <span>12:00</span>
          <span class="scale-110 text-center text-base font-black text-cyan-400"
            >16:30<br /><span class="text-xs">현재</span></span
          >
          <span>18:00</span>
          <span class="text-center"
            >20:00<br /><span class="text-xs text-slate-600">일몰</span></span
          >
        </div>
      </div>

      <div class="flex items-center justify-center gap-6">
        <button
          class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl transition-all hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]"
        >
          ▶
        </button>
        <button
          class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl transition-all hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]"
        >
          ⏭
        </button>
      </div>
    </div>
  </div>
</template>
