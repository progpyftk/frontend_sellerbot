<template>
  <q-page class="promo-ads q-pa-lg">
    <SbPageHeader
      eyebrow="Mercado Livre"
      title="Promoções por anúncios"
      subtitle="Analise as propostas disponíveis por conta, SKU e anúncio. Escolha uma proposta específica por anúncio antes de ativar."
      icon="local_offer"
    >
      <template #actions>
        <q-btn outline no-caps icon="refresh" label="Atualizar" :loading="loading" @click="reload" />
      </template>
    </SbPageHeader>

    <!-- Indicadores resumidos -->
    <SbKpiGrid :columns="5" class="q-mb-xs">
      <SbKpiCard label="Anúncios encontrados" :value="metrics.ads" variant="slate" />
      <SbKpiCard label="SKUs encontrados" :value="metrics.skus" variant="slate" />
      <SbKpiCard label="Promoções disponíveis" :value="metrics.promotions" variant="teal" />
      <SbKpiCard label="Promoções calculáveis" :value="metrics.estimable" variant="green" />
      <SbKpiCard label="Promoções bloqueadas" :value="metrics.blocked" variant="amber" />
    </SbKpiGrid>
    <p class="promo-ads__note">
      Contadores sobre as linhas já carregadas. O total consolidado ainda depende de ajuste no
      backend (ver <code>PROMO-12-REDESIGN.md</code>).
    </p>

    <!-- Filtros -->
    <SbCard :padded="false" class="q-mb-md">
      <template #header>
        <button class="promo-ads__filters-toggle" type="button" @click="filtersOpen = !filtersOpen">
          <q-icon :name="filtersOpen ? 'expand_more' : 'chevron_right'" size="18px" />
          <span>Filtros</span>
          <SbBadge v-if="activeFilterChips.length" variant="teal">{{ activeFilterChips.length }} ativo(s)</SbBadge>
        </button>
      </template>
      <template #actions>
        <q-btn
          v-if="activeFilterChips.length"
          flat
          dense
          no-caps
          label="Limpar filtros"
          @click="clearFilters"
        />
      </template>

      <div v-if="activeFilterChips.length" class="promo-ads__chips">
        <q-chip
          v-for="chip in activeFilterChips"
          :key="chip.key"
          dense
          removable
          color="teal-1"
          text-color="teal-9"
          @remove="chip.clear()"
        >
          {{ chip.label }}
        </q-chip>
      </div>

      <div v-show="filtersOpen" class="promo-ads__filters">
        <div class="promo-ads__filters-group">
          <span class="promo-ads__filters-legend">Consulta (backend)</span>
          <div class="promo-ads__filters-row">
            <q-select
              v-model="filters.account_id"
              :options="accountOptions"
              emit-value
              map-options
              clearable
              outlined
              dense
              label="Conta Mercado Livre"
              :loading="accountsLoading"
              class="promo-ads__filter promo-ads__filter--wide"
              @update:model-value="reload"
            />
            <q-input
              v-model="filters.q"
              outlined
              dense
              clearable
              label="Busca livre (título / SKU / MLB)"
              class="promo-ads__filter promo-ads__filter--wide"
              @keyup.enter="reload"
              @clear="reload"
            />
            <q-input
              v-model="filters.sku"
              outlined
              dense
              clearable
              label="SKU"
              class="promo-ads__filter"
              @keyup.enter="reload"
              @clear="reload"
            />
            <q-select
              v-model="filters.status"
              :options="STATUS_OPTIONS"
              emit-value
              map-options
              clearable
              outlined
              dense
              label="Status da promoção"
              class="promo-ads__filter"
              @update:model-value="reload"
            />
            <q-select
              v-model="filters.promotion_type"
              :options="PROMOTION_TYPE_OPTIONS"
              emit-value
              map-options
              clearable
              outlined
              dense
              label="Tipo da promoção"
              class="promo-ads__filter"
              @update:model-value="reload"
            />
            <q-btn no-caps color="primary" label="Buscar" :loading="loading" @click="reload" />
          </div>
        </div>

        <div class="promo-ads__filters-group">
          <span class="promo-ads__filters-legend">Financeiro (aplicado às linhas carregadas)</span>
          <div class="promo-ads__filters-row">
            <q-input
              v-model.number="filters.minMargin"
              type="number"
              outlined
              dense
              clearable
              label="Margem mínima (%)"
              class="promo-ads__filter promo-ads__filter--sm"
            />
            <q-input
              v-model.number="filters.minProfit"
              type="number"
              outlined
              dense
              clearable
              label="Lucro mínimo (R$)"
              class="promo-ads__filter promo-ads__filter--sm"
            />
            <q-toggle v-model="filters.onlyEstimable" label="Somente promoções calculáveis" dense />
          </div>
        </div>
      </div>
    </SbCard>

    <!-- Barra fixa: visualização + controles de árvore -->
    <div class="promo-ads__viewbar">
      <q-btn-toggle
        v-model="view"
        :options="[
          { label: 'Por anúncios', value: 'ads' },
          { label: 'Por SKU', value: 'sku' },
        ]"
        no-caps
        unelevated
        toggle-color="primary"
        color="grey-2"
        text-color="grey-8"
      />
      <span class="promo-ads__viewbar-hint">
        {{ view === 'ads'
          ? 'Conta → anúncio/variação → promoções disponíveis.'
          : 'Conta → SKU → anúncios/variações → promoções.' }}
      </span>
      <q-space />
      <span class="promo-ads__viewbar-count">{{ visibleAdCount }} linha(s)</span>
      <q-btn flat dense no-caps size="sm" label="Expandir tudo" @click="expandTick++" />
      <q-btn flat dense no-caps size="sm" label="Recolher tudo" @click="collapseTick++" />
    </div>

    <!-- Erros -->
    <q-banner v-if="error" rounded class="promo-ads__banner promo-ads__banner--error q-mb-md">
      {{ error }}
    </q-banner>
    <q-banner v-if="skipped.length" rounded class="promo-ads__banner promo-ads__banner--warn q-mb-md">
      {{ skipped.length }} anúncio(s) não puderam ser consultados no Mercado Livre. Os demais
      resultados seguem disponíveis.
      <ul class="promo-ads__skipped">
        <li v-for="s in skipped" :key="s.item_id">{{ s.item_id }}: {{ s.reason }}</li>
      </ul>
    </q-banner>

    <!-- Estados -->
    <SbEmptyState
      v-if="loading && !rows.length"
      variant="loading"
      title="Carregando promoções"
      message="Consultando propostas por anúncio no Mercado Livre."
    />
    <SbEmptyState
      v-else-if="!loading && error && !rows.length"
      variant="error"
      title="Não foi possível carregar"
      :message="error"
    >
      <template #action>
        <q-btn no-caps color="primary" label="Tentar de novo" @click="reload" />
      </template>
    </SbEmptyState>
    <SbEmptyState
      v-else-if="!loading && !visibleGroups.length"
      variant="empty"
      title="Nenhum anúncio com promoção"
      message="Ajuste os filtros, troque a conta ou reduza os pisos de margem/lucro."
    />

    <!-- Árvore agrupada -->
    <template v-else>
      <PromotionsAdsGroup
        v-for="group in visibleGroups"
        :key="group.key"
        :group="group"
        :mode="view"
        :selection="selection"
        :thresholds="thresholds"
        :expand-tick="expandTick"
        :collapse-tick="collapseTick"
        @choose="onChoose"
        @clear="onClear"
      />

      <div v-if="nextCursor" class="promo-ads__more">
        <q-btn outline no-caps label="Carregar mais" :loading="loadingMore" @click="loadMore" />
      </div>
    </template>

    <!-- Resumo da seleção -->
    <transition name="promo-ads-fade">
      <div v-if="summary.total" class="promo-ads__summary">
        <div class="promo-ads__summary-main">
          <div class="promo-ads__summary-headline">
            <strong>{{ summary.total }}</strong> proposta(s) selecionada(s)
          </div>
          <div class="promo-ads__summary-scope">
            {{ summary.ads }} anúncios · {{ summary.skus }} SKUs · {{ summary.accounts }} contas
          </div>
        </div>

        <div class="promo-ads__summary-stats">
          <span>Preço médio: <strong>{{ brl(summary.avgPrice) }}</strong></span>
          <span>Desconto médio: <strong>{{ pct(summary.avgDiscountPct) }}</strong></span>
          <span>Lucro estimado médio: <strong>{{ brl(summary.avgProfit) }}</strong></span>
          <span>Margem estimada média: <strong>{{ pct(summary.avgMarginPct) }}</strong></span>
        </div>

        <div class="promo-ads__summary-flags">
          <SbBadge variant="green">{{ summary.eligibleCount }} aptas para ativação</SbBadge>
          <SbBadge variant="amber">{{ summary.blockedCount }} bloqueadas</SbBadge>
          <span class="promo-ads__summary-lock">Trava: {{ maxDiscountPct }}%</span>
        </div>

        <div class="promo-ads__summary-actions">
          <q-btn flat no-caps label="Limpar seleção" @click="clearSelection" />
          <q-btn color="primary" no-caps label="Revisar ativação" @click="reviewOpen = true" />
        </div>
      </div>
    </transition>

    <PromotionsAdsReviewDialog
      v-model="reviewOpen"
      :summary="summary"
      :max-discount-pct="maxDiscountPct"
      :activating="activating"
      @update:max-discount-pct="maxDiscountPct = $event"
      @remove="removeFromSelection"
      @confirm="activate"
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import MercadoLivreService from 'src/services/MercadoLivreService'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbKpiGrid from 'src/components/common/SbKpiGrid.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import PromotionsAdsGroup from 'src/components/promotions-ads/PromotionsAdsGroup.vue'
import PromotionsAdsReviewDialog from 'src/components/promotions-ads/PromotionsAdsReviewDialog.vue'
import {
  PROMOTION_TYPE_OPTIONS,
  STATUS_OPTIONS,
  applyClientFilters,
  buildActivatePayload,
  choosePromotion,
  clearRow,
  formatBRL,
  formatPct,
  groupByAccount,
  groupByAccountSku,
  headerMetrics,
  normalizeRow,
  summarizeSelection,
} from 'src/utils/promotionsAdsView'

