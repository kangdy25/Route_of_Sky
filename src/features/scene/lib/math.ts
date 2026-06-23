export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export function lerpRadians(start: number, end: number, progress: number) {
  const tau = Math.PI * 2
  const delta = ((((end - start + Math.PI) % tau) + tau) % tau) - Math.PI
  return start + delta * progress
}
