<template>
  <div v-if="loading" class="overview-loading"><SbEmptyState variant="loading" title="Carregando resumo" message="Reunindo métricas e qualidade dos dados." /></div>
  <SbEmptyState v-else-if="error" variant="error" title="Resumo indisponível" :message="error" />
  <div v-else-if="overview" class="overview-stack">
    <SbCard class="item-context">
      <div class="context-main">
        <div class="context-icon"><q-icon name="inventory_2" size="22px" /></div>
        <div class="context-copy">
          <div class="context-title">{{ overview.title }}</div>
          <div class="context-meta">
            <SbBadge variant="ml">Mercado Livre</SbBadge>
            <SbBadge :variant="overview.is_full ? 'teal' : 'slate'">{{ overview.is_full ? 'Full' : overview.logistic_type }}</SbBadge>
            <span>{{ overview.account?.nickname || overview.account?.account_id || 'Conta não informada' }}</span>
          </div>
        </div>
      </div>
      <div class="context-actions">
        <div class="context-id">{{ overview.item_id }} <q-btn flat round dense icon="content_copy" size="sm" aria-label="Copiar item ID" @click="copyId" /></div>
        <q-btn v-if="overview.permalink" flat dense color="teal-8" icon="open_in_new" label="Abrir anúncio" :href="overview.permalink" target="_blank" />
      </div>
    </SbCard>
    <ItemAnalyticsKpiStrip :metrics="overview.metrics" />
    <div class="inventory-grid">
      <ItemAnalyticsInventoryCard :overview="listingOverview" />
      <ItemAnalyticsInventoryCard v-if="overview.is_full" :overview="overview" />
    </div>
    <ItemAnalyticsDataQuality :quality="overview.data_quality" :period-days="overview.data_quality?.days || 30" />
  </div>
</template>

<script setup>
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import ItemAnalyticsDataQuality from './ItemAnalyticsDataQuality.vue'
import ItemAnalyticsInventoryCard from './ItemAnalyticsInventoryCard.vue'
import ItemAnalyticsKpiStrip from './ItemAnalyticsKpiStrip.vue'
import { computed } from 'vue'

const props = defineProps({ overview: { type: Object, default: null }, loading: Boolean, error: { type: String, default: '' } })
const emit = defineEmits(['copied'])
const listingOverview = computed(() => ({ ...props.overview, is_full: false }))
async function copyId() {
  if (props.overview?.item_id && navigator.clipboard) {
    await navigator.clipboard.writeText(props.overview.item_id)
    emit('copied')
  }
}
</script>

<style lang="scss" scoped>
.overview-stack { display: flex; flex-direction: column; gap: 12px; }
.item-context { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 20px; }
.context-main, .context-meta, .context-id, .context-actions { display: flex; align-items: center; }
.context-main { min-width: 0; gap: 12px; }
.context-icon { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 42px; border-radius: 11px; color: #0f766e; background: #ccfbf1; }
.context-copy { min-width: 0; }
.context-title { overflow: hidden; color: #0f172a; font-size: 16px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.context-meta { flex-wrap: wrap; gap: 6px; color: #64748b; font-size: 11px; margin-top: 6px; }
.context-actions { flex-direction: column; align-items: flex-end; gap: 4px; }
.context-id { color: #64748b; font-family: monospace; font-size: 11px; gap: 2px; }
.inventory-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.inventory-grid > :only-child { grid-column: 1 / -1; }
@media (max-width: 700px) { .item-context { align-items: flex-start; flex-direction: column; } .context-actions { align-items: flex-start; } .inventory-grid { grid-template-columns: 1fr; } }
</style>
