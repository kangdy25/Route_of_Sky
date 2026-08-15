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

function formatUpdatedTime(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(timestamp)
}

const statusText = computed(() => {
  if (props.isLoading) return '날씨 업데이트 중'
  if (props.dataSource === 'network' && props.lastUpdatedAt) {
    return `실시간 데이터 · ${formatUpdatedTime(props.lastUpdatedAt)} 갱신`
  }
  if (props.dataSource === 'cache' && props.lastUpdatedAt) {
    return `저장된 데이터 · ${formatUpdatedTime(props.lastUpdatedAt)} 갱신`
  }
  if (props.dataSource === 'stale-cache' && props.lastUpdatedAt) {
    return `저장된 날씨 표시 중 · ${formatUpdatedTime(props.lastUpdatedAt)} 갱신`
  }
  if (props.errorMessage) return '날씨 업데이트 실패'

  return ''
})
</script>

<template>
  <p
    v-if="statusText"
    data-testid="weather-sync-status"
    role="status"
    aria-live="polite"
    class="mt-1.5 truncate text-xs font-medium text-cyan-100/80 sm:text-sm"
  >
    {{ statusText }}
  </p>
</template>
