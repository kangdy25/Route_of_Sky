# Phase 3 렌더링 trace 기준선

## 가설

이전 rAF 렌더 루프 후보는 실제 GPU 프레임 p95를 악화시켰다. Canvas, Paint/Raster, Composite/GPU, Cesium 중 어느 비용이 지배적인지 확인하지 않고 루프를 바꾼 것이 원인일 수 있다.

## Before

Phase 2 최종 실제 GPU 원본(`../../phase2/runs/phase2-final-after.json`)은 자동 품질을 포함했다. Phase 3은 런타임 코드를 바꾸기 전에 High 데스크톱과 Medium CPU ×4를 고정한 20초 trace 3회로 새 기준선을 만든다.

## 유지 조건

- GPU 모델·드라이버, URL 쿼리, 위치, API 키, 원본 trace는 저장소에 남기지 않는다.
- 세 반복에서 가장 큰 비용이 두 번째 비용의 1.5배 이상일 때만 병목으로 확정한다.
- 병목이 확정되지 않으면 기능 코드를 변경하지 않고 진단 결과만 병합한다.
