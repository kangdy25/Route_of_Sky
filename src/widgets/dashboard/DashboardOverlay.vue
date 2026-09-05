<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { hasCesiumIonAccessToken } from '@/shared/config/env'
import type { SceneLocation } from '@/features/scene/model/scene.types'
import type { SceneQualityLevel, SceneQualityMode } from '@/features/scene/model/scene.types'
import type { WeatherStatePatch } from '@/features/weather/model/weather.types'
import type { WeatherDataSource } from '@/features/weather/model/weather.store'
import { prefersReducedMotion } from '@/shared/lib/motion'
import AppHeader from './AppHeader.vue'
import AtmospherePanel from './AtmospherePanel.vue'
import EnvironmentPanel from './EnvironmentPanel.vue'
import SettingsPanel from './SettingsPanel.vue'
import SkyPanel from './SkyPanel.vue'
import TimePanel from './TimePanel.vue'

const time = defineModel<number>('time', { required: true })
const temperature = defineModel<number>('temperature', { required: true })
const humidity = defineModel<number>('humidity', { required: true })
const windSpeed = defineModel<number>('windSpeed', { required: true })
const windDirectionDegrees = defineModel<number>('windDirectionDegrees', { required: true })
const aqi = defineModel<number>('aqi', { required: true })
const cloudCover = defineModel<number>('cloudCover', { required: true })
const precipitation = defineModel<number>('precipitation', { required: true })
const visibility = defineModel<number>('visibility', { required: true })
const qualityMode = defineModel<SceneQualityMode>('qualityMode', { required: true })

const props = defineProps<{
  temperatureMin: number
  temperatureMax: number
  locations: SceneLocation[]
  selectedLocationId: string
  effectiveQuality: SceneQualityLevel
  isSceneTransitioning?: boolean
  weatherDataSource?: WeatherDataSource
  weatherIsLoading?: boolean
  weatherErrorMessage?: string
  weatherLastUpdatedAt?: number | null
}>()

const overlayRef = ref<HTMLElement | null>(null)
const panelGroupRef = ref<HTMLElement | null>(null)
const panelRefs = ref<HTMLElement[]>([])
const isSettingsOpen = ref(false)
const isDashboardOpen = ref(true)
const isPanelGroupRendered = ref(true)

let activePanelTween: gsap.core.Tween | null = null

const emit = defineEmits<{
  /** 현재 선택된 도시로 카메라 이동(FlyTo) 트리거 */
  flyToSelectedLocation: []
  /** 도시 로케이션 변경 */
  selectLocation: [locationId: string]
  /** 실시간 날씨 데이터 재반영 요청 */
  renderCurrentWeather: []
  /** 특정 프리셋 기상 상태 적용 */
  previewWeather: [patch: WeatherStatePatch]
  /** 시간대 변경 요청 */
  setTime: [time: number]
  /** 사용자 수동 날씨 슬라이더 조작 감지 이벤트 */
  manualWeatherInput: []
  /** 사용자 수동 시간 슬라이더 조작 감지 이벤트 */
  manualTimeInput: []
  /** 날씨 재동기화 재시도 요청 */
  retryWeather: []
}>()

/** 현재 활성화된 로케이션 메타데이터 */
const selectedLocation = computed(
  () => props.locations.find((location) => location.id === props.selectedLocationId) ?? props.locations[0],
)

/** 날씨 동기화 에러 발생 시 상태별 한국어 알림 메시지 */
const weatherAlertMessage = computed(() => {
  if (!props.weatherErrorMessage) return ''

  return props.weatherDataSource === 'stale-cache'
    ? '실시간 날씨를 불러오지 못했습니다. 저장된 날씨를 계속 표시합니다.'
    : '실시간 날씨를 불러오지 못했습니다. 현재 값은 최신 정보가 아닐 수 있습니다.'
})

/** 하단 서브 패널들을 Stagger 애니메이션 대상 배열에 등록 */
function registerPanel(el: unknown) {
  if (el instanceof HTMLElement && !panelRefs.value.includes(el)) {
    panelRefs.value.push(el)
  }
}

