<script setup lang="ts">
// Props could be added if needed
</script>

<template>
  <header
    class="pointer-events-auto relative z-10 flex items-center justify-between rounded-lg border border-cyan-300/20 bg-slate-950/60 px-5 py-3 shadow-[inset_0_0_24px_rgba(34,211,238,0.12),0_12px_34px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
  >
    <div
      class="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent shadow-[0_0_16px_rgba(34,211,238,0.8)]"
    ></div>
    <div class="flex items-center gap-3">
      <div
        class="animate-spin-slow h-10 w-10 rounded-full border-[3px] border-dashed border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.72)]"
      ></div>
      <h1
        class="text-2xl font-black tracking-[0.08em] text-white drop-shadow-[0_0_10px_rgba(34,211,238,0.42)]"
      >
        Route of <span class="text-cyan-400">Sky</span>
      </h1>
    </div>

    <div
      class="flex items-center gap-3 rounded-full border border-cyan-300/25 bg-cyan-950/20 px-8 py-3 shadow-[inset_0_0_14px_rgba(34,211,238,0.10)] backdrop-blur-md"
    >
      <svg class="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        ></path>
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        ></path>
      </svg>
      <span class="text-base font-bold tracking-[0.16em] text-cyan-50">MANHATTAN, NY</span>
    </div>

    <div class="flex gap-4">
      <button
        class="rounded-lg border border-cyan-300/25 bg-slate-950/55 p-3 text-xl text-cyan-100 shadow-[inset_0_0_16px_rgba(34,211,238,0.08)] backdrop-blur-md transition-all hover:border-cyan-200/70 hover:bg-cyan-400/15"
      >
        ⚙️
      </button>
      <button
        class="rounded-lg border border-cyan-300/25 bg-slate-950/55 p-3 text-xl text-cyan-100 shadow-[inset_0_0_16px_rgba(34,211,238,0.08)] backdrop-blur-md transition-all hover:border-cyan-200/70 hover:bg-cyan-400/15"
      >
        👤
      </button>
    </div>
  </header>
</template>
