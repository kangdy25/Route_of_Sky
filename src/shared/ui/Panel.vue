<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    accentClass?: string
    headerClass?: string
    paddingClass?: string
    surface?: 'default' | 'soft'
    fullHeight?: boolean
    justify?: boolean
  }>(),
  {
    title: '',
    accentClass: 'w-12',
    headerClass: 'mb-6',
    paddingClass: 'p-6',
    surface: 'default',
    fullHeight: false,
    justify: false,
  },
)

const surfaceClass = computed(() => {
  return props.surface === 'soft' ? 'bg-slate-900/40' : 'bg-slate-900/50'
})
</script>

<template>
  <section
    :class="[
      'flex flex-col rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl',
      'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
      surfaceClass,
      paddingClass,
      fullHeight ? 'h-full' : '',
      justify ? 'justify-between' : '',
    ]"
  >
    <slot name="header">
      <div v-if="title" :class="['flex items-center justify-between', headerClass]">
        <h2 class="text-xl font-black text-slate-200 uppercase">{{ title }}</h2>
        <div :class="['h-2 rounded-full bg-cyan-500/30', accentClass]"></div>
      </div>
    </slot>

    <slot />
  </section>
</template>
