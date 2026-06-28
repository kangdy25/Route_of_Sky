<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import SceneCanvas from '@/features/scene/components/SceneCanvas.vue'
import { WORLD_LOCATIONS } from '@/features/scene/model/scene.constants'
import { createWeatherLocationQuery } from '@/features/weather/api/weatherApi'
import { useWeatherStore } from '@/features/weather/model/weather.store'
import DashboardOverlay from '@/widgets/dashboard/DashboardOverlay.vue'

const SELECTED_LOCATION_STORAGE_KEY = 'route-of-sky:selected-location-id'
const defaultLocation = WORLD_LOCATIONS[1]

function getStoredSelectedLocation() {
  try {
    const locationId = window.localStorage.getItem(SELECTED_LOCATION_STORAGE_KEY)

    return WORLD_LOCATIONS.find((location) => location.id === locationId) ?? defaultLocation
  } catch {
    return defaultLocation
  }
}

function saveSelectedLocation(locationId: string) {
  try {
    window.localStorage.setItem(SELECTED_LOCATION_STORAGE_KEY, locationId)
  } catch {
    // 저장소를 사용할 수 없는 브라우저 모드에서는 현재 세션 상태만 유지합니다.
  }
}

const weatherStore = useWeatherStore()
const sceneCanvasRef = ref<InstanceType<typeof SceneCanvas> | null>(null)
const selectedLocation = ref(getStoredSelectedLocation())

// 대시보드 카드와 3D 씬이 같은 reactive 상태를 바라보도록 Pinia store를 ref로 펼칩니다.
const {
  time,
  temperature,
  temperatureMin,
  temperatureMax,
  humidity,
  windSpeed,
  windDirectionDegrees,
  aqi,
  cloudCover,
  precipitation,
  visibility,
} = storeToRefs(weatherStore)

function flyToSelectedLocation() {
  const location = selectedLocation.value
  sceneCanvasRef.value?.flyToLocation({
    longitude: location.lng,
    latitude: location.lat,
    height: 1650,
    headingDegrees: 28,
    pitchDegrees: -38,
    duration: 3.4,
  })
}

function loadSelectedLocationWeather() {
  const location = selectedLocation.value

  return weatherStore.loadCurrentWeather(createWeatherLocationQuery(location.lat, location.lng))
}

function selectLocation(locationId: string) {
  const nextLocation = WORLD_LOCATIONS.find((location) => location.id === locationId)
  if (!nextLocation) return

  selectedLocation.value = nextLocation
  saveSelectedLocation(nextLocation.id)
  flyToSelectedLocation()
  void loadSelectedLocationWeather()
}

onMounted(() => {
  void loadSelectedLocationWeather()
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
        :location="selectedLocation"
      />
    </div>

    <DashboardOverlay
      v-model:time="time"
      v-model:temperature="temperature"
      :temperature-min="temperatureMin"
      :temperature-max="temperatureMax"
      v-model:humidity="humidity"
      v-model:wind-speed="windSpeed"
      v-model:wind-direction-degrees="windDirectionDegrees"
      v-model:aqi="aqi"
      v-model:cloud-cover="cloudCover"
      v-model:precipitation="precipitation"
      v-model:visibility="visibility"
      :locations="WORLD_LOCATIONS"
      :selected-location-id="selectedLocation.id"
      @fly-to-selected-location="flyToSelectedLocation"
      @select-location="selectLocation"
      @render-current-weather="loadSelectedLocationWeather"
    />
  </main>
</template>
