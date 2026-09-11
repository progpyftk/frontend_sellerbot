<template>
  <!-- Estado semântico do robô/anúncio. Cor nunca é a única informação (ícone + texto sempre). -->
  <span class="adv-pill" :class="`adv-pill--${tone}`">
    <q-icon :name="icon" size="14px" aria-hidden="true" />
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: { type: String, default: 'neutral' },
  label: { type: String, default: '' },
});

const MAPA = {
  verificado: { tone: 'ok', icon: 'check_circle' },
  aplicado: { tone: 'ok', icon: 'check_circle' },
  aguardando: { tone: 'neutral', icon: 'schedule' },
  divergente: { tone: 'danger', icon: 'error' },
  recusado: { tone: 'warn', icon: 'block' },
  bloqueado: { tone: 'muted', icon: 'shield' },
  pausado: { tone: 'warn', icon: 'pause_circle' },
  ligado: { tone: 'ok', icon: 'smart_toy' },
  desligado: { tone: 'muted', icon: 'power_settings_new' },
  neutral: { tone: 'muted', icon: 'circle' },
};

const meta = computed(() => MAPA[props.status] || MAPA.neutral);
const tone = computed(() => meta.value.tone);
const icon = computed(() => meta.value.icon);
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.adv-pill {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  padding: 3px $space-3;
  border-radius: 999px;
  font-size: $text-xs-size;
  font-weight: $font-medium;
  white-space: nowrap;

  &--ok { background: $tint-green-bg; color: $tint-green-text; }
  &--warn { background: $tint-amber-bg; color: $tint-amber-text; }
  &--danger { background: $tint-red-bg; color: $tint-red-text; }
  &--muted { background: $tint-slate-bg; color: $tint-slate-text; }
  &--info { background: $tint-sky-bg; color: $tint-sky-text; }
}
</style>