const $q = useQuasar()

const PAGE_SIZE = 40

const rows = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const activating = ref(false)
const error = ref('')
const skipped = ref([])
const nextCursor = ref(null)

const accountOptions = ref([])
const accountNames = ref({})
const accountsLoading = ref(false)

const view = ref('ads')
const selection = ref({})
const reviewOpen = ref(false)
const maxDiscountPct = ref(15)
const filtersOpen = ref(true)
const expandTick = ref(0)
const collapseTick = ref(0)

const filters = reactive({
  account_id: null,
  q: '',
  sku: '',
  status: null,
  promotion_type: null,
  minMargin: null,
  minProfit: null,
  onlyEstimable: false,
})

const brl = formatBRL
const pct = (v) => formatPct(v)

const finiteOrNull = (v) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : null)

const thresholds = computed(() => ({
  minMarginPct: finiteOrNull(filters.minMargin),
  minProfit: finiteOrNull(filters.minProfit),
}))

const metrics = computed(() => headerMetrics(rows.value))

const filteredRows = computed(() =>
  applyClientFilters(rows.value, {
    onlyEstimable: filters.onlyEstimable,
    minMarginPct: thresholds.value.minMarginPct,
    minProfit: thresholds.value.minProfit,
  }),
)

const visibleGroups = computed(() =>
  view.value === 'sku'
    ? groupByAccountSku(filteredRows.value)
    : groupByAccount(filteredRows.value),
)
const visibleAdCount = computed(() => filteredRows.value.length)

