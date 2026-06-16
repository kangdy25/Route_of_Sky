<script setup lang="ts">
import SkyElements from './SkyElements.vue'
import Terrain from './Terrain.vue'

defineProps<{
  precipitation: number
}>()
</script>

<template>
  <!-- 기본 씬에서 움직임을 확인하기 위한 회전 오브젝트입니다. -->
  <SkyElements />

  <!-- 산과 계곡을 표현하는 기본 지형입니다. -->
  <Terrain :precipitation="precipitation" />
</template>
