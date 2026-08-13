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

## 2026-08-13 · 최종 재측정과 사례 연구

- Before: `render-trace-after.json`의 CPU ×4 Medium 중앙값 — Rain 400.9ms, Storm 383.3ms, Snow 449.9ms.
- 최종 환경: non-headless Google Chrome, hardwareAcceleration true, 1365×768, HTTP 캐시 비활성화, Weather 고정 mock, 20초, 프리셋별 독립 3회. 원시 trace와 원시 GPU 정보는 보관하지 않았다.
- After 원본: `runs/final-after-*.json` 6개와 결합본 `runs/final-after.json`.
- After 중앙값: CPU ×4 Medium Rain 233.8ms, Storm 216.0ms, Snow 250.9ms.
- 숫자상 Before → After: Rain 167.1ms·41.7%, Storm 167.3ms·43.6%, Snow 199.0ms·44.2% 감소.
- 판단: 이 기간 렌더링 런타임 코드는 **변경 0건**이다. 따라서 수치 차이를 Phase 3 최적화 성과로 귀속하지 않는다. 결과는 환경 변동을 보여주는 raw 재측정이며, 계획의 성공 판정은 **안전한 개선 미확정·미시도**다.
- 기능/시각 검증: High/Medium/Low × Rain/Storm/Snow 고정 조건 캡처 9개를 생성했고, High 품질 코드는 변경하지 않았다. 최종 자산은 WebP 9개, 총 1,117,042B다.
- 측정 중 폐기: 전체 18회 재측정은 Storm 두 번째 실행이 정상 창을 초과해 결과 파일을 만들지 못했다. 부분값은 공식 결과에서 제외했다. 이후 프리셋별 독립 실행으로 유효한 3회 세트만 보존했다.
- 롤백 조건 결과: 구현 코드가 없으므로 롤백할 코드도 없다. 수치만 만들기 위한 입자/해상도 저하는 하지 않았다.
