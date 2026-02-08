<template>
  <q-page class="bg-grey-2">
    <div class="q-pa-md">
      <q-card flat class="bg-white shadow-2 rounded-borders">

        <q-card-section class="bg-white q-py-md q-px-lg border-bottom">
          <div class="row items-center justify-between">
            <div class="row items-center">
              <div class="q-mr-md bg-indigo-6 text-white q-pa-sm rounded-borders shadow-2">
                <q-icon name="inventory_2" size="sm" />
              </div>
              <div>
                <div class="text-caption text-grey-7 text-weight-medium text-uppercase">Gestão de Vendas</div>
                <div class="text-h6 text-grey-9 text-weight-bold" style="line-height: 1.1;">
                  Gestão de Anúncios
                </div>
              </div>
            </div>
            <div class="row q-gutter-sm">
              <q-btn unelevated color="indigo-6" text-color="white" icon="refresh" label="Atualizar"
                @click="refreshData" :loading="loading" />
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pa-md bg-grey-1 border-bottom">
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-md-4">
              <q-input v-model="filters.search" debounce="600" placeholder="Buscar (Título, SKU, MLB)..." outlined dense
                bg-color="white" clearable @update:model-value="resetPagination">
                <template v-slot:prepend><q-icon name="search" class="text-grey-5" /></template>
              </q-input>
            </div>

            <div class="col-12 col-md-3">
              <q-select v-model="filters.account" :options="accountOptions" option-value="id" option-label="nickname"
                label="Conta" outlined dense bg-color="white" emit-value map-options multiple use-chips clearable
                @update:model-value="resetPagination" />
            </div>

            <div class="col-12 col-md-3">
              <q-select v-model="filters.logistic_type" :options="logisticOptions" option-value="value"
                option-label="label" label="Logística" outlined dense bg-color="white" emit-value map-options multiple
                use-chips clearable @update:model-value="resetPagination" />
            </div>

            <div class="col-12 col-md-2">
              <q-btn flat color="grey-7" icon="filter_list" label="Mais Filtros" class="full-width"
                @click="showAdvancedFilters = !showAdvancedFilters" />
            </div>
          </div>

          <div v-if="showAdvancedFilters" class="q-mt-md">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-md-3">
                <q-select v-model="filters.status" :options="statusOptions" option-value="value" option-label="label"
                  label="Status" outlined dense bg-color="white" emit-value map-options multiple use-chips clearable
                  @update:model-value="resetPagination" />
              </div>

              <div class="col-12 col-md-3">
                <q-select v-model="filters.stockStatus" :options="stockOptions" option-value="value"
                  option-label="label" label="Estoque" outlined dense bg-color="white" emit-value map-options clearable
                  @update:model-value="resetPagination" />
              </div>

              <div class="col-12 col-md-3">
                <q-select v-model="filters.is_flex" :options="flexOptions" option-value="value" option-label="label"
                  label="Flex" outlined dense bg-color="white" emit-value map-options clearable
                  @update:model-value="resetPagination" />
              </div>

              <div class="col-6 col-md-1.5">
                <q-input v-model.number="filters.priceMin" type="number" label="Preço mín" outlined dense
                  bg-color="white" clearable debounce="600" @update:model-value="resetPagination" />
              </div>

              <div class="col-6 col-md-1.5">
                <q-input v-model.number="filters.priceMax" type="number" label="Preço máx" outlined dense
                  bg-color="white" clearable debounce="600" @update:model-value="resetPagination" />
              </div>
            </div>

            <div class="row q-mt-sm q-gutter-x-sm">
              <q-badge color="orange-1" text-color="orange-9" class="cursor-pointer q-py-xs hover-badge"
                @click="setFilterFullNoStock">
                🔥 Full Sem Estoque
              </q-badge>
              <q-badge color="blue-1" text-color="blue-9" class="cursor-pointer q-py-xs hover-badge"
                @click="setFilterOpportunityFlex">
                💰 Oportunidade Flex
              </q-badge>
              <q-space />
              <q-btn flat color="grey-8" icon="filter_alt_off" label="Limpar Tudo" size="sm" @click="clearFilters" />
            </div>
          </div>
        </q-card-section>

        <transition name="slide-fade">
          <q-card-section v-if="showMagicLink" class="q-pa-md bg-orange-1 border-bottom">
            <div class="row items-center q-col-gutter-md">
              <div class="col-12 col-md-auto text-center">
                <q-icon name="warning_amber" color="deep-orange" size="lg" />
              </div>
              <div class="col-12 col-md">
                <div class="text-subtitle1 text-weight-bold text-deep-orange-9">
                  Ação Necessária na conta: {{ selectedAccountName }}
                </div>
                <div class="text-caption text-grey-9">
                  Você está filtrando itens <b>FULL sem estoque</b>. Utilize o link abaixo para acessar a gestão de
                  retirada do Mercado Livre e evitar cobranças de armazenagem prolongada.
                </div>
              </div>
              <div class="col-12 col-md-5">
                <q-input outlined dense readonly bg-color="white" :model-value="magicLinkUrl">
                  <template v-slot:append>
                    <q-btn unelevated color="primary" label="Copiar" icon="content_copy" @click="copyMagicLink"
                      size="sm" class="q-mr-sm" />
                    <q-btn flat round color="grey-7" icon="open_in_new" type="a" :href="magicLinkUrl" target="_blank" />
                  </template>
                </q-input>
              </div>
            </div>
          </q-card-section>
        </transition>

        <q-table :rows="items" :columns="columns" row-key="item_id" flat :loading="loading"
          v-model:pagination="pagination" @request="onRequest" binary-state-sort
          class="sticky-header-table my-custom-table" no-data-label="Nenhum anúncio encontrado.">

          <template v-slot:header="props">
            <q-tr :props="props" class="bg-grey-2 text-grey-8 text-uppercase text-caption">
              <q-th auto-width />
              <q-th v-for="col in props.cols" :key="col.name" :props="props" class="text-weight-bold">
                {{ col.label }}
              </q-th>
            </q-tr>
          </template>

          <template v-slot:body="props">
            <q-tr :props="props" :class="props.expand ? 'bg-indigo-1' : 'hover-row'" class="cursor-pointer">

              <q-td auto-width class="q-py-md">
                <q-btn size="sm" flat round :color="props.expand ? 'indigo' : 'grey-6'" @click.stop="
                  props.expand = !props.expand;
                if (props.expand) ensureItemDetail(props.row)
                  " :icon="props.expand ? 'expand_less' : 'expand_more'" />
              </q-td>

              <q-td key="thumbnail" :props="props" style="width: 70px">
                <div class="relative-position">
                  <q-img :src="props.row.thumbnail" style="height: 50px; width: 50px" fit="contain"
                    class="rounded-borders border-grey" />
                  <div class="absolute-bottom-right" style="transform: translate(20%, 20%);">
                    <q-icon v-if="props.row.status === 'paused'" name="pause_circle" color="orange" size="18px"
                      class="bg-white rounded-borders" />
                    <q-icon v-if="props.row.status === 'active'" name="check_circle" color="positive" size="18px"
                      class="bg-white rounded-borders" />
                  </div>
                </div>
              </q-td>

              <q-td key="title" :props="props" style="max-width: 350px; white-space: normal;">
                <div class="column q-gutter-y-xs">
                  <a :href="props.row.permalink" target="_blank" class="text-grey-9 text-weight-bold hover-link"
                    style="font-size: 13px; line-height: 1.3;">
                    {{ props.row.title }}
                  </a>

                  <div class="row items-center q-gutter-x-sm text-caption">
                    <span v-if="props.row.sku"
                      class="bg-grey-3 text-grey-8 q-px-xs rounded-borders font-mono cursor-pointer"
                      @click.stop="copyText(props.row.sku)">
                      {{ props.row.sku }}
                    </span>

                    <span class="bg-grey-3 text-grey-8 q-px-xs rounded-borders font-mono cursor-pointer"
                      @click.stop="copyText(props.row.item_id)" title="Clique para copiar o MLB">
                      {{ props.row.item_id }}
                    </span>

                    <span class="text-indigo-6 text-weight-bold">
                      <q-icon name="store" size="10px" /> {{ props.row.account_nickname }}
                    </span>

                    <q-badge v-if="props.row.listing_type_id === 'gold_pro'" outline color="yellow-9" label="Premium"
                      size="xs" class="self-start" />
                    <q-badge v-else outline color="grey-6" label="Clássico" size="xs" class="self-start" />

                    <q-badge v-if="props.row.catalog_listing" outline color="indigo" label="CATÁLOGO"
                      class="text-weight-bold" />
                  </div>

                  <div class="row q-gutter-x-md q-mt-xs">
                    <div class="row items-center text-caption">
                      <q-icon name="inventory" size="xs" class="q-mr-xs text-grey-6" />
                      <span :class="props.row.available_quantity > 0 ? 'text-grey-9' : 'text-red text-weight-bold'">
                        {{ props.row.available_quantity }} un
                      </span>
                    </div>
                    <div class="row items-center text-caption">
                      <q-icon name="shopping_cart" size="xs" class="q-mr-xs text-grey-6" />
                      <span class="text-grey-9">{{ props.row.sold_quantity }} vendas</span>
                    </div>
                  </div>

                  <div class="row q-gutter-x-xs q-mt-xs" v-if="getPromotions(props.row).length > 0">
                    <q-badge v-for="promo in getPromotions(props.row)" :key="promo" color="purple-1"
                      text-color="purple-9" class="text-weight-bold q-py-xs">
                      <q-icon name="local_offer" size="10px" class="q-mr-xs" /> {{ promo }}
                    </q-badge>
                  </div>
                </div>
              </q-td>

              <q-td key="health" :props="props" align="center">
                <div v-if="getQualityWarnings(props.row).length === 0">
                  <q-chip dense :color="getHealthColor(props.row)" :text-color="getHealthTextColor(props.row)"
                    icon="verified">
                    {{ formatHealth(props.row.health) }}
                  </q-chip>
                </div>
                <div v-else class="cursor-pointer">
                  <q-chip dense :color="getHealthColor(props.row)" :text-color="getHealthTextColor(props.row)"
                    icon="warning">
                    {{ getQualityWarnings(props.row).length }} Avisos • {{ formatHealth(props.row.health) }}
                  </q-chip>
                  <q-tooltip content-class="bg-grey-9 text-white" max-width="300px">
                    <div class="text-weight-bold q-mb-xs">Correções necessárias:</div>
                    <ul class="q-pl-md q-ma-none text-caption" style="list-style-type: disc;">
                      <li v-for="w in getQualityWarnings(props.row)" :key="w">{{ w }}</li>
                    </ul>
                  </q-tooltip>
                </div>
              </q-td>

              <q-td key="logistic_type" :props="props" align="left">
                <div class="column q-gutter-y-xs">
                  <div class="row items-center no-wrap">
                    <q-icon :name="getLogisticMeta(props.row.logistic_type).icon"
                      :color="getLogisticMeta(props.row.logistic_type).color" size="xs" class="q-mr-sm" />
                    <div class="column">
                      <span class="text-weight-medium text-caption">
                        {{ getLogisticMeta(props.row.logistic_type).label }}
                      </span>
                    </div>
                    <q-icon name="info_outline" size="xs" class="q-ml-sm text-grey-6">
                      <q-tooltip content-class="bg-grey-9 text-white" max-width="260px">
                        {{ getLogisticMeta(props.row.logistic_type).helper }}
                      </q-tooltip>
                    </q-icon>
                  </div>
                  <div class="row q-gutter-x-xs">
                    <q-badge v-if="props.row.is_flex" outline color="purple-6" label="Flex" size="xs" />
                    <q-badge v-if="props.row.is_full" outline color="green-7" label="Full" size="xs" />
                    <q-badge v-if="props.row.free_shipping" outline color="teal-7" label="Frete Grátis" size="xs" />
                  </div>
                </div>
              </q-td>

              <q-td key="price" :props="props" align="right">
                <div class="column items-end">
                  <div v-if="hasDiscount(props.row)" class="text-strike text-grey-5 text-caption">
                    {{ formatCurrency(getEffectiveRegularPrice(props.row)) }}
                  </div>
                  <div class="text-subtitle1 text-weight-bold text-grey-9">
                    {{ formatCurrency(getEffectivePrice(props.row)) }}
                  </div>
                  <q-badge v-if="hasDiscount(props.row) && getDiscountPct(props.row) != null" color="green-1"
                    text-color="green-9" class="q-mt-xs text-weight-bold text-caption">
                    {{ getDiscountPct(props.row) }}% OFF
                  </q-badge>
                </div>
              </q-td>
            </q-tr>

            <q-tr v-show="props.expand" :props="props">
              <q-td colspan="100%" class="q-pa-none">
                <div class="bg-grey-1 q-pa-md shadow-inner">
                  <div class="row q-col-gutter-lg">
                    <div class="col-12 col-md-8">
                      <div class="text-overline text-grey-7 q-mb-sm">Variações</div>
                      <q-markup-table flat bordered class="bg-white" dense>
                        <thead class="bg-grey-2">
                          <tr>
                            <th class="text-left">Atributo</th>
                            <th class="text-left">SKU</th>
                            <th class="text-center">Estoque</th>
                            <th class="text-right">Preço</th>
                            <th class="text-center">ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-if="isDetailLoading(props.row)">
                            <td colspan="5" class="text-center text-caption text-grey-6 q-pa-md">
                              <q-spinner-dots color="indigo" size="2em" /> Carregando...
                            </td>
                          </tr>
                          <tr v-else-if="getVariations(props.row).length === 0">
                            <td colspan="5" class="text-center text-caption text-grey-6 q-pa-md">
                              Sem variações
                            </td>
                          </tr>
                          <tr v-else v-for="v in getVariations(props.row)" :key="v.variation_id || v.id">
                            <td><q-badge color="grey-3" text-color="black">{{ v.attribute_combination || 'Padrão'
                            }}</q-badge></td>
                            <td class="font-mono text-grey-7">{{ v.sku || '-' }}</td>
                            <td class="text-center"
                              :class="v.available_quantity > 0 ? 'text-green-7 text-bold' : 'text-red'">
                              {{ v.available_quantity }}
                            </td>
                            <td class="text-right">{{ formatCurrency(v.price) }}</td>
                            <td class="text-center font-mono text-caption text-grey-5">
                              {{ v.variation_id || v.id }}
                            </td>
                          </tr>
                        </tbody>
                      </q-markup-table>
                    </div>

                    <div class="col-12 col-md-4" v-if="getQualityWarnings(props.row).length > 0">
                      <div class="text-overline text-red-7 q-mb-sm">Problemas Detectados</div>
                      <q-list dense bordered class="bg-white rounded-borders">
                        <q-item v-for="(warn, idx) in getQualityWarnings(props.row)" :key="idx">
                          <q-item-section avatar min-width>
                            <q-icon name="error_outline" color="red" size="xs" />
                          </q-item-section>
                          <q-item-section class="text-caption text-grey-9">{{ warn }}</q-item-section>
                        </q-item>
                      </q-list>
                    </div>
                  </div>
                </div>
              </q-td>
            </q-tr>

          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { useQuasar, copyToClipboard } from 'quasar'

