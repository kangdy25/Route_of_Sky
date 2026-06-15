<script setup lang="ts">
import { ref, computed } from 'vue'
import MainScene from '@/components/scene/MainScene.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import EnvironmentSpecs from '@/components/ui/card/EnvironmentSpecs.vue'
import AtmosphereQuality from '@/components/ui/card/AtmosphereQuality.vue'
import TimeScrubbing from '@/components/ui/card/TimeScrubbing.vue'
import SkyConditions from '@/components/ui/card/SkyConditions.vue'

// 임시 상태 값 (추후 API 및 3D 씬과 연동)
const time = ref(16.5)
const temperature = ref(24.5)
const humidity = ref(62)
const windSpeed = ref(5)
const aqi = ref(45)
const cloudCover = ref(65)
const precipitation = ref(0.0)
const visibility = ref(15.0)

const hasGoogleApiKey = computed(() => {
  return !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY
})
</script>

<template>
  <main
    class="relative min-h-screen w-full overflow-x-hidden bg-[#0f172a] font-sans text-slate-200"
  >
    <div class="fixed inset-0 z-0">
      <MainScene
        :time="time"
        :cloud-cover="cloudCover"
        :precipitation="precipitation"
        :aqi="aqi"
        :visibility="visibility"
      />
    </div>

    <div class="pointer-events-none relative z-10 flex min-h-screen flex-col p-4 lg:p-6">
      <AppHeader />

      <!-- Google Maps API Key Guide Banner -->
      <div
        v-if="!hasGoogleApiKey"
        class="pointer-events-auto mt-4 rounded-xl border border-blue-500/20 bg-blue-950/45 p-4 backdrop-blur-md"
      >
        <div class="flex items-start gap-3">
          <span class="text-lg">💡</span>
          <div>
            <h3 class="text-sm font-semibold text-blue-300">
              Google Photorealistic 3D Tiles 활성화 가능
            </h3>
            <p class="mt-1 text-xs leading-relaxed text-slate-300">
              프로젝트 루트에 생성된 <code>.env</code> 파일에 Google Maps API 키를
              <code>VITE_GOOGLE_MAPS_API_KEY</code> 변수로 등록해 주세요. 등록 시 실시간 스트리밍
              실사 3D 지구 지형(샌프란시스코 금문교 등)으로 자동 전환됩니다.
            </p>
          </div>
        </div>
      </div>

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
          <TimeScrubbing v-model="time" />
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
