<script setup lang="ts">
// Props could be added if needed
</script>

<template>
  <div
    class="relative flex h-full w-48 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-xl"
  >
    <div
      class="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-blue-900 to-slate-900 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.5)]"
    >
      <span class="text-2xl">🌍</span>
      <div
        class="absolute top-8 right-8 h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
      ></div>
    </div>
  </div>
</template>
