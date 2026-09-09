/**
 * 숫자를 반올림하여 정수형 문자열로 변환합니다. '-0' 표기를 방어하여 순수 '0'으로 출력합니다.
 * Weather Lab과 대시보드 지표의 숫자 표기 규칙을 일관되게 적용합니다.
 */
export function formatInteger(value: number) {
  return String(Math.round(value))
}

/** 숫자를 소수점 한 자리까지 반올림하여 문자열로 변환합니다. 의미 없는 .0은 생략합니다. */
export function formatSingleDecimal(value: number) {
  return String(Number(value.toFixed(1)))
}
