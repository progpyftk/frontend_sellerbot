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
                bg-color="white" clearable>
                <template v-slot:prepend><q-icon name="search" class="text-grey-5" /></template>
              </q-input>
            </div>

            <div class="col-12 col-md-3">
              <q-select v-model="filters.account" :options="accountOptions" option-value="id"
                option-label="account_nickname" label="Conta" outlined dense bg-color="white" emit-value map-options
                multiple use-chips clearable />
            </div>

            <div class="col-12 col-md-3">
              <q-select v-model="filters.logistic_type" :options="logisticOptions" option-value="value"
                option-label="label" label="Logística" outlined dense bg-color="white" emit-value map-options multiple
                use-chips clearable />
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
                  label="Status" outlined dense bg-color="white" emit-value map-options multiple use-chips clearable />
              </div>

              <div class="col-12 col-md-3">
                <q-select v-model="filters.stockStatus" :options="stockOptions" option-value="value"
                  option-label="label" label="Estoque" outlined dense bg-color="white" emit-value map-options
                  clearable />
              </div>

              <div class="col-12 col-md-3">
                <q-select v-model="filters.is_flex" :options="flexOptions" option-value="value" option-label="label"
                  label="Flex" outlined dense bg-color="white" emit-value map-options clearable />
              </div>

              <div class="col-6 col-md-1.5">
                <q-input v-model.number="filters.priceMin" type="number" label="Preço mín" outlined dense
                  bg-color="white" clearable />
              </div>

              <div class="col-6 col-md-1.5">
                <q-input v-model.number="filters.priceMax" type="number" label="Preço máx" outlined dense
                  bg-color="white" clearable />
              </div>
            </div>
          </div>
        </q-card-section>

        <q-table :rows="items" :columns="columns" row-key="item_id" flat :loading="loading"
          v-model:pagination="pagination" @request="onRequest" binary-state-sort
          class="sticky-header-table my-custom-table">
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

              <q-td key="status" :props="props" align="left" style="width: 120px">
                <q-chip dense square :color="props.row.status === 'active' ? 'green-1' : 'orange-1'"
                  :text-color="props.row.status === 'active' ? 'green-9' : 'orange-10'"
                  :icon="props.row.status === 'active' ? 'check_circle' : 'pause_circle'" class="text-caption">
                  {{ props.row.status === 'active' ? 'Ativo' : 'Pausado' }}
                </q-chip>
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

                    <div class="row q-gutter-sm q-mt-xs">
                      <div class="mini-metric">
                        <div class="mini-label">Estoque</div>
                        <div class="mini-value" :class="props.row.available_quantity > 0 ? 'text-grey-9' : 'text-red'">
                          {{ props.row.available_quantity }}
                        </div>
                      </div>

                      <div class="mini-metric">
                        <div class="mini-label">Vendas</div>
                        <div class="mini-value text-grey-9">
                          {{ props.row.sold_quantity }}
                        </div>
                      </div>
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

              <q-td key="catalog" :props="props" align="center">
                <div v-if="props.row.catalog_listing">
                  <q-icon name="layers" color="indigo" size="sm">
                    <q-tooltip>Anúncio de Catálogo (Buy Box)</q-tooltip>
                  </q-icon>
                </div>
                <div v-else>
                  <q-icon name="remove" color="grey-4" size="xs" />
                </div>
              </q-td>

              <q-td key="health" :props="props" align="center">
                <!-- Sem avisos: mostra percentual com cor por score -->
                <div v-if="getQualityWarnings(props.row).length === 0">
                  <q-chip dense :color="getHealthColor(props.row)" :text-color="getHealthTextColor(props.row)"
                    icon="verified">
                    {{ formatHealth(props.row.health) }}
                  </q-chip>
                </div>

                <!-- Com avisos: chip de avisos + tooltip -->
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
                      <span class="text-caption text-grey-6 font-mono">
                        {{ props.row.logistic_type }}
                      </span>
                    </div>
                    <q-icon name="info_outline" size="xs" class="q-ml-sm text-grey-6">
                      <q-tooltip content-class="bg-grey-9 text-white" max-width="260px">
                        {{ getLogisticMeta(props.row.logistic_type).helper }}
                      </q-tooltip>
                    </q-icon>
                  </div>

                  <div class="row q-gutter-x-xs">
                    <q-badge v-if="props.row.listing_type_id === 'gold_pro'" outline color="yellow-9" label="Premium"
                      size="xs" />
                    <q-badge v-else outline color="grey-6" label="Clássico" size="xs" />

                    <q-badge v-if="props.row.is_flex" outline color="purple-6" label="Flex" size="xs" />

                    <q-badge v-if="props.row.is_full" outline color="green-7" label="Full" size="xs" />

                    <q-badge v-if="props.row.free_shipping" outline color="teal-7" label="Frete Grátis" size="xs" />
                  </div>
                </div>
              </q-td>

              <q-td key="available_quantity" :props="props" align="center">
                <div class="text-subtitle2" :class="props.row.available_quantity > 0 ? 'text-grey-9' : 'text-red'">
                  {{ props.row.available_quantity }}
                </div>
                <div class="text-caption text-grey-5">disp.</div>
              </q-td>

              <q-td key="sold_quantity" :props="props" align="center" style="width: 90px">
                <q-badge color="grey-2" text-color="grey-9" class="text-weight-bold">
                  {{ props.row.sold_quantity ?? 0 }}
                </q-badge>
                <div class="text-caption text-grey-5">vend.</div>
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
                              Carregando variações...
                            </td>
                          </tr>

                          <tr v-else-if="getVariations(props.row).length === 0">
                            <td colspan="5" class="text-center text-caption text-grey-6 q-pa-md">
                              Sem variações
                            </td>
                          </tr>

                          <tr v-else v-for="v in getVariations(props.row)" :key="v.variation_id || v.id">
                            <td>{{ v.attribute_combination || 'Padrão' }}</td>
                            <td class="font-mono text-grey-7">{{ v.sku }}</td>
                            <td class="text-center" :class="v.available_quantity > 0 ? 'text-green-7' : 'text-red'">
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
import { ref, onMounted, reactive, watch } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { useQuasar, copyToClipboard } from 'quasar'

