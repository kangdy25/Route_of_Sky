import { gsap } from 'gsap'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  DEFAULT_WEATHER_LOCATION_QUERY,
  fetchCurrentWeather,
} from '@/features/weather/api/weatherApi'
import { prefersReducedMotion } from '@/shared/lib/motion'
import { readWeatherCache, writeWeatherCache } from './weather.cache'
import { defaultWeatherState } from './weather.constants'
import type { WeatherState, WeatherStatePatch } from './weather.types'

// ==========================================
// 1. 타입 정의 및 설정 상수
// ==========================================

/** 날씨 데이터 출처 */
export type WeatherDataSource = 'default' | 'cache' | 'network' | 'stale-cache'

/** 날씨 로드 함수 옵션 */
export interface LoadCurrentWeatherOptions {
  fetcher?: typeof fetch
  force?: boolean
  animate?: boolean
}

/** 날씨 트랜지션 보간 옵션 */
export interface WeatherTransitionOptions {
  animate?: boolean // GSAP 트윈 애니메이션을 실행할지 여부
}

/** 진행 중인 네트워크 요청 트래킹 객체 */
interface PendingWeatherRequest {
  controller: AbortController // 진행 중인 fetch 요청을 즉시 중단(abort)할 수 있는 컨트롤러 인스턴스
  promise: Promise<WeatherState> // 진행 중인 날씨 데이터 응답 Promise
}

/**
 * 개발 환경에서 캐시 히트 및 네트워크 소요 시간 지표를 텔레메트리 모듈로 비동기 전송합니다.
 * 동적 임포트(Dynamic Import)를 사용하여 프로덕션 빌드 번들 크기를 증가시키지 않습니다.
 *
 * @param event 성능 측정 이벤트 유형 ('weather-cache-hit' | 'weather-network')
 * @param valueMs 측정된 소요 시간 (ms)
 */
function reportPerformanceInDevelopment(
  event: 'weather-cache-hit' | 'weather-network',
  valueMs: number,
) {
  void import('@/shared/lib/performanceTelemetry').then(({ reportDevelopmentPerformance }) => {
    reportDevelopmentPerformance({ event, valueMs })
  })
}

const WEATHER_TRANSITION_DURATION = 0.9
const TIME_TRANSITION_DURATION = 0.7

/** GSAP 보간 애니메이션을 적용할 수치형 날씨 키 목록 (time 제외) */
const weatherTransitionKeys = [
  'temperature',
  'temperatureMin',
  'temperatureMax',
  'humidity',
  'windSpeed',
  'windDirectionDegrees',
  'aqi',
  'cloudCover',
  'precipitation',
  'visibility',
] as const satisfies readonly (keyof Omit<WeatherState, 'time'>)[]

// ==========================================
// 2. Pinia 스토어 정의
// ==========================================

