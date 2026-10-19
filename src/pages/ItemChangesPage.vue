<template>
  <q-page class="item-history">
    <header class="history-heading">
      <div><span class="eyebrow">Mercado Livre</span><h1>Histórico de alterações</h1></div>
      <q-btn outline dense color="primary" icon="refresh" label="Atualizar" :loading="loading" @click="load" />
    </header>

    <section class="history-filters" aria-label="Filtros do histórico">
      <div class="filter-row">
        <q-input v-model="filters.search" outlined dense clearable label="Buscar anúncio ou identificador"
          class="search-filter" @update:model-value="searchLater" />
        <q-select v-model="filters.account_id" :options="accountOptions" emit-value map-options outlined dense
          clearable label="Conta" class="account-filter" @update:model-value="applyFilters" />
        <q-select v-model="filters.changed_fields" :options="changeOptions" multiple emit-value map-options
          outlined dense label="O que mudou" class="change-filter" @update:model-value="applyFilters" />
      </div>
      <div class="filter-row">
        <div class="period-shortcuts" aria-label="Atalhos de período">
          <q-btn flat dense label="Hoje" @click="setPeriod('today')" />
          <q-btn flat dense label="Ontem" @click="setPeriod('yesterday')" />
          <q-btn flat dense label="7 dias" @click="setPeriod('week')" />
        </div>
        <q-input v-model="filters.date_from" type="date" outlined dense label="Detecção a partir de"
          stack-label @update:model-value="applyFilters" />
        <q-input v-model="filters.date_to" type="date" outlined dense label="Detecção até"
          stack-label @update:model-value="applyFilters" />
        <q-input v-model="filters.promotion_name" outlined dense clearable label="Nome da promoção"
          @update:model-value="searchLater" />
        <q-select v-model="filters.status" :options="statusOptions" emit-value map-options outlined dense
          clearable label="Ativo / situação" class="small-filter" @update:model-value="applyFilters" />
        <q-select v-model="filters.logistics" :options="logisticOptions" emit-value map-options outlined dense
          clearable label="Logística" class="small-filter" @update:model-value="applyFilters" />
        <q-btn flat dense icon="filter_alt_off" label="Limpar" @click="clearFilters" />
      </div>
    </section>

    <div class="coverage-note">
      <span>Histórico a partir da primeira coleta · Horário de Brasília · Anterior → novo</span>
      <q-icon name="info_outline" size="15px" tabindex="0" aria-label="Sobre a cobertura do histórico">
        <q-tooltip class="history-tooltip">As datas mostram quando detectamos a mudança. Mudanças entre coletas podem não ser observadas. {{ coverageText }}</q-tooltip>
      </q-icon>
    </div>
    <div v-if="accountError" class="history-error" role="alert">
      {{ accountError }} <q-btn flat dense label="Recarregar contas" @click="loadAccounts" />
    </div>
    <div v-if="error" class="history-error" role="alert">
      {{ error }} <q-btn flat dense label="Tentar novamente" @click="load" />
    </div>

    <q-table v-else v-model:pagination="pagination" :rows="rows" :columns="columns" row-key="id"
      :loading="loading" :rows-per-page-options="[20, 40, 100, 200]" rows-per-page-label="Linhas por página"
      :pagination-label="paginationLabel" flat bordered dense separator="cell"
      class="history-table" @request="onRequest">
      <template #body-cell-detected_at="props">
        <q-td :props="props" class="date-cell" :title="props.row.occurred_at ? `Alteração: ${formatDate(props.row.occurred_at)}` : 'Horário da detecção'">{{ formatDate(props.row.detected_at) }}
        </q-td>
      </template>
      <template #body-cell-item="props">
        <q-td :props="props" class="item-cell">
          <div class="item-content" :title="`${props.row.title || 'Anúncio sem título'} · ${props.row.item_id}`">
            <a v-if="safePermalink(props.row.permalink)" :href="safePermalink(props.row.permalink)"
              class="item-id" target="_blank" rel="noopener noreferrer">{{ props.row.item_id }}</a>
            <span v-else class="item-id">{{ props.row.item_id }}</span>
            <span class="item-title">{{ props.row.title || 'Anúncio sem título' }}</span>
          </div>
        </q-td>
      </template>
      <template #body-cell-changed="props">
        <q-td :props="props" class="changes-cell" :title="props.row.changed_fields.map(f => fieldLabels[f] || f).join(', ')">{{ props.row.changed_fields.map(f => fieldLabels[f] || f).join(', ') }}</q-td>
      </template>
      <template v-for="field in stateFields" :key="field" #[`body-cell-${field}`]="props">
        <q-td :props="props" class="state-cell" :class="{ 'cell-changed': props.row.changed_fields.includes(field) }">
          <div class="cell-content" :title="cellTitle(props.row, field)">
            <template v-if="props.row.changed_fields.includes(field)">
              <span class="old-value">{{ fieldText(props.row.before[field], field) }}</span>
              <span class="transition" aria-label="mudou para">→</span>
            </template>
            <span :class="{ 'new-value': props.row.changed_fields.includes(field) }">{{ fieldText(props.row.after[field], field) }}</span>
          </div>
        </q-td>
      </template>
      <template #no-data>
        <div class="empty-state" role="status">
          <q-icon name="history" size="24px" />
          <span v-if="loading">Consultando alterações…</span>
          <span v-else-if="!hasCoverage">Ainda não há cobertura de histórico para as contas selecionadas. A primeira coleta estabelece a referência.</span>
          <span v-else>Nenhuma alteração encontrada nos filtros selecionados. A cobertura é progressiva por anúncio e campo.</span>
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useItemChanges } from 'src/composables/useItemChanges'
import { fieldLabels, fieldText, formatDate, safePermalink, statusLabels } from 'src/utils/itemChanges'

