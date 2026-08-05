<template>
  <section class="filters-panel" aria-label="Filtros de anúncios">
    <div class="filters-search">
      <q-input
        :model-value="filters.search"
        outlined dense clearable
        placeholder="Buscar por título, SKU ou ID"
        aria-label="Buscar anúncios"
        @update:model-value="emit('filter', 'search', $event || '')"
      >
        <template #prepend><q-icon name="search" /></template>
      </q-input>
    </div>
    <div class="filters-grid">
      <q-select
        :model-value="filters.account"
        :options="accountOptions"
        emit-value map-options outlined dense clearable
        label="Conta"
        @update:model-value="emit('filter', 'account', $event || '')"
      />
      <q-select
        :model-value="filters.status"
        :options="statusOptions"
        emit-value map-options outlined dense clearable
        label="Status"
        @update:model-value="emit('filter', 'status', $event || '')"
      />
      <q-select
        :model-value="filters.logistic_type"
        :options="logisticOptions"
        emit-value map-options outlined dense clearable
        label="Logística"
        @update:model-value="emit('filter', 'logistic_type', $event || '')"
      />
      <q-select
        :model-value="filters.stock_status"
        :options="stockOptions"
        emit-value map-options outlined dense clearable
        label="Estoque"
        @update:model-value="emit('filter', 'stock_status', $event || '')"
      />
    </div>
    <div class="filters-footer">
      <q-toggle
        :model-value="filters.is_full === 'true'"
        label="Somente Full"
        color="teal-7"
        @update:model-value="emit('filter', 'is_full', $event ? 'true' : '')"
      />
      <q-select
        :model-value="filters.sort"
        :options="sortOptions"
        emit-value map-options borderless dense
        label="Ordenar por"
        class="sort-select"
        @update:model-value="emit('filter', 'sort', $event)"
      />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  filters: { type: Object, required: true },
  accounts: { type: Array, default: () => [] },
})
const emit = defineEmits(['filter'])

const accountOptions = computed(() => props.accounts.map((account) => ({
  label: account.account_nickname || account.nickname || account.account_id || account.id,
  value: account.account_id || account.id,
})))
const statusOptions = [
  { label: 'Ativos', value: 'active' },
  { label: 'Pausados', value: 'paused' },
  { label: 'Finalizados', value: 'closed' },
]
const logisticOptions = [
  { label: 'Full', value: 'fulfillment' },
  { label: 'Flex', value: 'self_service' },
  { label: 'Mercado Envios', value: 'me2' },
  { label: 'Sem informação', value: 'not_informed' },
]
const stockOptions = [
  { label: 'Estoque positivo', value: 'positive' },
  { label: 'Estoque zerado', value: 'zero' },
  { label: 'Full indisponível', value: 'full_zero' },
]
const sortOptions = [
  { label: 'Última sincronização', value: 'last_synced' },
  { label: 'GMV', value: 'gmv' },
  { label: 'Pedidos', value: 'orders' },
  { label: 'Estoque informado', value: 'listing_stock' },
  { label: 'Título', value: 'title' },
]
</script>

<style lang="scss" scoped>
.filters-panel { padding: 16px; border-bottom: 1px solid #f1f5f9; }
.filters-search { margin-bottom: 12px; }
.filters-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.filters-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; }
.sort-select { max-width: 170px; }
@media (max-width: 900px) { .filters-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) { .filters-grid { grid-template-columns: 1fr; } .filters-footer { align-items: flex-start; flex-direction: column; } .sort-select { max-width: none; width: 100%; } }
</style>
