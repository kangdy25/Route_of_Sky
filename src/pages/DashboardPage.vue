<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import SceneCanvas from '@/features/scene/components/SceneCanvas.vue'
import { useWeatherStore } from '@/features/weather/model/weather.store'
import DashboardOverlay from '@/widgets/dashboard/DashboardOverlay.vue'

const weatherStore = useWeatherStore()
const sceneCanvasRef = ref<InstanceType<typeof SceneCanvas> | null>(null)

// 대시보드 카드와 3D 씬이 같은 reactive 상태를 바라보도록 Pinia store를 ref로 펼칩니다.
const { time, temperature, humidity, windSpeed, aqi, cloudCover, precipitation, visibility } =
  storeToRefs(weatherStore)

function flyToCentralPark() {
  sceneCanvasRef.value?.flyToLocation({
    longitude: -73.9654,
    latitude: 40.7829,
    height: 1450,
    headingDegrees: 32,
    pitchDegrees: -42,
    duration: 3.4,
  })
}
</script>

<template>
  <main
    class="relative min-h-screen w-full overflow-x-hidden bg-[#020617] font-sans text-slate-200"
  >
    <div class="fixed inset-0 z-0">
      <SceneCanvas
        ref="sceneCanvasRef"
        :time="time"
        :cloud-cover="cloudCover"
        :precipitation="precipitation"
        :aqi="aqi"
        :visibility="visibility"
      />
    </div>

    <DashboardOverlay
      v-model:time="time"
      :temperature="temperature"
      :humidity="humidity"
      :wind-speed="windSpeed"
      :aqi="aqi"
      :cloud-cover="cloudCover"
      :precipitation="precipitation"
      :visibility="visibility"
      @fly-to-central-park="flyToCentralPark"
    />
  </main>
</template>
