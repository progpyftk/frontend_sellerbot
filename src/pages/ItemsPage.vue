<template>
  <q-page class="bg-grey-1">
    <div class="q-pa-md">
      <q-card flat bordered class="bg-white shadow-1">

        <q-card-section class="bg-primary text-white q-py-sm">
          <div class="row items-center justify-between">
            <div class="row items-center">
              <q-icon name="storefront" size="md" class="q-mr-md" />
              <div>
                <div class="text-caption text-blue-2">Catálogo & Estoque</div>
                <div class="text-h6 text-weight-bold" style="line-height: 1.1;">Gerenciamento Avançado</div>
              </div>
            </div>
            <q-btn flat round dense icon="refresh" @click="fetchItems(true)" :loading="loading">
              <q-tooltip>Forçar Atualização</q-tooltip>
            </q-btn>
          </div>
        </q-card-section>

        <q-card-section class="q-pa-md bg-grey-1 border-bottom">

          <div class="row q-col-gutter-sm">
            <div class="col-12 col-md-4">
              <q-input v-model="filters.search" debounce="500" placeholder="Título, SKU ou MLB..." outlined dense
                bg-color="white" clearable @update:model-value="resetPaginationAndFetch">
                <template v-slot:prepend><q-icon name="search" color="primary" /></template>
              </q-input>
            </div>

            <div class="col-12 col-md-4">
              <q-select v-model="filters.account" :options="accountOptions" option-value="id"
                option-label="account_nickname" label="Contas (Múltiplas)" outlined dense bg-color="white" emit-value
                map-options multiple use-chips clearable @update:model-value="resetPaginationAndFetch">
                <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
                  <q-item v-bind="itemProps">
                    <q-item-section side><q-checkbox :model-value="selected"
                        @update:model-value="toggleOption(opt)" /></q-item-section>
                    <q-item-section><q-item-label>{{ opt.account_nickname }}</q-item-label></q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>

            <div class="col-12 col-md-4">
              <q-select v-model="filters.logistic_type" :options="logisticOptions" label="Logística (Combinar)" outlined
                dense bg-color="white" emit-value map-options multiple use-chips clearable
                @update:model-value="resetPaginationAndFetch">
                <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
                  <q-item v-bind="itemProps">
                    <q-item-section side><q-checkbox :model-value="selected"
                        @update:model-value="toggleOption(opt)" /></q-item-section>
                    <q-item-section>
                      <q-item-label>{{ opt.label }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
          </div>

          <div class="row q-col-gutter-sm q-mt-xs">

            <div class="col-12 col-md-3">
              <q-select v-model="filters.status" :options="statusOptions" label="Status" outlined dense bg-color="white"
                emit-value map-options multiple use-chips clearable @update:model-value="resetPaginationAndFetch" />
            </div>

            <div class="col-6 col-md-2">
              <q-select v-model="filters.stockStatus" :options="stockOptions" label="Estoque" outlined dense
                bg-color="white" emit-value map-options clearable @update:model-value="resetPaginationAndFetch" />
            </div>

            <div class="col-6 col-md-2">
              <q-select v-model="filters.is_flex"
                :options="[{ label: 'É Flex', value: 'true' }, { label: 'NÃO é Flex', value: 'false' }]" label="Filtro Flex"
                outlined dense bg-color="white" emit-value map-options clearable
                @update:model-value="resetPaginationAndFetch">
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar>
                      <q-icon :name="scope.opt.value === 'true' ? 'bolt' : 'block'"
                        :color="scope.opt.value === 'true' ? 'purple' : 'grey'" />
                    </q-item-section>
                    <q-item-section>{{ scope.opt.label }}</q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>

            <div class="col-12 col-md-2">
              <q-input v-model="filters.priceMin" type="number" prefix="R$" placeholder="Min" outlined dense
                bg-color="white" debounce="600" @update:model-value="resetPaginationAndFetch" />
            </div>

            <div class="col-12 col-md-2">
              <q-input v-model="filters.priceMax" type="number" prefix="R$" placeholder="Max" outlined dense
                bg-color="white" debounce="600" @update:model-value="resetPaginationAndFetch" />
            </div>
          </div>

          <div class="row q-mt-sm q-gutter-x-sm">
            <q-badge color="grey-3" text-color="black" class="cursor-pointer q-py-xs hover-badge"
              @click="setFilterFullNoStock">
              🔥 Full Sem Estoque
            </q-badge>
            <q-badge color="grey-3" text-color="black" class="cursor-pointer q-py-xs hover-badge"
              @click="setFilterOpportunityFlex">
              💰 Oportunidade Flex
            </q-badge>
            <q-space />
            <q-btn flat color="grey-8" icon="filter_alt_off" label="Limpar Tudo" size="sm" @click="clearFilters" />
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
                  retirada do
                  Mercado Livre e evitar cobranças de armazenagem prolongada.
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

        <q-table :rows="items" :columns="columns" row-key="id" flat :loading="loading" v-model:pagination="pagination"
          @request="onRequest" binary-state-sort no-data-label="Nenhum anúncio encontrado.">
          <template v-slot:header="props">
            <q-tr :props="props">
              <q-th auto-width />
              <q-th v-for="col in props.cols" :key="col.name" :props="props">
                {{ col.label }}
              </q-th>
            </q-tr>
          </template>

          <template v-slot:body="props">
            <q-tr :props="props" :class="props.expand ? 'bg-blue-1' : ''">

              <q-td auto-width>
                <q-btn v-if="props.row.variations && props.row.variations.length > 0" size="sm" color="primary" round
                  dense @click="props.expand = !props.expand" :icon="props.expand ? 'remove' : 'add'" />
              </q-td>

              <q-td key="thumbnail" :props="props">
                <q-avatar rounded size="50px" class="shadow-1">
                  <img :src="props.row.thumbnail" style="object-fit: contain; background: #fff;" />
                </q-avatar>
              </q-td>

              <q-td key="title" :props="props">
                <div class="text-weight-bold text-body2 ellipsis-2-lines" style="max-width: 350px;">
                  <a :href="props.row.permalink" target="_blank" class="text-black text-no-decoration hover-underline">
                    {{ props.row.title }}
                  </a>
                </div>
                <div class="row items-center q-gutter-x-xs q-mt-xs text-caption text-grey-7">
                  <q-badge v-if="props.row.sku" outline color="grey-7" label="SKU" />
                  <span v-if="props.row.sku"><b>{{ props.row.sku }}</b></span>
                  <span v-else class="text-grey-5">S/ SKU</span>
                  <span>|</span>
                  <span>{{ props.row.item_id }}</span>
                </div>
              </q-td>

              <q-td key="logistic_type" :props="props" align="center">
                <q-chip dense size="11px" :color="getLogisticColor(props.row.logistic_type)" text-color="white"
                  class="text-weight-bold">
                  {{ formatLogistic(props.row.logistic_type) }}
                </q-chip>
                <div v-if="props.row.is_flex" class="text-caption text-purple text-weight-bold"
                  style="font-size: 10px;">⚡ FLEX</div>
              </q-td>

              <q-td key="available_quantity" :props="props" align="center">
                <div class="text-h6 text-weight-bold"
                  :class="props.row.available_quantity > 0 ? 'text-green-8' : 'text-red'">
                  {{ props.row.available_quantity }}
                </div>
                <div class="text-caption text-grey" style="font-size: 10px;">Vendidos: {{ props.row.sold_quantity }}
                </div>
              </q-td>

              <q-td key="price" :props="props" align="right">
                <div
                  v-if="props.row.original_price && parseFloat(props.row.original_price) > parseFloat(props.row.price)">
                  <div class="text-strike text-grey-6 text-caption">{{ formatCurrency(props.row.original_price) }}</div>
                  <div class="text-weight-bold text-green-8 text-body1">{{ formatCurrency(props.row.price) }}</div>
                </div>
                <div v-else class="text-weight-bold text-body1">
                  {{ formatCurrency(props.row.price) }}
                </div>
              </q-td>

              <q-td key="status" :props="props" align="center">
                <q-icon :name="getStatusInfo(props.row.status).icon" :color="getStatusInfo(props.row.status).color"
                  size="sm">
                  <q-tooltip>{{ getStatusInfo(props.row.status).label }}</q-tooltip>
                </q-icon>
              </q-td>
            </q-tr>

            <q-tr v-show="props.expand" :props="props">
              <q-td colspan="100%" class="q-pa-none">
                <div class="q-pa-md bg-grey-2 inset-shadow-down">
                  <div class="text-subtitle2 q-mb-xs text-grey-8 row items-center">
                    <q-icon name="style" class="q-mr-sm" /> Variações do Anúncio
                  </div>

                  <q-markup-table dense flat bordered class="bg-white">
                    <thead class="bg-grey-3 text-grey-9">
                      <tr>
                        <th class="text-left">Atributos</th>
                        <th class="text-left">SKU Variação</th>
                        <th class="text-center">Estoque</th>
                        <th class="text-right">Preço</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="v in props.row.variations" :key="v.variation_id">
                        <td>
                          <q-badge color="blue-1" text-color="blue-9" class="q-pa-xs">
                            {{ v.attribute_combination || 'Padrão' }}
                          </q-badge>
                        </td>
                        <td class="text-bold font-mono text-grey-9">{{ v.sku || '-' }}</td>
                        <td class="text-center"
                          :class="v.available_quantity > 0 ? 'text-green-7 text-bold' : 'text-red'">
                          {{ v.available_quantity }}
                        </td>
                        <td class="text-right">{{ formatCurrency(v.price) }}</td>
                      </tr>
                    </tbody>
                  </q-markup-table>
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
import { ref, onMounted, reactive, computed } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar, copyToClipboard } from 'quasar'

