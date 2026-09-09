# 작업 일지: 날씨 지표 표시 형식

## 기본 정보

- 날짜: 2026-09-04
- 브랜치: `practice/my-own-practice`
- 관련 PR: 예정
- 목표: GSAP 상태 보간 중에도 날씨 지표의 읽기 쉬운 표시 자릿수를 유지한다.

## 기준선과 가설

- 기준선: GSAP이 보간한 원시 부동소수점 값을 카드에 그대로 렌더링해 운량, 강수량, 가시거리, AQI 수치가 과도하게 길게 표시된다.
- 가설: 표시 전용 formatter를 적용하면 씬 상태 보간은 보존하면서 카드 수치를 안정적으로 읽을 수 있다.
- 성공 기준: 운량·AQI는 정수, 강수량·가시거리는 소수점 한 자리까지만 표시하며, `.0`은 나타나지 않는다. 시간대 탐색은 이미 `HH:mm` 형식이므로 변경하지 않는다.

## 변경 내용

- 운량 카드의 표시값을 정수로 반올림한다.
- 기존 강수량 formatter 규칙을 유지하고 가시거리 카드에도 적용한다.
- 대기질 정보와 설정 패널의 AQI 표시값을 정수로 반올림한다.
- 시간대 탐색은 이미 `HH:mm` 형식으로 표시되는 것을 확인해 변경하지 않는다.
- 보간 소수값, `.0` 생략, 반올림을 검증하는 단위 테스트를 추가한다.

## 검증

- 실행 명령: `pnpm exec vitest run src/shared/lib/formatMetricValue.spec.ts src/widgets/dashboard/CloudCoverMetric.spec.ts src/widgets/dashboard/PrecipitationMetric.spec.ts src/widgets/dashboard/VisibilityMetric.spec.ts src/widgets/dashboard/AtmospherePanel.spec.ts src/widgets/dashboard/SettingsPanel.spec.ts -t "GSAP 보간 중인 운량|GSAP 보간 중인 AQI|강수량은 한 자리|가시거리는 한 자리|AQI 슬라이더 라벨|weather metric value formatter"`, `pnpm build`, `pnpm test:e2e`
- 테스트 결과: 표시 형식 관련 단위 테스트 6개 파일·7개 통과, build 통과, Playwright E2E 9개 통과. 전체 단위 테스트는 이 브랜치의 기존 라벨 기대값·CSS selector·Weather API 오류 메시지 불일치 13건으로 실패했으며, 이번 표시 형식 변경과 무관하다.
- Before → After: 원시 부동소수점 표시 → 운량 정수, 강수량·가시거리 한 자리 소수(정수면 `.0` 생략). 성능 수치 변경을 목표로 하지 않는다.

## 판단과 롤백

- 판정: 통과. 표시 포맷 변경을 유지한다.
- 위험: 반올림한 표시값이 내부 렌더링 상태와 짧은 구간에서 다르게 보일 수 있다.
- 롤백 조건: 표시 자릿수 제한이 날씨 상태의 의미를 오도하거나 기존 카드 검증을 깨뜨리면 formatter 연결을 되돌린다.
- 다음 작업: 테스트·빌드·E2E 검증 뒤 PR에 변경 근거와 자체 리뷰를 남긴다.
