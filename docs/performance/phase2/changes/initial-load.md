# 초기 로딩 분리

## 가설

초기 앱 번들에 Cesium과 `SceneCanvas`를 포함하면 대시보드 셸의 첫 페인트가 3D Viewer 초기화와 경쟁한다. 씬 모듈을 첫 셸 페인트 뒤에 로드하면 FCP/LCP를 낮추면서 Viewer 준비 시간과 레이아웃 안정성을 유지할 수 있다.

## Before

실제 GPU 3회 중앙값은 데스크톱 FCP/LCP 692ms, CLS 0, Viewer 준비 651.9ms였다. CPU ×4에서는 FCP/LCP 1,000ms, Viewer 준비 1,927.6ms였다. 원본값은 `runs/initial-load-before.json`에 보존한다.

## 유지 조건

- 데스크톱 FCP 또는 LCP 10% 이상 개선
- Viewer 준비 시간 악화 15% 이하
- CLS 0.02 이하
- Viewer 준비 전 마지막 위치 선택이 유실되지 않음

## 후보 After

실험 구현은 대시보드 셸을 먼저 그리고 두 번째 animation frame에서 `SceneCanvas` 청크를 요청했다. 로딩 중 Tokyo를 선택하는 E2E는 통과했고 CLS도 0으로 유지했다. 하지만 실제 GPU 3회 중앙값은 데스크톱 FCP/LCP 692 → 1,044/1,060ms, Viewer 준비 651.9 → 1,408.6ms로 악화했다. CPU ×4도 FCP/LCP 1,000 → 1,240ms, Viewer 준비 1,927.6 → 3,291.0ms로 악화했다.

초기 entry JS gzip만 보면 84.72 → 78.28KiB(6.44KiB·7.6% 감소)였지만, 분리된 SceneCanvas 청크 9.14KiB를 더한 초기 시나리오 총 JS gzip은 84.72 → 87.42KiB(2.70KiB·3.2% 증가)였다. 프로덕션 초기 경로에서의 네트워크·파싱 순서가 지연되어 FCP/LCP 목표와 Viewer 준비 악화 15% 이하 조건을 모두 위반했다. 원본값은 `runs/initial-load-after.json`, 전체 표는 `initial-load-comparison.md`에 보존한다.

## 결정·롤백

동적 SceneCanvas 구현과 관련 E2E는 모두 되돌렸다. 병합 대상은 실패 실험의 원본 측정·비교·판단 문서와 다중 청크에서 entry asset을 정확히 판별하도록 고친 측정기뿐이다. 이후 초기 로딩 개선은 실제 Chrome trace에서 Cesium 초기 long task와 LCP 후보를 먼저 분리한 뒤 재시도한다.
