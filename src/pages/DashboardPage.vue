<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import SceneCanvas from '@/features/scene/components/SceneCanvas.vue'
import { useWeatherStore } from '@/features/weather/model/weather.store'
import DashboardOverlay from '@/widgets/dashboard/DashboardOverlay.vue'

const weatherStore = useWeatherStore()
const sceneCanvasRef = ref<InstanceType<typeof SceneCanvas> | null>(null)

// 대시보드 카드와 3D 씬이 같은 reactive 상태를 바라보도록 Pinia store를 ref로 펼칩니다.
const {
  time,
  temperature,
  humidity,
  windSpeed,
  windDirectionDegrees,
  aqi,
  cloudCover,
  precipitation,
  visibility,
} = storeToRefs(weatherStore)

function flyToTimesSquare() {
  sceneCanvasRef.value?.flyToLocation({
    longitude: -73.9855,
    latitude: 40.758,
    height: 1350,
    headingDegrees: 28,
    pitchDegrees: -38,
    duration: 3.4,
  })
}

onMounted(() => {
  void weatherStore.loadCurrentWeather()
})
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
        :temperature="temperature"
        :wind-speed="windSpeed"
        :wind-direction-degrees="windDirectionDegrees"
        :humidity="humidity"
      />
    </div>

    <DashboardOverlay
      v-model:time="time"
      v-model:temperature="temperature"
      v-model:humidity="humidity"
      v-model:wind-speed="windSpeed"
      v-model:wind-direction-degrees="windDirectionDegrees"
      v-model:aqi="aqi"
      v-model:cloud-cover="cloudCover"
      v-model:precipitation="precipitation"
      v-model:visibility="visibility"
      @fly-to-times-square="flyToTimesSquare"
    />
  </main>
</template>
