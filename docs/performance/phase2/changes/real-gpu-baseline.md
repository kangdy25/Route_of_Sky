# 실제 GPU 기준선·개발 계측

## 목표

실제 GPU에서 재현 가능한 기준선과 개발 전용 익명 계측 경로를 마련한다.

## Before

`runs/real-gpu-before.json`은 변경 전 `main` 앱을 실제 Chrome GPU에서 데스크톱·CPU ×4 각각 3회 측정한 원본값과 중앙값이다.

## 구현 후 검증 예정

계측이 비활성화된 프로덕션 빌드는 런타임 요청을 추가하지 않아야 하며, Preview·Production `/api/performance`은 404여야 한다. `VERCEL_ENV=development vercel dev`에서는 허용 이벤트가 204와 구조화 로그를 반환하고 위치 같은 비허용 필드는 400이어야 한다.

## After

- 프로덕션 앱 JS gzip: 86,752 → 86,752 bytes, 0 bytes·0.0% 변화
- 리소스 전송량: 2,853,295 → 2,853,295 bytes, 0 bytes·0.0% 변화
- Development 허용 이벤트: 204 및 `route-of-sky-performance` 구조화 로그 확인
- 위치 필드: 400 거절, Preview·Production: 404 거절
- 실제 GPU 측정은 독립 실행 변동이 있어 FCP/LCP 중앙값이 데스크톱 640 → 740ms, CPU ×4 940 → 1,096ms로 달랐다. 프로덕션 앱 자산·전송이 동일하고 계측 모듈은 빌드에서 제거됐으므로 이 값은 계측 회귀로 판정하지 않는다.

## 결론

목표대로 실제 GPU 기준선과 안전한 로컬 개발 검증 경로를 마련했다. 렌더링 또는 사용자 화면을 변경하지 않았으므로, 이 작업에는 별도 전후 시각 캡처가 적용되지 않는다.
