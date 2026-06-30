<script setup lang="ts">
import Panel from '@/shared/ui/Panel.vue'
import HumidityMetric from './HumidityMetric.vue'
import TemperatureMetric from './TemperatureMetric.vue'
import WindSpeedMetric from './WindSpeedMetric.vue'

defineProps<{
  temperature: number
  temperatureMin: number
  temperatureMax: number
  humidity: number
  windSpeed: number
  windDirectionDegrees: number
}>()
</script>

<template>
  <Panel
    title="환경 정보"
    accent-class="w-16"
    header-class="mb-6 sm:mb-10"
    surface="soft"
    class="transition-all"
  >
    <!-- 기온 지표입니다. -->
    <TemperatureMetric
      :temperature="temperature"
      :temperature-min="temperatureMin"
      :temperature-max="temperatureMax"
    />

    <!-- 습도 지표입니다. -->
    <HumidityMetric :humidity="humidity" />

    <!-- 풍속 지표입니다. -->
    <WindSpeedMetric :wind-speed="windSpeed" :wind-direction-degrees="windDirectionDegrees" />
  </Panel>
</template>
