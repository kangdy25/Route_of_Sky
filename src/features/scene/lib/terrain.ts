import { Color, MathUtils } from 'three'

/** 지형 노이즈가 만들 수 있는 최대 산 높이입니다. */
export const terrainHeightScale = 22

/** Three.js 월드에서 지형 메시가 놓이는 기준 Y 좌표입니다. */
export const terrainBaseY = -10

/** 2D 좌표를 안정적인 의사 난수 값으로 변환합니다. */
export function hash2(x: number, y: number) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return h - Math.floor(h)
}

/** 주변 격자 난수 값을 부드럽게 보간하는 2D value noise입니다. */
export function noise2(x: number, y: number) {
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

/** 여러 주파수의 noise를 합쳐 자연스러운 산 능선을 만듭니다. */
export function fbm2(x: number, y: number, octaves = 4) {
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

/**
 * 월드 X/Z 좌표에 대응하는 지형 높이를 계산합니다.
 *
 * 중심부는 낮은 분지로 남기고 외곽으로 갈수록 산이 높아지도록 거리 기반 마스크를 섞습니다.
 */
export function getTerrainHeight(x: number, y: number) {
  const d = Math.sqrt(x * x + y * y)
  const rawNoise = fbm2(x * 0.012, y * 0.012, 4)
  const centerMask = MathUtils.smoothstep(d, 25, 160)

  return rawNoise * (1.5 + (terrainHeightScale - 1.5) * centerMask)
}

/** 높이에 따라 초원, 암석 지대, 설산 계열의 vertex color를 반환합니다. */
export function getColorForHeight(h: number) {
  const color = new Color()

  if (h < 5.0) {
    const t = h / 5.0
    color.setRGB(0.24 * (1 - t) + 0.12 * t, 0.48 * (1 - t) + 0.32 * t, 0.28 * (1 - t) + 0.18 * t)
  } else if (h < 12.0) {
    const t = (h - 5.0) / 7.0
    color.setRGB(0.12 * (1 - t) + 0.35 * t, 0.32 * (1 - t) + 0.38 * t, 0.18 * (1 - t) + 0.4 * t)
  } else {
    const t = Math.min(1.0, (h - 12.0) / 7.0)
    color.setRGB(0.35 * (1 - t) + 0.95 * t, 0.38 * (1 - t) + 0.96 * t, 0.4 * (1 - t) + 0.98 * t)
  }

  return color
}
