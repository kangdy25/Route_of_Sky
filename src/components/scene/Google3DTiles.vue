<script setup lang="ts">
import { useGoogleTilesRenderer } from '@/features/scene/composables/useGoogleTilesRenderer'

// 월드 원점(0, 0, 0)에 맞출 실제 지리 좌표입니다.
const props = withDefaults(
  defineProps<{
    lat?: number // 로컬 원점의 위도입니다.
    lon?: number // 로컬 원점의 경도입니다.
    alt?: number // 로컬 원점의 고도입니다. 단위는 meter입니다.
  }>(),
  {
    lat: 37.512218, // 기본값: 서울 잠실 롯데월드타워
    lon: 127.102707,
    alt: 25,
  },
)

useGoogleTilesRenderer(props)
</script>

<script lang="ts">
export default {
  render() {
    return null
  },
}
</script>
