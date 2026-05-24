<script setup lang="ts">
import TemperatureSpec from './environment/TemperatureSpec.vue'
import HumiditySpec from './environment/HumiditySpec.vue'
import WindSpeedSpec from './environment/WindSpeedSpec.vue'

defineProps<{
  temperature: number
  humidity: number
  windSpeed: number
}>()
</script>

<template>
  <div
    class="env-spec-container flex flex-col rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-xl transition-all"
  >
    <div class="mb-10 flex items-center justify-between">
      <h2 class="text-base font-black tracking-[0.25em] text-slate-400 uppercase">환경 정보</h2>
      <div class="h-2 w-16 rounded-full bg-cyan-500/30"></div>
    </div>

    <!-- Temperature Section -->
    <TemperatureSpec :temperature="temperature" />

    <!-- Humidity Section -->
    <HumiditySpec :humidity="humidity" />

    <!-- Wind Speed Section -->
    <WindSpeedSpec :windSpeed="windSpeed" />
  </div>
</template>

<style scoped>
.env-spec-container {
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
}
</style>
