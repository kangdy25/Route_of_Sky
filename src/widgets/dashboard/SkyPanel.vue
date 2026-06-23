<script setup lang="ts">
import Panel from '@/shared/ui/Panel.vue'
import CloudCoverMetric from './CloudCoverMetric.vue'
import PrecipitationMetric from './PrecipitationMetric.vue'
import VisibilityMetric from './VisibilityMetric.vue'

withDefaults(
  defineProps<{
    cloudCover?: number
    precipitation?: number
    visibility?: number
    temperature?: number
  }>(),
  {
    cloudCover: 45,
    precipitation: 0.0,
    visibility: 15.0,
    temperature: 18,
  },
)
</script>

<template>
  <Panel title="하늘 상태" justify>
    <div class="grid grid-cols-3 gap-3">
      <!-- 운량 지표입니다. -->
      <CloudCoverMetric :cloud-cover="cloudCover" />

      <!-- 강수량 지표입니다. -->
      <PrecipitationMetric :precipitation="precipitation" :temperature="temperature" />

      <!-- 가시거리 지표입니다. -->
      <VisibilityMetric :visibility="visibility" />
    </div>
  </Panel>
</template>