const $q = useQuasar()
const items = ref([])
const loading = ref(false)

// Opções dinâmicas (Facets)
const availableAccounts = ref([])
const availableStatuses = ref([])
const availableLogistics = ref([])

const showAdvancedFilters = ref(false)

// --- STATE DOS FILTROS ---
const filters = reactive({
  search: '',
  account: [],
  logistic_type: [],
  status: [], // Vazio = Todos (backend entende)
  stockStatus: null,
  is_flex: null,
  priceMin: null,
  priceMax: null
})

const pagination = ref({
  sortBy: 'last_synced_at',
  descending: true,
  page: 1,
  rowsPerPage: 20,
  rowsNumber: 0
})

// --- COMPUTEDS: OPÇÕES INTELIGENTES ---
const accountOptions = computed(() => availableAccounts.value)

const logisticOptions = computed(() => {
  return availableLogistics.value.map(l => ({
    label: LOGISTIC_META[l]?.label || l,
    value: l
  }))
})

// Mapeia status do banco para Label bonita
const STATUS_LABELS = {
  active: 'Ativo', paused: 'Pausado', closed: 'Fechado', under_review: 'Em Revisão', inactive: 'Inativo'
}
const statusOptions = computed(() => {
  return availableStatuses.value.map(s => ({
    label: STATUS_LABELS[s] || s,
    value: s
  }))
})

