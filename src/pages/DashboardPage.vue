<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

const isSnowPreview = computed(() => precipitation.value > 0 && temperature.value <= 0)
const isThunderstormPreview = computed(
  () => !isSnowPreview.value && precipitation.value >= 12 && cloudCover.value >= 55,
)
const rainPreviewButtonText = computed(() => {
  return isThunderstormPreview.value ? 'Storm' : 'Rain'
})
const precipitationTestLabel = computed(() => {
  return isSnowPreview.value ? 'Snowfall' : 'Precipitation'
})
const precipitationTestUnit = computed(() => {
  return isSnowPreview.value ? 'cm/h' : 'mm/h'
})

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
  visibility.value = estimateVisibilityFromAirQuality(aqi.value)
}

function setAqiFromInput(event: Event) {
  const target = event.target as HTMLInputElement
  aqi.value = Number(target.value)
  syncVisibilityFromAirQuality()
}

function previewRain() {
  temperature.value = Math.max(temperature.value, 12)
  cloudCover.value = Math.max(cloudCover.value, 88)
  precipitation.value = Math.max(precipitation.value, 9.5)
  windSpeed.value = Math.max(windSpeed.value, 7)
  windDirectionDegrees.value = 215
  humidity.value = Math.max(humidity.value, 82)
  aqi.value = Math.max(aqi.value, 86)
  syncVisibilityFromAirQuality()
}

function previewSnow() {
  temperature.value = Math.min(temperature.value, -4)
  cloudCover.value = Math.max(cloudCover.value, 92)
  precipitation.value = Math.max(precipitation.value, 5.5)
  windSpeed.value = Math.max(windSpeed.value, 4)
  windDirectionDegrees.value = 30
  humidity.value = Math.max(humidity.value, 88)
  aqi.value = Math.max(aqi.value, 72)
  syncVisibilityFromAirQuality()
}

function previewClear() {
  temperature.value = 24.5
  cloudCover.value = 12
  precipitation.value = 0
  windSpeed.value = 3
  windDirectionDegrees.value = 225
  humidity.value = 48
  aqi.value = 38
  syncVisibilityFromAirQuality()
}

function flyToJamsil() {
  sceneCanvasRef.value?.flyToLocation({
    longitude: 127.1026,
    latitude: 37.5125,
    height: 1350,
    headingDegrees: 314,
    pitchDegrees: -42,
    duration: 3.4,
  })
}

watch([aqi, precipitation, cloudCover], () => {
  syncVisibilityFromAirQuality()
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
      :temperature="temperature"
      :humidity="humidity"
      :wind-speed="windSpeed"
      :wind-direction-degrees="windDirectionDegrees"
      :aqi="aqi"
      :cloud-cover="cloudCover"
      :precipitation="precipitation"
      :visibility="visibility"
      @fly-to-jamsil="flyToJamsil"
    />

    <section
      class="fixed bottom-4 left-1/2 z-20 w-[min(23rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-white/15 bg-slate-950/80 p-4 text-slate-100 shadow-[0_18px_54px_rgba(0,0,0,0.44)] backdrop-blur-2xl"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-black tracking-wide text-cyan-200 uppercase">Weather test</h2>
          <p class="mt-1 text-xs font-medium text-slate-400">
            Rain / thunderstorm / snow realtime preview
          </p>
        </div>
        <button
          type="button"
          class="rounded-md border border-slate-500/40 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-300/60 hover:text-cyan-100 focus:ring-2 focus:ring-cyan-300/40 focus:outline-none"
          @click="previewClear"
        >
          Clear
        </button>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          class="rounded-md border border-sky-300/35 bg-sky-500/15 px-3 py-2 text-sm font-black text-sky-100 transition hover:border-sky-200/70 hover:bg-sky-500/25 focus:ring-2 focus:ring-sky-300/40 focus:outline-none"
          @click="previewRain"
        >
          {{ rainPreviewButtonText }}
        </button>
        <button
          type="button"
          class="rounded-md border border-cyan-100/35 bg-cyan-100/10 px-3 py-2 text-sm font-black text-cyan-50 transition hover:border-cyan-100/70 hover:bg-cyan-100/20 focus:ring-2 focus:ring-cyan-100/40 focus:outline-none"
          @click="previewSnow"
        >
          Snow
        </button>
      </div>

      <div class="mt-4 space-y-3">
        <label class="block">
          <span class="flex justify-between text-xs font-bold text-slate-300">
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
          <span class="flex justify-between text-xs font-bold text-slate-300">
            <span>Temperature</span>
            <span>{{ temperature.toFixed(1) }} C</span>
          </span>
          <input
            v-model.number="temperature"
            class="mt-2 h-2 w-full accent-cyan-300"
            type="range"
            min="-12"
            max="30"
            step="0.5"
          />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="flex justify-between text-xs font-bold text-slate-300">
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
            <span class="flex justify-between text-xs font-bold text-slate-300">
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
            <span class="flex justify-between text-xs font-bold text-slate-300">
              <span>Wind angle</span>
              <span>{{ Math.round(windDirectionDegrees) }}°</span>
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
            <span class="flex justify-between text-xs font-bold text-slate-300">
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
            <span class="flex justify-between text-xs font-bold text-slate-300">
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
            <span class="flex justify-between text-xs font-bold text-slate-300">
              <span>Visibility</span>
              <span>{{ visibility.toFixed(1) }} km</span>
            </span>
            <div class="mt-2 h-2 w-full rounded-full bg-cyan-950/60">
              <div
                class="h-full rounded-full bg-cyan-300 transition-all duration-700"
                :style="{ width: `${Math.min(100, (visibility / 22) * 100)}%` }"
              ></div>
            </div>
          </label>
        </div>
      </div>
    </section>
  </main>
</template>