/** 4개 서브 패널 순차 등장(Stagger) 애니메이션 */
function animatePanelEntrance() {
  activePanelTween?.kill()
  if (prefersReducedMotion() || panelRefs.value.length === 0) return

  activePanelTween = gsap.fromTo(
    panelRefs.value,
    { autoAlpha: 0, y: 16 },
    { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power3.out', stagger: 0.09 },
  )
}

/** 대시보드 하단 패널 그룹 전체 토글 (접기/펼치기) */
async function toggleDashboard() {
  activePanelTween?.kill()

  // 닫혀 있는 상태에서 펼치기
  if (!isDashboardOpen.value) {
    isPanelGroupRendered.value = true
    isDashboardOpen.value = true
    await nextTick()
    animatePanelEntrance()
    return
  }

  // 모션 감소 환경이거나 DOM이 없으면 즉시 언마운트
  if (prefersReducedMotion() || !panelGroupRef.value) {
    isDashboardOpen.value = false
    isPanelGroupRendered.value = false
    return
  }

  // 열려 있는 상태에서 접기 (페이드아웃 후 unmount)
  activePanelTween = gsap.to(panelGroupRef.value, {
    autoAlpha: 0,
    y: 10,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: () => {
      isDashboardOpen.value = false
      isPanelGroupRendered.value = false
      activePanelTween = null
    },
  })
}

/** 씬 카메라 전환(FlyTo) 중 대시보드 UI를 반투명 처리 */
function animateSceneTransition(isTransitioning: boolean) {
  if (!panelGroupRef.value || prefersReducedMotion()) return

  gsap.killTweensOf(panelGroupRef.value)
  gsap.to(panelGroupRef.value, {
    autoAlpha: isTransitioning ? 0.45 : 1,
    scale: isTransitioning ? 0.985 : 1,
    y: isTransitioning ? 6 : 0,
    duration: isTransitioning ? 0.25 : 0.45,
    ease: isTransitioning ? 'power2.out' : 'power3.out',
    overwrite: 'auto',
  })
}

onMounted(() => {
  /* v8 ignore next -- 템플릿 ref가 비어 있는 비정상 마운트 방어 guard입니다. */
  if (!overlayRef.value) return

  // 초기 로드시 HUD 전체 블러 페이드인 - 진입 효과
  gsap.fromTo(
    overlayRef.value,
    { autoAlpha: 0, y: 18, filter: 'blur(10px)' },
    {
      autoAlpha: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.95,
      ease: 'power3.out',
    },
  )
  animatePanelEntrance()
})

/** 템플릿 재렌더링 시 기존 DOM 엘리먼트 배열 초기화 */
onBeforeUpdate(() => {
  panelRefs.value = []
})

/** 컴포넌트가 사라진 뒤에 애니메이션이, 콜백이 백그라운드에서 실행되어 발생하는 메모리 누수와 에러 방지. */
onBeforeUnmount(() => {
  activePanelTween?.kill()
  if (panelGroupRef.value) gsap.killTweensOf(panelGroupRef.value)
})

/**  카메라 이동 상태 실시간 감시 */
watch(() => props.isSceneTransitioning ?? false, animateSceneTransition, { immediate: true })
</script>

<template>
  <div
    ref="overlayRef"
    class="dashboard-frame pointer-events-none relative z-10 flex min-h-dvh flex-col p-3 sm:p-4 lg:p-6"
  >
    <!-- HUD 사이버펑크 데코레이션 보더 및 네온 라인 -->
    <div
      class="pointer-events-none absolute inset-2 border border-cyan-300/15 shadow-[inset_0_0_32px_rgba(34,211,238,0.10)] sm:inset-3"
    />
    <div
      class="pointer-events-none absolute inset-x-6 top-3 h-px bg-linear-to-r from-transparent via-cyan-200/70 to-transparent shadow-[0_0_16px_rgba(34,211,238,0.85)] sm:inset-x-12"
    />
    <div
      class="pointer-events-none absolute inset-x-10 bottom-3 h-px bg-linear-to-r from-transparent via-cyan-300/35 to-transparent sm:inset-x-20"
    />
    <AppHeader
      :locations="locations"
      :selected-location-id="selectedLocationId"
      :is-dashboard-open="isDashboardOpen"
      :weather-data-source="weatherDataSource"
      :weather-is-loading="weatherIsLoading"
      :weather-error-message="weatherErrorMessage"
      :weather-last-updated-at="weatherLastUpdatedAt"
      @fly-to-selected-location="emit('flyToSelectedLocation')"
      @select-location="emit('selectLocation', $event)"
      @open-settings="isSettingsOpen = true"
      @toggle-dashboard="toggleDashboard"
    />
    <!-- 날씨 동기화 에러 알림 배너 -->
    <div
      v-if="weatherAlertMessage"
      data-testid="weather-sync-alert"
      role="alert"
      class="pointer-events-auto mt-3 flex flex-col gap-3 rounded-lg border border-amber-300/35 bg-amber-950/65 p-3 text-sm text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.10)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-4"
    >
      <p>{{ weatherAlertMessage }}</p>
      <button
        type="button"
        class="rounded-md border border-amber-200/50 px-3 py-1.5 text-sm font-bold text-amber-50 transition-colors hover:bg-amber-200/15 focus:ring-2 focus:ring-amber-200/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-55"
        aria-label="날씨 동기화 다시 시도"
        :disabled="weatherIsLoading"
        @click="emit('retryWeather')"
      >
        {{ weatherIsLoading ? '업데이트 중' : '다시 시도' }}
      </button>
    </div>

    <!-- Cesium ion 토큰 미등록 시, 3D Tiles 활성화 방법 안내 -->
    <div
      v-if="!hasCesiumIonAccessToken"
      class="pointer-events-auto mt-4 rounded-lg border border-blue-500/20 bg-blue-950/45 p-3 backdrop-blur-md sm:p-4"
    >
      <div class="flex items-start gap-3">
        <svg
          class="h-5 w-5 shrink-0 text-blue-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke-width="2" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 16v-4m0-4h.01" />
        </svg>
        <div>
          <h3 class="text-sm font-semibold text-blue-300 sm:text-base">Google Photorealistic 3D Tiles 활성화 가능</h3>
          <p class="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
            프로젝트 루트의 <code>.env</code> 파일에 Cesium ion 토큰을 <code>VITE_CESIUM_ION_ACCESS_TOKEN</code> 변수로
            등록해 주세요. 등록 시 Asset ID <code>2275207</code>의 실사 3D 타일이 로드됩니다.
          </p>
        </div>
      </div>
    </div>

    <!-- 하단 메인 대시보드 서브 패널 컨테이너 -->
    <div
      v-if="isPanelGroupRendered"
      id="dashboard-panels"
      ref="panelGroupRef"
      class="mt-4 flex flex-1 flex-col justify-between gap-4 pb-24 sm:mt-5 sm:gap-5 lg:mt-6 lg:flex-row lg:items-start lg:gap-6 lg:pb-0"
    >
      <!-- 좌측 환경 메트릭 패널 -->
      <aside
        :ref="registerPanel"
        class="pointer-events-auto flex w-full flex-col gap-4 sm:gap-5 lg:w-95 lg:shrink-0 lg:gap-6"
      >
        <EnvironmentPanel
          :temperature="temperature"
          :temperature-min="temperatureMin"
          :temperature-max="temperatureMax"
          :humidity="humidity"
          :wind-speed="windSpeed"
          :wind-direction-degrees="windDirectionDegrees"
        />
      </aside>

      <!-- 우측 하늘/대기/시간 제어 패널 그룹 -->
      <aside
        :ref="registerPanel"
        class="pointer-events-auto flex w-full flex-col gap-4 sm:gap-5 lg:w-97.5 lg:shrink-0 lg:gap-6"
      >
        <SkyPanel
          :cloud-cover="cloudCover"
          :precipitation="precipitation"
          :visibility="visibility"
          :temperature="temperature"
        />
        <AtmospherePanel :aqi="aqi" />
        <TimePanel
          v-model="time"
          :location="selectedLocation"
          @set-time="emit('setTime', $event)"
          @manual-time-input="emit('manualTimeInput')"
        />
      </aside>
    </div>

    <!-- 환경설정 모달 다이얼로그 -->
    <SettingsPanel
      v-model:time="time"
      v-model:temperature="temperature"
      v-model:humidity="humidity"
      v-model:wind-speed="windSpeed"
      v-model:wind-direction-degrees="windDirectionDegrees"
      v-model:aqi="aqi"
      v-model:cloud-cover="cloudCover"
      v-model:precipitation="precipitation"
      v-model:visibility="visibility"
      v-model:quality-mode="qualityMode"
      :open="isSettingsOpen"
      :location="selectedLocation"
      :effective-quality="effectiveQuality"
      @close="isSettingsOpen = false"
      @render-current-weather="emit('renderCurrentWeather')"
      @preview-weather="emit('previewWeather', $event)"
      @set-time="emit('setTime', $event)"
      @manual-weather-input="emit('manualWeatherInput')"
      @manual-time-input="emit('manualTimeInput')"
    />
  </div>
</template>

<style scoped>
.dashboard-frame::before,
.dashboard-frame::after {
  position: absolute;
  z-index: 0;
  width: 92px;
  height: 92px;
  content: '';
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(34, 211, 238, 0.55));
}

.dashboard-frame::before {
  top: 12px;
  left: 12px;
  border-top: 2px solid rgba(34, 211, 238, 0.62);
  border-left: 2px solid rgba(34, 211, 238, 0.62);
}

.dashboard-frame::after {
  right: 12px;
  bottom: 12px;
  border-right: 2px solid rgba(34, 211, 238, 0.52);
  border-bottom: 2px solid rgba(34, 211, 238, 0.52);
}

@media (max-width: 639px) {
  .dashboard-frame::before,
  .dashboard-frame::after {
    width: 56px;
    height: 56px;
  }
}
</style>