// Opções estáticas
const stockOptions = [
  { label: 'Todos', value: null },
  { label: 'Sem estoque (0)', value: 'zero' },
  { label: 'Com estoque (>0)', value: 'positive' }
]

const flexOptions = [
  { label: 'Todos', value: null },
  { label: 'Flex: Sim', value: true },
  { label: 'Flex: Não', value: false }
]

// --- LINK MÁGICO ---
const magicLinkUrl = "https://www.mercadolivre.com.br/anuncios/lista/space_management?filters=with-fulfillment-with-empty-stock"

const showMagicLink = computed(() => {
  // Mostra se: 1 conta selecionada + Logística Full + Sem Estoque
  return filters.account && filters.account.length === 1 &&
    filters.logistic_type.includes('fulfillment') &&
    filters.stockStatus === 'zero'
})

const selectedAccountName = computed(() => {
  if (!filters.account || filters.account.length !== 1) return ''
  const acc = availableAccounts.value.find(a => a.id === filters.account[0])
  return acc ? acc.nickname : 'Conta'
})

const copyMagicLink = () => {
  copyToClipboard(magicLinkUrl)
    .then(() => $q.notify({ type: 'positive', message: 'Link copiado!', icon: 'content_copy' }))
}

// --- MACROS ---
const setFilterFullNoStock = () => {
  filters.logistic_type = ['fulfillment']
  filters.stockStatus = 'zero'
  // Limpa outros conflitantes
  filters.is_flex = null
  refreshData()
}

