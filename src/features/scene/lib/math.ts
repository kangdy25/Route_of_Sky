// scene 모듈 전반에서 공유하는 작은 수치 유틸입니다.

// 값을 0과 1 사이로 제한합니다.
export function clampToUnitInterval(value: number) {
  return Math.min(1, Math.max(0, value))
}

// 값을 지정한 최솟값과 최댓값 사이로 제한합니다.
export function clampToRange(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

// 두 경계 사이를 부드러운 S-커브 값으로 보간합니다.
export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clampToUnitInterval((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

// 각도 래핑을 고려해 가장 짧은 회전 경로로 라디안 값을 보간합니다.
export function lerpRadians(start: number, end: number, progress: number) {
  const tau = Math.PI * 2
  const delta = ((((end - start + Math.PI) % tau) + tau) % tau) - Math.PI
  return start + delta * progress
}
