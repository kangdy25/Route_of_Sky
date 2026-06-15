<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import * as THREE from 'three'
import { getTerrainHeight, terrainBaseY } from '@/features/scene/lib/terrain'

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

// 자연 오브젝트와 GPU 리소스 참조입니다.
const trees = shallowRef<Tree[]>([])
const rocks = shallowRef<Rock[]>([])

const waterMeshRef = shallowRef<THREE.Mesh | null>(null)
const grassMeshRef = shallowRef<THREE.InstancedMesh | null>(null)
const firefliesGeomRef = shallowRef<THREE.BufferGeometry | null>(null)

const fireflyData: Firefly[] = []

// 매 렌더링마다 같은 숲 배치가 나오도록 고정 seed를 사용합니다.
let seed = 777
function seededRandom() {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

// 인스턴싱된 풀잎에 바람 흔들림을 적용하는 GPU 셰이더입니다.
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

    // 인스턴스 행렬을 적용해 각 풀잎의 월드 위치를 계산합니다.
    vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
    vec4 mvPosition = modelViewMatrix * worldPosition;

    // uv.y가 높은 풀잎 끝부분만 더 크게 흔들리게 합니다.
    float windStrength = uv.y;
    
    // 시간과 인스턴스 위치를 섞어 풀잎마다 다른 위상의 흔들림을 만듭니다.
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
    // 아래쪽은 짙은 초록, 끝으로 갈수록 밝은 초록이 되도록 그라데이션을 줍니다.
    vec3 bottomColor = vec3(0.08, 0.22, 0.09);
    vec3 topColor = vec3(0.38, 0.76, 0.28);
    vec3 finalColor = mix(bottomColor, topColor, vUv.y);

    // 가벼운 방향성 diffuse 조명으로 풀잎의 입체감을 만듭니다.
    float diffuse = max(0.55, dot(vNormal, normalize(vec3(1.0, 2.0, 1.0))));
    
    gl_FragColor = vec4(finalColor * diffuse, 1.0);
  }
`

// 공통 지형 높이에 맞춰 나무와 바위 위치를 생성합니다.
function initializeNature() {
  const tList: Tree[] = []
  const rList: Rock[] = []

  const totalAttempts = 350
  let treeId = 0
  let rockId = 0

  for (let i = 0; i < totalAttempts; i++) {
    const angle = seededRandom() * Math.PI * 2
    const dist = 26.0 + seededRandom() * 154.0 // 중앙 호수 영역을 피해 배치합니다.
    const x = Math.cos(angle) * dist
    const z = Math.sin(angle) * dist

    const h = getTerrainHeight(x, z)
    const y = terrainBaseY + h

    // 초원과 완만한 경사에 나무를 배치합니다.
    if (h >= 1.6 && h <= 12.0 && seededRandom() > 0.45) {
      const hOffset = getTerrainHeight(x + 1, z)
      const slope = Math.abs(h - hOffset)

      if (slope < 1.0) {
        const heightScale = 0.8 + seededRandom() * 0.6
        const widthScale = 0.85 + seededRandom() * 0.3

        const greenColors = [
          '#1e3d22', // 짙은 소나무색
          '#2d572c', // 밝은 전나무색
          '#1a331c', // 어두운 이끼색
          '#325230', // 깊은 잎색
          '#42663e', // 회녹색 침엽수색
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

    // 고도가 어느 정도 있는 구간에 바위를 드문드문 배치합니다.
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

// Tres 리소스가 마운트된 뒤 인스턴스 풀과 반딧불 버퍼를 채웁니다.
onMounted(() => {
  // 흔들리는 풀잎 InstancedMesh를 채웁니다.
  const grass = grassMeshRef.value
  if (grass) {
    const dummy = new THREE.Object3D()
    const grassCount = grass.count
    let grassIndex = 0

    // 낮은 고도에서 풀잎을 심을 수 있는 좌표를 찾습니다.
    for (let i = 0; i < grassCount * 3 && grassIndex < grassCount; i++) {
      const angle = seededRandom() * Math.PI * 2
      const dist = 24.0 + seededRandom() * 120.0
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist

      const h = getTerrainHeight(x, z)

      // 풀은 낮은 초록 계곡 지대에만 자라도록 제한합니다.
      if (h >= 0.5 && h < 5.0) {
        const y = terrainBaseY + h
        dummy.position.set(x + (seededRandom() - 0.5) * 1.5, y, z + (seededRandom() - 0.5) * 1.5)

        // 풀잎마다 회전과 기울기를 조금씩 다르게 줍니다.
        dummy.rotation.set(
          (seededRandom() - 0.5) * 0.15,
          seededRandom() * Math.PI,
          (seededRandom() - 0.5) * 0.15,
        )

        // 풀잎 크기도 약간씩 달라지게 합니다.
        const grassScale = 0.75 + seededRandom() * 0.5
        dummy.scale.set(grassScale, grassScale, grassScale)
        dummy.updateMatrix()

        grass.setMatrixAt(grassIndex++, dummy.matrix)
      }
    }
    grass.instanceMatrix.needsUpdate = true
  }

  // 반딧불 입자 버퍼를 채웁니다.
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
      // 숲이 있는 지형 위로 반딧불이 떠다니도록 배치합니다.
      const y = terrainBaseY + h + 1.2 + seededRandom() * 3.8

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

// 매 프레임 물결, 풀 흔들림, 반딧불 움직임을 갱신합니다.
let time = 0
const onBeforeRender = () => {
  time += 0.015

  // 풀 셰이더의 시간 uniform을 갱신합니다.
  grassUniforms.uTime.value = time

  // 중앙 호수 표면에 낮은 폴리곤 스타일의 물결을 적용합니다.
  const water = waterMeshRef.value
  if (water) {
    const geom = water.geometry as THREE.BufferGeometry
    const pos = geom.attributes.position

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i)
      const vy = pos.getY(i)

      // 여러 sine/cosine 파형을 겹쳐 수면 높이맵을 계산합니다.
      const waveVal =
        Math.sin(vx * 0.18 + time * 1.4) * 0.18 +
        Math.cos(vy * 0.16 + time * 1.8) * 0.14 +
        Math.sin((vx + vy) * 0.08 + time * 0.8) * 0.12

      pos.setZ(i, waveVal)
    }
    pos.needsUpdate = true
    geom.computeVertexNormals() // 면 단위 반사가 살아나도록 normal을 다시 계산합니다.
  }

  // 반딧불이 부유 애니메이션입니다.
  const firefliesGeom = firefliesGeomRef.value
  if (firefliesGeom && fireflyData.length > 0) {
    const pos = firefliesGeom.attributes.position

    for (let i = 0; i < fireflyData.length; i++) {
      const data = fireflyData[i]
      data.angle += data.speed

      // 부드러운 3D 나선형 흔들림으로 떠다니는 느낌을 만듭니다.
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
