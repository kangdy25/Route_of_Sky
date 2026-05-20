<script setup lang="ts">
// Props could be added if needed
</script>

<template>
  <header class="pointer-events-auto flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div
        class="animate-spin-slow h-8 w-8 rounded-full border-[3px] border-dashed border-cyan-400 shadow-[0_0_10px_#22d3ee]"
      ></div>
      <h1 class="text-2xl font-bold tracking-wide text-white">
        Route of <span class="text-cyan-400">Sky</span>
      </h1>
      <span class="mt-1 text-xs font-semibold text-slate-400">v1.0</span>
    </div>

    <div
      class="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-6 py-2 backdrop-blur-md"
    >
      <svg class="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <span class="text-sm font-medium tracking-wider">NAMYANGJU-SI, KR</span>
    </div>

    <div class="flex gap-3">
      <button
        class="rounded-xl border border-white/10 bg-black/40 p-2 backdrop-blur-md transition-colors hover:bg-white/10"
      >
        ⚙️
      </button>
      <button
        class="rounded-xl border border-white/10 bg-black/40 p-2 backdrop-blur-md transition-colors hover:bg-white/10"
      >
        👤
      </button>
    </div>
  </header>
</template>
