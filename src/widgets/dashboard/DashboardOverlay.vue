<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { hasCesiumIonAccessToken } from '@/shared/config/env'
import AppHeader from './AppHeader.vue'
import AtmospherePanel from './AtmospherePanel.vue'
import EnvironmentPanel from './EnvironmentPanel.vue'
import SkyPanel from './SkyPanel.vue'
import TimePanel from './TimePanel.vue'

const time = defineModel<number>('time', { required: true })
const overlayRef = ref<HTMLElement | null>(null)
const emit = defineEmits<{
  flyToJamsil: []
}>()

defineProps<{
  temperature: number
  humidity: number
  windSpeed: number
  windDirectionDegrees: number
  aqi: number
  cloudCover: number
  precipitation: number
  visibility: number
}>()

onMounted(() => {
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
    class="dashboard-frame pointer-events-none relative z-10 flex min-h-screen flex-col p-4 lg:p-6"
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
      class="pointer-events-none absolute inset-3 border border-cyan-300/15 shadow-[inset_0_0_32px_rgba(34,211,238,0.10)]"
    ></div>
    <div
      class="pointer-events-none absolute inset-x-12 top-3 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent shadow-[0_0_16px_rgba(34,211,238,0.85)]"
    ></div>
    <div
      class="pointer-events-none absolute inset-x-20 bottom-3 h-px bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent"
    ></div>
    <AppHeader />

    <!-- Cesium ion 토큰이 없을 때 3D Tiles 활성화 방법을 안내합니다. -->
    <div
      v-if="!hasCesiumIonAccessToken"
      class="pointer-events-auto mt-4 rounded-xl border border-blue-500/20 bg-blue-950/45 p-4 backdrop-blur-md"
    >
      <div class="flex items-start gap-3">
        <span class="text-lg">💡</span>
        <div>
          <h3 class="text-base font-semibold text-blue-300">
            Google Photorealistic 3D Tiles 활성화 가능
          </h3>
          <p class="mt-1 text-sm leading-relaxed text-slate-300">
            프로젝트 루트의 <code>.env</code> 파일에 Cesium ion 토큰을
            <code>VITE_CESIUM_ION_ACCESS_TOKEN</code> 변수로 등록해 주세요. 등록 시 Asset ID
            <code>2275207</code>의 실사 3D 타일이 로드됩니다.
          </p>
        </div>
      </div>
    </div>

    <div
      class="mt-6 flex flex-1 flex-col justify-between gap-6 pb-2 lg:flex-row lg:items-start lg:pb-0"
    >
      <aside class="pointer-events-auto flex w-full flex-col gap-6 lg:w-[380px] lg:shrink-0">
        <EnvironmentPanel
          :temperature="temperature"
          :humidity="humidity"
          :wind-speed="windSpeed"
          :wind-direction-degrees="windDirectionDegrees"
        />
        <button
          type="button"
          class="rounded-lg border border-cyan-300/30 bg-slate-950/70 px-5 py-4 text-left shadow-[inset_0_0_20px_rgba(34,211,238,0.12),0_18px_36px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition-all hover:border-cyan-200/70 hover:bg-cyan-950/45 hover:shadow-[0_0_24px_rgba(34,211,238,0.28)] focus:ring-2 focus:ring-cyan-300/50 focus:outline-none"
          @click.stop="emit('flyToJamsil')"
        >
          <span class="block text-sm font-bold text-cyan-300 uppercase"> Scenic route </span>
          <span class="mt-2 block text-lg font-black text-white">Jamsil fly-through</span>
          <span class="mt-1 block text-base font-medium text-slate-300">Seoul aerial approach</span>
        </button>
      </aside>

      <aside class="pointer-events-auto flex w-full flex-col gap-6 lg:w-[390px] lg:shrink-0">
        <SkyPanel
          :cloud-cover="cloudCover"
          :precipitation="precipitation"
          :visibility="visibility"
          :temperature="temperature"
        />
        <AtmospherePanel :aqi="aqi" />
        <TimePanel v-model="time" />
      </aside>
    </div>
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
</style>
