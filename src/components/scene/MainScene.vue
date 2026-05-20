<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import SkyElements from './SkyElements.vue'
</script>

<template>
  <TresCanvas clear-color="#000000" window-size>
    <TresPerspectiveCamera :position="[3, 3, 3]" :look-at="[0, 0, 0]" />
    <OrbitControls />
    <SkyElements />
  </TresCanvas>
</template>
