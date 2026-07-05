<template>
  <SbCard hover :padded="false" :class="['sb-kpi', `sb-kpi--${variant}`]">
    <div class="sb-kpi-label">
      <span>{{ label }}</span>
      <slot name="info" />
    </div>

    <div class="sb-kpi-value-row">
      <span v-if="prefix" class="sb-kpi-prefix">{{ prefix }}</span>
      <span class="sb-kpi-value">{{ value }}</span>
      <span
        v-if="hasDelta"
        class="sb-kpi-delta"
        :class="deltaClass"
        :title="`${deltaPrefix ? deltaPrefix + ' ' : ''}${delta} vs período anterior`"
      >
        <q-icon :name="deltaIcon" size="11px" />
        <template v-if="deltaPrefix">{{ deltaPrefix }} </template>{{ delta }}
      </span>
    </div>

    <div v-if="sub" class="sb-kpi-sub">{{ sub }}</div>

    <svg
      v-if="sparklineData && sparklineData.length > 1"
      class="sb-kpi-sparkline"
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
    >
      <path :d="sparklinePath" fill="none" :stroke="sparklineColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
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
  /** rótulo antes do delta quando ele mede outra métrica (ex: "TACoS" no card ROAS) */
  deltaPrefix: { type: String, default: '' },
  /** teal | green | amber | red | sky | indigo | slate */
  variant: { type: String, default: 'teal' },
  /** quando true, delta positivo é ruim (ex: cancelamentos, ads) */
  invertDelta: { type: Boolean, default: false },
  /** dados para sparkline (array de números) */
  sparklineData: { type: Array, default: null },
  /** cor do sparkline (hex) */
  sparklineColor: { type: String, default: '#0f766e' },
});

// Sem dado de comparação (null/undefined/'—'), o pill não renderiza —
// um "—" inline ao lado do valor é só ruído visual.
const hasDelta = computed(() =>
  props.delta !== null && props.delta !== undefined && props.delta !== '—'
);

const deltaNum = computed(() => {
  if (!hasDelta.value) return 0;
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

// Sparkline path (spline Catmull-Rom)
const sparklinePath = computed(() => {
  if (!props.sparklineData || props.sparklineData.length < 2) return '';
  const data = props.sparklineData;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (w - 2 * padding);
    const y = h - padding - ((v - min) / range) * (h - 2 * padding);
    return `${x},${y}`;
  });

  let path = `M ${points[0]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[Math.max(0, i - 1)].split(',').map(Number);
    const [x1, y1] = points[i].split(',').map(Number);
    const [x2, y2] = points[i + 1].split(',').map(Number);
    const [x3, y3] = points[Math.min(points.length - 1, i + 2)].split(',').map(Number);

    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
  }

  return path;
});
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

// Stat tile compacto: label / valor+delta / sub em ~90px de altura.
// A sparkline é overlay absoluto no rodapé — não adiciona altura.
.sb-kpi {
  position: relative;
  overflow: hidden;
  padding: $space-3 $space-4;
  min-height: 88px;
  display: flex;
  flex-direction: column;
  justify-content: center;

  // o conteúdo do slot vive dentro de .sb-card-body — o empilhamento é dele
  :deep(.sb-card-body) {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2.5px;
    background: $border;
  }
  &--teal::before   { background: #0f766e; }
  &--green::before  { background: #16a34a; }
  &--amber::before  { background: #d97706; }
  &--red::before    { background: #dc2626; }
  &--sky::before    { background: #0284c7; }
  &--indigo::before { background: #6366f1; }
  &--slate::before  { background: #94a3b8; }
}

.sb-kpi-label {
  display: flex;
  align-items: center;
  gap: $space-1;
  font-size: $text-xs-size;
  font-weight: $font-medium;
  color: $text-muted;
  line-height: 1.3;
  position: relative;
  z-index: 1;
}

.sb-kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: $space-2;
  flex-wrap: wrap; // em cards estreitos (mobile 2 col) o pill quebra p/ baixo sem estourar
  position: relative;
  z-index: 1;
}

.sb-kpi-prefix {
  font-size: 14px;
  font-weight: $font-semibold;
  color: $text-muted;
}

.sb-kpi-value {
  font-size: 21px;
  font-weight: $font-semibold;
  color: $text-primary;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.sb-kpi-delta {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  font-size: 11px;
  font-weight: $font-semibold;
  padding: 1px 6px;
  border-radius: 999px;
  white-space: nowrap;
  cursor: default;

  &--good { background: $tint-green-bg; color: $tint-green-text; }
  &--bad  { background: $tint-red-bg; color: $tint-red-text; }
  &--neutral { background: $tint-slate-bg; color: $tint-slate-text; }
}

.sb-kpi-sub {
  font-size: 11px;
  color: $text-disabled;
  line-height: 1.3;
  position: relative;
  z-index: 1;
}

.sb-kpi-sparkline {
  position: absolute;
  right: $space-3;
  bottom: $space-2;
  width: 72px;
  height: 22px;
  opacity: 0.3;
  pointer-events: none;
}
</style>