const selectionList = computed(() => Object.values(selection.value))
const summary = computed(() => summarizeSelection(selectionList.value, thresholds.value))

const accountLabel = (id) => accountOptions.value.find((o) => o.value === id)?.label || id
const typeLabel = (v) => PROMOTION_TYPE_OPTIONS.find((o) => o.value === v)?.label || v
const statusOptLabel = (v) => STATUS_OPTIONS.find((o) => o.value === v)?.label || v

const activeFilterChips = computed(() => {
  const chips = []
  if (filters.account_id) chips.push({ key: 'account', label: `Conta: ${accountLabel(filters.account_id)}`, clear: () => { filters.account_id = null; reload() } })
  if (filters.q) chips.push({ key: 'q', label: `Busca: "${filters.q}"`, clear: () => { filters.q = ''; reload() } })
  if (filters.sku) chips.push({ key: 'sku', label: `SKU: ${filters.sku}`, clear: () => { filters.sku = ''; reload() } })
  if (filters.status) chips.push({ key: 'status', label: `Status: ${statusOptLabel(filters.status)}`, clear: () => { filters.status = null; reload() } })
  if (filters.promotion_type) chips.push({ key: 'type', label: `Tipo: ${typeLabel(filters.promotion_type)}`, clear: () => { filters.promotion_type = null; reload() } })
  if (finiteOrNull(filters.minMargin) !== null) chips.push({ key: 'margin', label: `Margem ≥ ${filters.minMargin}%`, clear: () => { filters.minMargin = null } })
  if (finiteOrNull(filters.minProfit) !== null) chips.push({ key: 'profit', label: `Lucro ≥ ${brl(filters.minProfit)}`, clear: () => { filters.minProfit = null } })
  if (filters.onlyEstimable) chips.push({ key: 'estimable', label: 'Somente calculáveis', clear: () => { filters.onlyEstimable = false } })
  return chips
})

