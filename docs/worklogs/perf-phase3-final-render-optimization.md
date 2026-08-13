# 작업 일지: Phase 3 최종 렌더링 최적화

## 기본 정보

- 날짜: 2026-08-13
- 브랜치: `codex/perf-phase3-final-render-optimization`
- 목표: CPU ×4 · Medium Rain/Storm/Snow frame p95를 각각 15% 이상 개선하되 High 시각 품질은 보존한다.

## 기준선과 가설

- 기준선: PR #29 실제 GPU 20초·3회 중앙값 — Rain 400.9ms, Storm 383.3ms, Snow 449.9ms.
- 가설: 한 가지 trace 비용이 1.5배 이상 지배하면 해당 경로만 변경해 세 프리셋을 함께 개선할 수 있다.
- 구현 허용 조건: 세 반복에서 동일한 단일 병목이 두 번째 비용의 1.5배 이상.

## 변경 내용

- 결과: Composite가 최대였지만 JavaScript 대비 1.01–1.05배여서 조건 미충족(`unclassified`).
- 결정: 기능 코드, Canvas draw 밀도, Cesium 상세도, High 시각 품질을 변경하지 않았다.
- 제외: OffscreenCanvas Worker는 마지막 작업에 호환성·디버깅 위험을 추가하므로 채택하지 않았다.

## Before → After

| 프리셋 | Before | After | 절대 차이 | 개선율 | 목표 판정 |
| --- | ---: | ---: | ---: | ---: | --- |
| Rain | 400.9ms | 400.9ms | 0.0ms | 0.0% | 미달 — 구현 미승인 |
| Storm | 383.3ms | 383.3ms | 0.0ms | 0.0% | 미달 — 구현 미승인 |
| Snow | 449.9ms | 449.9ms | 0.0ms | 0.0% | 미달 — 구현 미승인 |

## 검증과 롤백

- 최종 사례 연구 브랜치에서 최신 `main` 재측정, build, `perf:budget`, 단위 테스트, Playwright E2E, High/Medium/Low 시각 확인을 실행한다.
- 롤백할 코드가 없으며, 진단·판정 문서만 Merge commit으로 병합한다.