const $q = useQuasar()

const items = ref([])
const loading = ref(false)

const accountOptions = ref([])
const showAdvancedFilters = ref(false)

const logisticOptions = ref([
  { label: 'Full (fulfillment)', value: 'fulfillment' },
  { label: 'Coleta / Cross-docking (cross_docking)', value: 'cross_docking' },
  { label: 'Postagem em Agência (drop_off)', value: 'drop_off' },
  { label: 'Postagem em Agência XD (xd_drop_off)', value: 'xd_drop_off' },
  { label: 'Flex / Envio por você (self_service)', value: 'self_service' }
])

const statusOptions = ref([
  { label: 'Ativo', value: 'active' },
  { label: 'Pausado', value: 'paused' }
])

const stockOptions = ref([
  { label: 'Todos', value: null },
  { label: 'Sem estoque (0)', value: 'zero' },
  { label: 'Com estoque (>0)', value: 'positive' }
])

const flexOptions = ref([
  { label: 'Todos', value: null },
  { label: 'Flex: Sim', value: true },
  { label: 'Flex: Não', value: false }
])

const columns = [
  { name: 'thumbnail', align: 'center', label: '', field: 'thumbnail' },
  { name: 'title', align: 'left', label: 'PRODUTO', field: 'title' },
  { name: 'health', align: 'center', label: 'QUALIDADE', field: 'health' },
  { name: 'logistic_type', align: 'left', label: 'LOGÍSTICA', field: 'logistic_type' },
  { name: 'price', align: 'right', label: 'PREÇO', field: 'effective_price' }
]

const filters = reactive({
  search: '',
  account: [],
  logistic_type: [],
  status: ['active', 'paused'],
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

// ---------- Helpers (promo / warnings / variations) ----------

const getPromotions = (row) => {
  const promos = []

  if (row.promotions_info && Array.isArray(row.promotions_info)) {
    row.promotions_info.forEach(p => {
      const name = p?.name || p?.type || p?.id
      if (name) promos.push(String(name))
    })
  }

  if (promos.length === 0 && row.pricing_details && row.pricing_details.deal_ids) {
    row.pricing_details.deal_ids.forEach(() => promos.push('Oferta'))
  }

  // remove duplicados
  return [...new Set(promos)].slice(0, 3)
}

const getQualityWarnings = (row) => {
  if (row.quality_warnings && Array.isArray(row.quality_warnings)) {
    return row.quality_warnings.map(w => (typeof w === 'object' ? (w.message || w.reason || JSON.stringify(w)) : String(w)))
  }
  // fallback leve
  const h = row.health
  if (h != null && Number(h) < 1) return ['Verifique a qualidade no painel do ML']
  return []
}

// lazy-load detail
const detailLoading = ref({}) // item_id -> boolean

const isDetailLoading = (row) => !!detailLoading.value[row.item_id]

const ensureItemDetail = async (row) => {
  const key = row.item_id
  if (!key) return
  if (row._detail) return
  if (detailLoading.value[key]) return

  detailLoading.value = { ...detailLoading.value, [key]: true }
  try {
    const r = await MercadoLivreService.getItem(key)
    row._detail = r.data
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Falha ao carregar detalhes do item', timeout: 1200 })
  } finally {
    detailLoading.value = { ...detailLoading.value, [key]: false }
  }
}

const getVariations = (row) => row._detail?.variation_objects || []

// ---------- Formatters / pricing ----------

const formatCurrency = (val) =>
  val != null && val !== ''
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val))
    : ''

