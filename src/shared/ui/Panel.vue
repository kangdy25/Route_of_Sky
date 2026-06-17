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
  return props.surface === 'soft' ? 'panel-shell--soft' : 'panel-shell--default'
})
</script>

<template>
  <section
    :class="[
      'panel-shell flex flex-col overflow-hidden rounded-lg backdrop-blur-2xl',
      surfaceClass,
      paddingClass,
      fullHeight ? 'h-full' : '',
      justify ? 'justify-between' : '',
    ]"
  >
    <div class="relative z-10 flex min-h-0 flex-1 flex-col">
      <slot name="header">
        <div v-if="title" :class="['flex items-center justify-between', headerClass]">
          <h2
            class="text-xl font-black text-cyan-50 uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]"
          >
            {{ title }}
          </h2>
          <div
            :class="[
              'h-px bg-gradient-to-r from-cyan-300/80 via-cyan-300/35 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.65)]',
              accentClass,
            ]"
          ></div>
        </div>
      </slot>

      <slot />
    </div>
  </section>
</template>

<style scoped>
.panel-shell {
  position: relative;
  border: 1px solid rgba(34, 211, 238, 0.24);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 0 28px rgba(8, 145, 178, 0.12),
    0 18px 40px rgba(0, 0, 0, 0.32),
    0 0 22px rgba(34, 211, 238, 0.08);
}

.panel-shell--default {
  background:
    linear-gradient(135deg, rgba(3, 13, 28, 0.82), rgba(5, 35, 46, 0.58)),
    radial-gradient(circle at 100% 0%, rgba(34, 211, 238, 0.14), transparent 34%);
}

.panel-shell--soft {
  background:
    linear-gradient(135deg, rgba(2, 8, 23, 0.76), rgba(6, 30, 42, 0.54)),
    radial-gradient(circle at 0% 100%, rgba(45, 212, 191, 0.1), transparent 38%);
}

.panel-shell::before,
.panel-shell::after {
  position: absolute;
  z-index: 0;
  content: '';
  pointer-events: none;
}

.panel-shell::before {
  inset: 0;
  background:
    linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.55), transparent) top / 100% 1px
      no-repeat,
    linear-gradient(180deg, rgba(34, 211, 238, 0.16), transparent 44%);
}

.panel-shell::after {
  top: 0;
  right: 0;
  width: 58px;
  height: 58px;
  border-top: 2px solid rgba(34, 211, 238, 0.68);
  border-right: 2px solid rgba(34, 211, 238, 0.68);
  filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.55));
}
</style>
