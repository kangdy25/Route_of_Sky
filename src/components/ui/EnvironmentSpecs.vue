<script setup lang="ts">
defineProps<{
  temperature: number
  humidity: number
  windSpeed: number
}>()
</script>

<template>
  <div
    class="env-spec-container flex flex-col rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-xl transition-all"
  >
    <div class="mb-10 flex items-center justify-between">
      <h2 class="text-base font-black tracking-[0.25em] text-slate-400 uppercase">환경 정보</h2>
      <div class="h-2 w-16 rounded-full bg-cyan-500/30"></div>
    </div>

    <!-- Temperature Section -->
    <div class="spec-section mb-10">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.6)]"
          ></div>
          <span class="text-base font-bold tracking-wider text-slate-200 uppercase">기온</span>
        </div>
        <span class="text-sm font-semibold text-orange-400 italic">따뜻함, 맑음 ↗</span>
      </div>
      <div class="flex items-center gap-8">
        <!-- Enlarged Circular Gauge -->
        <div class="relative flex h-32 w-32 shrink-0 items-center justify-center">
          <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              stroke-width="6"
              class="text-slate-800"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="url(#tempGradient)"
              stroke-width="7"
              stroke-dasharray="276.46"
              stroke-dashoffset="70"
              stroke-linecap="round"
              class="drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]"
            />
            <defs>
              <linearGradient id="tempGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#fb923c" />
                <stop offset="100%" stop-color="#f87171" />
              </linearGradient>
            </defs>
          </svg>
          <div class="flex flex-col items-center">
            <span class="text-4xl leading-none font-black tracking-tight text-white"
              >{{ temperature
              }}<span class="ml-1 text-base font-normal text-slate-400">°C</span></span
            >
            <span class="mt-2 text-sm font-black tracking-widest text-orange-400 uppercase"
              >상승 중</span
            >
          </div>
        </div>
        <!-- Specs Info -->
        <div class="flex-1 space-y-4">
          <div class="flex flex-col gap-1 px-1">
            <span class="font-mono text-sm font-bold tracking-tighter text-slate-500 uppercase"
              ><span class="text-blue-400">최저 기온</span> 24.5</span
            >
            <span class="font-mono text-sm font-bold tracking-tighter text-slate-500 uppercase"
              ><span class="text-orange-400">최고 기온</span> 32.0</span
            >
          </div>
          <div class="h-6 w-full rounded-lg border border-white/5 bg-slate-950/50 p-1.5">
            <div
              class="h-full w-[70%] rounded-md bg-gradient-to-r from-orange-500/60 to-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.3)]"
            ></div>
          </div>
          <p class="px-1 text-sm leading-relaxed font-medium text-slate-400">
            현재 고도에서 열 변화가 안정적으로 유지되고 있습니다.
          </p>
        </div>
      </div>
    </div>

    <!-- Humidity Section -->
    <div class="spec-section mb-10">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]"
          ></div>
          <span class="text-base font-bold tracking-wider text-slate-200 uppercase">습도</span>
        </div>
        <span class="text-sm font-semibold text-cyan-400 italic">낮은 응결도</span>
      </div>
      <div class="flex items-center gap-8">
        <!-- Enlarged Circular Gauge -->
        <div class="relative flex h-32 w-32 shrink-0 items-center justify-center">
          <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              stroke-width="6"
              class="text-slate-800"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="url(#humGradient)"
              stroke-width="7"
              stroke-dasharray="276.46"
              stroke-dashoffset="110"
              stroke-linecap="round"
              class="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            />
            <defs>
              <linearGradient id="humGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#22d3ee" />
                <stop offset="100%" stop-color="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          <div class="flex flex-col items-center">
            <span class="text-4xl leading-none font-black tracking-tight text-white"
              >{{ humidity }}<span class="ml-1 text-base font-normal text-slate-400">%</span></span
            >
            <span class="mt-2 text-sm font-black tracking-widest text-cyan-400 uppercase"
              >안정</span
            >
          </div>
        </div>
        <div class="flex-1">
          <div class="grid h-10 grid-cols-5 gap-2">
            <div
              v-for="i in 5"
              :key="i"
              :class="[
                'rounded-md border border-white/5',
                i <= 3
                  ? 'bg-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                  : 'bg-slate-800/30',
              ]"
            ></div>
          </div>
          <div
            class="mt-3 flex justify-between px-1 font-mono text-xs font-black tracking-widest text-slate-500"
          >
            <span>건조</span>
            <span>습함</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Wind Speed Section -->
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
  </div>
</template>

<style scoped>
.env-spec-container {
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
}

.spec-section {
  position: relative;
}

/* Custom styles for smoother gauge transitions */
svg circle {
  transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
