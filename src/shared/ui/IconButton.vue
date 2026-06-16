<script setup lang="ts">
defineProps<{
  title: string
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    :title="title"
    :aria-label="title"
    class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl transition-all hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>
