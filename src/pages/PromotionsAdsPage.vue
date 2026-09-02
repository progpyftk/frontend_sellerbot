<template>
  <q-page class="promo-ads q-pa-lg">
    <SbPageHeader
      eyebrow="Mercado Livre"
      title="Promoções por anúncios"
      subtitle="Cada anúncio lista suas promoções por estado. Marque as que quer ativar, ajuste o % e ative em lote — ou remova as ativas pelo botão vermelho."
      icon="local_offer"
    >
      <template #actions>
        <q-btn outline no-caps icon="refresh" label="Atualizar" :loading="loading" @click="reload" />
      </template>
    </SbPageHeader>

    <!--
      Faixa de métricas. Antes eram 4 KPI cards + um parágrafo explicando que
      o primeiro card media o catálogo e os outros três mediam a página. Agora
      todos medem as linhas carregadas e o total do catálogo aparece uma vez,
      no canto direito — sem nota de rodapé.
    -->
    <div class="pa-stats">
      <div class="pa-stat" title="Anúncios carregados que têm ao menos uma promoção (ativa ou candidata)">
        <span class="pa-stat__v">{{ metrics.ads }}</span>
        <span class="pa-stat__l">Anúncios</span>
      </div>
      <div class="pa-stat" title="Promoções já rodando no Mercado Livre">
        <span class="pa-stat__v">{{ metrics.active }}</span>
        <span class="pa-stat__l">Ativas</span>
      </div>
      <div class="pa-stat" title="Promoções candidatas que você ainda não ativou">
        <span class="pa-stat__v">{{ metrics.available }}</span>
        <span class="pa-stat__l">Faltam ativar</span>
      </div>
      <!-- "Sem dados" e não "Bloqueadas": no dock de resumo "bloqueadas" quer
           dizer "selecionadas que não passam nos pisos" — outro significado. -->
      <div class="pa-stat" title="Promoções sem CMV, tarifa ou preço — não dá para calcular a margem">
        <span class="pa-stat__v">{{ metrics.blocked }}</span>
        <span class="pa-stat__l">Sem dados</span>
      </div>
      <span class="pa-stats__scope">
        desta página<template v-if="adsTotal > visibleAdCount"> · {{ adsTotal }} no catálogo</template>
      </span>
    </div>

    <!-- Barra fixa: modo, agrupamento, filtros e controles de árvore -->
    <div class="pa-bar">
      <div class="pa-bar__in">
        <q-btn-toggle
          v-model="actionMode"
          :options="[
            { label: 'Ativar propostas', value: 'activate', icon: 'bolt' },
            { label: 'Remover ativas', value: 'remove', icon: 'delete_outline' },
          ]"
          no-caps unelevated toggle-color="primary" color="grey-2" text-color="grey-8"
        />
        <q-btn-toggle
          v-if="!sortedFlat"
          v-model="view"
          :options="[
            { label: 'Por anúncios', value: 'ads' },
            { label: 'Por SKU', value: 'sku' },
          ]"
          no-caps unelevated toggle-color="primary" color="grey-2" text-color="grey-8"
        />
        <span class="pa-bar__hint">{{ barHint }}</span>
        <q-space />
        <span class="pa-bar__count">
          {{ visibleAdCount }}<template v-if="adsTotal > visibleAdCount">/{{ adsTotal }}</template> anúncios
        </span>
        <q-btn
          flat dense no-caps size="sm" icon="tune" label="Filtros"
          :color="filtersOpen ? 'primary' : 'grey-7'"
          @click="filtersOpen = !filtersOpen"
        >
          <q-badge v-if="activeFilterChips.length" color="teal" floating>{{ activeFilterChips.length }}</q-badge>
        </q-btn>
        <q-btn flat dense no-caps size="sm" label="Expandir" @click="expandTick++" />
        <q-btn flat dense no-caps size="sm" label="Recolher" @click="collapseTick++" />
      </div>
    </div>

    <!-- Filtros: recolhidos por padrão, logo abaixo da barra -->
    <div v-show="filtersOpen" class="pf">
      <section class="pf__section">
        <header class="pf__head">
          <q-icon name="search" size="15px" />
          <span>Buscar anúncios</span>
        </header>
        <div class="pf__grid">
          <q-select
            v-model="filters.account_id"
            :options="accountOptions"
            emit-value map-options clearable outlined dense
            label="Conta Mercado Livre"
            :loading="accountsLoading"
            class="pf__field pf__field--lg"
            @update:model-value="reload"
          />
          <q-input
            v-model="filters.q"
            outlined dense clearable
            label="Título, SKU ou MLB"
            class="pf__field pf__field--lg"
            @keyup.enter="reload"
            @clear="reload"
          >
            <template #prepend><q-icon name="search" size="18px" /></template>
          </q-input>
          <q-input
            v-model="filters.sku"
            outlined dense clearable
            label="SKU exato"
            class="pf__field"
            @keyup.enter="reload"
            @clear="reload"
          />
          <q-select
            v-model="filters.status"
            :options="STATUS_OPTIONS"
            emit-value map-options clearable outlined dense
            label="Status da promoção"
            class="pf__field"
            @update:model-value="reload"
          />
          <q-select
            v-model="filters.promotion_type"
            :options="PROMOTION_TYPE_OPTIONS"
            emit-value map-options clearable outlined dense
            label="Tipo da promoção"
            class="pf__field"
            @update:model-value="reload"
          />
        </div>
      </section>

      <section class="pf__section">
        <header class="pf__head">
          <q-icon name="tune" size="15px" />
          <span>Margem, lucro e ordenação</span>
          <span class="pf__head-hint">varre o catálogo inteiro no servidor</span>
        </header>
        <div class="pf__grid">
          <q-input
            v-model.number="filters.minMargin"
            type="number" outlined dense clearable debounce="500"
            label="Margem alvo (%)"
            hint="Filtra e trava a ativação"
            class="pf__field pf__field--sm"
            @update:model-value="reload"
          />
          <q-input
            v-model.number="filters.minProfit"
            type="number" outlined dense clearable debounce="500"
            label="Lucro mínimo (R$)"
            class="pf__field pf__field--sm"
            @update:model-value="reload"
          />
          <q-select
            v-model="filters.sort"
            :options="SORT_OPTIONS"
            emit-value map-options clearable outlined dense
            label="Ordenar por"
            class="pf__field"
            @update:model-value="reload"
          />
          <label class="pf__toggle">
            <q-toggle v-model="filters.onlyEstimable" dense color="primary" @update:model-value="reload" />
            <span>Somente calculáveis</span>
          </label>
        </div>
      </section>
    </div>

    <!-- Filtros ativos: continuam visíveis com o painel recolhido -->
    <div v-if="activeFilterChips.length" class="pf-active">
      <q-chip
        v-for="chip in activeFilterChips"
        :key="chip.key"
        dense removable color="teal-1" text-color="teal-9"
        @remove="chip.clear()"
      >
        {{ chip.label }}
      </q-chip>
      <q-btn flat dense no-caps size="sm" color="grey-7" label="Limpar todos" @click="clearFilters" />
    </div>

    <!-- Avisos de origem dos dados: uma linha, não um banner colorido -->
    <p v-if="scanInfo && scanInfo.exhausted" class="pa-note">
      <q-icon name="travel_explore" size="14px" />
      Varredura ao vivo: {{ scanInfo.matched }} proposta(s) em {{ scanInfo.scanned }} de
      {{ scanInfo.scan_total }} anúncios. Filtre por <strong>conta</strong> ou <strong>busca</strong>
      para varrer o restante.
    </p>
    <p v-else-if="snapshotInfo && snapshotInfo.computed_at" class="pa-note">
      <q-icon name="cloud_done" size="14px" />
      Filtro e ordenação sobre o catálogo inteiro — dados de
      <strong>{{ new Date(snapshotInfo.computed_at).toLocaleString('pt-BR') }}</strong>.
      <template v-if="snapshotInfo.stale">Atualizando em segundo plano.</template>
      Ativação e remoção consultam o Mercado Livre na hora.
    </p>

    <!-- Erros -->
    <p v-if="error" class="pa-note pa-note--error">
      <q-icon name="error_outline" size="14px" />
      {{ error }}
    </p>
    <p v-if="skipped.length" class="pa-note pa-note--warn">
      <q-icon name="warning_amber" size="14px" />
      {{ skipped.length }} anúncio(s) não puderam ser consultados no Mercado Livre. Os demais
      resultados seguem disponíveis.
    </p>

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

    <!--
      Lista: UMA tabela para a página inteira. O <thead> é único e fica fixo
      no scroll; PromotionsAdsGroup devolve <tbody> (conta + anúncios). Antes
      cada anúncio era um card com borda, sombra e seu próprio <thead> de
      10 colunas repetido.
    -->
    <div v-else class="pa-tablewrap">
      <table class="pa-table">
        <thead class="pa-thead">
          <tr>
            <th class="c-pick"></th>
            <th class="c-type" title="Tipo de campanha do Mercado Livre">Promoção</th>
            <th class="c-disc" title="% de desconto sobre o preço atual do anúncio. 'ML min' = o menor desconto que essa campanha aceita. Digite outro valor para simular.">Desconto</th>
            <th class="c-price num" title="Preço que o comprador vê depois do desconto">Preço final</th>
            <th class="c-fee num" title="Comissão do Mercado Livre sobre o preço final">Tarifa ML</th>
            <th class="c-ship num" title="Frete pago pelo vendedor (estimado do histórico de envios)">Frete</th>
            <th class="c-cmv num" title="Custo da mercadoria vendida (vem do ERP)">CMV</th>
            <th class="c-profit num" title="Preço final − tarifa − frete − CMV, por unidade">Lucro/un</th>
            <th class="c-margin num" title="Lucro ÷ preço final. Passe o mouse para comparar com o alvo.">Margem</th>
            <th class="c-sit" title="Apta = passa nos pisos de margem/lucro. Ativa/Processando = estado atual no ML.">Situação</th>
          </tr>
        </thead>

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
          :editing-busy-key="editingBusyKey"
          @toggle="onToggle"
          @set-discount="onSetDiscount"
          @select-many="onSelectMany"
          @clear-ad="onClearAd"
          @toggle-removal="onToggleRemoval"
          @remove-one="onRemoveOne"
          @edit-active="onEditActive"
        />
      </table>
    </div>

    <div v-if="nextCursor" class="promo-ads__more">
      <q-btn outline no-caps label="Carregar mais" :loading="loadingMore" @click="loadMore" />
    </div>

    <!-- Resumo da seleção (ativar) -->
    <transition name="promo-ads-fade">
      <div v-if="actionMode === 'activate' && summary.total" class="promo-ads__summary">
        <div class="promo-ads__summary-row">
          <div class="promo-ads__summary-main">
            <div class="promo-ads__summary-headline">
              <strong>{{ summary.total }}</strong> promoção(ões) selecionada(s)
            </div>
            <div class="promo-ads__summary-scope">
              {{ summary.ads }} anúncios · {{ summary.skus }} SKUs · {{ summary.accounts }} contas
            </div>
          </div>
          <div class="promo-ads__summary-flags">
            <SbBadge variant="green">{{ summary.eligibleCount }} aptas</SbBadge>
            <SbBadge variant="amber">{{ summary.blockedCount }} bloqueadas</SbBadge>
            <span v-if="thresholds.minMarginPct != null" class="promo-ads__summary-lock">
              Margem alvo: {{ thresholds.minMarginPct }}%
            </span>
          </div>
        </div>

        <div class="promo-ads__summary-row">
          <div class="promo-ads__summary-stats">
            <span>Preço médio <strong>{{ brl(summary.avgPrice) }}</strong></span>
            <span>Desconto médio <strong>{{ pct(summary.avgDiscountPct) }}</strong></span>
            <span>Lucro médio <strong>{{ brl(summary.avgProfit) }}</strong></span>
            <span>Margem média <strong>{{ pct(summary.avgMarginPct) }}</strong></span>
          </div>
          <div v-if="editableSelectedKeys.length" class="promo-ads__summary-bulk">
            <span>Aplicar</span>
            <input v-model.number="bulkDiscount" type="number" min="1" max="99" step="0.5" class="promo-ads__bulk-input" />
            <span>% a {{ editableSelectedKeys.length }} editável(is)</span>
            <q-btn dense flat no-caps color="primary" label="Aplicar" @click="applyBulkDiscount" />
          </div>
          <div class="promo-ads__summary-actions">
            <q-btn flat no-caps label="Limpar" @click="clearSelection" />
            <q-btn color="primary" no-caps :label="`Revisar ${summary.eligibleCount} ativações`" @click="reviewOpen = true" />
          </div>
        </div>
      </div>
    </transition>

    <!-- Resumo da seleção (remover) -->
    <transition name="promo-ads-fade">
      <div v-if="actionMode === 'remove' && removalSummary.total" class="promo-ads__summary promo-ads__summary--danger">
        <div class="promo-ads__summary-row">
          <div class="promo-ads__summary-main">
            <div class="promo-ads__summary-headline">
              <strong>{{ removalSummary.total }}</strong> promoção(ões) ativa(s) a remover
            </div>
            <div class="promo-ads__summary-scope">
              {{ removalSummary.ads }} anúncios · {{ removalSummary.accounts }} contas
            </div>
          </div>
          <div class="promo-ads__summary-flags">
            <span v-for="(n, t) in removalSummary.byType" :key="t" class="promo-ads__summary-lock">
              {{ typeLabel(t) }}: <strong>{{ n }}</strong>
            </span>
          </div>
        </div>
        <div class="promo-ads__summary-row">
          <div class="promo-ads__summary-actions">
            <q-btn flat no-caps label="Limpar seleção" @click="clearRemovalSelection" />
            <q-btn color="negative" no-caps label="Revisar remoção" @click="reviewOpen = true" />
          </div>
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
import SbBadge from 'src/components/common/SbBadge.vue'
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
  selectionKey,
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
const editingBusyKey = ref(null) // promotionKey da linha em "editar %" (bloqueia ações nela)
const reviewOpen = ref(false)
const filtersOpen = ref(false)
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
const sortLabel = (v) => SORT_OPTIONS.find((o) => o.value === v)?.label || v

