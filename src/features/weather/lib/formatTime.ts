/** 0~24 범위의 시간 값을 HH:mm 문자열로 변환합니다. */
export function formatTime(time: number) {
  const totalMinutes = Math.round(time * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')

  return `${hh}:${mm}`
}
