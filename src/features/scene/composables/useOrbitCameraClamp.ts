import { ref, type ComputedRef } from 'vue'
import type { Vector3 } from 'three'

type OrbitControlsLike = {
  target?: Vector3
  object?: {
    position?: Vector3
  }
  update?: () => void
}

type OrbitControlsComponentRef = {
  instance?: { value?: OrbitControlsLike | null } | OrbitControlsLike | null
}

/**
 * Google Tiles 모드에서 카메라가 지형 아래로 내려가지 않도록 OrbitControls 값을 보정합니다.
 */
export function useOrbitCameraClamp(hasGoogleTiles: ComputedRef<boolean>) {
  const orbitControlsRef = ref<OrbitControlsComponentRef | null>(null)
  const minMapTargetY = 620
  const minMapCameraY = 260

  function bindOrbitControlsRef(value: unknown) {
    orbitControlsRef.value = value as OrbitControlsComponentRef | null
  }

  function getOrbitControlsFromRef(): OrbitControlsLike | null {
    const instance = orbitControlsRef.value?.instance

    if (!instance) return null
    if ('value' in instance) return (instance.value as OrbitControlsLike | null) || null

    return instance as OrbitControlsLike
  }

  function resolveOrbitControls(input?: unknown): OrbitControlsLike | null {
    if (!input || typeof input !== 'object') return getOrbitControlsFromRef()

    const candidate = input as OrbitControlsLike
    if (typeof candidate.update === 'function') return candidate

    const eventTarget = (input as { target?: unknown }).target
    if (eventTarget && typeof eventTarget === 'object') {
      const targetCandidate = eventTarget as OrbitControlsLike
      if (typeof targetCandidate.update === 'function') return targetCandidate
    }

    return getOrbitControlsFromRef()
  }

  function clampMapCamera(input?: unknown) {
    const controls = resolveOrbitControls(input)
    if (!hasGoogleTiles.value || !controls) return

    let changed = false

    if (controls.target && controls.target.y < minMapTargetY) {
      controls.target.y = minMapTargetY
      changed = true
    }

    const cameraPosition = controls.object?.position
    if (cameraPosition && cameraPosition.y < minMapCameraY) {
      cameraPosition.y = minMapCameraY
      changed = true
    }

    if (changed) {
      controls.update?.()
    }
  }

  return {
    bindOrbitControlsRef,
    clampMapCamera,
  }
}
