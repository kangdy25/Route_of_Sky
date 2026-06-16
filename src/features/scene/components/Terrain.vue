<script setup lang="ts">
import { computed, watch, shallowRef } from 'vue'
import * as THREE from 'three'
import { getColorForHeight, getTerrainHeight, terrainBaseY } from '@/features/scene/lib/terrain'

const props = withDefaults(
  defineProps<{
    precipitation?: number // 강수 강도입니다. 0부터 100까지의 백분율로 사용합니다.
  }>(),
  {
    precipitation: 0,
  },
)

const terrainMeshRef = shallowRef<THREE.Mesh | null>(null)

// 지형 메시가 준비되면 공통 높이 함수로 vertex 높이와 색상을 한 번에 적용합니다.
watch(terrainMeshRef, (mesh) => {
  if (!mesh) return

  const geometry = mesh.geometry as THREE.BufferGeometry
  const pos = geometry.attributes.position
  const colors = []

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i)
    const vy = pos.getY(i) // PlaneGeometry의 2D 좌표계에서는 X/Y가 지형 평면 좌표입니다.

    const height = getTerrainHeight(vx, vy)
    pos.setZ(i, height) // 회전 후 월드 Y축 높이가 되도록 로컬 Z축으로 밀어 올립니다.

    const color = getColorForHeight(height)
    colors.push(color.r, color.g, color.b)
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  pos.needsUpdate = true
})

// 비가 올수록 지면이 젖어 보이도록 roughness/metalness를 조정합니다.
const terrainRoughness = computed(() => {
  const rainFactor = (props.precipitation ?? 0) / 100
  return 0.85 - rainFactor * 0.35 // 젖을수록 표면 반사가 강해집니다.
})

const terrainMetalness = computed(() => {
  const rainFactor = (props.precipitation ?? 0) / 100
  return 0.02 + rainFactor * 0.15 // 젖은 흙/암석의 은은한 반사감을 더합니다.
})
</script>

<template>
  <!-- The Displaced Mountain Terrain -->
  <TresMesh
    ref="terrainMeshRef"
    :rotation="[-Math.PI / 2, 0, 0]"
    :position="[0, terrainBaseY, 0]"
    receive-shadow
    cast-shadow
  >
    <TresPlaneGeometry :args="[450, 450, 140, 140]" />
    <TresMeshStandardMaterial
      :vertex-colors="true"
      :roughness="terrainRoughness"
      :metalness="terrainMetalness"
    />
  </TresMesh>
</template>
