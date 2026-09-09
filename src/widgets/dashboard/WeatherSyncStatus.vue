<script setup lang="ts">
import { computed } from 'vue'
import type { WeatherDataSource } from '@/features/weather/model/weather.store'

const props = withDefaults(
  defineProps<{
    dataSource?: WeatherDataSource
    isLoading?: boolean
    errorMessage?: string
    lastUpdatedAt?: number | null
  }>(),
  {
    dataSource: 'default',
    isLoading: false,
    errorMessage: '',
    lastUpdatedAt: null,
  },
)

// Intl 인스턴스 단일 생성 및 재사용 (불필요한 인스턴스화 방지)
const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const formatUpdatedTime = (timestamp: number) => timeFormatter.format(timestamp)

// 상태 텍스트 연산
const statusText = computed(() => {
  if (props.isLoading) return '날씨 업데이트 중...'
  if (props.errorMessage) return '날씨 업데이트 실패'

  if (props.lastUpdatedAt) {
    const formatted = formatUpdatedTime(props.lastUpdatedAt)
    if (props.dataSource === 'network') return `실시간 데이터 · ${formatted} 갱신`
    if (props.dataSource === 'cache') return `저장된 데이터 · ${formatted} 갱신`
    if (props.dataSource === 'stale-cache') return `이전 날씨 표시 중 · ${formatted} 갱신`
  }

  return ''
})

// 상태별 텍스트 강조 색상 (에러 발생 시 시각적 경고 부여)
const statusColorClass = computed(() => {
  if (props.errorMessage) return 'text-rose-400'
  if (props.isLoading) return 'text-cyan-300'
  return 'text-cyan-100/80'
})
</script>

<template>
  <!-- 날씨 데이터 동기화/갱신 상태 알림 텍스트 -->
  <p
    v-if="statusText"
    data-testid="weather-sync-status"
    role="status"
    aria-live="polite"
    class="mt-1.5 truncate text-xs font-medium transition-colors sm:text-sm"
    :class="statusColorClass"
  >
    {{ statusText }}
  </p>
</template>
