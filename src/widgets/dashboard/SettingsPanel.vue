<script setup lang="ts">
import { gsap } from 'gsap'
import { computed, ref, watch } from 'vue'
import { formatTime } from '@/features/weather/lib/formatTime'
import type { WeatherStatePatch } from '@/features/weather/model/weather.types'
import { getCurrentLocalTimeForLocation } from '@/features/scene/lib/sky'
import { WORLD_LOCATIONS } from '@/features/scene/model/scene.constants'
import { prefersReducedMotion } from '@/shared/lib/motion'
import { formatInteger, formatSingleDecimal } from '@/shared/lib/formatMetricValue'
import type { SceneLocation, SceneQualityLevel, SceneQualityMode } from '@/features/scene/model/scene.types'

// 씬 & 날씨 제어 양방향 모델 바인딩
const time = defineModel<number>('time', { required: true })
const temperature = defineModel<number>('temperature', { required: true })
const humidity = defineModel<number>('humidity', { required: true })
const windSpeed = defineModel<number>('windSpeed', { required: true })
const windDirectionDegrees = defineModel<number>('windDirectionDegrees', { required: true })
const aqi = defineModel<number>('aqi', { required: true })
const cloudCover = defineModel<number>('cloudCover', { required: true })
const precipitation = defineModel<number>('precipitation', { required: true })
const visibility = defineModel<number>('visibility', { required: true })
const qualityMode = defineModel<SceneQualityMode>('qualityMode', { default: 'auto' })

const props = withDefaults(
  defineProps<{
    open: boolean
    location?: SceneLocation
    effectiveQuality?: SceneQualityLevel
  }>(),
  {
    location: () => WORLD_LOCATIONS[1],
    effectiveQuality: 'high',
  },
)

const emit = defineEmits<{
  /** 설정 패널 닫기 요청 */
  close: []
  /** 현재 실제 날씨 API 데이터로 씬 전체 복원 */
  renderCurrentWeather: []
  /** 특정 프리셋 날씨 상태 일괄 적용 */
  previewWeather: [patch: WeatherStatePatch]
  /** 시간대 변경 요청 */
  setTime: [time: number]
  /** 사용자가 수동으로 날씨 슬라이더 조작 시 발생 (자동 동기화 일시정지용) */
  manualWeatherInput: []
  /** 사용자가 수동으로 시간 슬라이더 조작 시 발생 */
  manualTimeInput: []
}>()

/** AQI, 운량, 강수량에 따라 가시거리를 자동 계산할지 여부 */
const autoVisibility = ref(true)

// 강수 및 기온 기반 눈/비 판별
const isSnowPreview = computed(() => precipitation.value > 0 && temperature.value <= 0)
const precipitationTestLabel = computed(() => (isSnowPreview.value ? '적설량' : '강수량'))
const precipitationTestUnit = computed(() => (isSnowPreview.value ? 'cm/h' : 'mm/h'))

// 디스플레이 포맷팅
const formattedTime = computed(() => formatTime(time.value))
const displayedAqi = computed(() => formatInteger(aqi.value))
const displayedTemperature = computed(() => formatSingleDecimal(temperature.value))
const displayedHumidity = computed(() => formatInteger(humidity.value))
const displayedWindSpeed = computed(() => formatSingleDecimal(windSpeed.value))

/**
 * 대기질(AQI), 강수량, 운량을 바탕으로 물리적 가시거리(km)를 추정 계산하는 순수 함수
 * 기본 최대 시정 22km에서 지표별 감쇄 수식을 적용하고 1.0 ~ 22.0km 범위로 클램핑합니다.
 */
