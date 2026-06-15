<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'

const time = defineModel<number>({ default: 16.5 })

const formattedTime = computed(() => {
  const totalMinutes = Math.round(time.value * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  return `${hh}:${mm}`
})

const timeStatus = computed(() => {
  const t = time.value
  if (t >= 0 && t < 5) {
    return { title: '깊은 밤', subtitle: '별빛이 빛나는 하늘' }
  } else if (t >= 5 && t < 7) {
    return { title: '일출 새벽', subtitle: '붉게 물드는 하늘' }
  } else if (t >= 7 && t < 11) {
    return { title: '아침 태양', subtitle: '맑고 상쾌한 하늘' }
  } else if (t >= 11 && t < 15) {
    return { title: '낮 태양', subtitle: '푸르고 선명한 하늘' }
  } else if (t >= 15 && t < 17.5) {
    return { title: '오후 태양', subtitle: '맑고 밝은 하늘' }
  } else if (t >= 17.5 && t < 19.5) {
    return { title: '일몰 노을', subtitle: '붉고 노란 하늘' }
  } else {
    return { title: '늦은 밤', subtitle: '어스름한 밤하늘' }
  }
})

const isPlaying = ref(false)
let playInterval: ReturnType<typeof setInterval> | null = null

const togglePlay = () => {
  if (isPlaying.value) {
    stopPlay()
  } else {
    startPlay()
  }
}

const startPlay = () => {
  isPlaying.value = true
  playInterval = setInterval(() => {
    time.value = Math.round(((time.value + 0.1) % 24) * 10) / 10
  }, 50)
}

const stopPlay = () => {
  isPlaying.value = false
  if (playInterval) {
    clearInterval(playInterval)
    playInterval = null
  }
}

const skipForward = () => {
  time.value = Math.round(((time.value + 2) % 24) * 10) / 10
}

const skipBackward = () => {
  time.value = Math.round(((time.value - 2 + 24) % 24) * 10) / 10
}

const resetTime = () => {
  time.value = 0
}

const leftOpacity = computed(() => {
  // 00:00 to 08:00: opacity scales from 0 to 1
  return Math.min(1, Math.max(0, time.value / 8))
})

const rightOpacity = computed(() => {
  // 16:00 to 24:00: opacity scales from 1 to 0
  return Math.min(1, Math.max(0, (24 - time.value) / 8))
})

onUnmounted(() => {
  stopPlay()
})
</script>

<template>
  <div
    class="relative flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl"
  >
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-xl font-black text-slate-200 uppercase">시간대 탐색</h2>
        <p class="mt-2 text-base font-medium text-slate-300">
          재생 헤드를 드래그하여 시간대별<br />
          하늘 상태를 미리 확인하세요.
        </p>
      </div>
      <div class="text-right">
        <span class="block text-2xl font-black tracking-tight text-white">{{
          timeStatus.title
        }}</span>
        <span class="block text-sm font-bold tracking-widest text-cyan-400 uppercase">{{
          timeStatus.subtitle
        }}</span>
      </div>
    </div>

    <div class="mt-10 flex flex-col gap-8">
      <div class="relative w-full px-2">
        <input
          v-model.number="time"
          type="range"
          min="0"
          max="24"
          step="0.1"
          class="absolute z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div class="relative h-2 w-full rounded-full bg-slate-800">
          <div
            class="absolute top-0 left-0 h-full rounded-full bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
            :style="{ width: `${(time / 24) * 100}%` }"
          ></div>
          <div
            class="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-400 shadow-xl"
            :style="{ left: `${(time / 24) * 100}%` }"
          ></div>
        </div>
        <div class="relative mt-5 h-12 font-mono text-sm font-bold tracking-tighter text-slate-300">
          <span
            class="absolute top-0 left-1 transition-opacity duration-200"
            :style="{ opacity: leftOpacity }"
          >
            00:00
          </span>
          <span
            class="absolute top-0 -translate-x-1/2 scale-110 text-center text-base font-black text-cyan-400"
            :style="{ left: `${(time / 24) * 100}%` }"
          >
            {{ formattedTime }}
            <span class="block text-xs font-normal text-slate-400">현재</span>
          </span>
          <span
            class="absolute top-0 right-1 transition-opacity duration-200"
            :style="{ opacity: rightOpacity }"
          >
            24:00
          </span>
        </div>
      </div>

      <div class="flex items-center justify-center gap-4 sm:gap-6">
        <button
          @click="resetTime"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xl transition-all hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          title="00:00으로 리셋"
        >
          ↺
        </button>
        <button
          @click="skipBackward"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl transition-all hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          title="2시간 뒤로 감기"
        >
          ⏮
        </button>
        <button
          @click="togglePlay"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl transition-all hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          title="재생/일시정지"
        >
          {{ isPlaying ? '❚❚' : '▶' }}
        </button>
        <button
          @click="skipForward"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl transition-all hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]"
          title="2시간 빨리 감기"
        >
          ⏭
        </button>
      </div>
    </div>
  </div>
</template>