const { filters, pagination, rows, accounts, coverage, hasCoverage, loading, error, accountError,
  load, loadAccounts, applyFilters, searchLater, setPeriod, clearFilters, onRequest } = useItemChanges()
const accountOptions = computed(() => accounts.value.map(a => ({ label: a.account_nickname, value: a.id })))
const changeOptions = [{ value: 'price', label: 'Preço (base ou promocional)' }, ...Object.entries(fieldLabels).map(([value, label]) => ({ value, label }))]
const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
const logisticOptions = [
  { value: 'full', label: 'Full' }, { value: 'flex', label: 'Flex' },
  { value: 'cross_docking', label: 'Coleta' }, { value: 'drop_off', label: 'Postagem' },
  { value: 'xd_drop_off', label: 'Ponto de envio' },
]
const paginationLabel = (first, last, total) => `${first}–${last} de ${total}`
const stateFields = Object.keys(fieldLabels)
function cellTitle(row, field) {
  const current = fieldText(row.after[field], field)
  const previous = row.changed_fields.includes(field) ? `${fieldText(row.before[field], field)} → ` : ''
  const observed = row.after[field]?.observed_at
  return `${previous}${current}${observed ? `\nObservado em ${formatDate(observed)}` : ''}`
}
const columns = [
  { name: 'detected_at', field: 'detected_at', label: 'Data / hora da detecção', sortable: true },
  { name: 'account_name', field: 'account_name', label: 'Conta' },
  { name: 'item', field: 'title', label: 'Anúncio' },
  { name: 'base_price', label: 'Preço-base' },
  { name: 'promotion_price', label: 'Preço promocional' },
  { name: 'promotions', label: 'Nome da promoção' },
  { name: 'changed', label: 'O que mudou' },
  { name: 'status', label: 'Ativo / situação' },
  { name: 'logistics', label: 'Logística' },
].map(column => ({ ...column, align: ['base_price', 'promotion_price'].includes(column.name) ? 'right' : 'left' }))
const coverageText = computed(() => {
  const observed = coverage.value?.accounts?.filter(a => a.first_observed_at) || []
  return observed.map(a => {
    const last = Object.values(a.fields || {}).map(f => f.last_observed_at).filter(Boolean).sort().at(-1)
    return `${a.account_name}: coleta iniciada em ${formatDate(a.first_observed_at)}${last ? `; última observação em ${formatDate(last)}` : ''}.`
  }).join(' ')
})
</script>

