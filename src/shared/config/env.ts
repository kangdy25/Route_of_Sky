/** Cesium ion에서 Google Photorealistic 3D Tiles asset을 불러올 때 사용하는 토큰입니다. */
export const cesiumIonAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || ''

/** 앱 전역에서 Cesium ion 기반 3D Tiles 모드를 사용할 수 있는지 판단하는 플래그입니다. */
export const hasCesiumIonAccessToken = Boolean(cesiumIonAccessToken)

/** WeatherAPI.com에서 현재 날씨를 조회할 때 사용하는 API 키입니다. */
export const weatherApiKey = import.meta.env.VITE_WEATHER_API_KEY || ''

/** 앱 전역에서 실시간 날씨 API 연동을 사용할 수 있는지 판단하는 플래그입니다. */
export const hasWeatherApiKey = Boolean(weatherApiKey)
