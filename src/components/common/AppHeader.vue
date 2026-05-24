<script setup lang="ts">
// Props could be added if needed
</script>

<template>
  <header class="pointer-events-auto flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div
        class="animate-spin-slow h-10 w-10 rounded-full border-[3px] border-dashed border-cyan-400 shadow-[0_0_15px_#22d3ee]"
      ></div>
      <h1 class="text-2xl font-black tracking-wide text-white">
        Route of <span class="text-cyan-400">Sky</span>
      </h1>
    </div>

    <div
      class="flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-8 py-3 backdrop-blur-md"
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
      <span class="text-base font-bold tracking-[0.1em] text-white">NAMYANGJU-SI, KR</span>
    </div>

    <div class="flex gap-4">
      <button
        class="rounded-2xl border border-white/10 bg-black/40 p-3 text-xl backdrop-blur-md transition-all hover:bg-white/10"
      >
        ⚙️
      </button>
      <button
        class="rounded-2xl border border-white/10 bg-black/40 p-3 text-xl backdrop-blur-md transition-all hover:bg-white/10"
      >
        👤
      </button>
    </div>
  </header>
</template>