/** 날씨 상태를 앱 레이아웃과 3D 씬이 함께 참조할 수 있도록 관리합니다. */
export const useWeatherStore = defineStore('weather', () => {
  // ----------------------------------------
  // 2-1. 도메인 반응형 상태 (Weather States)
  // ----------------------------------------
  const time = ref(defaultWeatherState.time)
  const temperature = ref(defaultWeatherState.temperature)
  const temperatureMin = ref(defaultWeatherState.temperatureMin)
  const temperatureMax = ref(defaultWeatherState.temperatureMax)
  const humidity = ref(defaultWeatherState.humidity)
  const windSpeed = ref(defaultWeatherState.windSpeed)
  const windDirectionDegrees = ref(defaultWeatherState.windDirectionDegrees)
  const aqi = ref(defaultWeatherState.aqi)
  const cloudCover = ref(defaultWeatherState.cloudCover)
  const precipitation = ref(defaultWeatherState.precipitation)
  const visibility = ref(defaultWeatherState.visibility)

  // ----------------------------------------
  // 2-2. 네트워크 및 메타 상태
  // ----------------------------------------
  const isLoading = ref(false)
  const errorMessage = ref('')
  const lastUpdatedAt = ref<number | null>(null)
  const dataSource = ref<WeatherDataSource>('default')
  const cacheAgeMs = ref<number | null>(null)

  // 진단 및 성능 모니터링 카운터
  const cacheHitCount = ref(0)
  const cacheMissCount = ref(0)
  const networkRequestCount = ref(0)
  const forcedRefreshCount = ref(0)

  // ----------------------------------------
  // 2-3. 비동기 요청 및 트랜지션 내부 제어 변수
  // ----------------------------------------
  const pendingRequests = new Map<string, PendingWeatherRequest>()
  let activeLocationQuery = ''
  let activeWeatherTween: gsap.core.Tween | null = null
  let activeTimeTween: gsap.core.Tween | null = null
  let weatherTransitionId = 0
  let timeTransitionId = 0

  // ----------------------------------------
  // 2-4. 내부 헬퍼 (동기 상태 적용)
  // ----------------------------------------

  /** 전체 날씨 상태를 반응형 ref에 즉시 대입 */
  function applyWeatherStateImmediately(state: WeatherState) {
    time.value = state.time
    temperature.value = state.temperature
    temperatureMin.value = state.temperatureMin
    temperatureMax.value = state.temperatureMax
    humidity.value = state.humidity
    windSpeed.value = state.windSpeed
    windDirectionDegrees.value = state.windDirectionDegrees
    aqi.value = state.aqi
    cloudCover.value = state.cloudCover
    precipitation.value = state.precipitation
    visibility.value = state.visibility
  }

  /** 현재 반응형 ref들의 값을 순수 WeatherState 객체로 추출 */
  function getWeatherState(): WeatherState {
    return {
      time: time.value,
      temperature: temperature.value,
      temperatureMin: temperatureMin.value,
      temperatureMax: temperatureMax.value,
      humidity: humidity.value,
      windSpeed: windSpeed.value,
      windDirectionDegrees: windDirectionDegrees.value,
      aqi: aqi.value,
      cloudCover: cloudCover.value,
      precipitation: precipitation.value,
      visibility: visibility.value,
    }
  }

  /** 날씨 패치 객체에서 정의된 필드만 즉시 반영 */
  function applyWeatherPatchImmediately(patch: WeatherStatePatch) {
    if (patch.time !== undefined) time.value = patch.time
    if (patch.temperature !== undefined) temperature.value = patch.temperature
    if (patch.temperatureMin !== undefined) temperatureMin.value = patch.temperatureMin
    if (patch.temperatureMax !== undefined) temperatureMax.value = patch.temperatureMax
    if (patch.humidity !== undefined) humidity.value = patch.humidity
    if (patch.windSpeed !== undefined) windSpeed.value = patch.windSpeed
    if (patch.windDirectionDegrees !== undefined)
      windDirectionDegrees.value = patch.windDirectionDegrees
    if (patch.aqi !== undefined) aqi.value = patch.aqi
    if (patch.cloudCover !== undefined) cloudCover.value = patch.cloudCover
    if (patch.precipitation !== undefined) precipitation.value = patch.precipitation
    if (patch.visibility !== undefined) visibility.value = patch.visibility
  }

  // ----------------------------------------
  // 2-5. GSAP 트랜지션 제어
  // ----------------------------------------

  /** 진행 중인 날씨 수치 보간(GSAP 트윈) 애니메이션을 즉시 중단합니다. */
  function cancelWeatherTransition() {
    weatherTransitionId += 1
    activeWeatherTween?.kill()
    activeWeatherTween = null
  }

  /** 진행 중인 시간대(0~24) 보간 애니메이션을 즉시 중단합니다. */
  function cancelTimeTransition() {
    timeTransitionId += 1
    activeTimeTween?.kill()
    activeTimeTween = null
  }

  /** 진행 중인 모든 날씨 및 시간 보간 애니메이션을 일괄 중단합니다. */
  function cancelTransitions() {
    cancelWeatherTransition()
    cancelTimeTransition()
  }

  /**
   * 날씨 상태의 일부(Patch)를 수치 보간(GSAP 트윈)을 통해 부드럽게 반영합니다.
   * animate 옵션이 비활성화되었거나 OS의 모션 줄이기(prefers-reduced-motion)가 켜진 경우 즉시 대입합니다.
   *
   * @param patch 업데이트할 날씨 속성 부분 집합
   * @param options 애니메이션 적용 여부 옵션
   */
  function applyWeatherPatch(patch: WeatherStatePatch, options: WeatherTransitionOptions = {}) {
    // 1. 애니메이션 비활성화 또는 모션 감소 접근성 설정 시 즉시 반영
    if (!options.animate || prefersReducedMotion()) {
      cancelWeatherTransition()
      applyWeatherPatchImmediately(patch)
      return
    }

    // 2. 새 트랜지션 준비: 이전 트랜지션 중단 및 고유 트랜지션 ID 발급
    cancelWeatherTransition()
    const transitionId = ++weatherTransitionId

    // 3. time 속성은 연속 보간 대상이 아닌 별도 타임라인이므로 즉시 동기화
    if (patch.time !== undefined) {
      cancelTimeTransition()
      time.value = patch.time
    }

    // 4. GSAP 보간에 사용할 시작점(tweenState)과 도달 목표치(targets) 분리 구성
    const current = getWeatherState()
    const tweenState: Record<(typeof weatherTransitionKeys)[number], number> = {} as Record<
      (typeof weatherTransitionKeys)[number],
      number
    >
    const targets: Partial<Record<(typeof weatherTransitionKeys)[number], number>> = {}

    for (const key of weatherTransitionKeys) {
      tweenState[key] = current[key] // 시작값: 현재 스토어에 보관된 수치
      if (patch[key] !== undefined) {
        targets[key] = patch[key] // 목표값: patch에 지정된 새로운 수치
      }
    }

    // 변경할 수치 속성이 없는 경우(예: time만 전달된 경우) 트위닝 종료
    if (Object.keys(targets).length === 0) return

    // 5. GSAP 트윈 애니메이션 실행 (0.9초간 수치 보간)
    let completed = false
    const tween = gsap.to(tweenState, {
      ...targets,
      duration: WEATHER_TRANSITION_DURATION,
      ease: 'power2.out',
      // 매 프레임 계산된 보간 수치를 반응형 ref들에 즉각 동기화
      onUpdate: () => applyWeatherPatchImmediately(tweenState),
      // 보간 완료 시 미세한 오차 예방을 위한 최종 패치 값 강제 확정 및 트윈 정리
      onComplete: () => {
        completed = true
        if (weatherTransitionId === transitionId) {
          activeWeatherTween = null
          applyWeatherPatchImmediately(patch)
        }
      },
    })
    // 동기식 완료(지연시간 0초 등) 예외 방어 후 활성 트윈 등록
    if (!completed && weatherTransitionId === transitionId) {
      activeWeatherTween = tween
    }
  }

  /**
   * 전체 날씨 상태(WeatherState)를 스토어에 반영합니다.
   * animate 옵션에 따라 즉시 덮어쓰거나 수치 보간(applyWeatherPatch)을 거칩니다.
   *
   * @param state 새로운 전체 날씨 데이터 객체
   * @param options 애니메이션 적용 여부 옵션
   */
  function applyWeatherState(state: WeatherState, options: WeatherTransitionOptions = {}) {
    if (!options.animate || prefersReducedMotion()) {
      cancelTransitions()
      applyWeatherStateImmediately(state)
      return
    }

    applyWeatherPatch(state, options)
  }

  /**
   * 씬의 시간대(0~24)를 변경합니다.
   * animate 옵션이 켜져 있으면 GSAP 트윈(0.7초)을 통해 부드럽게 보간하며,
   * 모션 감소 환경이거나 옵션이 꺼져 있으면 즉시 대입합니다.
   *
   * @param nextTime 변경할 목표 시간 (0 ~ 24)
   * @param options 애니메이션 적용 여부 옵션
   */
  function setSceneTime(nextTime: number, options: WeatherTransitionOptions = {}) {
    // 1. 애니메이션 비활성화 또는 모션 감소 접근성 설정 시 즉시 반영
    if (!options.animate || prefersReducedMotion()) {
      cancelTimeTransition()
      time.value = nextTime
      return
    }

    // 2. 새 트랜지션 준비: 이전 시간 트랜지션 중단 및 고유 트랜지션 ID 발급
    cancelTimeTransition()
    const transitionId = ++timeTransitionId

    // 3. GSAP 보간용 상태 객체 생성 (Vue ref 대신 일반 객체 바인딩으로 프록시 오버헤드 방지)
    const tweenState = { value: time.value }
    let completed = false

    // 4. GSAP 보간 실행 (0.7초간 power2.inOut 완급 조절)
    const tween = gsap.to(tweenState, {
      value: nextTime,
      duration: TIME_TRANSITION_DURATION,
      ease: 'power2.inOut',
      // 매 프레임 계산된 보간 수치를 반응형 time ref에 동기화
      onUpdate: () => {
        time.value = tweenState.value
      },
      // 애니메이션 종료 시 미세한 오차 예방을 위한 최종 목표값 보정 및 트윈 정리
      onComplete: () => {
        completed = true
        if (timeTransitionId === transitionId) {
          activeTimeTween = null
          time.value = nextTime
        }
      },
    })
    // 동기식 완료(지연시간 0초 등) 예외 방어 후 활성 트윈 등록
    if (!completed && timeTransitionId === transitionId) {
      activeTimeTween = tween
    }
  }

  // ----------------------------------------
  // 2-6. 비동기 네트워크 요청 관리
  // ----------------------------------------

  /**
   * 브라우저 User Timing API를 통해 성능 측정 타임스탬프 마크(Mark)를 기록합니다.
   */
  function markWeatherPerformance(name: string) {
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
      performance.mark(name)
    }
  }

  /**
   * 기준 시점부터 현재까지의 경과 시간을 계산하여 성능 측정 지표(Measure)를 기록합니다.
   */
  function measureWeatherPerformance(name: string, startedAt: number) {
    if (typeof performance !== 'undefined' && typeof performance.measure === 'function') {
      performance.measure(name, { start: startedAt, end: performance.now() })
    }
  }

  /**
   * 동일한 요청의 중복 호출을 병합(Deduplication)하고, 새로운 위치 요청 시 이전 요청을 중단(Abort)합니다.
   *
   * @param locationQuery 위치 식별 쿼리
   * @param fetcher 네트워크 요청에 사용할 fetch 함수
   * @param force 캐시 무시 여부 (요청 키 구분에 사용)
   * @returns 진행 중인 또는 새로 생성된 요청 객체 (controller, promise)
   */
  function getOrCreateRequest(locationQuery: string, fetcher: typeof fetch, force: boolean) {
    // 쿼리와 강제성 여부를 조합하여 고유 요청 키 생성 (예: 'seoul:cached', 'seoul:fresh')
    const requestKey = `${locationQuery}:${force ? 'fresh' : 'cached'}`
    const existing = pendingRequests.get(requestKey)
    if (existing) return existing

    // 다른 위치에 대한 이전 미완료 요청은 모두 네트워크 수준에서 중단(Abort) 처리
    for (const [pendingKey, pending] of pendingRequests) {
      if (pendingKey !== requestKey) {
        pending.controller.abort()
        pendingRequests.delete(pendingKey)
      }
    }

    // 3. 신규 AbortController 및 API 호출 Promise 래핑 객체 생성
    const controller = new AbortController()
    const request: PendingWeatherRequest = {
      controller,
      promise: fetchCurrentWeather(locationQuery, {
        fetcher,
        signal: controller.signal,
      }),
    }
    pendingRequests.set(requestKey, request)
    networkRequestCount.value += 1

    // 4. 요청 완료(성공/실패 무관) 시 Map에서 안전하게 제거하여 메모리 누수 방지
    const removePendingRequest = () => {
      if (pendingRequests.get(requestKey) === request) {
        pendingRequests.delete(requestKey)
      }
    }
    void request.promise.then(removePendingRequest, removePendingRequest)

    return request
  }

  /**
   * 지정된 위치의 날씨 데이터를 로드하여 스토어 상태를 갱신합니다.
   * 유효한 캐시(TTL 5분 이내)가 존재하면 네트워크 요청을 건너뛰고 즉시 복원합니다.
   * 네트워크 요청 실패 시 로컬 캐시(Stale-Cache)로 폴백하여 사용자 경험을 유지합니다.
   *
   * @param locationQuery 조회할 위치 식별 쿼리 (기본값: DEFAULT_WEATHER_LOCATION_QUERY)
   * @param options 강제 새로고침(force), 커스텀 fetcher, 애니메이션(animate) 설정
   * @returns 데이터 반영 성공 여부 (true: 캐시 또는 네트워크 데이터 반영 성공, false: 요청 무효화 또는 완전 실패)
   */
  async function loadCurrentWeather(
    locationQuery = DEFAULT_WEATHER_LOCATION_QUERY,
    options: LoadCurrentWeatherOptions = {},
  ): Promise<boolean> {
    const cacheLookupStartedAt = typeof performance === 'undefined' ? 0 : performance.now()
    const cached = readWeatherCache(locationQuery)
    activeLocationQuery = locationQuery

    // 1. 캐시 히트 경로 (Cache-First)
    if (!options.force && cached?.isFresh) {
      applyWeatherState(cached.weather)
      dataSource.value = 'cache'
      cacheAgeMs.value = cached.ageMs
      cacheHitCount.value += 1
      lastUpdatedAt.value = cached.fetchedAt
      errorMessage.value = ''
      isLoading.value = false
      markWeatherPerformance('route-of-sky:weather-cache-hit')
      measureWeatherPerformance('route-of-sky:weather-cache-hydration', cacheLookupStartedAt)
      if (import.meta.env.DEV) {
        reportPerformanceInDevelopment(
          'weather-cache-hit',
          performance.now() - cacheLookupStartedAt,
        )
      }
      return true
    }

    // 2. 네트워크 요청 준비 (Cache Miss 또는 Force Refresh)
    if (options.force) {
      forcedRefreshCount.value += 1
    } else {
      cacheMissCount.value += 1
    }
    isLoading.value = true
    errorMessage.value = ''
    const request = getOrCreateRequest(
      locationQuery,
      options.fetcher ?? fetch,
      Boolean(options.force),
    )

    try {
      // 3. 네트워크 응답 대기 및 최신 상태 반영
      const weather = await request.promise

      // 경쟁 상태(Race Condition) 방어: 사용자가 다른 위치로 이미 전환한 경우 폐기
      if (activeLocationQuery !== locationQuery) return false

      const fetchedAt = Date.now()
      applyWeatherState(weather, { animate: options.animate })
      writeWeatherCache(locationQuery, weather, fetchedAt)
      dataSource.value = 'network'
      cacheAgeMs.value = 0
      lastUpdatedAt.value = fetchedAt
      markWeatherPerformance('route-of-sky:weather-network')
      if (import.meta.env.DEV) {
        reportPerformanceInDevelopment('weather-network', performance.now() - cacheLookupStartedAt)
      }

      return true
    } catch (error) {
      // 대기 도중 다른 위치로 전환된 상태라면 에러 핸들링도 무시하고 종료
      if (activeLocationQuery !== locationQuery) return false

      // 4. 에러 폴백 (만료된 캐시라도 남아있다면 화면에 우선 노출하여 UX 저하 방지)
      if (cached) {
        applyWeatherState(cached.weather)
        dataSource.value = 'stale-cache'
        cacheAgeMs.value = cached.ageMs
        lastUpdatedAt.value = cached.fetchedAt
        errorMessage.value = '실시간 날씨를 불러오지 못해 저장된 날씨를 표시합니다.'
        markWeatherPerformance('route-of-sky:weather-stale-cache')
        return true
      }

      // 캐시조차 없는 완전 실패 상황
      errorMessage.value =
        error instanceof Error ? error.message : '실시간 날씨 정보를 불러오지 못했습니다.'

      return false
    } finally {
      // 현재 활성화된 위치의 요청일 때만 로딩 상태 해제
      if (activeLocationQuery === locationQuery) {
        isLoading.value = false
      }
    }
  }

  // ----------------------------------------
  // 2-7. 외부에 노출할 인터페이스 반환
  // ----------------------------------------
  return {
    time,
    temperature,
    temperatureMin,
    temperatureMax,
    humidity,
    windSpeed,
    windDirectionDegrees,
    aqi,
    cloudCover,
    precipitation,
    visibility,
    isLoading,
    errorMessage,
    lastUpdatedAt,
    dataSource,
    cacheAgeMs,
    cacheHitCount,
    cacheMissCount,
    networkRequestCount,
    forcedRefreshCount,
    applyWeatherState,
    applyWeatherPatch,
    setSceneTime,
    cancelTransitions,
    loadCurrentWeather,
  }
})