function calculateVisibility(params: {
  aqiValue: number
  precipitationValue: number
  cloudCoverValue: number
}): number {
  // AQI는 0~300 범위로 정규화 후 비선형 감쇄 적용
  const normalizedAqi = Math.min(300, Math.max(0, params.aqiValue))
  const airQualityVisibility = 22 - normalizedAqi ** 1.15 * 0.027
  // 강수 패널티: 강수량당 0.45km씩 최대 8km 감쇄
  const precipitationPenalty = Math.min(8, params.precipitationValue * 0.45)
  // 운량 패널티: 운량이 70%를 초과할 때만 초과분에 대해 미세 감쇄
  const cloudPenalty = Math.max(0, (params.cloudCoverValue - 70) * 0.025)

  const finalVisibility = airQualityVisibility - precipitationPenalty - cloudPenalty
  return Math.max(1, Math.min(22, Number(finalVisibility.toFixed(1))))
}

/**
 * 현재 반응형 상태들을 바탕으로 가시거리(visibility)를 자동 갱신
 * 모달이 열려있고 autoVisibility 옵션이 켜져 있을 때만 실행됩니다.
 */
function syncVisibilityFromAirQuality() {
  if (!props.open || !autoVisibility.value) return

  visibility.value = calculateVisibility({
    aqiValue: aqi.value,
    precipitationValue: precipitation.value,
    cloudCoverValue: cloudCover.value,
  })
}

/**
 * AQI 슬라이더 수동 조작 핸들러,
 * 부모에게 수동 입력 이벤트를 전달하고 가시거리 자동 갱신을 실행합니다.
 */
function handleAqiInput() {
  emit('manualWeatherInput')
  syncVisibilityFromAirQuality()
}

// 프리셋 정의 및 적용
type WeatherPresetValues = {
  temperature: number
  cloudCover: number
  precipitation: number
  windSpeed: number
  windDirectionDegrees: number
  humidity: number
  aqi: number
}

/**
 * 주어진 프리셋 수치 세트를 씬에 적용,
 * 가시거리는 프리셋의 파라미터를 기반으로 즉시 연산하여 함께 주입합니다.
 */
function applyWeatherPreset(preset: WeatherPresetValues) {
  const calculatedVis = calculateVisibility({
    aqiValue: preset.aqi,
    precipitationValue: preset.precipitation,
    cloudCoverValue: preset.cloudCover,
  })
  emit('previewWeather', {
    ...preset,
    visibility: calculatedVis,
  })
}

/** 맑은 날씨 프리셋 적용 (고온, 저운량, 무강수) */
function previewSunny() {
  applyWeatherPreset({
    temperature: 22,
    cloudCover: 8,
    precipitation: 0,
    windSpeed: 2.8,
    windDirectionDegrees: 240,
    humidity: 42,
    aqi: 32,
  })
}

/** 비 오는 날씨 프리셋 적용 (중온, 고운량, 일반 강수) */
function previewRain() {
  applyWeatherPreset({
    temperature: 15,
    cloudCover: 88,
    precipitation: 7.2,
    windSpeed: 6.5,
    windDirectionDegrees: 160,
    humidity: 86,
    aqi: 25,
  })
}

/** 폭풍우 날씨 프리셋 적용 (전운량, 강한 강수, 강풍) */
function previewStorm() {
  applyWeatherPreset({
    temperature: 23,
    cloudCover: 100,
    precipitation: 16,
    windSpeed: 14,
    windDirectionDegrees: 225,
    humidity: 94,
    aqi: 35,
  })
}

/** 눈 오는 날씨 프리셋 적용 (영하 기온, 고운량, 적설 강수) */
function previewSnow() {
  applyWeatherPreset({
    temperature: -7,
    cloudCover: 92,
    precipitation: 4.8,
    windSpeed: 5.5,
    windDirectionDegrees: 30,
    humidity: 90,
    aqi: 20,
  })
}

/** 안개/미세먼지 날씨 프리셋 적용 (극단적 AQI, 시정 급감) */
function previewHaze() {
  applyWeatherPreset({
    temperature: 27,
    cloudCover: 62,
    precipitation: 0,
    windSpeed: 1.5,
    windDirectionDegrees: 270,
    humidity: 66,
    aqi: 260,
  })
}

/** 사전 정의된 시간대 프리셋(새벽, 정오, 일몰, 밤)으로 시간 변경 요청 */
function setTimePreset(nextTime: number) {
  emit('setTime', nextTime)
}