const barHint = computed(() => {
  if (actionMode.value === 'remove') return 'Marque as ativas que quer remover'
  if (sortedFlat.value) return 'Lista ordenada — uma proposta por anúncio'
  return view.value === 'sku' ? 'Agrupado por SKU' : 'Agrupado por conta'
})

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

// --- Editar % de UMA promoção já ativa (PRICE_DISCOUNT/DOD) ---
function onEditActive ({ row, promo }) {
  const key = selectionKey(row, promo)
  const currentPct = promo.financials?.discount_pct ?? null
  $q.dialog({
    title: 'Editar desconto ativo',
    message: `Novo % de desconto para <b>${promo.typeLabel || promo.promotion_type}</b> em <b>${row.title}</b>.`
      + '<br><span style="font-size:12px;color:#64748b">O Mercado Livre não edita direto: o SellerBot remove o desconto '
      + 'atual e reativa com o novo % na sequência. Leva ~15-20s.</span>',
    html: true, cancel: 'Cancelar',
    prompt: {
      model: currentPct !== null ? String(currentPct) : '', type: 'number',
      isValid: (v) => Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) < 100,
    },
    ok: { label: 'Atualizar', color: 'primary', noCaps: true },
  }).onOk(async (val) => {
    const pct = Number(val)
    editingBusyKey.value = key
    try {
      const { data } = await MercadoLivreService.editActivePromotionAdDiscount({
        confirmed: true, account_id: row.account_id, item_id: row.item_id,
        promotion_type: promo.promotion_type, discount_pct: pct,
      })
      if (data.success) {
        $q.notify({
          color: 'positive', timeout: 7000,
          message: `Desconto atualizado: ${formatBRL(data.old_price)} → ${formatBRL(data.deal_price)} (${pct}%).`,
        })
      } else {
        $q.notify({ color: 'negative', multiLine: true, timeout: 9000, message: data.message || 'Não foi possível atualizar o desconto.' })
      }
      await reload()
    } catch (err) {
      $q.notify({
        color: 'negative', multiLine: true, timeout: 9000,
        message: err.response?.data?.message || err.response?.data?.error || 'Falha ao editar o desconto.',
      })
    } finally {
      editingBusyKey.value = null
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
@import 'src/css/tokens';

// Respiro para o dock fixo de resumo (2 linhas + margem inferior). Se o dock
// ganhar uma terceira linha, este valor precisa subir.
$pa-dock-clearance: 120px;

/* Alturas fixas: o cabeçalho da tabela e a linha da conta são sticky e
   precisam saber exatamente onde a barra termina. Daí as CSS vars.

   `--pa-top` é a altura do header do app, que é FIXO (`view="hHh lpR fFf"`
   tem `H` maiúsculo → Quasar aplica `fixed-top` ao <q-header>). O conteúdo da
   página rola por baixo dele, então todo `top:` deste stack precisa somar
   esse valor — sem isso a barra fica escondida atrás do header. */
.promo-ads {
  --pa-top: #{$app-header-h};
  --pa-bar-h: 52px;
  --pa-head-h: 34px;
  max-width: 1400px;
  margin-inline: auto;
}

/* ---------- faixa de métricas ---------- */
.pa-stats {
  display: flex; align-items: baseline; flex-wrap: wrap; gap: $space-3 $space-6;
  padding: $space-3 $space-5;
  margin: $space-4 0 $space-3;
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius-md;
}
.pa-stat { display: flex; align-items: baseline; gap: 7px; }
.pa-stat__v { font-size: $text-h2-size; font-weight: $font-bold; color: $text-primary; font-variant-numeric: tabular-nums; }
.pa-stat__l { font-size: $text-xs-size; color: $text-muted; }
.pa-stats__scope { margin-left: auto; font-size: $text-xs-size; color: $text-disabled; }

/* ---------- barra fixa ---------- */
/* Sem sangria: todo o conteúdo da página já vive dentro do padding do
   q-page, então a barra na largura exata da coluna cobre tudo o que rola
   por baixo dela — e fica alinhada com a tabela. */
.pa-bar {
  position: sticky;
  top: var(--pa-top);
  z-index: 30;
  height: var(--pa-bar-h);
  background: $surface;
  border-top: 1px solid $border;
  border-bottom: 1px solid $border;
}
.pa-bar__in {
  height: 100%;
  display: flex; align-items: center; gap: $space-3;
  overflow-x: auto;
  .q-btn-toggle { border: 1px solid $border; border-radius: $radius-md; flex: none; }
}
.pa-bar__hint { font-size: $text-xs-size; color: $text-muted; white-space: nowrap; }
.pa-bar__count { font-size: $text-xs-size; color: $text-muted; white-space: nowrap; flex: none; }

/* ---------- filtros ---------- */
.pf {
  padding: $space-2 $space-4 $space-3;
  background: $surface-2;
  border-bottom: 1px solid $border;
}
.pf__section { padding: $space-4 0 0; }
.pf__head {
  display: flex; align-items: baseline; gap: 7px;
  margin-bottom: $space-3;
  font-size: $text-small-size; font-weight: $font-bold; color: $text-body;
  .q-icon { color: $primary; align-self: center; }
}
.pf__head-hint { font-size: $text-xs-size; font-weight: $font-regular; color: $text-muted; }
.pf__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: $space-4;
  align-items: start;
}
.pf__field { min-width: 0; }
@media (min-width: 760px) {
  .pf__field--lg { grid-column: span 2; }
}
.pf__field--sm :deep(.q-field__native) { text-align: right; }
.pf__toggle {
  display: flex; align-items: center; gap: 8px;
  align-self: center;
  font-size: $text-small-size; color: $text-muted; cursor: pointer;
  white-space: nowrap;
}

.pf-active {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  padding: $space-3 $space-4;
  background: $surface;
  border: 1px solid $border;
  border-top: none;
}

/* ---------- avisos (uma linha, sem caixa colorida) ---------- */
.pa-note {
  display: flex; align-items: flex-start; gap: 7px;
  margin: $space-3 0 0;
  font-size: $text-xs-size; color: $text-muted; line-height: 1.5;
  strong { color: $text-body; }
  .q-icon { flex: none; margin-top: 2px; }
}
.pa-note--error { color: $tint-red-text; strong { color: $tint-red-text; } }
.pa-note--warn { color: $tint-amber-text; strong { color: $tint-amber-text; } }

/* ---------- tabela única ---------- */
.pa-tablewrap { margin-top: $space-3; }
.pa-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  font-size: $text-small-size;
  color: $text-body;
}
.pa-table :deep(.num) { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }

/* Larguras em % para o <thead> e as <tbody> (componente filho) alinharem
   exatamente. Precisam somar 100% — com table-layout:fixed o que sobrar
   seria redistribuído e as colunas desalinhariam. */
.pa-table :deep(.c-pick)   { width: 4%; }
.pa-table :deep(.c-type)   { width: 16.5%; }
.pa-table :deep(.c-disc)   { width: 13%; }
.pa-table :deep(.c-price)  { width: 9%; }
.pa-table :deep(.c-fee)    { width: 8%; }
.pa-table :deep(.c-ship)   { width: 7%; }
.pa-table :deep(.c-cmv)    { width: 7%; }
.pa-table :deep(.c-profit) { width: 9%; }
.pa-table :deep(.c-margin) { width: 8.5%; }
.pa-table :deep(.c-sit)    { width: 18%; }

/* separadores entre os grupos de colunas (entrada / preço / custos / resultado) */
.pa-table :deep(.c-price),
.pa-table :deep(.c-profit),
.pa-table :deep(.c-sit) { border-left: 1px solid $border; }

.pa-thead th {
  position: sticky;
  top: calc(var(--pa-top) + var(--pa-bar-h));
  z-index: 3;
  height: var(--pa-head-h);
  padding: 0 $space-2;
  text-align: left;
  font-size: $text-xs-size; font-weight: $font-bold;
  text-transform: uppercase; letter-spacing: 0.03em;
  color: $text-muted;
  background: $surface-2;
  border-top: 1px solid $border-strong;
  border-bottom: 1px solid $border-strong;
  white-space: nowrap;
}
/* Só as colunas que realmente têm `title` ganham cursor de ajuda — a coluna
   do checkbox (`.c-pick`) não tem tooltip e não deve fingir que tem. */
.pa-thead th[title] { cursor: help; }
.pa-thead th.num { text-align: right; }

/* Abaixo de 1100px as três colunas de custo saem; as larguras precisam
   ser recalculadas (somando 100%) ou as colunas restantes ficam tortas. */
@media (max-width: 1100px) {
  .pa-table :deep(.c-fee),
  .pa-table :deep(.c-ship),
  .pa-table :deep(.c-cmv) { display: none; }

  .pa-table :deep(.c-pick)   { width: 5%; }
  .pa-table :deep(.c-type)   { width: 22%; }
  .pa-table :deep(.c-disc)   { width: 17%; }
  .pa-table :deep(.c-price)  { width: 12%; }
  .pa-table :deep(.c-profit) { width: 12%; }
  .pa-table :deep(.c-margin) { width: 11%; }
  .pa-table :deep(.c-sit)    { width: 21%; }
}

/* Telas estreitas: sticky atrapalha mais do que ajuda, e a tabela passa a
   rolar na horizontal. overflow-x cria um container de scroll, então o
   sticky precisa ser desligado junto — inclusive o da linha de conta, que
   mora no componente filho e por isso precisa de :deep(). */
@media (max-width: 900px) {
  .pa-bar { position: static; }
  .pa-thead th { position: static; }
  .pa-table :deep(.pa-acctrow td) { position: static; }
  .pa-tablewrap { overflow-x: auto; }
  .pa-table { min-width: 880px; }
}

.promo-ads__more { text-align: center; margin: $space-5 0 $pa-dock-clearance; }

/* ---------- dock de resumo ---------- */
.promo-ads__summary {
  --sb-x: -50%;
  position: fixed;
  left: 50%;
  bottom: $space-4;
  transform: translateX(var(--sb-x));
  width: min(1320px, calc(100vw - 48px));
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  padding: $space-3 $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-3;
  z-index: 3000;
}
@media (min-width: 769px) {
  .promo-ads__summary {
    --sb-x: calc(-50% + 124px);
    width: min(1320px, calc(100vw - 248px - 48px));
  }
}
.promo-ads__summary-row {
  display: flex; align-items: center; gap: $space-5; flex-wrap: wrap;
}
.promo-ads__summary-main { flex: 1; min-width: 220px; }
.promo-ads__summary-headline { font-size: $text-body-size; color: $text-body; strong { color: $text-primary; font-size: $text-h3-size; } }
.promo-ads__summary-scope { font-size: $text-xs-size; color: $text-muted; }
.promo-ads__summary-flags { display: flex; align-items: center; gap: $space-2; flex-wrap: wrap; }
.promo-ads__summary-lock { font-size: $text-xs-size; color: $text-muted; strong { color: $text-body; } }

.promo-ads__summary-stats {
  display: flex; flex-wrap: wrap; gap: 4px $space-5;
  font-size: $text-xs-size; color: $text-muted;
  strong { color: $text-primary; }
}
.promo-ads__summary-bulk {
  display: flex; align-items: center; gap: $space-2;
  font-size: $text-xs-size; color: $text-muted;
  padding: $space-1 $space-3; background: $surface-2; border-radius: $radius-md;
}
.promo-ads__bulk-input {
  width: 58px; padding: $space-1 $space-2; border: 1px solid $border-strong; border-radius: $radius-sm;
  font-size: $text-xs-size; font-weight: $font-bold; text-align: right; color: $text-primary;
}
.promo-ads__summary-actions { display: flex; gap: $space-2; margin-left: auto; }

/* variante perigo (modo remover): borda vermelha + fundo levemente tintado */
.promo-ads__summary--danger {
  border-color: $negative;
  background: $tint-red-bg;
  .promo-ads__summary-headline { color: $negative; }
}

.promo-ads-fade-enter-active,
.promo-ads-fade-leave-active { transition: opacity $transition-base, transform $transition-base; }
.promo-ads-fade-enter-from,
.promo-ads-fade-leave-to { opacity: 0; transform: translate(var(--sb-x), 12px); }
</style>
