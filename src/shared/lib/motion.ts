/**
 * 사용자 OS 및 브라우저 환경의 '움직임 줄이기' 설정 활성화 여부를 확인합니다.
 * SSR이나 미지원 브라우저에서는 false를 반환합니다.
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
