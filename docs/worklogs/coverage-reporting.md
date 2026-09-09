# 작업 일지: coverage-reporting

## 기본 정보

- 날짜: 2026-09-01
- 브랜치: practice/my-own-practice
- 관련 PR: 없음
- 목표: V8 커버리지 보고서와 Windows E2E 서버 시작이 실패하는 테스트 도구 설정을 해결한다.

## 기준선과 가설

- 기준선: `pnpm run test:coverage`에서 229개 테스트는 통과했지만, `file:///logo.webp` 경로 오류로 5개 스위트가 실패했다.
- 가설: Vue 템플릿의 정적 이미지 URL을 런타임 문자열 바인딩으로 바꾸면 Vite가 Windows에서 유효하지 않은 `file:///logo.webp` 가상 파일 URL을 커버리지 처리 경로로 전달하지 않는다.
- 성공 기준: 전체 커버리지 테스트와 E2E가 실패 없이 완료되고, `vue-tsc --noEmit -p tsconfig.app.json`이 통과한다.

## 변경 내용

- 로고 URL을 런타임 문자열 바인딩으로 변경해 템플릿 정적 자산 변환을 피했다.
- Playwright의 웹 서버 명령을 플랫폼 독립적인 pnpm 명령으로 변경했다.

## 검증

- 실행 명령: `pnpm run test:coverage -- --reporter=dot`, `pnpm exec vue-tsc --noEmit -p tsconfig.app.json --pretty false`, `pnpm run test:e2e`, `pnpm build`
- 테스트 결과: 커버리지 35개 파일·266개 테스트 통과, E2E 9개 통과, TypeScript 검사와 빌드 통과.
- Before → After: 커버리지 5개 스위트 실패 → 35개 파일·266개 테스트 통과. E2E 웹 서버 시작 실패 → 9개 시나리오 통과.

## 판단과 롤백

- 판정: 유지.
- 위험: 정적 이미지 자체는 커버리지 대상이 아니므로 애플리케이션 코드 커버리지에는 영향이 없다.
- 롤백 조건: 커버리지 보고서 오류가 지속되거나 TypeScript 진단이 새로 발생하면 이 제외 설정을 되돌린다.
- 다음 작업: 없음.
