<template>
  <SbCard hover :class="['sb-kpi', `sb-kpi--${variant}`]">
    <div class="sb-kpi-label">
      <span>{{ label }}</span>
      <slot name="info" />
    </div>
    <div v-if="prefix || value" class="sb-kpi-value-row">
      <span v-if="prefix" class="sb-kpi-prefix">{{ prefix }}</span>
      <span class="sb-kpi-value">{{ value }}</span>
    </div>
    <div v-if="sub" class="sb-kpi-sub">{{ sub }}</div>
    <div v-if="delta !== null && delta !== undefined" class="sb-kpi-delta" :class="deltaClass">
      <q-icon :name="deltaIcon" size="12px" />
      {{ delta }} vs período anterior
    </div>
    <slot />
  </SbCard>
</template>

<script setup>
import { computed } from 'vue';
import SbCard from './SbCard.vue';

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  prefix: { type: String, default: '' },
  sub: { type: String, default: '' },
  delta: { type: [String, Number], default: null },
  /** teal | green | amber | red | sky | indigo | slate */
  variant: { type: String, default: 'teal' },
  /** quando true, delta positivo é ruim (ex: cancelamentos, ads) */
  invertDelta: { type: Boolean, default: false },
});

const deltaNum = computed(() => {
  if (props.delta === null || props.delta === undefined) return 0;
  if (typeof props.delta === 'number') return props.delta;
  return parseFloat(String(props.delta).replace(/[^\d.-]/g, '')) || 0;
});

const deltaClass = computed(() => {
  if (!deltaNum.value) return 'sb-kpi-delta--neutral';
  const positive = deltaNum.value > 0;
  const isGood = props.invertDelta ? !positive : positive;
  return isGood ? 'sb-kpi-delta--good' : 'sb-kpi-delta--bad';
});

const deltaIcon = computed(() => {
  if (!deltaNum.value) return 'remove';
  return deltaNum.value > 0 ? 'arrow_upward' : 'arrow_downward';
});
</script>

<style lang="scss" scoped>
.sb-kpi {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 12px;
    bottom: 12px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: #e2e8f0;
  }
  &--teal::before   { background: #0d9488; }
  &--green::before  { background: #16a34a; }
  &--amber::before  { background: #d97706; }
  &--red::before    { background: #dc2626; }
  &--sky::before    { background: #0284c7; }
  &--indigo::before { background: #4f46e5; }
  &--slate::before  { background: #94a3b8; }
}

.sb-kpi-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sb-kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 2px;
}

.sb-kpi-prefix {
  font-size: 16px;
  font-weight: 600;
  color: #64748b;
}

.sb-kpi-value {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.5px;
  line-height: 1.1;
}

.sb-kpi-sub {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.sb-kpi-delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  font-weight: 600;
  margin-top: 6px;
  width: fit-content;
  padding: 2px 6px;
  border-radius: 6px;

  &--good { background: #dcfce7; color: #166534; }
  &--bad  { background: #fee2e2; color: #991b1b; }
  &--neutral { background: #f1f5f9; color: #475569; }
}
</style>
