<template>
  <section class="fp-strategy" :class="`fp-strategy--${meta.tone}`">
    <div class="fp-strategy__icon"><q-icon :name="meta.icon" /></div>
    <div class="fp-strategy__copy">
      <span class="fp-eyebrow">ESTRATÉGIA DESTA CONTA</span>
      <h2>{{ meta.label }}</h2>
      <p>{{ strategy.rationale }}</p>
      <div class="fp-strategy__evidence">
        <span v-for="row in strategy.evidence || []" :key="row.metric">
          <strong>{{ percent(row.value) }}</strong> {{ row.label }}
        </span>
      </div>
    </div>
    <button type="button" class="fp-explain-link" @click="$emit('explain')">
      Como o SellerBot decidiu <q-icon name="arrow_forward" />
    </button>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { strategyMeta } from 'src/utils/fulfillmentPlan'

const props = defineProps({ strategy: { type: Object, default: () => ({}) } })
defineEmits(['explain'])
const meta = computed(() => strategyMeta(props.strategy?.regime))
function percent(value) { return Number(value || 0).toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 0 }) }
</script>
