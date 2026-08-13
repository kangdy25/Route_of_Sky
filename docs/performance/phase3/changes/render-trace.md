# Phase 3 렌더링 trace 기준선

## 가설

이전 rAF 렌더 루프 후보는 실제 GPU 프레임 p95를 악화시켰다. Canvas, Paint/Raster, Composite/GPU, Cesium 중 어느 비용이 지배적인지 확인하지 않고 루프를 바꾼 것이 원인일 수 있다.

## Before

Phase 2 최종 실제 GPU 원본(`../../phase2/runs/phase2-final-after.json`)은 자동 품질을 포함했다. Phase 3은 런타임 코드를 바꾸기 전에 High 데스크톱과 Medium CPU ×4를 고정한 20초 trace 3회로 새 기준선을 만든다.

## 구현과 After

- `perf:render-trace`는 headless가 아닌 Google Chrome을 실행하고 Chrome CDP의 GPU 정보를 검사한다. SwiftShader, llvmpipe, software renderer가 감지되면 공식 측정을 실패 처리한다.
- HTTP 캐시를 끄고 Weather 응답을 고정 mock으로 대체했다. 브라우저·뷰포트·CPU 제한·품질만 보존하며 GPU 모델, 위치, URL 쿼리, API 키는 저장하지 않는다.
- 원본 trace는 운영체제 임시 디렉터리에만 생성하고 분석 직후 삭제한다. Git에는 [`render-trace-after.json`](../runs/render-trace-after.json)의 익명 집계만 보관한다.
- 프레임 p95는 페이지의 `requestAnimationFrame` 간격이고, trace 비용은 포함 관계가 있을 수 있는 이벤트의 집계다. 따라서 서로 다른 비용의 합계나 실제 GPU 시간으로 해석하지 않는다.

| 조건 | Rain p95 (3회 → 중앙값) | Storm p95 (3회 → 중앙값) | Snow p95 (3회 → 중앙값) | 확정 병목 |
| --- | ---: | ---: | ---: | --- |
| Desktop · High | 166.6 / 166.7 / 166.7ms → **166.7ms** | 183.3 / 182.7 / 181.4ms → **182.7ms** | 166.7 / 200.0 / 166.7ms → **166.7ms** | unclassified |
| CPU ×4 · Medium | 417.5 / 400.9 / 400.0ms → **400.9ms** | 383.3 / 383.2 / 500.0ms → **383.3ms** | 449.9 / 533.3 / 383.4ms → **449.9ms** | unclassified |

CPU ×4 Medium의 세 반복은 모두 Composite가 가장 컸지만, JavaScript와의 비용 비율이 Rain 1.04×, Storm 1.04×, Snow 1.01×였다. 확정 기준인 1.50×에 미달하므로, 이 PR은 특정 렌더링 경로를 바꾸지 않는다.

## 판정

| 항목 | Before | After | 절대 차이 | 개선율 | 목표 판정 |
| --- | ---: | ---: | ---: | ---: | --- |
| 런타임 렌더링 코드 | Phase 2 상태 | 변경 없음 | 0 | 0.0% | 해당 없음 — 진단 PR |
| CPU ×4 Medium Rain/Storm/Snow p95 | Phase 3의 고정 품질 측정 전 | 400.9 / 383.3 / 449.9ms | 비교 불가 | 비교 불가 | **미확정** — 단일 병목 기준 미충족 |

Phase 2의 자동 품질 수치와 이번 고정 Medium 수치는 시나리오가 달라 개선율을 계산하지 않는다. 수치를 섞어 성공 또는 회귀라고 주장하지 않는다.

## 유지 조건

- GPU 모델·드라이버, URL 쿼리, 위치, API 키, 원본 trace는 저장소에 남기지 않는다.
- 세 반복에서 가장 큰 비용이 두 번째 비용의 1.5배 이상일 때만 병목으로 확정한다.
- 병목이 확정되지 않으면 기능 코드를 변경하지 않고 진단 결과만 병합한다.
