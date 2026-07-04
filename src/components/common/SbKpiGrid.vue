<template>
  <div class="kpi-grid" :class="gridClass">
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  /** Número de colunas no desktop (2, 3, 4, 5) */
  columns: { type: Number, default: 4 },
  /** Espaçamento entre cards (em pixels) */
  gap: { type: Number, default: 16 },
});

const gridClass = computed(() => `kpi-grid--cols-${props.columns}`);
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.kpi-grid {
  display: grid;
  gap: v-bind('`${props.gap}px`');
  grid-template-columns: repeat(1, 1fr);

  // Mobile: 2 colunas
  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }

  // Tablet: 3 colunas
  @media (min-width: 900px) {
    &--cols-3 { grid-template-columns: repeat(3, 1fr); }
    &--cols-4 { grid-template-columns: repeat(3, 1fr); }
    &--cols-5 { grid-template-columns: repeat(3, 1fr); }
  }

  // Desktop: colunas definidas
  @media (min-width: 1200px) {
    &--cols-2 { grid-template-columns: repeat(2, 1fr); }
    &--cols-3 { grid-template-columns: repeat(3, 1fr); }
    &--cols-4 { grid-template-columns: repeat(4, 1fr); }
    &--cols-5 { grid-template-columns: repeat(5, 1fr); }
  }
}
</style>
