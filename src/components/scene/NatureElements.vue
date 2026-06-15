<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import * as THREE from 'three'

interface Tree {
  id: number
  position: [number, number, number]
  scale: [number, number, number]
  leafColor: string
}

interface Rock {
  id: number
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: string
}

interface Firefly {
  baseX: number
  baseY: number
  baseZ: number
  speed: number
  angle: number
  offsetY: number
}

// 1. Terrain Height Mapping logic (replicated for exact alignment)
function hash2(x: number, y: number) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return h - Math.floor(h)
}

function noise2(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy

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

const terrainHeightScale = 22
function getTerrainHeight(x: number, y: number) {
  const d = Math.sqrt(x * x + y * y)
  const rawNoise = fbm2(x * 0.012, y * 0.012, 4)
  const centerMask = THREE.MathUtils.smoothstep(d, 25, 160)
  return rawNoise * (1.5 + (terrainHeightScale - 1.5) * centerMask)
}

// 2. Element Refs and Data Structures
const trees = shallowRef<Tree[]>([])
const rocks = shallowRef<Rock[]>([])

const waterMeshRef = shallowRef<THREE.Mesh | null>(null)
const grassMeshRef = shallowRef<THREE.InstancedMesh | null>(null)
const firefliesGeomRef = shallowRef<THREE.BufferGeometry | null>(null)

const fireflyData: Firefly[] = []

// Shared seed for reproducible random placements
let seed = 777
function seededRandom() {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

// 3. Custom GPU Shader for Wind-swayed Instanced Grass
const grassUniforms = {
  uTime: { value: 0 },
}

const grassVertexShader = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // Apply instance matrix to vertex position to compute world position
    vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
    vec4 mvPosition = modelViewMatrix * worldPosition;

    // Grass sway math: only sway the tip of the grass (where uv.y is close to 1)
    float windStrength = uv.y;
    
    // Wave calculations using time and instance positions for varied phases
    float waveX = sin(uTime * 2.8 + (worldPosition.x * 0.5) + (worldPosition.z * 0.3)) * 0.12;
    float waveZ = cos(uTime * 2.2 + (worldPosition.x * 0.3) + (worldPosition.z * 0.4)) * 0.08;

    mvPosition.x += waveX * windStrength;
    mvPosition.z += waveZ * windStrength;

    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const grassFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    // Gradient: dark forest green at bottom to light fresh green at the tip
    vec3 bottomColor = vec3(0.08, 0.22, 0.09);
    vec3 topColor = vec3(0.38, 0.76, 0.28);
    vec3 finalColor = mix(bottomColor, topColor, vUv.y);

    // Very simple directional diffuse lighting shading
    float diffuse = max(0.55, dot(vNormal, normalize(vec3(1.0, 2.0, 1.0))));
    
    gl_FragColor = vec4(finalColor * diffuse, 1.0);
  }
`

// 4. Generate All Nature Elements
function initializeNature() {
  const tList: Tree[] = []
  const rList: Rock[] = []

  const terrainCenterY = -10 // Terrain base y offset

  // A. Generate Trees and Rocks
  const totalAttempts = 350
  let treeId = 0
  let rockId = 0

  for (let i = 0; i < totalAttempts; i++) {
    const angle = seededRandom() * Math.PI * 2
    const dist = 26.0 + seededRandom() * 154.0 // Avoid the center lake area
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist

    const h = getTerrainHeight(x, z)
    const y = terrainCenterY + h

    // Trees on grass/slopes
    if (h >= 1.6 && h <= 12.0 && seededRandom() > 0.45) {
      const hOffset = getTerrainHeight(x + 1, z)
      const slope = Math.abs(h - hOffset)

      if (slope < 1.0) {
        const heightScale = 0.8 + seededRandom() * 0.6
        const widthScale = 0.85 + seededRandom() * 0.3

        const greenColors = [
          '#1e3d22', // Forest Pine
          '#2d572c', // Bright Spruce
          '#1a331c', // Dark Moss
          '#325230', // Deep Foliage
          '#42663e', // Sage Pine
        ]
        const leafColor = greenColors[Math.floor(seededRandom() * greenColors.length)]

        tList.push({
          id: treeId++,
          position: [x, y, z],
          scale: [widthScale, heightScale, widthScale],
          leafColor,
        })
      }
    }

    // Rocks
    if (h >= 2.5 && h <= 15.0 && seededRandom() > 0.88) {
      const scaleX = 1.0 + seededRandom() * 2.2
      const scaleY = 0.8 + seededRandom() * 1.5
      const scaleZ = 1.0 + seededRandom() * 2.2
      const rotX = seededRandom() * Math.PI
      const rotY = seededRandom() * Math.PI
      const rz = seededRandom() * Math.PI

      const rockColors = ['#5e626a', '#4a4c52', '#6b6f78', '#7f838c']
      const color = rockColors[Math.floor(seededRandom() * rockColors.length)]

      rList.push({
        id: rockId++,
        position: [x, y - 0.25, z],
        rotation: [rotX, rotY, rz],
        scale: [scaleX, scaleY, scaleZ],
        color,
      })
    }
  }

  trees.value = tList
  rocks.value = rList
}

// B. Populate Instanced Grass and Fireflies once elements are mounted
onMounted(() => {
  // 1. Populate Waving Grass InstancedMesh
  const grass = grassMeshRef.value
  if (grass) {
    const dummy = new THREE.Object3D()
    const grassCount = grass.count
    let grassIndex = 0

    // Try finding grass coordinates on lower elevations
    for (let i = 0; i < grassCount * 3 && grassIndex < grassCount; i++) {
      const angle = seededRandom() * Math.PI * 2
      const dist = 24.0 + seededRandom() * 120.0
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist

      const h = getTerrainHeight(x, z)

      // Grass grows only on the green valleys (h < 5.0)
      if (h >= 0.5 && h < 5.0) {
        const y = -10 + h
        dummy.position.set(x + (seededRandom() - 0.5) * 1.5, y, z + (seededRandom() - 0.5) * 1.5)

        // Random spin and lean
        dummy.rotation.set(
          (seededRandom() - 0.5) * 0.15,
          seededRandom() * Math.PI,
          (seededRandom() - 0.5) * 0.15,
        )

        // Varied grass leaf size
        const grassScale = 0.75 + seededRandom() * 0.5
        dummy.scale.set(grassScale, grassScale, grassScale)
        dummy.updateMatrix()

        grass.setMatrixAt(grassIndex++, dummy.matrix)
      }
    }
    grass.instanceMatrix.needsUpdate = true
  }

  // 2. Populate Fireflies
  const firefliesGeom = firefliesGeomRef.value
  if (firefliesGeom) {
    const numFireflies = 180
    const positions = new Float32Array(numFireflies * 3)

    for (let i = 0; i < numFireflies; i++) {
      const angle = seededRandom() * Math.PI * 2
      const dist = 25.0 + seededRandom() * 95.0
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist

      const h = getTerrainHeight(x, z)
      // Float fireflies in forested regions above the floor
      const y = -10 + h + 1.2 + seededRandom() * 3.8

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      fireflyData.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        speed: 0.008 + seededRandom() * 0.012,
        angle: seededRandom() * Math.PI * 2,
        offsetY: seededRandom() * 100,
      })
    }
    firefliesGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  }
})

initializeNature()

// 5. Animating Water Waves & Fireflies
let time = 0
const onBeforeRender = () => {
  time += 0.015

  // Update grass time uniform
  grassUniforms.uTime.value = time

  // A. Low-Poly Volumetric Water wave animation
  const water = waterMeshRef.value
  if (water) {
    const geom = water.geometry as THREE.BufferGeometry
    const pos = geom.attributes.position

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i)
      const vy = pos.getY(i)

      // Compute overlapping sine wave height map for water surface
      const waveVal =
        Math.sin(vx * 0.18 + time * 1.4) * 0.18 +
        Math.cos(vy * 0.16 + time * 1.8) * 0.14 +
        Math.sin((vx + vy) * 0.08 + time * 0.8) * 0.12

      pos.setZ(i, waveVal)
    }
    pos.needsUpdate = true
    geom.computeVertexNormals() // Recompute face normals for low-poly faceted reflections
  }

  // B. Fireflies floating animation loop
  const firefliesGeom = firefliesGeomRef.value
  if (firefliesGeom && fireflyData.length > 0) {
    const pos = firefliesGeom.attributes.position

    for (let i = 0; i < fireflyData.length; i++) {
      const data = fireflyData[i]
      data.angle += data.speed

      // Gentle 3D helical swaying motion
      const currentX = data.baseX + Math.sin(data.angle) * 0.8
      const currentZ = data.baseZ + Math.cos(data.angle) * 0.8
      const currentY = data.baseY + Math.sin(time * 0.8 + data.offsetY) * 0.45

      pos.setXYZ(i, currentX, currentY, currentZ)
    }
    pos.needsUpdate = true
  }
}
</script>

<template>
  <TresGroup @before-render="onBeforeRender">
    <!-- 1. Low-Poly Faceted Water Plane (Central Basin Lake) -->
    <!-- Positioned slightly above the basin floor (y = -10), flatShading: true gives faceted low-poly reflections -->
    <TresMesh
      ref="waterMeshRef"
      :rotation="[-Math.PI / 2, 0, 0]"
      :position="[0, -9.6, 0]"
      receive-shadow
    >
      <TresPlaneGeometry :args="[65, 65, 24, 24]" />
      <TresMeshStandardMaterial
        color="#104a52"
        :roughness="0.06"
        :metalness="0.9"
        transparent
        :opacity="0.82"
        :flatShading="true"
      />
    </TresMesh>

    <!-- 2. Wind-Swayed Grass Blades (Instanced Mesh for 2,500 blades) -->
    <TresInstancedMesh ref="grassMeshRef" :args="[undefined, undefined, 2500]" cast-shadow>
      <!-- Double-sided vertical plane geometry represents a blade of grass -->
      <TresPlaneGeometry :args="[0.08, 0.45, 1, 3]" />
      <TresShaderMaterial
        :vertexShader="grassVertexShader"
        :fragmentShader="grassFragmentShader"
        :uniforms="grassUniforms"
        :side="THREE.DoubleSide"
      />
    </TresInstancedMesh>

    <!-- 3. Floating Glow Fireflies (Atmosphere Particles) -->
    <TresPoints>
      <TresBufferGeometry ref="firefliesGeomRef" />
      <TresPointsMaterial
        color="#bfff4f"
        :size="0.28"
        transparent
        :opacity="0.8"
        :depthWrite="false"
        :blending="THREE.AdditiveBlending"
      />
    </TresPoints>

    <!-- 4. Low-Poly Trees -->
    <TresGroup
      v-for="tree in trees"
      :key="'tree-' + tree.id"
      :position="tree.position"
      :scale="tree.scale"
    >
      <!-- Trunk -->
      <TresMesh :position="[0, 0.4, 0]" cast-shadow receive-shadow>
        <TresCylinderGeometry :args="[0.08, 0.15, 0.8, 4]" />
        <TresMeshStandardMaterial color="#402c1f" :roughness="0.95" />
      </TresMesh>

      <!-- Foliage Layer 1 (Bottom) -->
      <TresMesh :position="[0, 1.0, 0]" cast-shadow receive-shadow>
        <TresConeGeometry :args="[0.6, 0.9, 4]" />
        <TresMeshStandardMaterial :color="tree.leafColor" :roughness="0.9" :flatShading="true" />
      </TresMesh>

      <!-- Foliage Layer 2 (Middle) -->
      <TresMesh :position="[0, 1.5, 0]" cast-shadow receive-shadow>
        <TresConeGeometry :args="[0.45, 0.75, 4]" />
        <TresMeshStandardMaterial :color="tree.leafColor" :roughness="0.9" :flatShading="true" />
      </TresMesh>

      <!-- Foliage Layer 3 (Top) -->
      <TresMesh :position="[0, 1.95, 0]" cast-shadow receive-shadow>
        <TresConeGeometry :args="[0.32, 0.6, 4]" />
        <TresMeshStandardMaterial :color="tree.leafColor" :roughness="0.9" :flatShading="true" />
      </TresMesh>
    </TresGroup>

    <!-- 5. Low-Poly Rocks -->
    <TresMesh
      v-for="rock in rocks"
      :key="'rock-' + rock.id"
      :position="rock.position"
      :rotation="rock.rotation"
      :scale="rock.scale"
      cast-shadow
      receive-shadow
    >
      <TresDodecahedronGeometry :args="[0.9, 0]" />
      <TresMeshStandardMaterial :color="rock.color" :roughness="0.82" :flatShading="true" />
    </TresMesh>
  </TresGroup>
</template>