/** 현재 선택된 로케이션의 실제 현지 시각으로 씬 시간 복원 */
function resetToCurrentTime() {
  emit('setTime', getCurrentLocalTimeForLocation(props.location))
}

/**
 * 모달 진입 GSAP 애니메이션 (Enter)
 * 배경은 부드럽게 페이드인되고, 사이드 패널은 우측에서 미끄러져 들어옵니다.
 */
function enter(el: Element, done: () => void) {
  const backdrop = el.querySelector<HTMLElement>('[data-settings-backdrop]')
  const panel = el.querySelector<HTMLElement>('[data-settings-panel]')

  // 모션 감소 선호 환경(접근성)에서는 애니메이션 생략 후 즉시 렌더
  if (!backdrop || !panel || prefersReducedMotion()) {
    gsap.set([backdrop, panel].filter(Boolean), { clearProps: 'all' })
    done()
    return
  }

  gsap
    .timeline({ onComplete: done })
    .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power1.out' })
    .fromTo(panel, { autoAlpha: 0, x: 32 }, { autoAlpha: 1, x: 0, duration: 0.28, ease: 'power3.out' }, 0)
}

/**
 * 모달 퇴장 GSAP 애니메이션 (Leave)
 * 패널이 먼저 우측으로 빠져나가고 배경이 페이드아웃된 후 완료 콜백을 실행합니다.
 */
function leave(el: Element, done: () => void) {
  const backdrop = el.querySelector<HTMLElement>('[data-settings-backdrop]')
  const panel = el.querySelector<HTMLElement>('[data-settings-panel]')

  if (!backdrop || !panel || prefersReducedMotion()) {
    done()
    return
  }

  gsap
    .timeline({ onComplete: done })
    .to(panel, { autoAlpha: 0, x: 32, duration: 0.22, ease: 'power2.in' })
    .to(backdrop, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 0)
}

// 날씨 수치 변경 감지 -> 자동 가시거리 동기화
watch([aqi, precipitation, cloudCover], () => {
  syncVisibilityFromAirQuality()
})

// 자동 가시거리 체크박스 토글 감지 -> 켜지는 즉시 현재 상태로 동기화
watch(autoVisibility, (enabled) => {
  if (enabled) {
    syncVisibilityFromAirQuality()
  }
})
</script>

