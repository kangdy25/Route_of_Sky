<script setup lang="ts">
import { hasGoogleMapsApiKey } from '@/shared/config/env'
import AppHeader from './AppHeader.vue'
import AtmospherePanel from './AtmospherePanel.vue'
import EnvironmentPanel from './EnvironmentPanel.vue'
import SkyPanel from './SkyPanel.vue'
import TimePanel from './TimePanel.vue'

const time = defineModel<number>('time', { required: true })

defineProps<{
  temperature: number
  humidity: number
  windSpeed: number
  aqi: number
  cloudCover: number
  precipitation: number
  visibility: number
}>()
</script>

<template>
  <div class="pointer-events-none relative z-10 flex min-h-screen flex-col p-4 lg:p-6">
    <AppHeader />

    <!-- Google Maps API 키가 없을 때 3D Tiles 활성화 방법을 안내합니다. -->
    <div
      v-if="!hasGoogleMapsApiKey"
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
            <code>VITE_GOOGLE_MAPS_API_KEY</code> 변수로 등록해 주세요. 등록 시 실시간 스트리밍 실사
            3D 지구 지형으로 자동 전환됩니다.
          </p>
        </div>
      </div>
    </div>

    <div
      class="mt-6 flex flex-1 flex-col justify-between gap-6 pb-2 lg:flex-row lg:items-start lg:pb-0"
    >
      <aside class="pointer-events-auto flex w-full flex-col gap-6 lg:w-[340px] lg:shrink-0">
        <EnvironmentPanel :temperature="temperature" :humidity="humidity" :wind-speed="windSpeed" />
      </aside>

      <aside class="pointer-events-auto flex w-full flex-col gap-6 lg:w-[420px] lg:shrink-0">
        <SkyPanel
          :cloud-cover="cloudCover"
          :precipitation="precipitation"
          :visibility="visibility"
        />
        <AtmospherePanel :aqi="aqi" />
        <TimePanel v-model="time" />
      </aside>
    </div>
  </div>
</template>
