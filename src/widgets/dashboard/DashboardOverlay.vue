<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { hasCesiumIonAccessToken } from '@/shared/config/env'
import type { SceneLocation } from '@/features/scene/model/scene.types'
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

const props = defineProps<{
  temperatureMin: number
  temperatureMax: number
  locations: SceneLocation[]
  selectedLocationId: string
}>()

const overlayRef = ref<HTMLElement | null>(null)
const isSettingsOpen = ref(false)
const isDashboardOpen = ref(true)
const emit = defineEmits<{
  flyToSelectedLocation: []
  selectLocation: [locationId: string]
  renderCurrentWeather: []
}>()

const selectedLocation = computed(
  () =>
    props.locations.find((location) => location.id === props.selectedLocationId) ??
    props.locations[0],
)

onMounted(() => {
  /* v8 ignore next -- 템플릿 ref가 비어 있는 비정상 마운트 방어 guard입니다. */
  if (!overlayRef.value) return

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
})
</script>

<template>
  <div
    ref="overlayRef"
    class="dashboard-frame pointer-events-none relative z-10 flex min-h-dvh flex-col p-3 sm:p-4 lg:p-6"
    @click.stop
    @dblclick.stop
    @mousedown.stop
    @mouseup.stop
    @mousemove.stop
    @pointerdown.stop
    @pointermove.stop
    @pointerup.stop
    @touchstart.stop
    @touchmove.stop
    @touchend.stop
    @wheel.stop
  >
    <div
      class="pointer-events-none absolute inset-2 border border-cyan-300/15 shadow-[inset_0_0_32px_rgba(34,211,238,0.10)] sm:inset-3"
    ></div>
    <div
      class="pointer-events-none absolute inset-x-6 top-3 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent shadow-[0_0_16px_rgba(34,211,238,0.85)] sm:inset-x-12"
    ></div>
    <div
      class="pointer-events-none absolute inset-x-10 bottom-3 h-px bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent sm:inset-x-20"
    ></div>
    <AppHeader
      :locations="locations"
      :selected-location-id="selectedLocationId"
      :is-dashboard-open="isDashboardOpen"
      @fly-to-selected-location="emit('flyToSelectedLocation')"
      @select-location="emit('selectLocation', $event)"
      @open-settings="isSettingsOpen = true"
      @toggle-dashboard="isDashboardOpen = !isDashboardOpen"
    />

    <!-- Cesium ion 토큰이 없을 때 3D Tiles 활성화 방법을 안내합니다. -->
    <div
      v-if="!hasCesiumIonAccessToken"
      class="pointer-events-auto mt-4 rounded-lg border border-blue-500/20 bg-blue-950/45 p-3 backdrop-blur-md sm:p-4"
    >
      <div class="flex items-start gap-3">
        <span class="text-lg">i</span>
        <div>
          <h3 class="text-sm font-semibold text-blue-300 sm:text-base">
            Google Photorealistic 3D Tiles 활성화 가능
          </h3>
          <p class="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
            프로젝트 루트의 <code>.env</code> 파일에 Cesium ion 토큰을
            <code>VITE_CESIUM_ION_ACCESS_TOKEN</code> 변수로 등록해 주세요. 등록 시 Asset ID
            <code>2275207</code>의 실사 3D 타일이 로드됩니다.
          </p>
        </div>
      </div>
    </div>

    <div
      id="dashboard-panels"
      :class="[
        'mt-4 flex-1 flex-col justify-between gap-4 pb-24 transition-all duration-300 sm:mt-5 sm:gap-5 lg:mt-6 lg:flex-row lg:items-start lg:gap-6 lg:pb-0',
        isDashboardOpen ? 'flex' : 'hidden lg:flex',
      ]"
    >
      <aside
        class="pointer-events-auto flex w-full flex-col gap-4 sm:gap-5 lg:w-[380px] lg:shrink-0 lg:gap-6"
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

      <aside
        class="pointer-events-auto flex w-full flex-col gap-4 sm:gap-5 lg:w-[390px] lg:shrink-0 lg:gap-6"
      >
        <SkyPanel
          :cloud-cover="cloudCover"
          :precipitation="precipitation"
          :visibility="visibility"
          :temperature="temperature"
        />
        <AtmospherePanel :aqi="aqi" />
        <TimePanel v-model="time" :location="selectedLocation" />
      </aside>
    </div>

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
      :open="isSettingsOpen"
      :location="selectedLocation"
      @close="isSettingsOpen = false"
      @render-current-weather="emit('renderCurrentWeather')"
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
