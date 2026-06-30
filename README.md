<div align="center">
  <img src="public/logo.png" alt="Route of Sky Logo" width="280px" />
  <h1>Route of Sky</h1>
  <p><strong>여러 국가들의 3D 도시 경관과 실시간 날씨 데이터를 시각화하는 시뮬레이터</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white" alt="Vue 3" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Cesium-FF9900?style=for-the-badge&logo=cesium&logoColor=white" alt="Cesium" />
    <img src="https://img.shields.io/badge/Pinia-FRUIT?style=for-the-badge&logo=pinia&logoColor=yellow" alt="Pinia" />
  </p>

  <p>
    Cesium JS와 Google Photorealistic 3D Tiles를 결합하여 여러 국가의 3D 도시 환경을 생생하게 구현하고, <br>
    시간대별 광원 효과 및 다양한 기상 현상(비, 눈, 안개, 폭풍 등)을 정교하게 제어하는 대시보드 애플리케이션입니다.
  </p>
</div>

---

## 📸 미리보기 (Demo)

<div align="center">
  <img src="public/demo-1.gif" alt="Route of Sky Demo 1" width="90%" style="border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); margin-bottom: 20px;" />
  <br />
  <img src="public/demo-2.gif" alt="Route of Sky Demo 2" width="90%" style="border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);" />
</div>

## ✨ 주요 기능

- 🌆 **Cesium 기반의 실사 3D 렌더링**
  - Cesium Ion 토큰 연동 시 **Google Photorealistic 3D Tiles**를 로드하여 디테일한 여러 국가들의 전경 시각화.
  - 카메라 이동 및 최적화된 3D 씬 컨트롤.
- ☀️ **시간대별 대기 시뮬레이션 (Scene Time Preset)**
  - 태양의 고도와 방위각 계산을 통한 일출, 일몰, 낮, 밤의 하늘 색상 및 안개 표현.
  - 노을빛 Glow 효과와 시간의 흐름에 따른 동적인 조도 변화.
- ⛈️ **Weather Lab 기상 현상 구현**
  - Cesium Particle System 및 Shader 효과를 커스텀하여 **구름, 비, 폭풍, 눈, 안개(Fog/Haze)** 비주얼 시뮬레이션 제공.
- 📊 **모던하고 직관적인 날씨 대시보드**
  - 기온, 습도, 풍속, 운량, 강수량, 가시거리 및 대기질 지수(AQI) 등 다양한 날씨 지표를 미려한 UI 카드로 시각화.
- 🧪 **상태 관리 기반 시뮬레이터**
  - **Pinia** 스토어를 통해 실시간 3D 날씨 씬과 대시보드 UI 상태를 양방향으로 동기화.
  - API 연동 전에도 개발자 도구 및 설정 드로어를 통해 간편하게 기상 수치를 조작하고 결과를 프리뷰 가능.

## 🛠️ 기술 스택

### Frontend & Core

- **Vue 3 (Composition API)**: 선언적이고 고성능의 컴포넌트 개발.
- **TypeScript**: 정적 타입을 통한 견고한 애플리케이션 설계.
- **Vite**: 초고속 빌드 및 HMR 환경 구성.
- **Pinia**: 중앙 기상 상태 및 드로어 토글 상태 관리.
- **Tailwind CSS (v4)**: 유연하고 현대적인 UI 스타일링 적용.
- **GSAP (GreenSock)**: 대시보드 진입 및 위젯 전환용 부드러운 마이크로 인터랙션 구현.

### 3D Map Engine

- **Cesium.js (via `vite-plugin-cesium`)**: 웹 브라우저 기반 고성능 3D GIS 및 타일 렌더링.

### Testing & Quality

- **Vitest & @vue/test-utils**: 고속 유닛 테스트 및 커버리지 검증.
- **Playwright**: 안정적인 E2E 브라우저 테스트 및 시나리오 검증.
- **ESLint & Prettier**: 코드 일관성 및 스타일 가이드 준수.

## 🚀 빠른 시작

### 1. 요구사항

이 프로젝트를 실행하려면 [Node.js](https://nodejs.org/)와 [pnpm](https://pnpm.io/) 패키지 매니저가 필요합니다.

### 2. 패키지 설치

```bash
pnpm install
```

### 3. 환경 변수 설정

Google Photorealistic 3D Tiles를 사용하려면 **Cesium ion Access Token**, **Google Maps API key**가 필요합니다.
또한 날씨 데이터를 정확히 받기 위해서는 **Weather API** 키가 필요합니다.
프로젝트 루트 폴더에 `.env` 파일을 생성하고 발급받은 액세스 토큰과 API 키들을 입력해 주세요.

```env
# .env
VITE_GOOGLE_MAPS_API_KEY=your_api_key
VITE_CESIUM_ION_ACCESS_TOKEN=your_cesium_ion_access_token_here
VITE_WEATHER_API_KEY=your_api_key
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

개발 서버가 구동되면 브라우저에서 `http://localhost:5173`으로 접속할 수 있습니다.

## 📁 프로젝트 구조

```bash
src/
├── pages/             # 메인 레이아웃 및 전체 페이지 조립
│   └── Dashboard.vue  # 3D 맵과 날씨 대시보드가 결합된 메인 페이지
├── widgets/
│   └── dashboard/     # 대시보드용 위젯 (지표 카드, 설정 드로어 등)
├── features/
│   ├── scene/         # Cesium 3D 씬 렌더링, 카메라 뷰, 날씨 파티클(비, 눈 등) 관리
│   └── weather/       # 날씨 상태 모델(Pinia Store), 날씨 데이터 가공 유틸
└── shared/
    ├── config/        # 환경변수 로더 및 설정 상수
    └── ui/            # 공통으로 사용되는 UI 컴포넌트 (버튼, 카드, 드로어 등)
```

## 📜 실행 스크립트

| 명령어               | 설명                                            |
| :------------------- | :---------------------------------------------- |
| `pnpm dev`           | Vite 로컬 개발 서버 구동 (HMR 적용)             |
| `pnpm build`         | 프로덕션 환경을 위한 정적 리소스 빌드           |
| `pnpm preview`       | 빌드된 프로덕션 앱 로컬 미리보기                |
| `pnpm lint`          | ESLint 및 Prettier 포맷팅 검증 및 자동 수정     |
| `pnpm format`        | Prettier를 사용하여 전체 소스코드 스타일 정리   |
| `pnpm test:unit`     | Vitest 기반 유닛 테스트 실행                    |
| `pnpm test:coverage` | 테스트 커버리지 리포트 생성 (c8)                |
| `pnpm test:e2e`      | Playwright 기반 E2E 테스트 수행 (헤드리스 모드) |
| `pnpm test:e2e:ui`   | Playwright E2E 테스트 UI 모드 실행              |

## ⚠️ 개발 & 빌드 노트 (Troubleshooting)

- **Vite Build 시 타입 문제**:
  일부 환경에서 `pnpm build` 시 `vite.config.ts` 내의 coverage 설정 및 외부 Spec 타입 정의 오류로 인해 빌드가 실패하는 경우가 있습니다.
  로컬 코드 무결성 검증은 우선 `pnpm lint` 및 `pnpm test:unit`을 통해 진행하시기 바랍니다.
- **Cesium Ion Token**:
  3D Tiles가 로드되지 않는 경우 개발자 도구 콘솔의 Cesium 경고 메시지 또는 `.env`에 정의된 `VITE_CESIUM_ION_ACCESS_TOKEN` 값을 재확인하세요. (현재 3D Tiles의 Asset ID는 `2275207`을 사용하고 있습니다.)