function serverParams () {
  const raw = {
    account_id: filters.account_id,
    q: filters.q,
    sku: filters.sku,
    status: filters.status,
    promotion_type: filters.promotion_type,
    page_size: PAGE_SIZE,
  }
  return Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== null && v !== undefined && v !== ''),
  )
}

async function ensureAccounts () {
  if (accountOptions.value.length) return
  accountsLoading.value = true
  try {
    const { data } = await MercadoLivreService.listAccounts()
    const list = Array.isArray(data) ? data : (data.results || data.data || [])
    accountOptions.value = list.map((acc) => ({
      label: acc.account_nickname || acc.nickname || acc.account_id,
      value: acc.account_id,
    }))
    accountNames.value = Object.fromEntries(
      list.map((acc) => [acc.account_id, acc.account_nickname || acc.nickname || acc.account_id]),
    )
  } catch (err) {
    // filtro de conta é auxiliar — não bloqueia a listagem
    console.error('Falha ao carregar contas ML', err)
  } finally {
    accountsLoading.value = false
  }
}

async function reload () {
  loading.value = true
  error.value = ''
  nextCursor.value = null
  skipped.value = []
  try {
    await ensureAccounts()
    const { data } = await MercadoLivreService.getPromotionsAds(serverParams())
    rows.value = (data.results || []).map((r) => normalizeRow(r, accountNames.value))
    nextCursor.value = data.next_cursor || null
    skipped.value = data.skipped || []
  } catch (err) {
    error.value = err.response?.data?.error
      || err.response?.data?.message
      || 'Não foi possível consultar as promoções por anúncio.'
  } finally {
    loading.value = false
  }
}

async function loadMore () {
  if (!nextCursor.value) return
  loadingMore.value = true
  try {
    const { data } = await MercadoLivreService.getPromotionsAds({
      ...serverParams(),
      cursor: nextCursor.value,
    })
    rows.value.push(...(data.results || []).map((r) => normalizeRow(r, accountNames.value)))
    skipped.value.push(...(data.skipped || []))
    nextCursor.value = data.next_cursor || null
  } catch (err) {
    error.value = err.response?.data?.error
      || err.response?.data?.message
      || 'Não foi possível carregar a próxima página.'
  } finally {
    loadingMore.value = false
  }
}

function clearFilters () {
  filters.account_id = null
  filters.q = ''
  filters.sku = ''
  filters.status = null
  filters.promotion_type = null
  filters.minMargin = null
  filters.minProfit = null
  filters.onlyEstimable = false
  reload()
}

function onChoose ({ row, promo }) {
  selection.value = choosePromotion(selection.value, row, promo)
}
function onClear ({ row }) {
  selection.value = clearRow(selection.value, row)
}
function clearSelection () {
  selection.value = {}
}
function removeFromSelection (key) {
  const next = { ...selection.value }
  delete next[key]
  selection.value = next
}

