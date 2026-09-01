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

// ==========================================
// 로컬 스토리지 키 및 기본값 설정
// ==========================================

const SELECTED_LOCATION_STORAGE_KEY = 'route-of-sky:selected-location-id'
const SCENE_QUALITY_STORAGE_KEY = 'route-of-sky:scene-quality-mode'
const defaultLocation = WORLD_LOCATIONS[1] // 기본 진입 위치 (현재 미국 타임스퀘어)

/**
 * 로컬 스토리지에 저장된 마지막 선택 위치를 불러옵니다.
 * 유효한 위치 데이터가 없거나 스토리지 접근 실패 시 기본 위치(타임스퀘어)를 반환합니다.
 */
function getStoredSelectedLocation() {
  try {
    const locationId = window.localStorage.getItem(SELECTED_LOCATION_STORAGE_KEY)

    return WORLD_LOCATIONS.find((location) => location.id === locationId) ?? defaultLocation
  } catch {
    return defaultLocation
  }
}

/**
 * 선택한 위치 ID를 로컬 스토리지에 저장합니다.
 * 시크릿 모드 등 스토리지 접근이 차단된 환경에서는 에러를 무시하고 세션 상태만 유지합니다.
 */
function saveSelectedLocation(locationId: string) {
  try {
    window.localStorage.setItem(SELECTED_LOCATION_STORAGE_KEY, locationId)
  } catch {}
}

/**
 * 로컬 스토리지에 저장된 3D 그래픽 품질 설정(auto/high/medium/low)을 불러옵니다.
 * 유효하지 않은 값이거나 스토리지 접근 실패 시 기본값('auto')을 반환합니다.
 */
function getStoredQualityMode(): SceneQualityMode {
  try {
    const mode = window.localStorage.getItem(SCENE_QUALITY_STORAGE_KEY)
    return mode === 'auto' || mode === 'high' || mode === 'medium' || mode === 'low' ? mode : 'auto'
  } catch {
    return 'auto'
  }
}

// ==========================================
// 2. 컴포넌트 반응형 상태 (State)
// ==========================================

const weatherStore = useWeatherStore()
const sceneCanvasRef = ref<InstanceType<typeof SceneCanvas> | null>(null)
const selectedLocation = ref(getStoredSelectedLocation())
const isSceneTransitioning = ref(false)
const qualityMode = ref<SceneQualityMode>(getStoredQualityMode())
const effectiveQuality = ref<SceneQualityLevel>(
  qualityMode.value === 'auto' ? getRecommendedAutoQuality() : qualityMode.value,
)

/** 품질 모드 변경 시 로컬 스토리지에 동기화 */
watch(qualityMode, (mode) => {
  try {
    window.localStorage.setItem(SCENE_QUALITY_STORAGE_KEY, mode)
  } catch {}
})

// ==========================================
// 3. 날씨 전역 상태 (Pinia Store)
// ==========================================

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

/**
 * 3D 씬 카메라를 현재 선택된 위치(경도, 위도)로 부드럽게 이동시킵니다.
 */
function flyToSelectedLocation() {
  const location = selectedLocation.value
  sceneCanvasRef.value?.flyToLocation({
    longitude: location.lng,
    latitude: location.lat,
    height: 1650, // 카메라 고도 (m)
    headingDegrees: 28, // 카메라 수평 방향각 (Yaw)
    pitchDegrees: -38, // 카메라 내려다보는 각도 (Pitch)
    duration: 3.4, // 비행 전환 애니메이션 지속 시간 (초)
  })
}

/**
 * 현재 선택된 위치의 날씨 데이터를 API로부터 불러옵니다.
 * force가 true일 경우 캐시를 무시하고 최신 날씨를 강제 재조회합니다.
 */
function loadSelectedLocationWeather(force = false) {
  const location = selectedLocation.value

  return weatherStore.loadCurrentWeather(createWeatherLocationQuery(location.lat, location.lng), {
    force,
  })
}

/**
 * 대시보드에서 새로운 위치(도시)를 선택했을 때 실행되는 핸들러입니다.
 * 상태 업데이트 -> 스토리지 저장 -> 3D 카메라 이동 -> 날씨 데이터 조회를 순차 처리합니다.
 */
function selectLocation(locationId: string) {
  const nextLocation = WORLD_LOCATIONS.find((location) => location.id === locationId)
  if (!nextLocation) return

  selectedLocation.value = nextLocation
  saveSelectedLocation(nextLocation.id)
  flyToSelectedLocation()
  void loadSelectedLocationWeather()
}

// 컴포넌트 마운트 완료 시 현재/저장된 위치의 날씨 데이터를 최초 1회 조회
onMounted(() => {
  void loadSelectedLocationWeather()
})
</script>

<template>
  <main
    class="relative min-h-screen w-full overflow-x-hidden bg-[#020617] font-sans text-slate-200"
  >
    <div class="fixed inset-0 z-0">
      <!-- 3D 그래픽 Scene (배경 레이어) -->
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

    <!-- 3D 그래픽 Scene 위의 대시보드 UI (조작/표시 레이어) -->
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
