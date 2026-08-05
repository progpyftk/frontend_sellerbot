<template>
  <div class="kpi-strip">
    <SbKpiCard label="Visitas" :value="formatNumber(metrics.total_visits)" variant="sky" sub="No período" />
    <SbKpiCard label="Pedidos" :value="formatNumber(metrics.total_orders)" variant="green" sub="Pedidos confirmados" />
    <SbKpiCard label="Conversão" :value="formatPercent(metrics.avg_conversion)" variant="indigo" sub="Média diária" />
    <SbKpiCard label="GMV" :value="formatCurrency(metrics.total_gmv)" variant="teal" sub="Valor bruto vendido" />
    <SbKpiCard label="Ticket médio" :value="ticket" variant="slate" sub="GMV por pedido" />
  </div>
</template>

<script setup>
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import { formatCurrency, formatNumber, formatPercent } from 'src/utils/itemAnalytics'
import { computed } from 'vue'

const props = defineProps({ metrics: { type: Object, default: () => ({}) } })
const ticket = computed(() => props.metrics.total_orders ? formatCurrency(props.metrics.total_gmv / props.metrics.total_orders) : '—')
</script>

<style lang="scss" scoped>
.kpi-strip { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
@media (max-width: 1100px) { .kpi-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 600px) { .kpi-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
