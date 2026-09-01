<template>
  <q-page class="promo-ads q-pa-lg">
    <SbPageHeader
      eyebrow="Mercado Livre"
      title="Promoções por anúncios"
      subtitle="Cada anúncio lista suas promoções por estado. Marque as que quer ativar, ajuste o % de cada uma e ative em lote. Remova as ativas pelo botão vermelho."
      icon="local_offer"
    >
      <template #actions>
        <q-btn outline no-caps icon="refresh" label="Atualizar" :loading="loading" @click="reload" />
      </template>
    </SbPageHeader>

    <!-- como funciona -->
    <div class="promo-ads__legend">
      <span><span class="promo-ads__dot promo-ads__dot--active" /> <strong>Ativas agora</strong> — já no ML</span>
      <span><span class="promo-ads__dot promo-ads__dot--avail" /> <strong>Disponíveis para ativar</strong> — candidatas; marque e ative</span>
      <span><span class="promo-ads__dot promo-ads__dot--proc" /> <strong>Processando</strong> — o ML está aplicando</span>
      <span class="promo-ads__legend-sep">|</span>
      <span>Margem: <span class="promo-ads__mchip promo-ads__mchip--pos">≥ alvo</span> <span class="promo-ads__mchip promo-ads__mchip--warn">baixa</span> <span class="promo-ads__mchip promo-ads__mchip--neg">negativa</span></span>
    </div>

    <!-- Indicadores resumidos -->
    <SbKpiGrid :columns="5" class="q-mb-xs">
      <SbKpiCard label="Anúncios com promoção" :value="adsTotal" variant="slate" title="Quantos anúncios têm ao menos uma promoção (ativa ou candidata) no catálogo" />
      <SbKpiCard label="Promoções ativas" :value="metrics.active" variant="teal" title="Promoções já rodando no ML (linhas carregadas)" />
      <SbKpiCard label="Faltam ativar" :value="metrics.available" variant="sky" title="Promoções candidatas que você ainda não ativou (linhas carregadas)" />
      <SbKpiCard label="Calculáveis" :value="metrics.estimable" variant="green" title="Promoções com tarifa, frete e CMV suficientes para estimar a margem" />
      <SbKpiCard label="Bloqueadas" :value="metrics.blocked" variant="amber" title="Sem dados para calcular a margem (falta CMV, tarifa ou preço)" />
    </SbKpiGrid>
    <p class="promo-ads__note">
      <template v-if="snapshotInfo">
        “Anúncios com promoção” é o total do catálogo; os demais contadores são sobre as
        {{ visibleAdCount }} linha(s) já carregadas — use “Carregar mais” ou os filtros.
      </template>
      <template v-else>
        Contadores sobre as {{ visibleAdCount }} linha(s) já carregadas.
      </template>
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
          <span class="promo-ads__filters-legend">Financeiro e ordenação (varre o catálogo no servidor)</span>
          <div class="promo-ads__filters-row">
            <q-input
              v-model.number="filters.minMargin"
              type="number"
              outlined
              dense
              clearable
              debounce="500"
              label="Margem de contribuição alvo (%)"
              hint="Filtra e trava a ativação"
              class="promo-ads__filter promo-ads__filter--sm"
              @update:model-value="reload"
            />
            <q-input
              v-model.number="filters.minProfit"
              type="number"
              outlined
              dense
              clearable
              debounce="500"
              label="Lucro mínimo (R$)"
              class="promo-ads__filter promo-ads__filter--sm"
              @update:model-value="reload"
            />
            <q-select
              v-model="filters.sort"
              :options="SORT_OPTIONS"
              emit-value
              map-options
              outlined
              dense
              label="Ordenar por"
              class="promo-ads__filter"
              @update:model-value="reload"
            />
            <q-toggle
              v-model="filters.onlyEstimable"
              label="Somente calculáveis"
              dense
              @update:model-value="reload"
            />
          </div>
        </div>
      </div>
    </SbCard>

    <q-banner
      v-if="scanInfo && scanInfo.exhausted"
      rounded
      class="promo-ads__banner promo-ads__banner--info q-mb-md"
    >
      Varredura financeira ao vivo: {{ scanInfo.matched }} proposta(s) em
      {{ scanInfo.scanned }} de {{ scanInfo.scan_total }} anúncios.
      Filtre por <strong>conta</strong> ou <strong>busca</strong> para varrer o restante.
    </q-banner>
    <q-banner
      v-else-if="snapshotInfo && snapshotInfo.computed_at"
      rounded
      class="promo-ads__banner promo-ads__banner--info q-mb-md"
    >
      Filtro/ordenação sobre o catálogo inteiro — dados de
      <strong>{{ new Date(snapshotInfo.computed_at).toLocaleString('pt-BR') }}</strong>.
      <span v-if="snapshotInfo.stale">Atualizando em segundo plano.</span>
      Ativação e remoção sempre consultam o Mercado Livre na hora.
    </q-banner>

    <!-- Barra fixa: ação + visualização + controles de árvore -->
    <div class="promo-ads__viewbar">
      <q-btn-toggle
        v-model="actionMode"
        :options="[
          { label: 'Ativar propostas', value: 'activate', icon: 'bolt' },
          { label: 'Remover ativas', value: 'remove', icon: 'delete_outline' },
        ]"
        no-caps unelevated toggle-color="primary" color="grey-2" text-color="grey-8"
      />
      <q-separator vertical inset />
      <q-btn-toggle
        v-if="!sortedFlat"
        v-model="view"
        :options="[
          { label: 'Por anúncios', value: 'ads' },
          { label: 'Por SKU', value: 'sku' },
        ]"
        no-caps unelevated toggle-color="primary" color="grey-2" text-color="grey-8"
      />
      <span class="promo-ads__viewbar-hint">
        {{ actionMode === 'remove'
          ? 'Marque as promoções ATIVAS a remover (várias por anúncio).'
          : (sortedFlat ? 'Lista ordenada — escolha uma proposta por anúncio.'
            : (view === 'ads' ? 'Ordenado por título do anúncio.' : 'Ordenado por SKU — anúncios do mesmo SKU ficam juntos.')) }}
      </span>
      <q-space />
      <span class="promo-ads__viewbar-count">
        {{ visibleAdCount }}<template v-if="adsTotal > visibleAdCount"> de {{ adsTotal }}</template> linha(s)
      </span>
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
        :mode="sortedFlat ? 'ads' : view"
        :action-mode="actionMode"
        :selection="selection"
        :removal="removalSelection"
        :thresholds="thresholds"
        :expand-tick="expandTick"
        :collapse-tick="collapseTick"
        @toggle="onToggle"
        @set-discount="onSetDiscount"
        @select-many="onSelectMany"
        @clear-ad="onClearAd"
        @toggle-removal="onToggleRemoval"
        @remove-one="onRemoveOne"
      />

      <div v-if="nextCursor" class="promo-ads__more">
        <q-btn outline no-caps label="Carregar mais" :loading="loadingMore" @click="loadMore" />
      </div>
    </template>

    <!-- Resumo da seleção (ativar) -->
    <transition name="promo-ads-fade">
      <div v-if="actionMode === 'activate' && summary.total" class="promo-ads__summary">
        <div class="promo-ads__summary-main">
          <div class="promo-ads__summary-headline">
            <strong>{{ summary.total }}</strong> promoção(ões) selecionada(s)
          </div>
          <div class="promo-ads__summary-scope">
            {{ summary.ads }} anúncios · {{ summary.skus }} SKUs · {{ summary.accounts }} contas
          </div>
        </div>

        <div class="promo-ads__summary-stats">
          <span>Preço médio: <strong>{{ brl(summary.avgPrice) }}</strong></span>
          <span>Desconto médio: <strong>{{ pct(summary.avgDiscountPct) }}</strong></span>
          <span>Lucro médio: <strong>{{ brl(summary.avgProfit) }}</strong></span>
          <span>Margem média: <strong>{{ pct(summary.avgMarginPct) }}</strong></span>
        </div>

        <div v-if="editableSelectedKeys.length" class="promo-ads__summary-bulk">
          <span>Aplicar</span>
          <input v-model.number="bulkDiscount" type="number" min="1" max="99" step="0.5" class="promo-ads__bulk-input" />
          <span>% a {{ editableSelectedKeys.length }} editável(is)</span>
          <q-btn dense flat no-caps color="primary" label="Aplicar" @click="applyBulkDiscount" />
        </div>

        <div class="promo-ads__summary-flags">
          <SbBadge variant="green">{{ summary.eligibleCount }} aptas</SbBadge>
          <SbBadge variant="amber">{{ summary.blockedCount }} bloqueadas</SbBadge>
          <span v-if="thresholds.minMarginPct != null" class="promo-ads__summary-lock">
            Margem alvo: {{ thresholds.minMarginPct }}%
          </span>
        </div>

        <div class="promo-ads__summary-actions">
          <q-btn flat no-caps label="Limpar" @click="clearSelection" />
          <q-btn color="primary" no-caps :label="`Revisar ${summary.eligibleCount} ativações`" @click="reviewOpen = true" />
        </div>
      </div>
    </transition>

    <!-- Resumo da seleção (remover) -->
    <transition name="promo-ads-fade">
      <div v-if="actionMode === 'remove' && removalSummary.total" class="promo-ads__summary promo-ads__summary--danger">
        <div class="promo-ads__summary-main">
          <div class="promo-ads__summary-headline">
            <strong>{{ removalSummary.total }}</strong> promoção(ões) ativa(s) a remover
          </div>
          <div class="promo-ads__summary-scope">
            {{ removalSummary.ads }} anúncios · {{ removalSummary.accounts }} contas
          </div>
        </div>
        <div class="promo-ads__summary-stats">
          <span v-for="(n, t) in removalSummary.byType" :key="t">{{ t }}: <strong>{{ n }}</strong></span>
        </div>
        <div class="promo-ads__summary-actions">
          <q-btn flat no-caps label="Limpar seleção" @click="clearRemovalSelection" />
          <q-btn color="negative" no-caps label="Revisar remoção" @click="reviewOpen = true" />
        </div>
      </div>
    </transition>

    <PromotionsAdsReviewDialog
      v-model="reviewOpen"
      :mode="actionMode"
      :summary="summary"
      :removal-summary="removalSummary"
      :activating="activating"
      @remove="removeFromSelection"
      @remove-removal="removeFromRemoval"
      @confirm="actionMode === 'remove' ? removePromotions() : activate()"
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
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
  SORT_OPTIONS,
  STATUS_OPTIONS,
  buildActivatePayload,
  buildRemovePayload,
  bulkSetDiscount,
  clearSelectionForRow,
  formatBRL,
  formatPct,
  groupByAccount,
  groupByAccountSku,
  headerMetrics,
  normalizeRow,
  setSelectionDiscount,
  summarizeRemoval,
  summarizeSelection,
  toggleRemoval,
  toggleSelection,
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
const actionMode = ref('activate') // 'activate' | 'remove'
const selection = ref({})
const removalSelection = ref({})
const reviewOpen = ref(false)
const filtersOpen = ref(true)
const expandTick = ref(0)
const collapseTick = ref(0)
const scanInfo = ref(null)
const snapshotInfo = ref(null)

