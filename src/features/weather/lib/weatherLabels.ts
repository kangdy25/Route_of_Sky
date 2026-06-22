export function getCloudCoverLabel(cloudCover: number) {
  if (cloudCover < 10) return '맑음'
  if (cloudCover < 50) return '구름 조금'
  if (cloudCover < 80) return '구름 많음'
  return '흐림'
}

export function getPrecipitationLabel(precipitation: number, isSnow = false) {
  if (precipitation === 0) return '없음'
  if (precipitation < 2.5) return isSnow ? '약한 눈' : '약한 비'
  if (precipitation < 7.6) return isSnow ? '보통 눈' : '보통 비'
  return isSnow ? '강한 눈' : '강한 비'
}

export function getVisibilityLabel(visibility: number) {
  if (visibility >= 10) return '선명함'
  if (visibility >= 5) return '연무'
  if (visibility >= 2) return '박무'
  return '안개'
}

export function getTimeStatus(time: number) {
  if (time >= 0 && time < 5) {
    return { title: '깊은 밤', subtitle: '별빛이 빛나는 하늘' }
  }
  if (time >= 5 && time < 7) {
    return { title: '일출 새벽', subtitle: '붉게 물드는 하늘' }
  }
  if (time >= 7 && time < 11) {
    return { title: '아침 태양', subtitle: '맑고 상쾌한 하늘' }
  }
  if (time >= 11 && time < 15) {
    return { title: '낮 태양', subtitle: '푸르고 선명한 하늘' }
  }
  if (time >= 15 && time < 17.5) {
    return { title: '오후 태양', subtitle: '맑고 밝은 하늘' }
  }
  if (time >= 17.5 && time < 19.5) {
    return { title: '일몰 노을', subtitle: '붉고 노란 하늘' }
  }
  return { title: '늦은 밤', subtitle: '어스름한 밤하늘' }
}
