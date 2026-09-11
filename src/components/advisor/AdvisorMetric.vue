<template>
  <!-- Métrica de decisão: UM número, seu significado e o contexto. Nunca um número solto. -->
  <div class="adv-metric" :class="`adv-metric--${variant}`">
    <strong class="adv-metric__value">{{ value }}</strong>
    <span class="adv-metric__label">{{ label }}</span>
    <span v-if="hint" class="adv-metric__hint">{{ hint }}</span>
  </div>
</template>

<script setup>
defineProps({
  value: { type: [String, Number], required: true },
  label: { type: String, required: true },
  hint: { type: String, default: '' },
  variant: { type: String, default: 'neutral' }, // neutral | ok | warn | danger
});
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.adv-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  &__value {
    font-size: 32px;
    line-height: 1;
    font-weight: $font-bold;
    color: $text-primary;
    font-variant-numeric: tabular-nums;
  }

  &__label { font-size: $text-small-size; font-weight: $font-medium; color: $text-body; }
  &__hint { font-size: $text-xs-size; color: $text-muted; }

  &--ok &__value { color: $positive; }
  &--warn &__value { color: $warning; }
  &--danger &__value { color: $negative; }
}
</style>