const filters = reactive({
  account_id: null,
  q: '',
  sku: '',
  status: null,
  promotion_type: null,
  minMargin: null,
  minProfit: null,
  onlyEstimable: false,
  sort: null,
})

const brl = formatBRL
const pct = (v) => formatPct(v)

const finiteOrNull = (v) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : null)

const thresholds = computed(() => ({
  minMarginPct: finiteOrNull(filters.minMargin),
  minProfit: finiteOrNull(filters.minProfit),
}))

const metrics = computed(() => headerMetrics(rows.value))

// Com ordenação ativa a árvore agrupada quebraria a ordem — mostra lista plana.
const sortedFlat = computed(() => Boolean(filters.sort))

const visibleGroups = computed(() => {
  if (sortedFlat.value) {
    return [{ key: '__sorted__', account_id: '__sorted__', account_nickname: 'Resultado ordenado', ads: rows.value, adCount: rows.value.length }]
  }
  return view.value === 'sku'
    ? groupByAccountSku(rows.value)
    : groupByAccount(rows.value)
})
const visibleAdCount = computed(() => rows.value.length)

// Total real do catálogo: quando a resposta vem do snapshot pré-calculado,
// `snapshot.matched` é o total de linhas com promoção (não só a página).
// Sem snapshot (fan-out ao vivo), só dá para contar as linhas já carregadas.
const adsTotal = computed(() =>
  snapshotInfo.value && Number.isFinite(snapshotInfo.value.matched)
    ? snapshotInfo.value.matched
    : metrics.value.ads,
)

