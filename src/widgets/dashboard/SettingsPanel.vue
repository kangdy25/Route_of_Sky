<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatTime } from '@/features/weather/lib/formatTime'
import { getCurrentLocalTimeForLocation } from '@/features/scene/lib/sky'
import { WORLD_LOCATIONS } from '@/features/scene/model/scene.constants'
import type { SceneLocation } from '@/features/scene/model/scene.types'

const time = defineModel<number>('time', { required: true })
const temperature = defineModel<number>('temperature', { required: true })
const humidity = defineModel<number>('humidity', { required: true })
const windSpeed = defineModel<number>('windSpeed', { required: true })
const windDirectionDegrees = defineModel<number>('windDirectionDegrees', { required: true })
const aqi = defineModel<number>('aqi', { required: true })
const cloudCover = defineModel<number>('cloudCover', { required: true })
const precipitation = defineModel<number>('precipitation', { required: true })
const visibility = defineModel<number>('visibility', { required: true })

const props = withDefaults(
  defineProps<{
    open: boolean
    location?: SceneLocation
  }>(),
  {
    location: () => WORLD_LOCATIONS[1],
  },
)

const emit = defineEmits<{
  close: []
  renderCurrentWeather: []
}>()

const autoVisibility = ref(true)

const isSnowPreview = computed(() => precipitation.value > 0 && temperature.value <= 0)
const precipitationTestLabel = computed(() => {
  return isSnowPreview.value ? 'Snowfall' : 'Precipitation'
})
const precipitationTestUnit = computed(() => {
  return isSnowPreview.value ? 'cm/h' : 'mm/h'
})
const formattedTime = computed(() => formatTime(time.value))

type WeatherPreset = {
  temperature: number
  cloudCover: number
  precipitation: number
  windSpeed: number
  windDirectionDegrees: number
  humidity: number
  aqi: number
}

function estimateVisibilityFromAirQuality(aqiValue: number) {
  const normalizedAqi = Math.min(300, Math.max(0, aqiValue))
  const airQualityVisibility = 22 - normalizedAqi ** 1.15 * 0.027
  const precipitationPenalty = Math.min(8, precipitation.value * 0.45)
  const cloudPenalty = Math.max(0, (cloudCover.value - 70) * 0.025)

  return Math.max(
    1,
    Math.min(22, Number((airQualityVisibility - precipitationPenalty - cloudPenalty).toFixed(1))),
  )
}

function syncVisibilityFromAirQuality() {
  if (!props.open || !autoVisibility.value) return

  visibility.value = estimateVisibilityFromAirQuality(aqi.value)
}

function setAqiFromInput(event: Event) {
  const target = event.target as HTMLInputElement
  aqi.value = Number(target.value)
  syncVisibilityFromAirQuality()
}

function applyWeatherPreset(preset: WeatherPreset) {
  temperature.value = preset.temperature
  cloudCover.value = preset.cloudCover
  precipitation.value = preset.precipitation
  windSpeed.value = preset.windSpeed
  windDirectionDegrees.value = preset.windDirectionDegrees
  humidity.value = preset.humidity
  aqi.value = preset.aqi
  visibility.value = estimateVisibilityFromAirQuality(preset.aqi)
}

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

function setTimePreset(nextTime: number) {
  time.value = nextTime
}

function resetToCurrentTime() {
  time.value = getCurrentLocalTimeForLocation(props.location)
}

function setManualVisibility(event: Event) {
  const target = event.target as HTMLInputElement
  visibility.value = Number(target.value)
}

watch([aqi, precipitation, cloudCover], () => {
  syncVisibilityFromAirQuality()
})

