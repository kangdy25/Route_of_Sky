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