const selectionList = computed(() => Object.values(selection.value))
const summary = computed(() => summarizeSelection(selectionList.value, thresholds.value))
const removalList = computed(() => Object.values(removalSelection.value))
const removalSummary = computed(() => summarizeRemoval(removalList.value))

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
  if (finiteOrNull(filters.minMargin) !== null) chips.push({ key: 'margin', label: `Margem alvo ${filters.minMargin}%`, clear: () => { filters.minMargin = null; reload() } })
  if (finiteOrNull(filters.minProfit) !== null) chips.push({ key: 'profit', label: `Lucro ≥ ${brl(filters.minProfit)}`, clear: () => { filters.minProfit = null; reload() } })
  if (filters.onlyEstimable) chips.push({ key: 'estimable', label: 'Somente calculáveis', clear: () => { filters.onlyEstimable = false; reload() } })
  if (filters.sort) chips.push({ key: 'sort', label: `Ordem: ${sortLabel(filters.sort)}`, clear: () => { filters.sort = null; reload() } })
  return chips
})
const sortLabel = (v) => SORT_OPTIONS.find((o) => o.value === v)?.label || v

function serverParams () {
  const raw = {
    account_id: filters.account_id,
    q: filters.q,
    sku: filters.sku,
    status: filters.status,
    promotion_type: filters.promotion_type,
    min_margin_pct: finiteOrNull(filters.minMargin),
    min_profit: finiteOrNull(filters.minProfit),
    only_estimable: filters.onlyEstimable ? 'true' : null,
    sort: filters.sort,
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
    scanInfo.value = data.scan || null
    snapshotInfo.value = data.snapshot || null
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
    if (data.snapshot) snapshotInfo.value = data.snapshot
    if (data.scan) scanInfo.value = data.scan
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
  filters.sort = null
  reload()
}

function onToggle ({ row, promo }) {
  selection.value = toggleSelection(selection.value, row, promo)
}
function onSetDiscount ({ key, pct: p }) {
  selection.value = setSelectionDiscount(selection.value, key, p)
}
function onSelectMany ({ row, promos }) {
  let next = selection.value
  for (const promo of promos) {
    if (!next[`${row._key}##${promo._key}`]) next = toggleSelection(next, row, promo)
  }
  selection.value = next
}
function onClearAd ({ row }) {
  selection.value = clearSelectionForRow(selection.value, row)
}
function clearSelection () {
  selection.value = {}
}
function removeFromSelection (key) {
  const next = { ...selection.value }
  delete next[key]
  selection.value = next
}

// --- Ação em massa: aplicar um % a todas as promoções editáveis selecionadas ---
const bulkDiscount = ref(null)
const editableSelectedKeys = computed(() =>
  selectionList.value.filter((e) => e.discountEditable).map((e) => e.key),
)
function applyBulkDiscount () {
  const p = Number(bulkDiscount.value)
  if (!(p >= 1 && p <= 99)) {
    $q.notify({ color: 'negative', message: 'Informe um % entre 1 e 99.' })
    return
  }
  selection.value = bulkSetDiscount(selection.value, editableSelectedKeys.value, p)
}

// --- Remoção inline de UMA promoção ativa (botão vermelho na visão de ativar) ---
function onRemoveOne ({ row, promo }) {
  $q.dialog({
    title: 'Remover promoção',
    message: `Remover <b>${promo.typeLabel || promo.promotion_type}</b> de <b>${row.title}</b>?`
      + '<br><span style="font-size:12px;color:#64748b">O Mercado Livre confirma em alguns minutos.</span>',
    html: true, cancel: 'Cancelar', ok: { label: 'Remover', color: 'negative', noCaps: true },
  }).onOk(async () => {
    try {
      const payload = buildRemovePayload([{
        account_id: row.account_id, item_id: row.item_id,
        promotion_id: promo.promotion_id, promotion_type: promo.promotion_type,
      }])
      const { data } = await MercadoLivreService.removePromotionsAds(payload)
      const n = data.queued_count ?? data.queued?.length ?? 0
      if (n > 0) {
        $q.notify({ color: 'positive', message: 'Remoção na fila. O ML confirma em alguns minutos.' })
      } else {
        $q.notify({ color: 'warning', multiLine: true,
          message: (data.blocked || []).map((b) => b.reason).filter(Boolean).join('; ') || 'Não foi possível remover.' })
      }
      await reload()
    } catch (err) {
      $q.notify({ color: 'negative', message: err.response?.data?.message || err.response?.data?.error || 'Falha ao remover.' })
    }
  })
}

// --- Modo remoção (em lote) ---
function onToggleRemoval ({ row, promo }) {
  removalSelection.value = toggleRemoval(removalSelection.value, row, promo)
}
function clearRemovalSelection () {
  removalSelection.value = {}
}
function removeFromRemoval (key) {
  const next = { ...removalSelection.value }
  delete next[key]
  removalSelection.value = next
}

async function removePromotions () {
  const entries = removalList.value
  if (!entries.length) return
  activating.value = true
  try {
    const { data } = await MercadoLivreService.removePromotionsAds(buildRemovePayload(entries))
    const n = data.queued_count ?? data.queued?.length ?? 0
    $q.notify({
      color: 'positive', timeout: 8000, multiLine: true,
      message: `${n} anúncio(s) na fila de remoção. O Mercado Livre confirma em alguns minutos.`,
    })
    if (data.blocked?.length) {
      $q.notify({
        color: 'warning', timeout: 9000, multiLine: true,
        message: `${data.blocked.length} não removida(s): `
          + data.blocked.map((b) => b.reason).filter(Boolean).join('; '),
      })
    }
    removalSelection.value = {}
    reviewOpen.value = false
    await reload()
  } catch (err) {
    $q.notify({
      color: 'negative',
      message: err.response?.data?.message || err.response?.data?.error
        || 'Não foi possível enfileirar a remoção.',
    })
  } finally {
    activating.value = false
  }
}

async function activate () {
  const eligible = summary.value.eligible
  if (!eligible.length) return
  activating.value = true
  try {
    const payload = buildActivatePayload(eligible, {
      marginTarget: thresholds.value.minMarginPct,
    })
    const { data } = await MercadoLivreService.activatePromotionsAds(payload)
    const enqueued = data.enqueued_count ?? data.enqueued?.length ?? 0
    const directN = (data.enqueued || []).filter((e) => e.direct).length
    $q.notify({
      color: 'positive', multiLine: directN > 0,
      message: `${enqueued} proposta(s) enviada(s) para ativação.`
        + (directN > 0 ? ` ${directN} desconto(s) individual(is) ativados agora — o ML limita a 14 dias.` : ''),
    })
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

// Ao entrar no modo remoção, foca nas promoções ativas (só elas removem).
let statusAutoSet = false
watch(actionMode, (mode) => {
  if (mode === 'remove' && !filters.status) {
    filters.status = 'started'
    statusAutoSet = true
    reload()
  } else if (mode === 'activate' && statusAutoSet && filters.status === 'started') {
    filters.status = null
    statusAutoSet = false
    reload()
  }
})

onMounted(reload)
</script>

<style lang="scss" scoped>
.promo-ads__note {
  font-size: 11px;
  color: #94a3b8;
  margin: 6px 0 16px;
  code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 10.5px; }
}

.promo-ads__legend {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px 16px;
  font-size: 11.5px; color: #64748b;
  padding: 8px 12px; margin: 10px 0 4px;
  background: #f8fafc; border: 1px solid #eef2f6; border-radius: 8px;
  strong { color: #334155; font-weight: 700; }
}
.promo-ads__dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; vertical-align: 0; }
.promo-ads__dot--active { background: #0d9488; }
.promo-ads__dot--avail  { background: #0284c7; }
.promo-ads__dot--proc   { background: #d97706; }
.promo-ads__legend-sep { color: #cbd5e1; }
.promo-ads__mchip {
  display: inline-block; font-size: 10.5px; font-weight: 700;
  padding: 1px 6px; border-radius: 5px; margin-left: 2px;
}
.promo-ads__mchip--pos  { background: #dcfce7; color: #15803d; }
.promo-ads__mchip--warn { background: #fef3c7; color: #b45309; }
.promo-ads__mchip--neg  { background: #fee2e2; color: #b91c1c; }

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
.promo-ads__summary-bulk {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #475569; flex-shrink: 0;
  padding: 4px 10px; background: #f1f5f9; border-radius: 8px;
}
.promo-ads__bulk-input {
  width: 58px; padding: 3px 6px; border: 1px solid #cbd5e1; border-radius: 6px;
  font-size: 12.5px; font-weight: 700; text-align: right;
}
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
