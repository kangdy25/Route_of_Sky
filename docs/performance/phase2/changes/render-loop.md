# 렌더 루프 최적화

## 가설과 Before

`setTimeout` 기반 강수 루프는 브라우저 페인트 주기와 분리되어 불필요한 wake-up과 컨텍스트 조회를 만든다. 실제 GPU 기준은 `runs/render-loop-before.json`이며, 이는 변경 직전 동일 `main` 상태에서 측정한 `initial-load-before.json`의 3회 원본값을 작업 단위 이름으로 보존한 것이다.

## 변경

- 강수 루프를 `requestAnimationFrame`으로 통합하고 품질별 최소 간격은 유지한다.
- Canvas 2D context를 재사용하고 캔버스 대상이 바뀔 때만 다시 얻는다.
- 비가시 탭에서는 강수 루프와 Auto 품질 분석을 멈추고 복귀 시 재개한다.

## 목표

Rain/Storm/Snow 각 실제 GPU p95 15% 이상 개선, 어떤 프리셋도 5% 이상 회귀하지 않음.

## 후보 After와 롤백

실제 GPU 3회 중앙값에서 데스크톱 Rain/Storm/Snow p95는 83.4/66.7/17.7 → 183.2/135.2/66.7ms로 각각 99.8/68.5/49.0ms 증가했다(-119.7%/-102.7%/-276.8%). CPU ×4도 300.2/266.9/200.8 → 434.7/431.4/432.1ms로 모두 회귀했다. 번들 증가는 JS gzip 0.08KiB, CSS gzip 0.01KiB에 그쳤지만, 프레임 목표와 5% 회귀 한도를 위반했다.

원인은 rAF가 화면 갱신과 동기화되는 이점보다, Canvas·Cesium·측정 rAF가 같은 프레임 큐에서 경쟁한 비용이 더 컸을 가능성이다. 코드와 테스트는 롤백했고 원본값·비교는 `runs/render-loop-*.json`, `render-loop-comparison.md`에 보존한다. 다음 실험은 실제 Chrome trace로 Canvas와 Cesium의 프레임 원인을 먼저 분리한 뒤 시행한다.