const setFilterOpportunityFlex = () => {
  filters.is_flex = false // Não é flex
  filters.status = ['active']
  filters.stockStatus = 'positive' // Tem estoque

  // Tenta selecionar coletas se existir
  if (availableLogistics.value.includes('cross_docking')) {
    filters.logistic_type = ['cross_docking']
  } else {
    filters.logistic_type = []
  }
  refreshData()
}

const clearFilters = () => {
  filters.search = ''
  filters.account = []
  filters.logistic_type = []
  filters.status = []
  filters.stockStatus = null
  filters.is_flex = null
  filters.priceMin = null
  filters.priceMax = null
  refreshData()
}

// --- DATA FETCHING ---
// Função separada apenas para carregar os filtros (Facets)
const loadFilters = async () => {
  try {
    const { data } = await MercadoLivreService.getFacets()
    availableAccounts.value = data.accounts
    availableStatuses.value = data.status || []
    availableLogistics.value = data.logistic_type || []
  } catch (e) {
    console.error('Erro silencioso ao carregar filtros:', e)
    // Não vamos travar a tela se os filtros falharem
  }
}

const refreshData = () => onRequest({ pagination: pagination.value })

const resetPagination = () => { pagination.value.page = 1 }

const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  loading.value = true

  try {
    const params = {
      page,
      page_size: rowsPerPage,
      ordering: descending ? `-${sortBy}` : sortBy,
      search: filters.search || undefined,
      // Arrays
      account: filters.account?.length ? filters.account.join(',') : undefined,
      logistic_type: filters.logistic_type?.length ? filters.logistic_type.join(',') : undefined,
      status: filters.status?.length ? filters.status.join(',') : undefined,
      // Booleanos/Strings
      stock_status: filters.stockStatus || undefined,
      is_flex: filters.is_flex,
      price_min: filters.priceMin,
      price_max: filters.priceMax
    }

    // Limpa undefined
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k])

    const response = await MercadoLivreService.listItems(params)
    items.value = response.data.results || []
    pagination.value.rowsNumber = response.data.count || 0

    // Atualiza estado local da paginacao
    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending

  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Falha ao buscar anúncios' })
  } finally {
    loading.value = false
  }
}

