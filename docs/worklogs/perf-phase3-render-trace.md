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

- `perf:render-trace`와 분석 단위 테스트를 추가했다. 측정기는 실제 GPU가 아닐 때 실패하며 원시 GPU·trace를 저장하지 않는다.
- Vite preview 포트를 명시적으로 고정해, 이미 사용 중인 포트로 자동 변경된 서버를 잘못 기다리지 않게 했다.
- 앱 런타임 코드는 변경하지 않았다.

## 측정 결과

- 실행 명령: `pnpm run perf:render-trace -- --url http://127.0.0.1:4195 --label render-trace-after --runs 3`
- 환경: non-headless Google Chrome, 실제 GPU 확인, 1365×768, HTTP 캐시 비활성화, Weather 고정 mock, 20초, 각 3회 중앙값.

| 조건 | Rain p95 | Storm p95 | Snow p95 | 병목 |
| --- | ---: | ---: | ---: | --- |
| Desktop High | 166.7ms | 182.7ms | 166.7ms | unclassified |
| CPU ×4 Medium | 400.9ms | 383.3ms | 449.9ms | unclassified |

- 세 저사양 시나리오의 Composite/JavaScript 비율은 1.01–1.05×로 1.50× 확정 기준에 도달하지 못했다.

## 검증

- 완료: trace 분석 단위 테스트 3개, 스크립트 ESLint, production build, 실제 GPU 공식 trace 18회.
- 후속 PR에서 `perf:budget`, 전체 단위 테스트와 Playwright E2E를 재실행한다.

## 판단과 롤백

- 결론: 병목이 `unclassified`이므로 기능 구현을 진행하지 않는다.
- 롤백: 롤백할 런타임 변경은 없다. 진단·원본 수치만 병합한다.
