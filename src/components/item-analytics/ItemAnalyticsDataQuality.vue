<template>
  <div :class="['quality-banner', `quality-banner--${variant}`]" role="status">
    <q-icon :name="icon" size="16px" />
    <div>
      <strong>{{ title }}</strong>
      <span>{{ message }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  quality: { type: Object, default: () => ({}) },
  periodDays: { type: Number, default: 30 },
})
const missing = computed(() => props.quality.missing_days?.length || 0)
const variant = computed(() => {
  if (props.quality.inventory_status === 'error' || props.quality.inventory_status === 'unavailable') return 'error'
  if (props.quality.partial || missing.value) return 'warning'
  if (props.quality.legacy) return 'neutral'
  return 'fresh'
})
const title = computed(() => ({ fresh: 'Dados completos', warning: 'Cobertura parcial', error: 'Dados com restrição', neutral: 'Dados legados' }[variant.value]))
const icon = computed(() => ({ fresh: 'verified', warning: 'schedule', error: 'warning_amber', neutral: 'history' }[variant.value]))
const message = computed(() => {
  if (variant.value === 'error') return 'O inventário ou uma fonte de dados não pôde ser consultada.'
  if (missing.value) return `${missing.value} de ${props.periodDays} dias sem observação no histórico.`
  if (variant.value === 'neutral') return 'Parte das métricas ainda não possui observação no contrato novo.'
  return `${props.quality.observed_days || props.periodDays} dias observados no período.`
})
</script>

<style lang="scss" scoped>
.quality-banner { display: flex; align-items: flex-start; gap: 8px; border-radius: 10px; padding: 10px 12px; font-size: 12px; }
.quality-banner strong, .quality-banner span { display: block; }
.quality-banner span { margin-top: 2px; opacity: .85; }
.quality-banner--fresh { background: #ecfdf5; color: #166534; }
.quality-banner--warning { background: #fffbeb; color: #92400e; }
.quality-banner--error { background: #fef2f2; color: #991b1b; }
.quality-banner--neutral { background: #f1f5f9; color: #475569; }
</style>