// Watcher inteligente com debounce
let timer
watch(filters, () => {
  pagination.value.page = 1
  clearTimeout(timer)
  timer = setTimeout(refreshData, 400)
}, { deep: true })


// --- METADADOS / HELPERS VISUAIS ---
const LOGISTIC_META = {
  fulfillment: { label: 'Full', helper: 'Estoque no ML', icon: 'bolt', color: 'green-7' },
  cross_docking: { label: 'Coleta', helper: 'ML coleta no seu CD', icon: 'local_shipping', color: 'orange-8' },
  drop_off: { label: 'Agência', helper: 'Postagem em ponto', icon: 'store', color: 'grey-7' },
  xd_drop_off: { label: 'Agência XD', helper: 'Postagem Places', icon: 'store', color: 'blue-grey-7' },
  self_service: { label: 'Flex', helper: 'Envio próprio', icon: 'two_wheeler', color: 'purple-6' }
}

const getLogisticMeta = (type) => LOGISTIC_META[type] || { label: type, icon: 'help', color: 'grey' }

// Detalhes Lazy Load
const detailLoading = ref({})
const isDetailLoading = (row) => !!detailLoading.value[row.item_id]
const ensureItemDetail = async (row) => {
  if (row._detail || detailLoading.value[row.item_id]) return
  detailLoading.value[row.item_id] = true
  try {
    const { data } = await MercadoLivreService.getItem(row.item_id)
    row._detail = data
  } catch (e) { console.error(e) }
  finally { detailLoading.value[row.item_id] = false }
}
const getVariations = (row) => row._detail?.variation_objects || []