watch(autoVisibility, (enabled) => {
  if (enabled) {
    syncVisibilityFromAirQuality()
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40">
      <button
        type="button"
        class="absolute inset-0 h-full w-full bg-slate-950/46 backdrop-blur-[2px]"
        aria-label="Close settings"
        @click="emit('close')"
      ></button>

      <aside
        class="absolute top-0 right-0 flex h-full w-[min(27rem,100vw)] flex-col border-l border-cyan-300/20 bg-slate-950/92 text-slate-100 shadow-[-24px_0_72px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        @click.stop
      >
        <header
          class="flex items-center justify-between border-b border-cyan-300/15 px-5 py-4 shadow-[inset_0_-1px_0_rgba(34,211,238,0.08)]"
        >
          <div>
            <p class="text-xs font-black tracking-[0.18em] text-cyan-300 uppercase">Controls</p>
            <h2 id="settings-title" class="mt-1 text-xl font-black text-cyan-50">Settings</h2>
          </div>
          <button
            type="button"
            class="rounded-md border border-cyan-300/25 bg-slate-900/70 p-2 text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-400/15 focus:ring-2 focus:ring-cyan-300/45 focus:outline-none"
            aria-label="Close settings"
            @click="emit('close')"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 6l12 12M18 6 6 18"
              ></path>
            </svg>
          </button>
        </header>

        <div class="flex-1 overflow-y-auto px-5 py-5">
          <section class="rounded-lg border border-cyan-300/15 bg-slate-900/50 p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-sm font-black tracking-wide text-cyan-100 uppercase">Scene</h3>
                <p class="mt-1 text-xs leading-relaxed text-slate-400">
                  Times Square tiles, atmospheric overlays, and camera tools are active.
                </p>
              </div>
              <span
                class="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200"
              >
                Live
              </span>
            </div>
          </section>

          <section class="mt-4 rounded-lg border border-cyan-300/15 bg-slate-900/50 p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-black tracking-wide text-cyan-100 uppercase">Scene Time</h3>
                <p class="mt-1 text-xs leading-relaxed text-slate-400">
                  Tune sunlight, sky color, and building shadows together.
                </p>
              </div>
              <span class="text-sm font-black text-cyan-200">{{ formattedTime }}</span>
            </div>

            <div class="mt-4 grid grid-cols-4 gap-2">
              <button
                type="button"
                class="rounded-md border border-cyan-300/20 bg-slate-950/55 px-2 py-2 text-xs font-black text-slate-200 transition hover:border-cyan-200/70 hover:bg-cyan-400/15 focus:ring-2 focus:ring-cyan-300/40 focus:outline-none"
                @click="setTimePreset(6.2)"
              >
                Dawn
              </button>
              <button
                type="button"
                class="rounded-md border border-cyan-300/20 bg-slate-950/55 px-2 py-2 text-xs font-black text-slate-200 transition hover:border-cyan-200/70 hover:bg-cyan-400/15 focus:ring-2 focus:ring-cyan-300/40 focus:outline-none"
                @click="setTimePreset(12)"
              >
                Noon
              </button>
              <button
                type="button"
                class="rounded-md border border-cyan-300/20 bg-slate-950/55 px-2 py-2 text-xs font-black text-slate-200 transition hover:border-cyan-200/70 hover:bg-cyan-400/15 focus:ring-2 focus:ring-cyan-300/40 focus:outline-none"
                @click="setTimePreset(18.6)"
              >
                Sunset
              </button>
              <button
                type="button"
                class="rounded-md border border-cyan-300/20 bg-slate-950/55 px-2 py-2 text-xs font-black text-slate-200 transition hover:border-cyan-200/70 hover:bg-cyan-400/15 focus:ring-2 focus:ring-cyan-300/40 focus:outline-none"
                @click="setTimePreset(22.5)"
              >
                Night
              </button>
            </div>

            <div class="mt-3 flex justify-end">
              <button
                type="button"
                class="rounded-md border border-cyan-200/45 bg-cyan-300/15 px-3 py-2 text-xs font-black text-cyan-50 transition hover:border-cyan-100/80 hover:bg-cyan-300/25 focus:ring-2 focus:ring-cyan-200/45 focus:outline-none"
                @click="resetToCurrentTime"
              >
                Current Time
              </button>
            </div>

            <label class="mt-4 block">
              <span class="flex justify-between gap-3 text-xs font-bold text-slate-300">
                <span>Time scrubber</span>
                <span>{{ time.toFixed(1) }} h</span>
              </span>
              <input
                v-model.number="time"
                class="mt-2 h-2 w-full accent-cyan-300"
                type="range"
                min="0"
                max="23.9"
                step="0.1"
              />
            </label>
          </section>

          <section class="mt-4 rounded-lg border border-cyan-300/15 bg-slate-900/50 p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-black tracking-wide text-cyan-100 uppercase">
                  Weather Lab
                </h3>
                <p class="mt-1 text-xs leading-relaxed text-slate-400">
                  Preview weather states before live API data is connected.
                </p>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                class="col-span-3 rounded-md border border-cyan-200/55 bg-cyan-300/22 px-3 py-3 text-sm font-black text-cyan-50 shadow-[0_0_16px_rgba(103,232,249,0.18)] transition hover:border-cyan-100/80 hover:bg-cyan-300/30 focus:ring-2 focus:ring-cyan-100/55 focus:outline-none"
                @click="emit('renderCurrentWeather')"
              >
                Render Current Weather
              </button>
              <button
                type="button"
                class="rounded-md border border-emerald-300/35 bg-emerald-400/10 px-3 py-2 text-sm font-black text-emerald-100 transition hover:border-emerald-200/70 hover:bg-emerald-400/20 focus:ring-2 focus:ring-emerald-300/40 focus:outline-none"
                @click="previewSunny"
              >
                Sunny
              </button>
              <button
                type="button"
                class="rounded-md border border-sky-300/35 bg-sky-500/15 px-3 py-2 text-sm font-black text-sky-100 transition hover:border-sky-200/70 hover:bg-sky-500/25 focus:ring-2 focus:ring-sky-300/40 focus:outline-none"
                @click="previewRain"
              >
                Rain
              </button>
              <button
                type="button"
                class="rounded-md border border-violet-300/35 bg-violet-500/15 px-3 py-2 text-sm font-black text-violet-100 transition hover:border-violet-200/70 hover:bg-violet-500/25 focus:ring-2 focus:ring-violet-300/40 focus:outline-none"
                @click="previewStorm"
              >
                Storm
              </button>
              <button
                type="button"
                class="rounded-md border border-cyan-100/35 bg-cyan-100/10 px-3 py-2 text-sm font-black text-cyan-50 transition hover:border-cyan-100/70 hover:bg-cyan-100/20 focus:ring-2 focus:ring-cyan-100/40 focus:outline-none"
                @click="previewSnow"
              >
                Snow
              </button>
              <button
                type="button"
                class="rounded-md border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-sm font-black text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-400/20 focus:ring-2 focus:ring-amber-300/40 focus:outline-none"
                @click="previewHaze"
              >
                Haze
              </button>
            </div>

            <div class="mt-4 space-y-4">
              <label class="block">
                <span class="flex justify-between gap-3 text-xs font-bold text-slate-300">
                  <span>{{ precipitationTestLabel }}</span>
                  <span>{{ precipitation.toFixed(1) }} {{ precipitationTestUnit }}</span>
                </span>
                <input
                  v-model.number="precipitation"
                  class="mt-2 h-2 w-full accent-cyan-300"
                  type="range"
                  min="0"
                  max="16"
                  step="0.1"
                />
              </label>

              <label class="block">
                <span class="flex justify-between gap-3 text-xs font-bold text-slate-300">
                  <span>Temperature</span>
                  <span>{{ temperature.toFixed(1) }} C</span>
                </span>
                <input
                  v-model.number="temperature"
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
                    <span>Cloud</span>
                    <span>{{ cloudCover }}%</span>
                  </span>
                  <input
                    v-model.number="cloudCover"
                    class="mt-2 h-2 w-full accent-cyan-300"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                  />
                </label>

                <label class="block">
                  <span class="flex justify-between gap-2 text-xs font-bold text-slate-300">
                    <span>Wind</span>
                    <span>{{ windSpeed.toFixed(1) }} m/s</span>
                  </span>
                  <input
                    v-model.number="windSpeed"
                    class="mt-2 h-2 w-full accent-cyan-300"
                    type="range"
                    min="0"
                    max="18"
                    step="0.5"
                  />
                </label>

                <label class="block">
                  <span class="flex justify-between gap-2 text-xs font-bold text-slate-300">
                    <span>Wind angle</span>
                    <span>{{ Math.round(windDirectionDegrees) }} deg</span>
                  </span>
                  <input
                    v-model.number="windDirectionDegrees"
                    class="mt-2 h-2 w-full accent-cyan-300"
                    type="range"
                    min="0"
                    max="359"
                    step="1"
                  />
                </label>

                <label class="block">
                  <span class="flex justify-between gap-2 text-xs font-bold text-slate-300">
                    <span>Humidity</span>
                    <span>{{ humidity }}%</span>
                  </span>
                  <input
                    v-model.number="humidity"
                    class="mt-2 h-2 w-full accent-cyan-300"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                  />
                </label>

                <label class="block">
                  <span class="flex justify-between gap-2 text-xs font-bold text-slate-300">
                    <span>AQI</span>
                    <span>{{ aqi }}</span>
                  </span>
                  <input
                    :value="aqi"
                    class="mt-2 h-2 w-full accent-cyan-300"
                    type="range"
                    min="0"
                    max="300"
                    step="1"
                    @input="setAqiFromInput"
                  />
                </label>

                <label class="block">
                  <span class="flex justify-between gap-2 text-xs font-bold text-slate-300">
                    <span>Visibility</span>
                    <span>{{ visibility.toFixed(1) }} km</span>
                  </span>
                  <input
                    v-if="!autoVisibility"
                    :value="visibility"
                    class="mt-2 h-2 w-full accent-cyan-300"
                    type="range"
                    min="1"
                    max="22"
                    step="0.1"
                    @input="setManualVisibility"
                  />
                  <div v-else class="mt-2 h-2 w-full rounded-full bg-cyan-950/70">
                    <div
                      class="h-full rounded-full bg-cyan-300 transition-all duration-700"
                      :style="{ width: `${Math.min(100, (visibility / 22) * 100)}%` }"
                    ></div>
                  </div>
                </label>
              </div>

              <label
                class="flex items-center justify-between gap-3 rounded-lg border border-cyan-300/10 bg-slate-950/45 px-3 py-3"
              >
                <span>
                  <span class="block text-xs font-black text-slate-200">Auto visibility</span>
                  <span class="mt-0.5 block text-xs leading-relaxed text-slate-500">
                    Derive visibility from AQI, clouds, and precipitation.
                  </span>
                </span>
                <input v-model="autoVisibility" class="h-5 w-5 accent-cyan-300" type="checkbox" />
              </label>
            </div>
          </section>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
