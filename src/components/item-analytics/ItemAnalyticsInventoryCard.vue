<template>
  <SbCard class="inventory-card" :class="`inventory-card--${overview?.is_full ? 'full' : 'listing'}`">
    <template #header>
      <div class="inventory-heading">
        <div>
          <div class="card-eyebrow">{{ overview?.is_full ? 'Mercado Livre Full' : 'Estoque do anúncio' }}</div>
          <div class="card-title">{{ overview?.is_full ? 'Inventário físico' : 'Estoque informado' }}</div>
        </div>
        <SbBadge :variant="overview?.is_full ? inventoryVariant : 'slate'">{{ overview?.is_full ? inventoryStatusLabel : 'Fonte do anúncio' }}</SbBadge>
      </div>
    </template>
    <div class="inventory-values">
      <div class="inventory-main">
        <span class="inventory-value">{{ mainValue }}</span>
        <span class="inventory-unit">disponível</span>
      </div>
      <div v-if="overview?.is_full" class="inventory-breakdown">
        <div><span>Total armazenado</span><strong>{{ formatNumber(inventory.total_quantity) }}</strong></div>
        <div><span>Indisponível</span><strong>{{ formatNumber(inventory.not_available_quantity) }}</strong></div>
      </div>
    </div>
    <div class="inventory-footnote">
      <q-icon name="schedule" size="14px" />
      <span v-if="observedAt">Observado {{ observedAt }}</span>
      <span v-else>{{ overview?.is_full ? 'Ainda não consultado' : 'Data de sincronização indisponível' }}</span>
    </div>
    <div v-if="inventory.error_message" class="inventory-error">
      <q-icon name="warning_amber" size="15px" /> {{ inventory.error_message }}
    </div>
  </SbCard>
</template>

<script setup>
import { computed } from 'vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import { formatNumber } from 'src/utils/itemAnalytics'

const props = defineProps({ overview: { type: Object, default: null } })
const inventory = computed(() => props.overview?.fulfillment_inventory || {})
const listing = computed(() => props.overview?.listing_stock || {})
const mainValue = computed(() => formatNumber(props.overview?.is_full ? inventory.value.available_quantity : listing.value.available_quantity))
const observedAt = computed(() => {
  const value = props.overview?.is_full ? inventory.value.observed_at : listing.value.observed_at
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
})
const inventoryStatusLabel = computed(() => ({
  fresh: 'Atualizado', stale: 'Desatualizado', error: 'Com erro', unavailable: 'Indisponível', unknown: 'Não consultado',
}[inventory.value.status] || 'Sem informação'))
const inventoryVariant = computed(() => ({ fresh: 'green', stale: 'amber', error: 'red', unavailable: 'red' }[inventory.value.status] || 'slate'))
</script>

<style lang="scss" scoped>
.inventory-card { min-height: 150px; }
.inventory-card--full { border-color: #99f6e4; background: linear-gradient(135deg, #fff 0%, #f0fdfa 100%); }
.inventory-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.card-eyebrow { color: #0f766e; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.card-title { color: #0f172a; font-size: 15px; font-weight: 700; margin-top: 3px; }
.inventory-values { display: flex; align-items: end; justify-content: space-between; gap: 20px; }
.inventory-main { display: flex; align-items: baseline; gap: 7px; }
.inventory-value { color: #0f172a; font-size: 30px; font-weight: 700; letter-spacing: -.04em; }
.inventory-unit { color: #64748b; font-size: 12px; }
.inventory-breakdown { display: flex; gap: 16px; }
.inventory-breakdown div { display: flex; flex-direction: column; gap: 3px; color: #64748b; font-size: 11px; }
.inventory-breakdown strong { color: #334155; font-size: 15px; }
.inventory-footnote { display: flex; align-items: center; gap: 5px; color: #64748b; font-size: 11px; margin-top: 16px; }
.inventory-error { display: flex; gap: 5px; color: #991b1b; font-size: 11px; line-height: 1.35; margin-top: 8px; }
@media (max-width: 600px) { .inventory-values { align-items: flex-start; flex-direction: column; gap: 10px; } }
</style>
