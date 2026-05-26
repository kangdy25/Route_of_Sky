<script setup lang="ts">
import CloudCoverSpec from './sky/CloudCoverSpec.vue'
import PrecipitationSpec from './sky/PrecipitationSpec.vue'
import VisibilitySpec from './sky/VisibilitySpec.vue'

withDefaults(
  defineProps<{
    cloudCover?: number
    precipitation?: number
    visibility?: number
  }>(),
  {
    cloudCover: 45,
    precipitation: 0.0,
    visibility: 15.0,
  },
)
</script>

<template>
  <div
    class="sky-conditions-container flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl"
  >
    <div>
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-xl font-black text-slate-200 uppercase">하늘 상태</h2>
        <div class="h-2 w-12 rounded-full bg-cyan-500/30"></div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <!-- Cloud Cover Section -->
        <CloudCoverSpec :cloudCover="cloudCover" />

        <!-- Precipitation Section -->
        <PrecipitationSpec :precipitation="precipitation" />

        <!-- Visibility Section -->
        <VisibilitySpec :visibility="visibility" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sky-conditions-container {
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
}
</style>
