<script setup lang="ts">
const emit = defineEmits<{
  flyToTimesSquare: []
  openSettings: []
}>()
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
        class="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-300/20 bg-slate-950/45 p-1.5 shadow-[inset_0_0_18px_rgba(34,211,238,0.10),0_0_18px_rgba(34,211,238,0.24)] backdrop-blur-md"
      >
        <img
          src="/logo.png"
          alt="Route of Sky"
          class="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]"
        />
      </div>
      <h1
        class="bg-gradient-to-r from-cyan-100 via-sky-400 to-orange-300 bg-clip-text text-3xl font-black text-transparent drop-shadow-[0_0_12px_rgba(34,211,238,0.34)]"
      >
        Route of Sky
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
      <span class="text-lg font-bold text-cyan-50">NYC, TIMES SQUARE</span>
    </div>

    <div class="flex gap-4">
      <button
        type="button"
        class="rounded-lg border border-cyan-300/25 bg-slate-950/55 p-3 text-cyan-100 shadow-[inset_0_0_16px_rgba(34,211,238,0.08)] backdrop-blur-md transition-all hover:border-cyan-200/70 hover:bg-cyan-400/15 focus:ring-2 focus:ring-cyan-300/45 focus:outline-none"
        title="Times Square fly-through"
        aria-label="Times Square fly-through"
        @click.stop="emit('flyToTimesSquare')"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 17c3.2-4.8 6.1-6.7 9-5.6 2.2.8 3.6.3 5-1.4"
          ></path>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M14 5h5v5"
          ></path>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 17a2 2 0 100 4 2 2 0 000-4zm12-12a2 2 0 100 4 2 2 0 000-4z"
          ></path>
        </svg>
      </button>
      <button
        type="button"
        class="rounded-lg border border-cyan-300/25 bg-slate-950/55 p-3 text-cyan-100 shadow-[inset_0_0_16px_rgba(34,211,238,0.08)] backdrop-blur-md transition-all hover:border-cyan-200/70 hover:bg-cyan-400/15 focus:ring-2 focus:ring-cyan-300/45 focus:outline-none"
        title="Open settings"
        aria-label="Open settings"
        @click.stop="emit('openSettings')"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.3 4.3 11 2h2l.7 2.3a7.7 7.7 0 0 1 1.8.8l2.1-1.1 1.4 1.4-1.1 2.1c.3.6.6 1.2.8 1.8L21 10v2l-2.3.7a7.7 7.7 0 0 1-.8 1.8l1.1 2.1-1.4 1.4-2.1-1.1c-.6.3-1.2.6-1.8.8L13 20h-2l-.7-2.3a7.7 7.7 0 0 1-1.8-.8L6.4 18 5 16.6l1.1-2.1a7.7 7.7 0 0 1-.8-1.8L3 12v-2l2.3-.7c.2-.6.5-1.2.8-1.8L5 5.4 6.4 4l2.1 1.1c.6-.3 1.2-.6 1.8-.8Z"
          ></path>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"
          ></path>
        </svg>
      </button>
    </div>
  </header>
</template>
