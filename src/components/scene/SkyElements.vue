<script setup lang="ts">
import { shallowRef } from 'vue'

const boxRef = shallowRef()

// TresMesh가 매 프레임 렌더링되기 직전에 실행할 애니메이션 루프
const onBeforeRender = () => {
  if (boxRef.value) {
    // 회전 애니메이션 적용
    boxRef.value.rotation.y += 0.001
    boxRef.value.rotation.x += 0.005
  }
}
</script>

<template>
  <TresAmbientLight :intensity="0.75" />
  <TresDirectionalLight :position="[5, 5, 5]" :intensity="1" cast-shadow />

  <TresMesh ref="boxRef" @before-render="onBeforeRender">
    <TresBoxGeometry :args="[1, 1, 1]" />
    <TresMeshStandardMaterial color="#ffffff" :roughness="0.5" :metalness="0.75" />
  </TresMesh>
</template>
