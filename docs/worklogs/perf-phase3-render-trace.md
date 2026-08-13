# 작업 일지: Phase 3 Render Trace

## 기본 정보

- 날짜: 2026-08-13
- 브랜치: `codex/perf-phase3-render-trace`
- 목표: 실제 GPU trace로 CPU ×4 Medium 강수 렌더링의 단일 우선 병목을 판정한다.

## 기준선과 가설

- 기준선: Phase 2의 실제 GPU 수치는 자동 품질 전환을 포함해 병목 종류를 직접 분리하지 못했다.
- 가설: 프레임 p95가 높은 세 프리셋은 JS/Canvas, Paint/Raster, Composite/GPU, Cesium 중 한 비용이 일관되게 지배한다.
- 성공 기준: 각 시나리오 3회 원본 요약과 1.5배 판정 규칙에 따른 병목 분류를 남긴다.

## 변경 내용

- trace 수집기와 익명 요약기를 추가할 예정이다. 앱 런타임 코드는 변경하지 않는다.

## 검증

- 실행 명령: 실제 GPU trace 3회, build, `perf:budget`, 단위 테스트, Playwright E2E.

## 판단과 롤백

- 롤백 조건: 병목이 `unclassified`이거나 수집기가 민감한 정보를 남기면 다음 렌더링 구현을 진행하지 않는다.