async function activate () {
  const eligible = summary.value.eligible
  if (!eligible.length) return
  const lock = Number(maxDiscountPct.value)
  if (!(lock >= 1 && lock <= 99)) {
    $q.notify({ color: 'negative', message: 'Informe uma trava de desconto entre 1 e 99%.' })
    return
  }
  activating.value = true
  try {
    const payload = buildActivatePayload(eligible, { maxDiscountPct: lock })
    const { data } = await MercadoLivreService.activatePromotionsAds(payload)
    const enqueued = data.enqueued_count ?? data.enqueued?.length ?? 0
    $q.notify({ color: 'positive', message: `${enqueued} proposta(s) enviada(s) para ativação.` })
    if (data.blocked?.length) {
      $q.notify({
        color: 'warning',
        timeout: 9000,
        multiLine: true,
        message: `${data.blocked.length} proposta(s) bloqueada(s) pelo servidor: `
          + data.blocked.map((b) => b.reason).filter(Boolean).join('; '),
      })
    }
    // limpa da seleção todas as propostas submetidas; bloqueios do servidor
    // já foram sinalizados acima e o estado real volta no reload().
    const next = { ...selection.value }
    for (const entry of eligible) delete next[entry.key]
    selection.value = next
    reviewOpen.value = false
    await reload()
  } catch (err) {
    $q.notify({
      color: 'negative',
      message: err.response?.data?.message
        || err.response?.data?.error
        || 'Não foi possível ativar as propostas.',
    })
  } finally {
    activating.value = false
  }
}

onMounted(reload)
</script>

<style lang="scss" scoped>
.promo-ads__note {
  font-size: 11px;
  color: #94a3b8;
  margin: 6px 0 16px;
  code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 10.5px; }
}

.promo-ads__filters-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  padding: 0;
}

.promo-ads__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 20px 0;
}

.promo-ads__filters {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px 20px 20px;
}
.promo-ads__filters-group { display: flex; flex-direction: column; gap: 8px; }
.promo-ads__filters-legend {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #0d9488;
}
.promo-ads__filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.promo-ads__filter { width: 200px; }
.promo-ads__filter--wide { width: 264px; }
.promo-ads__filter--sm { width: 150px; }

.promo-ads__viewbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 -24px 16px;
  padding: 10px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  .q-btn-toggle { border: 1px solid #e2e8f0; border-radius: 8px; }
}
.promo-ads__viewbar-hint { font-size: 12px; color: #64748b; }
.promo-ads__viewbar-count { font-size: 12px; color: #64748b; }

.promo-ads__banner { font-size: 13px; }
.promo-ads__banner--error { background: #fee2e2; color: #991b1b; }
.promo-ads__banner--warn { background: #fef3c7; color: #92400e; }
.promo-ads__skipped { margin: 6px 0 0; padding-left: 18px; font-size: 12px; }

.promo-ads__more { text-align: center; margin: 16px 0 120px; }

.promo-ads__summary {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  width: min(1160px, calc(100vw - 48px));
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 22px;
  z-index: 3000;
}
.promo-ads__summary-main { flex-shrink: 0; }
.promo-ads__summary-headline { font-size: 14px; color: #334155; strong { color: #0f172a; font-size: 16px; } }
.promo-ads__summary-scope { font-size: 11.5px; color: #94a3b8; }
.promo-ads__summary-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 20px;
  font-size: 12px;
  color: #64748b;
  strong { color: #0f172a; }
}
.promo-ads__summary-flags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.promo-ads__summary-lock { font-size: 11.5px; color: #64748b; }
.promo-ads__summary-actions { display: flex; gap: 8px; flex-shrink: 0; margin-left: auto; }

.promo-ads-fade-enter-active,
.promo-ads-fade-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.promo-ads-fade-enter-from,
.promo-ads-fade-leave-to { opacity: 0; transform: translate(-50%, 12px); }

@media (max-width: 1024px) {
  .promo-ads__filter,
  .promo-ads__filter--wide,
  .promo-ads__filter--sm { width: 100%; }
  .promo-ads__summary {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .promo-ads__summary-actions { margin-left: 0; }
}
</style>
