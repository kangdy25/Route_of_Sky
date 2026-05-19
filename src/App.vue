<script setup lang="ts">
import { ref } from 'vue'
import MainScene from '@/components/scene/MainScene.vue' // 3D 씬 임포트
</script>

<template>
  <main class="relative h-screen w-screen overflow-hidden">
    <div class="absolute inset-0 z-0">
      <MainScene />
    </div>
  </main>
</template>