<style scoped lang="scss">
.item-history { padding: 16px 20px; color: var(--sb-text-primary, #172b36); min-width: 0; }
.history-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.eyebrow { color: var(--q-primary); font-size: 11px; font-weight: 600; }
h1 { font-size: 23px; font-weight: 600; line-height: 1.3; letter-spacing: -.4px; margin: 2px 0 0; }
.history-filters { border-block: 1px solid var(--sb-border, #dbe3e7); padding: 10px 0; }
.filter-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.filter-row + .filter-row { margin-top: 8px; }
.filter-row + .filter-row > .q-field { flex: 1 1 130px; min-width: 120px; }
.search-filter { flex: 2; min-width: 230px; }
.account-filter, .change-filter { flex: 1; min-width: 200px; }
.small-filter { min-width: 140px; }
.period-shortcuts { display: flex; gap: 2px; }
.coverage-note { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--sb-text-secondary, #596c78); line-height: 1.5; margin: 8px 0; }
.history-error { padding: 8px 12px; border: 1px solid var(--q-negative); border-radius: 3px; margin-bottom: 8px; }
.history-table { border-color: #d4dce1; border-radius: 3px; width: 100%; background: #fff; }
.history-table :deep(th) { height: 32px; padding: 5px 8px; font-size: 11px; font-weight: 600; background: #edf1f4; border-color: #d4dce1; white-space: nowrap; }
.history-table :deep(tbody td) { height: 32px; padding: 4px 8px; line-height: 20px; vertical-align: middle; font-size: 12px; border-color: #e2e7eb; white-space: nowrap; }
.history-table :deep(tbody tr:nth-child(even)) { background: #f8fafb; }
.history-table :deep(tbody tr:hover) { background: #f3f6f8; }
.history-table :deep(.q-table__middle) { max-height: calc(100vh - 300px); overflow: auto; }
.history-table :deep(thead th) { position: sticky; top: 0; z-index: 1; box-shadow: 0 1px 0 #cbd5dc; }
.history-table :deep(.q-table__bottom) { min-height: 34px; padding: 3px 8px; font-size: 11px; border-top: 1px solid #d4dce1; }
.item-cell { min-width: 290px; max-width: 350px; }
.item-content { display: flex; align-items: baseline; gap: 8px; max-width: 330px; }
.item-title { overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
a { color: var(--q-primary); text-underline-offset: 2px; }
.item-id { flex-shrink: 0; font-size: 11px; font-variant-numeric: tabular-nums; }
.date-cell { min-width: 150px; font-variant-numeric: tabular-nums; }
.state-cell { min-width: 140px; max-width: 300px; font-variant-numeric: tabular-nums; }
.cell-content { overflow: hidden; text-overflow: ellipsis; max-width: 280px; white-space: nowrap; }
.cell-content span { display: inline; }
.old-value { color: var(--sb-text-secondary, #596c78); }
.transition { color: #8697a3; margin: 0 5px; }
.new-value { font-weight: 600; color: var(--q-primary); }
.cell-changed { background: color-mix(in srgb, var(--q-primary) 3%, transparent); }
.changes-cell { min-width: 130px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
.empty-state { display: flex; align-items: center; gap: 10px; padding: 20px 12px; }
@media (max-width: 600px) {
  .item-history { padding: 12px; }
  .history-heading { align-items: flex-start; }
  h1 { font-size: 20px; }
  .filter-row > * { min-width: 0; flex: 1 1 140px; }
  .filter-row .search-filter, .period-shortcuts { flex-basis: 100%; }
  .history-table :deep(.q-table__middle) { max-height: 65vh; }
}
</style>
