<script setup lang="ts">
import { ref } from 'vue'
import MainScene from '@/components/scene/MainScene.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import EnvironmentSpecs from '@/components/ui/EnvironmentSpecs.vue'
import AtmosphereQuality from '@/components/ui/AtmosphereQuality.vue'
import TimeScrubbing from '@/components/ui/TimeScrubbing.vue'
import SkyConditions from '@/components/ui/SkyConditions.vue'

// 임시 상태 값 (추후 API 및 3D 씬과 연동)
const temperature = ref(24.5)
const humidity = ref(62)
const windSpeed = ref(5)
const aqi = ref(45)
const cloudCover = ref(65)
const precipitation = ref(0.0)
const visibility = ref(15.0)
</script>

<template>
  <main
    class="relative min-h-screen w-full overflow-x-hidden bg-[#0f172a] font-sans text-slate-200"
  >
    <div class="fixed inset-0 z-0">
      <MainScene />
    </div>

    <div class="pointer-events-none relative z-10 flex min-h-screen flex-col p-4 lg:p-6">
      <AppHeader />

      <div
        class="mt-6 flex flex-1 flex-col justify-between gap-6 pb-2 lg:flex-row lg:items-start lg:pb-0"
      >
        <aside class="pointer-events-auto flex w-full flex-col gap-6 lg:w-[340px] lg:shrink-0">
          <EnvironmentSpecs
            :temperature="temperature"
            :humidity="humidity"
            :windSpeed="windSpeed"
          />
        </aside>

        <aside class="pointer-events-auto flex w-full flex-col gap-6 lg:w-[420px] lg:shrink-0">
          <SkyConditions
            :cloud-cover="cloudCover"
            :precipitation="precipitation"
            :visibility="visibility"
          />
          <AtmosphereQuality :aqi="aqi" />
          <TimeScrubbing />
        </aside>
      </div>
    </div>
  </main>
</template>

<style>
::-webkit-scrollbar {
  width: 2px;
}
::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.9);
}
</style>
