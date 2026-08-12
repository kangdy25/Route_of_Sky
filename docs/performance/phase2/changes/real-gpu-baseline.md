# 실제 GPU 기준선·개발 계측

## 목표

실제 GPU에서 재현 가능한 기준선과 개발 전용 익명 계측 경로를 마련한다.

## Before

`runs/real-gpu-before.json`은 변경 전 `main` 앱을 실제 Chrome GPU에서 데스크톱·CPU ×4 각각 3회 측정한 원본값과 중앙값이다.

## 구현 후 검증 예정

계측이 비활성화된 프로덕션 빌드는 런타임 요청을 추가하지 않아야 하며, Preview·Production `/api/performance`은 404여야 한다. 구현 후 동일 3회 측정으로 자산·런타임 회귀가 없는지 기록한다.