const $q = useQuasar()
const items = ref([])
const loading = ref(false)
const accountOptions = ref([])

// --- STATE DE FILTROS ---
const filters = reactive({
  search: '',
  account: [], // Array
  logistic_type: [], // Array
  status: [], // Array
  stockStatus: null,
  is_flex: null, // 'true' ou 'false'
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

// --- LÓGICA DO LINK MÁGICO (CRUCIAL) ---
const magicLinkUrl = "https://www.mercadolivre.com.br/anuncios/lista/space_management?filters=with-fulfillment-with-empty-stock"

const showMagicLink = computed(() => {
  // A regra é clara: Conta selecionada + Logística Full + Estoque Zero
  // O filtro account agora é um array, verificamos se tem apenas 1 selecionada
  return filters.account &&
    filters.account.length === 1 &&
    filters.logistic_type.includes('fulfillment') &&
    filters.stockStatus === 'zero'
})

const selectedAccountName = computed(() => {
  if (!filters.account || filters.account.length !== 1) return ''
  const acc = accountOptions.value.find(a => a.id === filters.account[0])
  return acc ? acc.account_nickname : 'Conta'
})

const copyMagicLink = () => {
  copyToClipboard(magicLinkUrl)
    .then(() => $q.notify({ type: 'positive', message: 'Link copiado!', icon: 'content_copy' }))
    .catch(() => $q.notify({ type: 'negative', message: 'Erro ao copiar' }))
}

// --- CONFIGURAÇÕES ESTÁTICAS ---
const logisticOptions = [
  { label: 'Full (Fulfillment)', value: 'fulfillment' },
  { label: 'Coleta (Cross Docking)', value: 'cross_docking' },
  { label: 'Flex (Envio Rápido)', value: 'self_service' },
  { label: 'Correios (Drop Off)', value: 'drop_off' }
]

const stockOptions = [
  { label: 'Estoque Zerado (0)', value: 'zero' },
  { label: 'Com Estoque (>0)', value: 'positive' }
]

const statusOptions = [
  { label: 'Ativo', value: 'active', icon: 'check_circle', color: 'positive' },
  { label: 'Pausado', value: 'paused', icon: 'pause_circle', color: 'orange' },
  { label: 'Fechado/Inativo', value: 'closed', icon: 'cancel', color: 'grey' },
  { label: 'Sob Revisão', value: 'under_review', icon: 'gavel', color: 'deep-orange' },
  { label: 'Inativo (Admin)', value: 'inactive', icon: 'block', color: 'red' }
]

const columns = [
  { name: 'thumbnail', align: 'center', label: 'Foto', field: 'thumbnail' },
  { name: 'title', align: 'left', label: 'Detalhes do Produto', field: 'title' },
  { name: 'logistic_type', align: 'center', label: 'Logística', field: 'logistic_type' },
  { name: 'available_quantity', align: 'center', label: 'Total', field: 'available_quantity', sortable: true },
  { name: 'price', align: 'right', label: 'Preço', field: 'price', sortable: true },
  { name: 'status', align: 'center', label: 'Status', field: 'status' }
]

// --- MACROS ---
const setFilterFullNoStock = () => {
  filters.logistic_type = ['fulfillment']
  filters.stockStatus = 'zero'
  filters.status = ['active', 'paused']
  resetPaginationAndFetch()
}

const setFilterOpportunityFlex = () => {
  filters.is_flex = 'false' // Não é Flex
  filters.status = ['active'] // Está vendendo
  filters.logistic_type = ['cross_docking', 'drop_off']
  resetPaginationAndFetch()
}

// --- API FETCH ---
const fetchAccounts = async () => {
  try {
    const response = await api.get('/mercadolivre/accounts/')
    accountOptions.value = response.data.results || response.data
  } catch (e) { console.error(e) }
}

const resetPaginationAndFetch = () => {
  pagination.value.page = 1
  fetchItems()
}

const fetchItems = async (forceReset = false) => {
  if (forceReset) pagination.value.page = 1

  loading.value = true
  try {
    const { page, rowsPerPage, sortBy, descending } = pagination.value

    const params = {
      page: page,
      page_size: rowsPerPage,
      ordering: descending ? `-${sortBy}` : sortBy,
      search: filters.search || undefined,

      // Filtros de Array
      account: filters.account?.length ? filters.account.join(',') : undefined,
      logistic_type: filters.logistic_type?.length ? filters.logistic_type.join(',') : undefined,
      status: filters.status?.length ? filters.status.join(',') : undefined,

      // Filtros Booleanos/Range
      is_flex: filters.is_flex || undefined,
      price_min: filters.priceMin || undefined,
      price_max: filters.priceMax || undefined
    }

    if (filters.stockStatus === 'zero') {
      params.stock_status = 'zero'
    } else if (filters.stockStatus === 'positive') {
      params.stock_status = 'positive'
    }

    const response = await api.get('/mercadolivre/items/', { params })

    items.value = response.data.results
    pagination.value.rowsNumber = response.data.count

  } catch (error) {
    if (error.response && error.response.status === 404) {
      items.value = []
      pagination.value.rowsNumber = 0
    } else {
      $q.notify({ type: 'negative', message: 'Erro ao buscar dados' })
    }
  } finally {
    loading.value = false
  }
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
  resetPaginationAndFetch()
}

const onRequest = (props) => {
  pagination.value = props.pagination
  fetchItems()
}

// --- HELPERS ---
const formatCurrency = (val) => {
  if (val === undefined || val === null) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

const formatLogistic = (type) => {
  const map = { fulfillment: 'FULL', cross_docking: 'COLETA', self_service: 'FLEX', drop_off: 'CORREIOS' }
  return map[type] || type?.toUpperCase()
}

const getLogisticColor = (type) => {
  if (type === 'fulfillment') return 'green-7'
  if (type === 'cross_docking') return 'orange-8'
  if (type === 'self_service') return 'purple-6'
  return 'blue-grey'
}

const getStatusInfo = (status) => {
  const map = {
    active: { label: 'Ativo', icon: 'check_circle', color: 'positive' },
    paused: { label: 'Pausado', icon: 'pause_circle', color: 'orange' },
    closed: { label: 'Fechado', icon: 'cancel', color: 'grey' },
    under_review: { label: 'Revisão', icon: 'gavel', color: 'deep-orange' },
    inactive: { label: 'Inativo', icon: 'block', color: 'red' }
  }
  return map[status] || { label: status, icon: 'help', color: 'grey' }
}

onMounted(() => {
  fetchAccounts()
  fetchItems()
})
</script>

<style scoped>
.hover-underline:hover {
  text-decoration: underline;
}

.font-mono {
  font-family: monospace;
}

.border-bottom {
  border-bottom: 1px solid #e0e0e0;
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
  background-color: #bdbdbd !important;
}
</style>
