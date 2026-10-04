<template>
  <aside :class="['item-list-panel', { 'item-list-panel--open': open }]" :aria-hidden="mobile && !open" :inert="mobile && !open" aria-label="Lista de anúncios">
    <div class="list-heading">
      <div>
        <div class="list-title">Anúncios</div>
        <div class="list-count">{{ formatNumber(pagination.total) }} resultados</div>
      </div>
      <q-btn v-if="mobile" flat round dense icon="close" aria-label="Fechar lista" @click="emit('close')" />
    </div>
    <ItemAnalyticsFilters :filters="filters" :accounts="accounts" @filter="(...args) => emit('filter', ...args)" />

    <div v-if="loading" class="list-state"><SbEmptyState variant="loading" title="Carregando anúncios" message="Buscando os dados do período." /></div>
    <div v-else-if="error" class="list-state">
      <SbEmptyState variant="error" title="Não foi possível carregar" :message="error">
        <template #action><q-btn outline color="primary" label="Tentar novamente" @click="emit('retry')" /></template>
      </SbEmptyState>
    </div>
    <div v-else-if="!items.length" class="list-state">
      <SbEmptyState title="Nenhum anúncio encontrado" message="Ajuste a busca ou remova alguns filtros." />
    </div>
    <div v-else class="items-scroll">
      <button
        v-for="item in items"
        :key="item.item_id"
        :class="['item-row', { 'item-row--active': item.item_id === selectedItemId }]"
        :aria-pressed="item.item_id === selectedItemId"
        @click="emit('select', item.item_id)"
      >
        <img v-if="item.thumbnail" :src="item.thumbnail" :alt="''" class="item-thumb" />
        <span v-else class="item-thumb item-thumb--empty"><q-icon name="inventory_2" size="18px" /></span>
        <span class="item-row-body">
          <span class="item-row-title">{{ item.title }}</span>
          <span class="item-row-meta">
            <SbBadge :variant="item.is_full ? 'teal' : 'slate'">{{ item.is_full ? 'Full' : item.logistic_type }}</SbBadge>
            <span>{{ formatNumber(item.metrics.total_visits) }} visitas</span>
            <span>{{ formatNumber(item.metrics.total_orders) }} pedidos</span>
          </span>
          <span class="item-row-stock">
            Estoque {{ item.listing_stock.available_quantity == null ? 'não informado' : formatNumber(item.listing_stock.available_quantity) }}
            <span v-if="item.is_full">· Full {{ inventoryLabel(item) }}</span>
          </span>
        </span>
      </button>
    </div>

    <div v-if="pagination.pages > 1" class="list-pagination">
      <q-pagination :model-value="pagination.page" :max="pagination.pages" max-pages="5" direction-links color="primary" @update:model-value="emit('page', $event)" />
    </div>
  </aside>
</template>

<script setup>
import ItemAnalyticsFilters from './ItemAnalyticsFilters.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import { formatNumber } from 'src/utils/itemAnalytics'

defineProps({
  items: { type: Array, default: () => [] },
  accounts: { type: Array, default: () => [] },
  filters: { type: Object, required: true },
  pagination: { type: Object, required: true },
  selectedItemId: { type: String, default: '' },
  loading: Boolean,
  error: { type: String, default: '' },
  open: Boolean,
  mobile: Boolean,
})
const emit = defineEmits(['close', 'filter', 'page', 'retry', 'select'])

const inventoryLabel = (item) => {
  const value = item.fulfillment_inventory.available_quantity
  return value == null ? 'não consultado' : formatNumber(value)
}
</script>

<style lang="scss" scoped>
.item-list-panel { width: 340px; flex: 0 0 340px; background: #fff; border: 1px solid #b8cbd6; border-radius: 14px; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.list-heading { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 16px 10px; }
.list-title { color: #101e2b; font-size: 16px; font-weight: 700; }
.list-count { color: #4c6272; font-size: 12px; margin-top: 3px; }
.items-scroll { min-height: 0; overflow-y: auto; padding: 4px 8px 8px; }
.item-row { width: 100%; display: flex; gap: 10px; padding: 11px 8px; border: 0; border-bottom: 1px solid #dfe9ef; background: #fff; color: inherit; text-align: left; cursor: pointer; border-radius: 9px; }
.item-row:hover { background: #edf4f7; }
.item-row--active { background: #fdf2f7; box-shadow: inset 3px 0 #7f1642; }
.item-thumb { width: 42px; height: 42px; flex: 0 0 42px; border: 1px solid #b8cbd6; border-radius: 8px; object-fit: cover; }
.item-thumb--empty { display: grid; place-items: center; background: #edf4f7; color: #6b8498; }
.item-row-body { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.item-row-title { overflow: hidden; color: #101e2b; font-size: 13px; font-weight: 600; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
.item-row-meta, .item-row-stock { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; color: #4c6272; font-size: 11px; }
.item-row-stock { color: #4c6272; }
.list-pagination { display: flex; justify-content: center; padding: 10px; border-top: 1px solid #dfe9ef; }
.list-state { overflow-y: auto; }
@media (max-width: 767px) {
  .item-list-panel { position: fixed; z-index: 20; inset: 0; width: min(380px, 92vw); border-radius: 0 16px 16px 0; transform: translateX(-105%); transition: transform 180ms ease; box-shadow: 14px 0 35px rgba(15, 23, 42, .16); }
  .item-list-panel--open { transform: translateX(0); visibility: visible; }
  .item-list-panel:not(.item-list-panel--open) { visibility: hidden; }
}
</style>
