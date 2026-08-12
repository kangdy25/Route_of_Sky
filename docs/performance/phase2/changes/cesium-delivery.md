# Cesium 전송·썸네일 최적화

## 가설과 Before

공유 링크 썸네일은 1,376×768·977,995 bytes(약 955KiB)이고, Cesium의 Worker·WASM·텍스처는 버전 고정 자산임에도 재방문 캐시 정책이 명시돼 있지 않다. 정적 자산을 삭제하지 않고, 화면 품질을 유지한 썸네일 재인코딩과 장기 immutable 캐시를 적용한다.

## 변경

- `thumbnail.jpg`를 1,200×669, 213,019 bytes JPEG로 재인코딩한다.
- `/cesium/*`, `/thumbnail.jpg`에 1년 immutable Cache-Control을 적용한다.
- OG 이미지 실제 크기를 1,200×669로 맞춘다.

## 검증 기준

- 썸네일 250KiB 이하
- Preview 응답에서 Cache-Control이 `public, max-age=31536000, immutable`
- Cesium Worker·WASM·타일 경로 E2E 및 시각 확인에 오류 없음

## Preview 헤더 검증 제한

2026-08-13 Preview URL의 `thumbnail.jpg`, Cesium Worker 요청은 프로젝트 SSO 보호 때문에 모두 302 `vercel.com/sso-api`로 리디렉션됐다. 따라서 이 PR에서는 실제 배포 Cache-Control 응답을 확정하지 못했고, `vercel.json` 구성과 빌드·시각 검증만 완료했다. 병합 뒤 공개 Production URL에서 두 경로가 200 및 설정한 immutable 헤더를 반환하는지 확인해야 한다.