<template>
  <!-- DOM 트리의 제약을 벗어나 최상단 body 직하단으로 렌더링 -->
  <Teleport to="body">
    <!-- GSAP 커스텀 훅으로 진입/퇴장 애니메이션 위임 (:css="false") -->
    <Transition :css="false" @enter="enter" @leave="leave">
      <div v-if="open" class="fixed inset-0 z-40">
        <!-- 백드롭(배경) 오버레이: 클릭 시 패널 닫기 -->
        <button
          type="button"
          data-settings-backdrop
          class="absolute inset-0 h-full w-full bg-slate-950/46 backdrop-blur-[2px]"
          aria-label="Close settings"
          @click="emit('close')"
        ></button>
        <!-- 우측 슬라이드 사이드 패널 -->
        <aside
          data-settings-panel
          class="absolute top-0 right-0 flex h-full w-[min(27rem,100vw)] flex-col border-l border-cyan-300/20 bg-slate-950/92 text-slate-100 shadow-[-24px_0_72px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          @click.stop
        >
          <!-- 패널 헤더 -->
          <header
            class="flex items-center justify-between border-b border-cyan-300/15 px-5 py-4 shadow-[inset_0_-1px_0_rgba(34,211,238,0.08)]"
          >
            <div>
              <p class="text-xs font-bold tracking-widest text-cyan-300">SETTINGS</p>
              <h2 id="settings-title" class="mt-1 text-xl font-black text-cyan-50">환경설정</h2>
            </div>
            <button
              type="button"
              class="rounded-md border border-cyan-300/25 bg-slate-900/70 p-2 text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-400/15 focus:ring-2 focus:ring-cyan-300/45 focus:outline-none"
              aria-label="Close settings"
              @click="emit('close')"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 6l12 12M18 6 6 18"></path>
              </svg>
            </button>
          </header>

          <!-- 패널 본문 스크롤 영역 -->
          <div class="flex-1 overflow-y-auto px-5 py-5">
            <!-- 씬 및 렌더링 품질 제어 -->
            <section class="rounded-lg border border-cyan-300/15 bg-slate-900/50 p-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 class="text-sm font-black tracking-wide text-cyan-100 uppercase">Scene</h3>
                  <p class="mt-1 text-xs leading-relaxed text-slate-400">
                    타임스퀘어 배경과 실시간 기상 효과가 적용 중입니다.
                  </p>
                </div>
                <span
                  class="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200"
                >
                  Live
                </span>
              </div>
              <!-- 렌더링 품질 선택 셀렉트 -->
              <label class="mt-4 block">
                <span class="flex items-center justify-between gap-3 text-xs font-bold text-slate-300">
                  <span>렌더링 품질</span>
                  <span class="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2 py-1 text-cyan-200">
                    적용: {{ effectiveQuality.toUpperCase() }}
                  </span>
                </span>
                <select
                  v-model="qualityMode"
                  aria-label="렌더링 품질"
                  class="mt-2 w-full rounded-md border border-cyan-300/20 bg-slate-950/70 px-3 py-2 text-sm font-bold text-cyan-50 outline-none focus:ring-2 focus:ring-cyan-300/40"
                >
                  <option value="auto">Auto · 프레임 기반 자동 조절</option>
                  <option value="high">High · 최고 화질</option>
                  <option value="medium">Medium · 균형</option>
                  <option value="low">Low · 성능 우선</option>
                </select>
              </label>
            </section>

            <!-- 시간대 설정 -->
            <section class="mt-4 rounded-lg border border-cyan-300/15 bg-slate-900/50 p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-black tracking-wide text-cyan-100 uppercase">시간대 설정</h3>
                  <p class="mt-1 text-xs leading-relaxed text-slate-400">
                    태양의 고도와 하늘 색감, 그림자 연출을 함께 조율할 수 있습니다.
                  </p>
                </div>
                <span class="text-sm font-black text-cyan-200">{{ formattedTime }}</span>
              </div>

              <button
                type="button"
                class="mt-4 w-full rounded-md border border-cyan-200/55 bg-cyan-300/22 px-3 py-3 text-sm font-black text-cyan-50 shadow-[0_0_16px_rgba(103,232,249,0.18)] transition hover:border-cyan-100/80 hover:bg-cyan-300/30 focus:ring-2 focus:ring-cyan-100/55 focus:outline-none"
                @click="resetToCurrentTime"
              >
                현재 시각 반영
              </button>
              <div class="mt-3 grid grid-cols-4 gap-2">
                <button
                  type="button"
                  class="rounded-md border border-rose-300/35 bg-rose-500/15 px-2 py-2 text-xs font-black text-rose-100 transition hover:border-rose-200/70 hover:bg-rose-500/25 focus:ring-2 focus:ring-rose-300/40 focus:outline-none"
                  @click="setTimePreset(6.2)"
                >
                  새벽
                </button>
                <button
                  type="button"
                  class="rounded-md border border-amber-300/35 bg-amber-400/15 px-2 py-2 text-xs font-black text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-400/25 focus:ring-2 focus:ring-amber-300/40 focus:outline-none"
                  @click="setTimePreset(12)"
                >
                  정오
                </button>
                <button
                  type="button"
                  class="rounded-md border border-orange-300/35 bg-orange-500/15 px-2 py-2 text-xs font-black text-orange-100 transition hover:border-orange-200/70 hover:bg-orange-500/25 focus:ring-2 focus:ring-orange-300/40 focus:outline-none"
                  @click="setTimePreset(18.6)"
                >
                  일몰
                </button>
                <button
                  type="button"
                  class="rounded-md border border-indigo-300/35 bg-indigo-500/15 px-2 py-2 text-xs font-black text-indigo-100 transition hover:border-indigo-200/70 hover:bg-indigo-500/25 focus:ring-2 focus:ring-indigo-300/40 focus:outline-none"
                  @click="setTimePreset(22.5)"
                >
                  밤
                </button>
              </div>

              <label class="mt-4 block">
                <span class="flex justify-between gap-3 text-xs font-bold text-slate-300">
                  <span>시간 조절</span>
                  <span>{{ formattedTime }}</span>
                </span>
                <input
                  v-model.number="time"
                  @input="emit('manualTimeInput')"
                  class="mt-2 h-2 w-full accent-cyan-300"
                  type="range"
                  min="0"
                  max="23.9"
                  step="0.1"
                />
              </label>
            </section>
            <!-- 날씨 시뮬레이션 (Weather Lab) -->
            <section class="mt-4 rounded-lg border border-cyan-300/15 bg-slate-900/50 p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-black tracking-wide text-cyan-100 uppercase">날씨 시뮬레이션 (Lab)</h3>
                  <p class="mt-1 text-xs leading-relaxed text-slate-400">
                    실시간 API 연동 전, 기상 시나리오를 미리 테스트합니다.
                  </p>
                </div>
              </div>

              <!-- 날씨 프리셋 버튼 그리드 -->
              <div class="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  class="col-span-3 rounded-md border border-cyan-200/55 bg-cyan-300/22 px-3 py-3 text-sm font-black text-cyan-50 shadow-[0_0_16px_rgba(103,232,249,0.18)] transition hover:border-cyan-100/80 hover:bg-cyan-300/30 focus:ring-2 focus:ring-cyan-100/55 focus:outline-none"
                  @click="emit('renderCurrentWeather')"
                >
                  실시간 날씨 반영
                </button>
                <button
                  type="button"
                  class="rounded-md border border-emerald-300/35 bg-emerald-400/10 px-3 py-2 text-sm font-black text-emerald-100 transition hover:border-emerald-200/70 hover:bg-emerald-400/20 focus:ring-2 focus:ring-emerald-300/40 focus:outline-none"
                  @click="previewSunny"
                >
                  맑음
                </button>
                <button
                  type="button"
                  class="rounded-md border border-sky-300/35 bg-sky-500/15 px-3 py-2 text-sm font-black text-sky-100 transition hover:border-sky-200/70 hover:bg-sky-500/25 focus:ring-2 focus:ring-sky-300/40 focus:outline-none"
                  @click="previewRain"
                >
                  비
                </button>
                <button
                  type="button"
                  class="rounded-md border border-violet-300/35 bg-violet-500/15 px-3 py-2 text-sm font-black text-violet-100 transition hover:border-violet-200/70 hover:bg-violet-500/25 focus:ring-2 focus:ring-violet-300/40 focus:outline-none"
                  @click="previewStorm"
                >
                  폭풍우
                </button>
                <button
                  type="button"
                  class="rounded-md border border-cyan-100/35 bg-cyan-100/10 px-3 py-2 text-sm font-black text-cyan-50 transition hover:border-cyan-100/70 hover:bg-cyan-100/20 focus:ring-2 focus:ring-cyan-100/40 focus:outline-none"
                  @click="previewSnow"
                >
                  눈
                </button>
                <button
                  type="button"
                  class="rounded-md border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-sm font-black text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-400/20 focus:ring-2 focus:ring-amber-300/40 focus:outline-none"
                  @click="previewHaze"
                >
                  미세먼지
                </button>
              </div>

              <!-- 개별 기상 수치 슬라이더 모음 -->
              <div class="mt-4 space-y-4">
                <!-- 강수량 / 적설량 -->
                <label class="block">
                  <span class="flex justify-between gap-3 text-xs font-bold text-slate-300">
                    <span>{{ precipitationTestLabel }}</span>
                    <span>{{ precipitation.toFixed(1) }} {{ precipitationTestUnit }}</span>
                  </span>
                  <input
                    v-model.number="precipitation"
                    @input="emit('manualWeatherInput')"
                    class="mt-2 h-2 w-full accent-cyan-300"
                    type="range"
                    min="0"
                    max="16"
                    step="0.1"
                  />
                </label>

                <label class="block">
                  <span class="flex justify-between gap-3 text-xs font-bold text-slate-300">
                    <span>기온</span>
                    <span>{{ displayedTemperature }}°C</span>
                  </span>
                  <input
                    v-model.number="temperature"
                    @input="emit('manualWeatherInput')"
                    class="mt-2 h-2 w-full accent-cyan-300"
                    type="range"
                    min="-20"
                    max="40"
                    step="0.5"
                  />
                </label>

                <div class="grid grid-cols-2 gap-3">
                  <label class="block">
                    <span class="flex justify-between gap-2 text-xs font-bold text-slate-300">
                      <span>운량 (구름)</span>
                      <span>{{ cloudCover }}%</span>
                    </span>
                    <input
                      v-model.number="cloudCover"
                      @input="emit('manualWeatherInput')"
                      class="mt-2 h-2 w-full accent-cyan-300"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                    />
                  </label>

                  <label class="block">
                    <span class="flex justify-between gap-2 text-xs font-bold text-slate-300">
                      <span>풍속</span>
                      <span>{{ displayedWindSpeed }} m/s</span>
                    </span>
                    <input
                      v-model.number="windSpeed"
                      @input="emit('manualWeatherInput')"
                      class="mt-2 h-2 w-full accent-cyan-300"
                      type="range"
                      min="0"
                      max="18"
                      step="0.5"
                    />
                  </label>

                  <label class="block">
                    <span class="flex justify-between gap-2 text-xs font-bold text-slate-300">
                      <span>풍향</span>
                      <span>{{ Math.round(windDirectionDegrees) }}°</span>
                    </span>
                    <input
                      v-model.number="windDirectionDegrees"
                      @input="emit('manualWeatherInput')"
                      class="mt-2 h-2 w-full accent-cyan-300"
                      type="range"
                      min="0"
                      max="359"
                      step="1"
                    />
                  </label>

                  <label class="block">
                    <span class="flex justify-between gap-2 text-xs font-bold text-slate-300">
                      <span>습도</span>
                      <span>{{ displayedHumidity }}%</span>
                    </span>
                    <input
                      v-model.number="humidity"
                      @input="emit('manualWeatherInput')"
                      class="mt-2 h-2 w-full accent-cyan-300"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                    />
                  </label>

                  <label class="block">
                    <span class="flex justify-between gap-2 text-xs font-bold text-slate-300">
                      <span>대기질 지수 (AQI)</span>
                      <span>{{ displayedAqi }}</span>
                    </span>
                    <input
                      v-model.number="aqi"
                      class="mt-2 h-2 w-full accent-cyan-300"
                      type="range"
                      min="0"
                      max="300"
                      step="1"
                      @input="handleAqiInput"
                    />
                  </label>

                  <label class="block">
                    <span class="flex justify-between gap-2 text-xs font-bold text-slate-300">
                      <span>가시거리</span>
                      <span>{{ visibility.toFixed(1) }} km</span>
                    </span>
                    <input
                      v-if="!autoVisibility"
                      v-model.number="visibility"
                      class="mt-2 h-2 w-full accent-cyan-300"
                      type="range"
                      min="1"
                      max="22"
                      step="0.1"
                      @input="emit('manualWeatherInput')"
                    />
                    <div v-else class="mt-2 h-2 w-full rounded-full bg-cyan-950/70">
                      <div
                        class="h-full rounded-full bg-cyan-300"
                        :style="{ width: `${Math.min(100, (visibility / 22) * 100)}%` }"
                      ></div>
                    </div>
                  </label>
                </div>

                <label
                  class="flex items-center justify-between gap-3 rounded-lg border border-cyan-300/10 bg-slate-950/45 px-3 py-3"
                >
                  <span>
                    <span class="block text-xs font-black text-slate-200">가시거리 자동 연동</span>
                    <span class="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      AQI, 운량, 강수량에 따라 가시거리를 물리 공식으로 자동 계산합니다.
                    </span>
                  </span>
                  <input v-model="autoVisibility" class="h-5 w-5 accent-cyan-300" type="checkbox" />
                </label>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
