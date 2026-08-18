<template>
  <section class="fp-summary" aria-label="Resumo do plano">
    <button
      v-for="card in cards"
      :key="card.action"
      type="button"
      class="fp-summary-card"
      :class="[`fp-summary-card--${card.tone}`, { 'fp-summary-card--active': activeActions.includes(card.action) }]"
      @click="$emit('filter', card.action)"
    >
      <span class="fp-summary-card__icon"><q-icon :name="card.icon" /></span>
      <span><strong>{{ card.value }}</strong><small>{{ card.label }}</small></span>
      <q-icon name="chevron_right" class="fp-summary-card__arrow" />
    </button>
    <article class="fp-summary-card fp-summary-card--capital">
      <span class="fp-summary-card__icon"><q-icon name="payments" /></span>
      <span>
        <strong>{{ capitalLabel }}</strong>
        <small>{{ capitalCaption }}</small>
      </span>
    </article>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { ACTIONS, formatMoney } from 'src/utils/fulfillmentPlan'

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  activeActions: { type: Array, default: () => [] },
})
defineEmits(['filter'])

const cards = computed(() => [
  { action: 'replenish_full', value: actionableCount('replenish_full'), label: 'repor neste ciclo', ...ACTIONS.replenish_full },
  { action: 'start_full', value: actionableCount('start_full'), label: 'começar no Full', ...ACTIONS.start_full },
  { action: 'next_cycle', value: actionableCount('next_cycle'), label: 'próximo ciclo', ...ACTIONS.next_cycle },
  { action: 'data_review', value: props.summary.data_review || 0, label: 'revisar dados', ...ACTIONS.data_review },
])
const capitalLabel = computed(() => props.summary.estimated_capital == null
  ? `${formatMoney(props.summary.known_estimated_capital || 0)}+`
  : formatMoney(props.summary.estimated_capital))
const capitalCaption = computed(() => props.summary.estimated_capital == null
  ? 'capital conhecido · total incompleto'
  : 'capital estimado')

function actionableCount(action) {
  return props.summary.actionable_by_action?.[action] ?? props.summary[action] ?? 0
}
</script>
