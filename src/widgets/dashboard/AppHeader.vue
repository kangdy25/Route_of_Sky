<script setup lang="ts">
import { computed } from 'vue'
import type { SceneLocation } from '@/features/scene/model/scene.types'

const props = withDefaults(
  defineProps<{
    locations: SceneLocation[]
    selectedLocationId: string
    isDashboardOpen?: boolean
  }>(),
  {
    isDashboardOpen: true,
  },
)

const emit = defineEmits<{
  flyToSelectedLocation: []
  openSettings: []
  selectLocation: [locationId: string]
  toggleDashboard: []
}>()

const dashboardToggleLabel = computed(() =>
  props.isDashboardOpen ? 'Hide dashboard' : 'Show dashboard',
)
</script>

<template>
  <header
    class="pointer-events-auto sticky top-3 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-cyan-300/20 bg-slate-950/72 px-3 py-3 shadow-[inset_0_0_24px_rgba(34,211,238,0.12),0_12px_34px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:px-4 lg:relative lg:top-auto lg:grid-cols-[auto_minmax(15rem,22rem)_auto] lg:px-5"
  >
    <div
      class="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent shadow-[0_0_16px_rgba(34,211,238,0.8)] sm:inset-x-16"
    ></div>
    <div class="flex min-w-0 items-center gap-2 sm:gap-3">
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-slate-950/45 p-1.5 shadow-[inset_0_0_18px_rgba(34,211,238,0.10),0_0_18px_rgba(34,211,238,0.24)] backdrop-blur-md max-[380px]:hidden sm:h-12 sm:w-12 lg:h-14 lg:w-14 lg:rounded-xl"
      >
        <img
          src="/logo.png"
          alt="Route of Sky"
          class="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]"
        />
      </div>
      <h1
        class="truncate bg-gradient-to-r from-cyan-100 via-sky-400 to-orange-300 bg-clip-text text-xl font-black text-transparent drop-shadow-[0_0_12px_rgba(34,211,238,0.34)] sm:text-2xl lg:text-3xl"
      >
        Route of Sky
      </h1>
    </div>

    <label
      class="col-span-2 row-start-2 flex min-w-0 items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-950/20 px-3 py-2.5 shadow-[inset_0_0_14px_rgba(34,211,238,0.10)] backdrop-blur-md sm:gap-3 sm:px-4 lg:col-span-1 lg:row-start-auto lg:py-3"
    >
      <svg class="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        ></path>
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        ></path>
      </svg>
      <span class="sr-only">지역 선택</span>
      <select
        class="min-w-0 flex-1 bg-transparent text-sm font-black text-cyan-50 uppercase outline-none sm:text-base"
        :value="props.selectedLocationId"
        aria-label="지역 선택"
        @change="emit('selectLocation', ($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="location in props.locations"
          :key="location.id"
          class="bg-slate-950 text-cyan-50"
          :value="location.id"
        >
          {{ location.label }}, {{ location.city }}
        </option>
      </select>
    </label>

    <div
      class="col-start-2 row-start-1 flex justify-end gap-2 sm:gap-3 lg:col-start-auto lg:row-start-auto lg:gap-4"
    >
      <button
        type="button"
        class="rounded-lg border border-cyan-300/25 bg-slate-950/55 p-2.5 text-cyan-100 shadow-[inset_0_0_16px_rgba(34,211,238,0.08)] backdrop-blur-md transition-all hover:border-cyan-200/70 hover:bg-cyan-400/15 focus:ring-2 focus:ring-cyan-300/45 focus:outline-none lg:hidden"
        :title="dashboardToggleLabel"
        :aria-label="dashboardToggleLabel"
        :aria-expanded="props.isDashboardOpen"
        aria-controls="dashboard-panels"
        @click.stop="emit('toggleDashboard')"
      >
        <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            v-if="props.isDashboardOpen"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M7 12h10M10 18h4"
          ></path>
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 7h16M4 12h16M4 17h16"
          ></path>
        </svg>
      </button>
      <button
        type="button"
        class="rounded-lg border border-cyan-300/25 bg-slate-950/55 p-2.5 text-cyan-100 shadow-[inset_0_0_16px_rgba(34,211,238,0.08)] backdrop-blur-md transition-all hover:border-cyan-200/70 hover:bg-cyan-400/15 focus:ring-2 focus:ring-cyan-300/45 focus:outline-none max-[380px]:hidden sm:p-3"
        title="Fly to selected location"
        aria-label="Fly to selected location"
        @click.stop="emit('flyToSelectedLocation')"
      >
        <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 17c3.2-4.8 6.1-6.7 9-5.6 2.2.8 3.6.3 5-1.4"
          ></path>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M14 5h5v5"
          ></path>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 17a2 2 0 100 4 2 2 0 000-4zm12-12a2 2 0 100 4 2 2 0 000-4z"
          ></path>
        </svg>
      </button>
      <button
        type="button"
        class="rounded-lg border border-cyan-300/25 bg-slate-950/55 p-2.5 text-cyan-100 shadow-[inset_0_0_16px_rgba(34,211,238,0.08)] backdrop-blur-md transition-all hover:border-cyan-200/70 hover:bg-cyan-400/15 focus:ring-2 focus:ring-cyan-300/45 focus:outline-none sm:p-3"
        title="Open settings"
        aria-label="Open settings"
        @click.stop="emit('openSettings')"
      >
        <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.3 4.3 11 2h2l.7 2.3a7.7 7.7 0 0 1 1.8.8l2.1-1.1 1.4 1.4-1.1 2.1c.3.6.6 1.2.8 1.8L21 10v2l-2.3.7a7.7 7.7 0 0 1-.8 1.8l1.1 2.1-1.4 1.4-2.1-1.1c-.6.3-1.2.6-1.8.8L13 20h-2l-.7-2.3a7.7 7.7 0 0 1-1.8-.8L6.4 18 5 16.6l1.1-2.1a7.7 7.7 0 0 1-.8-1.8L3 12v-2l2.3-.7c.2-.6.5-1.2.8-1.8L5 5.4 6.4 4l2.1 1.1c.6-.3 1.2-.6 1.8-.8Z"
          ></path>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"
          ></path>
        </svg>
      </button>
    </div>
  </header>
</template>
