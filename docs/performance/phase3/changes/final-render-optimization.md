# Phase 3 최종 렌더링 최적화 판정

## 목표와 사전 조건

목표는 실제 GPU에서 CPU ×4 · Medium Rain/Storm/Snow 프레임 p95를 각각 15% 이상 낮추면서, Desktop High와 다른 프리셋을 5% 이상 회귀시키지 않는 것이다. 구현은 직전 trace에서 세 반복 모두 두 번째 비용보다 1.5배 이상 큰 단일 병목이 확정된 경우에만 허용했다.

## Before

[`runs/final-render-optimization-before.json`](../runs/final-render-optimization-before.json)은 PR #29에서 수집한 실제 GPU 20초·3회 중앙값을 이 브랜치의 기준선으로 고정한다.

| CPU ×4 · Medium | Before frame p95 | 목표 |
| --- | ---: | --- |
| Rain | 400.9ms | 340.8ms 이하 |
| Storm | 383.3ms | 325.8ms 이하 |
| Snow | 449.9ms | 382.4ms 이하 |

## 판정과 구현 선택

모든 저사양 프리셋에서 Composite가 가장 큰 집계였지만 JavaScript와의 비율은 Rain 1.04×, Storm 1.04×, Snow 1.01×였다. 확정 기준 1.50×에 미달했으므로 JS/Canvas, Paint/Raster/Composite, Cesium 어느 경로도 단일 원인으로 확정할 수 없다.

따라서 **런타임 코드를 변경하지 않았다.** High의 입자 수·해상도·시각 효과도 그대로다. 목표를 맞추기 위해 Medium의 효과를 임의로 낮추거나 OffscreenCanvas Worker를 추가하는 것은 이번 마지막 사이클의 안전 원칙에 어긋나므로 수행하지 않았다.

## After와 결과

코드 변경이 없으므로 After는 동일 기준선이며 [`runs/final-render-optimization-after.json`](../runs/final-render-optimization-after.json)에 0 변화로 기록했다. 최종 사례 연구 PR에서 최신 `main`을 다시 실제 GPU 3회 측정해 독립 검증한다.

| 지표 | Before | After | 절대 차이 | 개선율 | 목표 판정 |
| --- | ---: | ---: | ---: | ---: | --- |
| CPU ×4 Medium Rain p95 | 400.9ms | 400.9ms | 0.0ms | 0.0% | 미달 — 구현 미승인 |
| CPU ×4 Medium Storm p95 | 383.3ms | 383.3ms | 0.0ms | 0.0% | 미달 — 구현 미승인 |
| CPU ×4 Medium Snow p95 | 449.9ms | 449.9ms | 0.0ms | 0.0% | 미달 — 구현 미승인 |
| Desktop High 시각 품질 | 기준 상태 | 변경 없음 | 해당 없음 | 해당 없음 | 통과 |

## 롤백과 후속 조치

- 롤백할 실험 코드는 없다. 확정 병목이 없어 구현 자체를 시작하지 않았기 때문이다.
- 목표 미달은 숨기지 않으며, 최종 문서에 “안전한 개선 미확정·코드 변경 없음”으로 기록한다.
- 향후 재시도는 현재의 포함 관계 trace 대신 프레임별 CPU/GPU 구분이 가능한 프로파일과 고정 카메라·독립 Canvas/Cesium 시나리오를 먼저 설계한 뒤에만 검토한다.
