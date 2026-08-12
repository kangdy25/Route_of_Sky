# Phase 2 성능 최적화 작업 로그

개선율은 `(Before - After) / Before × 100`으로 계산합니다. 각 작업의 원본 3회 값과 중앙값은 `runs/`에 보존합니다.

## 2026-08-13 · 실제 GPU 기준선

- 가설: Phase 1 headless software WebGL 수치는 실제 사용자 GPU 체감보다 과도하게 느려, 절대 성능 목표와 후속 병목을 정확히 판정할 수 없다.
- 변경: 실제 Chrome GPU를 요구하는 `perf:gpu`, 실제 GPU 판정, Phase 2 JSON 형식과 비교 도구를 추가했다.
- Before: 데스크톱 중앙값 FCP/LCP 640ms, Viewer 준비 669ms, Rain/Storm/Snow p95 67.4/50.1/17.6ms, Long Task p95 104ms였다. CPU ×4에서는 FCP/LCP 940ms, Viewer 준비 1,588ms, Rain/Storm/Snow p95 282.6/250.0/150.5ms였다.
- 판단: headless software WebGL의 수백 ms~초 단위 프레임 값보다 실제 GPU가 유의미하게 빠르다. 이후 Phase 2 최적화의 공식 비교는 이 기준선만 사용한다.
- 롤백 조건: 소프트웨어 렌더러 결과가 저장되거나 개인·원시 GPU 정보가 JSON에 포함되면 측정기를 즉시 수정 또는 제거한다.
