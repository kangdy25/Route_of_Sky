/** Weather Lab과 대시보드 지표의 숫자 표기 규칙을 일관되게 적용합니다. */
export function formatInteger(value: number) {
  return String(Math.round(value))
}

/** 소수점 한 자리까지 표시하되, 의미 없는 .0은 생략합니다. */
export function formatSingleDecimal(value: number) {
  return String(Number(value.toFixed(1)))
}
