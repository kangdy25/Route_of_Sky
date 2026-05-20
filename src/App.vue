<script setup lang="ts">
import { ref } from 'vue'
import MainScene from '@/components/scene/MainScene.vue'
import AppHeader from '@/components/ui/AppHeader.vue'
import EnvironmentSpecs from '@/components/ui/EnvironmentSpecs.vue'
import AtmosphereQuality from '@/components/ui/AtmosphereQuality.vue'
import TimeScrubbing from '@/components/ui/TimeScrubbing.vue'
import WorldGlobe from '@/components/ui/WorldGlobe.vue'

// 임시 상태 값 (추후 API 및 3D 씬과 연동)
const temperature = ref(24.5)
const humidity = ref(62)
const windSpeed = ref(5)
const aqi = ref(45)
</script>

<template>
  <main
    class="relative min-h-screen w-screen overflow-x-hidden bg-[#0f172a] font-sans text-slate-200"
  >
    <div class="fixed inset-0 z-0">
      <MainScene />
    </div>

    <div class="pointer-events-none relative z-10 flex min-h-screen flex-col p-4 lg:p-6">
      <AppHeader />

      <div class="mt-6 flex flex-1 flex-col gap-6 lg:flex-row lg:items-start">
        <aside class="pointer-events-auto flex w-full flex-col gap-6 lg:w-[340px] lg:shrink-0">
          <EnvironmentSpecs
            :temperature="temperature"
            :humidity="humidity"
            :windSpeed="windSpeed"
          />
          <AtmosphereQuality :aqi="aqi" />
        </aside>

        <div class="flex flex-1 flex-col justify-end gap-6 pb-2 lg:pb-0">
          <div class="pointer-events-auto flex flex-col gap-6 lg:flex-row lg:items-stretch">
            <TimeScrubbing class="flex-1" />
            <WorldGlobe class="w-full lg:w-48" />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style>
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.9);
}
::-webkit-scrollbar-thumb {
  background: rgba(34, 211, 238, 0.3);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(34, 211, 238, 0.5);
}
</style>
