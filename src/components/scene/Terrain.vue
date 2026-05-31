<script setup lang="ts">
import { computed, watch, shallowRef } from 'vue'
import * as THREE from 'three'

const props = withDefaults(
  defineProps<{
    precipitation?: number // Precipitation intensity (0 to 100)
  }>(),
  {
    precipitation: 0,
  },
)

const terrainMeshRef = shallowRef<THREE.Mesh | null>(null)
const terrainHeightScale = 22 // Maximum height of peaks

// 1. 2D Noise and fBm (fractional Brownian motion) implementation for heightmap
function hash2(x: number, y: number) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return h - Math.floor(h)
}

function noise2(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy

  // Smoothstep interpolation for natural transitions
  const ux = fx * fx * (3.0 - 2.0 * fx)
  const uy = fy * fy * (3.0 - 2.0 * fy)

  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const d = hash2(ix + 1, iy + 1)

  return a * (1.0 - ux) * (1.0 - uy) + b * ux * (1.0 - uy) + c * (1.0 - ux) * uy + d * ux * uy
}

function fbm2(x: number, y: number, octaves = 4) {
  let value = 0.0
  let amplitude = 1.0
  let frequency = 1.0
  let maxVal = 0.0

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2(x * frequency, y * frequency)
    maxVal += amplitude
    amplitude *= 0.5
    frequency *= 2.0
  }
  return value / maxVal
}

// 2. Height calculation helper
// Combines fBm noise with a distance-based mask to create a valley basin at the center
function getTerrainHeight(x: number, y: number) {
  const d = Math.sqrt(x * x + y * y)
  const rawNoise = fbm2(x * 0.012, y * 0.012, 4)

  // Smoothstep mask: 0 at center (radius 25), rising to 1 at outer bounds (radius 160)
  const centerMask = THREE.MathUtils.smoothstep(d, 25, 160)

  // Low flat grassy valley near the center, tall mountains near the edges
  return rawNoise * (1.5 + (terrainHeightScale - 1.5) * centerMask)
}

// 3. Coloring based on terrain altitude
function getColorForHeight(h: number) {
  const color = new THREE.Color()

  if (h < 5.0) {
    // Lush Meadows: vibrant green to rich forest green
    const t = h / 5.0
    color.setRGB(0.24 * (1 - t) + 0.12 * t, 0.48 * (1 - t) + 0.32 * t, 0.28 * (1 - t) + 0.18 * t)
  } else if (h < 12.0) {
    // Slate Mountains: rocky slopes mixed with pine forest
    const t = (h - 5.0) / 7.0
    color.setRGB(0.12 * (1 - t) + 0.35 * t, 0.32 * (1 - t) + 0.38 * t, 0.18 * (1 - t) + 0.4 * t)
  } else {
    // Peaks: Snow-capped summit
    const t = Math.min(1.0, (h - 12.0) / 7.0)
    color.setRGB(0.35 * (1 - t) + 0.95 * t, 0.38 * (1 - t) + 0.96 * t, 0.4 * (1 - t) + 0.98 * t)
  }
  return color
}

// 4. Update the geometry vertices and vertex colors
watch(terrainMeshRef, (mesh) => {
  if (!mesh) return

  const geometry = mesh.geometry as THREE.BufferGeometry
  const pos = geometry.attributes.position
  const colors = []

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i)
    const vy = pos.getY(i) // Plane geometry is 2D, coordinates are X and Y

    const height = getTerrainHeight(vx, vy)
    pos.setZ(i, height) // Displace along Z (which will face Y up after rotation)

    const color = getColorForHeight(height)
    colors.push(color.r, color.g, color.b)
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  pos.needsUpdate = true
})

// 5. Reactive Terrain Material (Roughness/Metalness reacts to wetness from rain)
const terrainRoughness = computed(() => {
  const rainFactor = (props.precipitation ?? 0) / 100
  return 0.85 - rainFactor * 0.35 // Glossier when wet
})

const terrainMetalness = computed(() => {
  const rainFactor = (props.precipitation ?? 0) / 100
  return 0.02 + rainFactor * 0.15 // Slightly more reflective when wet
})
</script>

<template>
  <!-- The Displaced Mountain Terrain -->
  <TresMesh
    ref="terrainMeshRef"
    :rotation="[-Math.PI / 2, 0, 0]"
    :position="[0, -10, 0]"
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
