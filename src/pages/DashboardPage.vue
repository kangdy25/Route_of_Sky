<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import SceneCanvas from '@/features/scene/components/SceneCanvas.vue'
import { WORLD_LOCATIONS } from '@/features/scene/model/scene.constants'
import { getRecommendedAutoQuality } from '@/features/scene/lib/sceneQuality'
import type { SceneQualityLevel, SceneQualityMode } from '@/features/scene/model/scene.types'
import { createWeatherLocationQuery } from '@/features/weather/api/weatherApi'
import { useWeatherStore } from '@/features/weather/model/weather.store'
import DashboardOverlay from '@/widgets/dashboard/DashboardOverlay.vue'

const SELECTED_LOCATION_STORAGE_KEY = 'route-of-sky:selected-location-id'
const SCENE_QUALITY_STORAGE_KEY = 'route-of-sky:scene-quality-mode'
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

function getStoredQualityMode(): SceneQualityMode {
  try {
    const mode = window.localStorage.getItem(SCENE_QUALITY_STORAGE_KEY)
    return mode === 'auto' || mode === 'high' || mode === 'medium' || mode === 'low' ? mode : 'auto'
  } catch {
    return 'auto'
  }
}

const weatherStore = useWeatherStore()
const sceneCanvasRef = ref<InstanceType<typeof SceneCanvas> | null>(null)
const selectedLocation = ref(getStoredSelectedLocation())
const isSceneTransitioning = ref(false)
const qualityMode = ref<SceneQualityMode>(getStoredQualityMode())
const effectiveQuality = ref<SceneQualityLevel>(
  qualityMode.value === 'auto' ? getRecommendedAutoQuality() : qualityMode.value,
)

watch(qualityMode, (mode) => {
  try {
    window.localStorage.setItem(SCENE_QUALITY_STORAGE_KEY, mode)
  } catch {
    // 저장소를 사용할 수 없는 환경에서는 현재 세션 설정만 유지합니다.
  }
})

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
  isLoading,
  errorMessage,
  lastUpdatedAt,
  dataSource,
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

function loadSelectedLocationWeather(force = false) {
  const location = selectedLocation.value

  return weatherStore.loadCurrentWeather(createWeatherLocationQuery(location.lat, location.lng), {
    force,
  })
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
        :quality-mode="qualityMode"
        @update:effective-quality="effectiveQuality = $event"
        @camera-flight-start="isSceneTransitioning = true"
        @camera-flight-end="isSceneTransitioning = false"
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
      v-model:quality-mode="qualityMode"
      :locations="WORLD_LOCATIONS"
      :selected-location-id="selectedLocation.id"
      :effective-quality="effectiveQuality"
      :is-scene-transitioning="isSceneTransitioning"
      :weather-data-source="dataSource"
      :weather-is-loading="isLoading"
      :weather-error-message="errorMessage"
      :weather-last-updated-at="lastUpdatedAt"
      @fly-to-selected-location="flyToSelectedLocation"
      @select-location="selectLocation"
      @render-current-weather="loadSelectedLocationWeather(true)"
      @retry-weather="loadSelectedLocationWeather(true)"
      @preview-weather="weatherStore.applyWeatherPatch($event, { animate: true })"
      @set-time="weatherStore.setSceneTime($event, { animate: true })"
      @manual-weather-input="weatherStore.cancelTransitions()"
      @manual-time-input="weatherStore.cancelTransitions()"
    />
  </main>
</template>