// Formatters
const formatCurrency = (val) => val ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val)) : ''
const formatHealth = (h) => h != null ? `${Math.round(Number(h) <= 1 ? Number(h) * 100 : Number(h))}%` : '—'

const getHealthColor = (row) => {
  const h = Number(row.health || 0)
  const pct = h <= 1 ? h * 100 : h
  if (pct >= 99) return 'green-1'
  if (pct >= 80) return 'yellow-1'
  return 'red-1'
}
const getHealthTextColor = (row) => {
  const h = Number(row.health || 0)
  const pct = h <= 1 ? h * 100 : h
  if (pct >= 99) return 'green-9'
  if (pct >= 80) return 'yellow-10'
  return 'red-10'
}

const getPromotions = (row) => {
  const promos = []
  if (row.promotions_info) row.promotions_info.forEach(p => promos.push(p.name || p.type))
  if (!promos.length && row.pricing_details?.deal_ids) promos.push('Oferta')
  return [...new Set(promos)].slice(0, 3)
}

const getQualityWarnings = (row) => {
  if (row.quality_warnings) return row.quality_warnings.map(w => w.message || w)
  return (Number(row.health) < 0.8) ? ['Verifique qualidade'] : []
}

// Helpers de Preço
const getEffectivePrice = (row) => row.effective_price || row.price
const getEffectiveRegularPrice = (row) => row.effective_regular_price || row.original_price || row.base_price
const hasDiscount = (row) => {
  const reg = getEffectiveRegularPrice(row)
  const eff = getEffectivePrice(row)
  return reg && eff && Number(reg) > Number(eff)
}
const getDiscountPct = (row) => {
  const reg = Number(getEffectiveRegularPrice(row))
  const eff = Number(getEffectivePrice(row))
  return (reg && eff && reg > eff) ? Math.round(((reg - eff) / reg) * 100) : null
}
const copyText = (t) => { copyToClipboard(t); $q.notify('Copiado!') }

const columns = [
  { name: 'thumbnail', align: 'center', label: '', field: 'thumbnail' },
  { name: 'title', align: 'left', label: 'PRODUTO', field: 'title' },
  { name: 'health', align: 'center', label: 'QUALIDADE', field: 'health' },
  { name: 'logistic_type', align: 'left', label: 'LOGÍSTICA', field: 'logistic_type' },
  { name: 'price', align: 'right', label: 'PREÇO', field: 'effective_price' }
]

onMounted(() => {
  // 1. Dispara o carregamento dos filtros (em paralelo)
  loadFilters()

  // 2. Dispara o carregamento da tabela IMEDIATAMENTE
  refreshData()
})
</script>

<style scoped>
.my-custom-table :deep(tbody tr td) {
  height: 65px;
}

.hover-link:hover {
  text-decoration: underline;
  color: #3f51b5 !important;
}

.font-mono {
  font-family: 'Roboto Mono', monospace;
  letter-spacing: -0.5px;
}

.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}

.border-grey {
  border: 1px solid #eee;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

.hover-badge:hover {
  filter: brightness(0.95);
}
</style>