const formatHealth = (h) => {
  if (h == null) return '—'
  const n = Number(h)
  // aceita 0-1 ou 0-100
  const pct = n <= 1 ? Math.round(n * 100) : Math.round(n)
  return `${pct}%`
}

// --- Health colors (ADICIONE AQUI) ---
const getHealthColor = (row) => {
  const h = row.health
  if (h == null) return 'grey-4'
  const pct = Number(h) <= 1 ? Number(h) * 100 : Number(h)
  if (pct >= 99) return 'green-1'
  if (pct >= 80) return 'yellow-1'
  return 'red-1'
}

const getHealthTextColor = (row) => {
  const h = row.health
  if (h == null) return 'grey-7'
  const pct = Number(h) <= 1 ? Number(h) * 100 : Number(h)
  if (pct >= 99) return 'green-9'
  if (pct >= 80) return 'yellow-10'
  return 'red-10'
}

const hasDiscount = (row) => {
  // preferencial: backend manda
  if (row.active_promotion === true) return true
  if (row.active_promotion === false) return false

  // fallback: tenta comparar
  const regular = getEffectiveRegularPrice(row)
  const eff = getEffectivePrice(row)
  if (regular == null || eff == null) return false
  return Number(regular) > Number(eff)
}

const getEffectivePrice = (row) => {
  if (row.effective_price != null) return row.effective_price
  if (row.price != null) return row.price
  return null
}

const getEffectiveRegularPrice = (row) => {
  if (row.effective_regular_price != null) return row.effective_regular_price
  if (row.original_price != null) return row.original_price
  if (row.base_price != null) return row.base_price
  return null
}

const getDiscountPct = (row) => {
  if (row.discount_percentage != null) return row.discount_percentage

  const regular = Number(getEffectiveRegularPrice(row))
  const eff = Number(getEffectivePrice(row))
  if (!regular || !eff || regular <= eff) return null
  return Math.round(((regular - eff) / regular) * 100)
}

const LOGISTIC_META = {
  fulfillment: {
    label: 'Full (Mercado Envios)',
    helper: 'O Mercado Livre armazena e envia. Você repõe estoque no full.',
    icon: 'bolt',
    color: 'green-7'
  },
  cross_docking: {
    label: 'Coleta / Cross-docking',
    helper: 'O ML coleta na sua operação (ou fluxo de coleta). Você prepara e o ML transporta.',
    icon: 'local_shipping',
    color: 'orange-8'
  },
  drop_off: {
    label: 'Postagem em Agência (Drop-off)',
    helper: 'Você leva o pacote até uma agência/ponto de postagem do Mercado Envios.',
    icon: 'store',
    color: 'grey-7'
  },
  xd_drop_off: {
    label: 'Postagem em Agência (XD Drop-off)',
    helper: 'Variação de drop-off (rede/fluxo XD). Na prática: você posta em ponto/agência.',
    icon: 'store',
    color: 'blue-grey-7'
  },
  self_service: {
    label: 'Flex (Envio por você)',
    helper: 'Você faz a entrega (Flex). Geralmente com retirada/entrega rápida local.',
    icon: 'two_wheeler',
    color: 'purple-6'
  }
}

const getLogisticMeta = (type) => LOGISTIC_META[type] || {
  label: type || '—',
  helper: 'Tipo de logística não mapeado.',
  icon: 'help_outline',
  color: 'grey-7'
}


const copyText = (text) => {
  if (!text) return
  copyToClipboard(text).then(() => $q.notify({ type: 'positive', message: 'Copiado!', timeout: 500 }))
}

// ---------- API logic ----------

const fetchAccounts = async () => {
  try {
    const r = await MercadoLivreService.listAccounts()
    // aceita tanto {results: []} quanto []
    accountOptions.value = Array.isArray(r.data) ? r.data : (r.data?.results || [])
  } catch (e) {
    console.error(e)
  }
}

const refreshData = () => onRequest({ pagination: pagination.value })

const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  loading.value = true
  try {
    const response = await MercadoLivreService.listItems(props.pagination, filters)
    items.value = response.data.results || []
    pagination.value.rowsNumber = response.data.count || 0
    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Falha ao carregar anúncios', timeout: 1200 })
  } finally {
    loading.value = false
  }
}

// debounce simples pro watcher (evita flood em múltiplos selects)
let filtersTimer = null
watch(
  filters,
  () => {
    pagination.value.page = 1
    if (filtersTimer) clearTimeout(filtersTimer)
    filtersTimer = setTimeout(() => refreshData(), 250)
  },
  { deep: true }
)

onMounted(async () => {
  await fetchAccounts()
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
</style>
