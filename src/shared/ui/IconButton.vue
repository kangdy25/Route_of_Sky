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
    class="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/25 bg-slate-950/65 text-2xl text-cyan-100 shadow-[inset_0_0_18px_rgba(34,211,238,0.12),0_0_16px_rgba(34,211,238,0.12)] backdrop-blur-xl transition-all hover:border-cyan-200/70 hover:bg-cyan-400/20 hover:shadow-[0_0_22px_rgba(34,211,238,0.45)]"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>
