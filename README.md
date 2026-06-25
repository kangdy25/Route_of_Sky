# Route of Sky

뉴욕 타임스퀘어 상공의 3D 도시 씬과 날씨 대시보드를 함께 보여주는 Vue 3 웹 애플리케이션입니다. Cesium ion 토큰이 있으면 Google Photorealistic 3D Tiles를 불러오고, 토큰이 없을 때도 기본 Cesium 씬과 날씨 오버레이 UI는 동작합니다.

## 주요 기능

- 뉴욕 타임스퀘어 기준 3D 도시 카메라 뷰
- Cesium 기반 Google Photorealistic 3D Tiles 렌더링
- 시간대에 따라 변하는 태양, 하늘 색, 노을 glow, 안개 표현
- 구름, 비, 폭풍, 눈, 연무 시각 효과
- 기온, 습도, 풍속, 운량, 강수량, 가시거리, AQI 대시보드
- 설정 드로어의 Scene Time 프리셋과 Weather Lab 시뮬레이션
- API 연동 전에도 날씨 상태를 조정할 수 있는 Pinia 기반 상태 모델

## 기술 스택

- Vue 3
- TypeScript
- Vite
- Tailwind CSS
- Cesium
- Pinia
- GSAP
- Vitest
- Playwright

## 환경 변수

Google Photorealistic 3D Tiles는 Cesium ion asset을 통해 로드합니다. 프로젝트 루트에 `.env` 파일을 만들고 아래 값을 설정하세요.

```bash
VITE_CESIUM_ION_ACCESS_TOKEN=your_cesium_ion_access_token
```

현재 Google 3D Tiles asset id는 `2275207`입니다. 토큰이 없으면 3D Tiles 요청은 건너뛰고 화면 하단에 안내 메시지가 표시됩니다.

## 실행

```bash
pnpm install
pnpm dev
```

기본 개발 서버 주소는 `http://localhost:5173`입니다.

## 검증 명령

```bash
pnpm lint
pnpm test:unit
pnpm test:coverage
pnpm test:e2e
pnpm build
```

참고: 현재 `pnpm build`는 일부 spec 타입과 `vite.config.ts` coverage 옵션 타입 문제로 실패할 수 있습니다. 런타임 기능 검증은 `pnpm lint`와 `pnpm test:unit`을 우선 확인하세요.

## 구조

```bash
src/
  pages/              # 페이지 단위 조립
  widgets/
    dashboard/        # 대시보드 오버레이, 설정 패널, 지표 위젯
  features/
    scene/            # Cesium 씬 컴포넌트, 카메라, 구름, 하늘, 날씨 효과 로직
    weather/          # 날씨 상태 모델, store, 표시 라벨 유틸
  shared/
    config/           # 환경 변수 접근
    ui/               # 공통 UI 컴포넌트
```

## 개발 메모

- 기준 위치는 `NEW_YORK_TIMES_SQUARE_VIEW` 상수에서 관리합니다.
- 뉴욕 여름 일출/일몰 기준은 `NEW_YORK_SUMMER_SOLAR`에 모아 두었습니다.
- 날씨 대시보드와 3D 씬은 같은 Pinia weather store를 바라봅니다.
- API 연동 전까지는 설정 드로어의 Weather Lab으로 비, 폭풍, 눈, 연무 상태를 미리 볼 수 있습니다.
