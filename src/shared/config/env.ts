/** Google Photorealistic 3D Tiles를 활성화할 때 사용하는 Maps API 키입니다. */
export const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

/** 앱 전역에서 Google 3D Tiles 모드를 사용할 수 있는지 판단하는 플래그입니다. */
export const hasGoogleMapsApiKey = Boolean(googleMapsApiKey)
