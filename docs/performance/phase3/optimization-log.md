# Phase 3 성능 최적화 작업 로그

개선율은 `(Before - After) / Before × 100`으로 계산한다. 목표 미달과 롤백도 원본 수치와 함께 기록한다.

## 2026-08-13 · 렌더링 trace 기준선

- 가설: 실제 GPU의 CPU ×4 Medium Rain/Storm/Snow 프레임 지연은 하나의 지배적 렌더링 비용으로 설명될 수 있다.
- Before: Phase 2 실제 GPU 수치와 코드 상태를 고정했다. Phase 3은 아직 런타임 변경이 없다.
- 측정 계획: High 데스크톱·Medium CPU ×4, 프리셋별 20초, 각 3회에서 프레임 p95와 trace 비용을 익명 집계한다.
- 롤백 조건: 소프트웨어 렌더러, 개인정보 포함 trace, 또는 재현 불가 수치가 나오면 결과를 폐기하고 측정기를 보정한다.

## 2026-08-13 · 실제 GPU trace 결과

- 구현: `perf:render-trace`가 non-headless Google Chrome, 1365×768, HTTP 캐시 비활성화, Weather 고정 mock으로 20초씩 3회 실행했다. 원시 trace는 임시 파일에서 분석 후 삭제했다.
- After 원본: [`runs/render-trace-after.json`](runs/render-trace-after.json)에 High 데스크톱과 CPU ×4 Medium의 18회 익명 요약을 보존했다.
- CPU ×4 Medium 중앙값: Rain **400.9ms**, Storm **383.3ms**, Snow **449.9ms** frame p95.
- 병목 판단: 세 프리셋 모두 Composite가 최대였지만 JavaScript 대비 비율이 1.01–1.05×로, 확정 기준 1.50×에 미달했다. 결과는 `unclassified`다.
- 판단: 특정 Canvas, Paint/Raster/Composite 또는 Cesium 변경을 정당화할 근거가 없다. 다음 브랜치에서는 기능 코드를 바꾸지 않고 이 진단과 목표 미달을 최종 결과로 기록한다.
- 롤백: 구현 후보가 확정되지 않아 롤백할 런타임 변경은 없다. 목표를 추정으로 맞추기 위한 품질 저하도 수행하지 않는다.
