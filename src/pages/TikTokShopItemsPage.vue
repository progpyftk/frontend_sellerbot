<template>
  <q-page class="tiktok-items-page">

    <!-- ══ HEADER ═══════════════════════════════════════════════ -->
    <div class="page-header row items-center q-gutter-sm">
      <div class="header-icon">
        <q-icon name="smart_display" size="18px" />
      </div>
      <div class="column">
        <div class="header-eyebrow">TikTok Shop</div>
        <div class="header-title">Anúncios</div>
      </div>
      <div v-if="pagination.rowsNumber" class="header-count">{{ pagination.rowsNumber.toLocaleString('pt-BR') }} anúncios</div>
      <div class="q-ml-auto row items-center q-gutter-xs">
        <q-btn flat dense icon="refresh" color="grey-6" size="sm" @click="loadItems" :loading="loading">
          <q-tooltip>Atualizar lista</q-tooltip>
        </q-btn>
        <q-btn v-if="canWrite" unelevated color="grey-10" icon="sync" label="Sincronizar" size="sm"
          :loading="syncing" @click="syncItems" class="q-px-md" style="border-radius:8px" />
      </div>
    </div>

    <!-- ══ FILTER BAR ══════════════════════════════════════════ -->
    <div class="fb">
      <div class="fb-toolbar">
        <div class="fb-search" :class="[searchFocused && 'focused', filters.search && 'filled']">
          <q-icon name="search" size="15px" class="fb-search-icon" />
          <input class="fb-search-input" placeholder="Buscar por nome, SKU ou ID..."
            v-model="filters.search" @focus="searchFocused = true" @blur="searchFocused = false" @input="onSearch" />
          <button v-if="filters.search" class="fb-search-clear" @click="filters.search = ''; loadItems()">
            <q-icon name="close" size="13px" />
          </button>
        </div>
        <div class="fb-toolbar-actions">
          <button class="fb-tbtn">
            <q-icon name="sort" size="13px" />{{ currentSortLabel }}
            <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
              <q-list style="min-width:180px">
                <q-item v-for="opt in sortOptions" :key="opt.value" clickable v-close-popup
                  :class="['fb-menu-item', currentSort === opt.value && 'fb-menu-item--on']"
                  @click="applySort(opt.value)">
                  <q-item-section class="fb-menu-item-label">{{ opt.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </button>
          <button v-if="hasActiveFilters" class="fb-clear-btn" @click="clearFilters">
            <q-icon name="filter_alt_off" size="13px" />Limpar
          </button>
        </div>
      </div>

      <div class="fb-filterbar">
        <!-- Conta -->
        <div class="fb-combo" :class="filters.account?.length && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="storefront" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.account?.length">Conta</template>
              <template v-else-if="filters.account.length === 1">{{ accountOptions.find(a => a.id === filters.account[0])?.shop_name || 'Conta' }}</template>
              <template v-else>Conta <span class="fb-combo-multi">+{{ filters.account.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.account?.length" class="fb-combo-clear" @click.stop="filters.account = []; loadItems()">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:200px">
              <q-item v-for="acc in accountOptions" :key="acc.id" clickable
                :class="['fb-menu-item', filters.account?.includes(acc.id) && 'fb-menu-item--on']"
                @click.stop="toggleFilter('account', acc.id)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.account?.includes(acc.id)"
                    @update:model-value="toggleFilter('account', acc.id)"
                    @click.stop color="grey-8" dense />
                </q-item-section>
                <q-item-section class="fb-menu-item-label">{{ acc.shop_name }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>
      </div>
    </div>

    <!-- ══ TABELA ═══════════════════════════════════════════════ -->
    <div class="table-container table-responsive">
      <q-table
        flat
        :rows="items"
        :columns="columns"
        row-key="id"
        :loading="loading"
        v-model:pagination="pagination"
        @request="onRequest"
        binary-state-sort
        :dense="$q.screen.lt.md"
        :rows-per-page-options="[25, 50, 100]"
        class="sticky-header-table tiktok-table">

        <template v-slot:body="props">
          <q-tr :props="props" class="hover-row">

            <!-- Produto -->
            <q-td key="product" :props="props" style="max-width:320px;white-space:normal">
              <div class="row items-center q-gutter-sm">
                <q-img
                  v-if="props.row.main_image_url"
                  :src="props.row.main_image_url"
                  style="width:40px;height:40px;flex-shrink:0"
                  fit="contain"
                  class="rounded-borders border-grey">
                  <template v-slot:error>
                    <div class="absolute-full flex flex-center bg-grey-2">
                      <q-icon name="image_not_supported" size="14px" color="grey-5" />
                    </div>
                  </template>
                </q-img>
                <div class="column" style="min-width:0">
                  <span class="text-grey-9" style="font-size:12px">{{ props.row.title || '—' }}</span>
                  <span v-if="props.row.sku" class="sku-inline">{{ props.row.sku }}</span>
                </div>
              </div>
            </q-td>

            <!-- SKU -->
            <q-td key="sku" :props="props">
              <span class="badge-mono">{{ props.row.sku || '—' }}</span>
            </q-td>

            <!-- Preço -->
            <q-td key="price" :props="props" align="right">
              <span class="text-weight-bold">{{ formatCurrency(props.row.price) }}</span>
            </q-td>

            <!-- Estoque -->
            <q-td key="stock" :props="props" align="center">
              <span :class="props.row.stock > 0 ? 'text-positive' : 'text-negative'">
                {{ props.row.stock ?? '—' }}
              </span>
            </q-td>

            <!-- Status -->
            <q-td key="status" :props="props" align="center">
              <span :class="['status-dot', `status-dot--${props.row.status || 'default'}`]" />
              {{ props.row.status || '—' }}
            </q-td>

            <!-- Ações -->
            <q-td key="actions" :props="props" align="center">
              <q-btn v-if="canWrite" flat dense round icon="more_horiz" color="grey-6" size="sm">
                <q-menu anchor="bottom right" self="top right" class="fb-menu">
                  <q-list style="min-width:150px">
                    <q-item clickable v-close-popup @click="openPriceDialog(props.row)">
                      <q-item-section avatar><q-icon name="attach_money" size="16px" color="grey-7" /></q-item-section>
                      <q-item-section class="fb-menu-item-label">Editar preço</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openStockDialog(props.row)">
                      <q-item-section avatar><q-icon name="inventory_2" size="16px" color="grey-7" /></q-item-section>
                      <q-item-section class="fb-menu-item-label">Editar estoque</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </q-td>

          </q-tr>
        </template>

        <template #loading><q-inner-loading showing color="grey-8" /></template>
      </q-table>
    </div>

  </q-page>

  <!-- ══ DIALOG EDITAR PREÇO ════════════════════════════════ -->
  <q-dialog v-model="priceDialog.open" persistent>
    <q-card style="min-width:360px;border-radius:12px">
      <q-card-section class="q-pb-none">
        <div class="text-weight-bold text-grey-9" style="font-size:15px">Editar preço</div>
        <div class="text-grey-5" style="font-size:12px">{{ priceDialog.item?.title }}</div>
      </q-card-section>
      <q-card-section>
        <q-input v-model.number="priceDialog.price" label="Preço de venda" type="number"
          prefix="R$" filled dense :min="0" step="0.01" :rules="[v => v > 0 || 'Informe um preço']" />
        <q-input v-model.number="priceDialog.original_price" label="Preço original (opcional)" type="number"
          prefix="R$" filled dense :min="0" step="0.01" class="q-mt-sm" />
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancelar" v-close-popup color="grey-7" />
        <q-btn v-if="canWrite" unelevated label="Salvar" color="grey-10" :loading="priceDialog.saving"
          @click="savePrice" :disable="priceDialog.price <= 0" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- ══ DIALOG EDITAR ESTOQUE ════════════════════════════════ -->
  <q-dialog v-model="stockDialog.open" persistent>
    <q-card style="min-width:360px;border-radius:12px">
      <q-card-section class="q-pb-none">
        <div class="text-weight-bold text-grey-9" style="font-size:15px">Editar estoque</div>
        <div class="text-grey-5" style="font-size:12px">{{ stockDialog.item?.title }}</div>
      </q-card-section>
      <q-card-section>
        <q-input v-model.number="stockDialog.stock" label="Estoque disponível" type="number"
          filled dense :min="0" :rules="[v => Number.isInteger(v) && v >= 0 || 'Informe um número inteiro']" />
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancelar" v-close-popup color="grey-7" />
        <q-btn v-if="canWrite" unelevated label="Salvar" color="grey-10" :loading="stockDialog.saving"
          @click="saveStock" :disable="stockDialog.stock < 0" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import TikTokShopService from 'src/services/TikTokShopService'
import { useStore } from 'src/stores/store'

const $q = useQuasar()
const authStore = useStore()
const canWrite = computed(() => authStore.canWrite)

const priceDialog = reactive({
  open: false,
  item: null,
  price: 0,
  original_price: null,
  saving: false,
})

const stockDialog = reactive({
  open: false,
  item: null,
  stock: 0,
  saving: false,
})

const items = ref([])
const loading = ref(false)
const syncing = ref(false)
const searchFocused = ref(false)
const accountOptions = ref([])
const currentSort = ref('-created_at')

const pagination = ref({
  sortBy: null,
  descending: false,
  page: 1,
  rowsPerPage: 50,
  rowsNumber: 0,
})

let searchTimeout = null

const filters = reactive({
  search: '',
  account: [],
})

const columns = [
  { name: 'product', label: 'PRODUTO', field: 'title', sortable: false, align: 'left', style: 'min-width:280px' },
  { name: 'sku', label: 'SKU', field: 'sku', sortable: false, align: 'left', style: 'min-width:100px' },
  { name: 'price', label: 'PREÇO', field: 'price', sortable: true, align: 'right', style: 'min-width:90px' },
  { name: 'stock', label: 'ESTOQUE', field: 'stock', sortable: true, align: 'center', style: 'min-width:80px' },
  { name: 'status', label: 'STATUS', field: 'status', sortable: false, align: 'center', style: 'min-width:100px' },
  { name: 'actions', label: '', field: '', sortable: false, align: 'center', style: 'width:50px' },
]

const sortOptions = [
  { value: '-created_at', label: 'Mais recente' },
  { value: 'created_at', label: 'Mais antigo' },
  { value: '-price', label: 'Maior preço' },
  { value: 'price', label: 'Menor preço' },
  { value: 'title', label: 'Nome (A-Z)' },
]

const currentSortLabel = computed(() =>
  sortOptions.find(o => o.value === currentSort.value)?.label || 'Ordenar'
)

const hasActiveFilters = computed(() =>
  filters.search || filters.account.length
)

function formatCurrency(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function toggleFilter(key, value) {
  const arr = filters[key]
  const idx = arr.indexOf(value)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(value)
  loadItems()
}

function clearFilters() {
  filters.search = ''
  filters.account = []
  loadItems()
}

function applySort(val) {
  currentSort.value = val
  loadItems()
}

function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadItems(), 400)
}

async function loadItems(pg = null) {
  loading.value = true
  pagination.value.page = pg ?? 1
  try {
    const axiosParams = {
      sort: currentSort.value,
      page: pagination.value.page,
      page_size: pagination.value.rowsPerPage,
    }
    if (filters.search) axiosParams.search = filters.search
    if (filters.account.length) axiosParams.account = filters.account

    const { data } = await TikTokShopService.listItems(axiosParams)
    items.value = data.results ?? data
    pagination.value.rowsNumber = data.count ?? items.value.length
  } catch (e) {
    console.error('Erro ao carregar itens:', e)
    $q.notify({ message: 'Erro ao carregar itens', color: 'negative' })
  } finally {
    loading.value = false
  }
}

function onRequest(requestProps) {
  pagination.value.page = requestProps.pagination.page
  pagination.value.rowsPerPage = requestProps.pagination.rowsPerPage
  loadItems(requestProps.pagination.page)
}

async function loadAccounts() {
  try {
    const { data } = await TikTokShopService.listAccounts()
    accountOptions.value = data
  } catch (e) { console.error(e) }
}

async function syncItems() {
  const accountIds = filters.account.length ? filters.account : accountOptions.value.map(a => a.id)
  if (!accountIds.length) {
    $q.notify({ message: 'Nenhuma conta disponível', color: 'warning' }); return
  }
  syncing.value = true
  try {
    await Promise.all(accountIds.map(id => TikTokShopService.syncItems(id)))
    $q.notify({ message: 'Sync iniciado!', color: 'positive', icon: 'sync' })
    setTimeout(() => loadItems(), 2000)
  } catch (e) {
    $q.notify({ message: 'Erro ao sincronizar', color: 'negative' })
  } finally {
    syncing.value = false
  }
}

function openPriceDialog(item) {
  priceDialog.item = item
  priceDialog.price = Number(item.price) || 0
  priceDialog.original_price = Number(item.original_price) || null
  priceDialog.open = true
}

function openStockDialog(item) {
  stockDialog.item = item
  stockDialog.stock = Number(item.stock) || 0
  stockDialog.open = true
}

async function savePrice() {
  priceDialog.saving = true
  try {
    const payload = { price: priceDialog.price }
    if (priceDialog.original_price) payload.original_price = priceDialog.original_price
    await TikTokShopService.updateItemPrice(priceDialog.item.id, payload)
    $q.notify({ message: 'Preço atualizado!', color: 'positive', icon: 'check' })
    priceDialog.open = false
    loadItems(pagination.value.page)
  } catch (e) {
    const msg = e?.response?.data?.detail || 'Erro ao atualizar preço'
    $q.notify({ message: msg, color: 'negative' })
  } finally {
    priceDialog.saving = false
  }
}

async function saveStock() {
  stockDialog.saving = true
  try {
    await TikTokShopService.updateItemStock(stockDialog.item.id, { stock: stockDialog.stock })
    $q.notify({ message: 'Estoque atualizado!', color: 'positive', icon: 'check' })
    stockDialog.open = false
    loadItems(pagination.value.page)
  } catch (e) {
    const msg = e?.response?.data?.detail || 'Erro ao atualizar estoque'
    $q.notify({ message: msg, color: 'negative' })
  } finally {
    stockDialog.saving = false
  }
}

onMounted(() => {
  loadAccounts()
  loadItems()
})
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';
.tiktok-items-page { background: #f8fafc; min-height: 100vh; }

.page-header {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  padding: 14px 20px;
  position: sticky; top: $app-header-h; z-index: 10;
}
.header-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg, #010101, #333);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.header-eyebrow { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
.header-title { font-size: 18px; font-weight: 700; color: #0f172a; }
.header-count {
  background: #f1f5f9; border-radius: 10px; padding: 3px 10px;
  font-size: 12px; font-weight: 600; color: #64748b;
}

/* ── Filter bar ── */
.fb { background: #fff; border-bottom: 1px solid #e2e8f0; }
.fb-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; flex-wrap: nowrap; overflow-x: auto;
}
.fb-search {
  display: flex; align-items: center; gap: 6px;
  flex: 1; min-width: 160px; max-width: 380px;
  height: 34px; padding: 0 10px;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  background: #f8fafc; transition: border-color .15s, background .15s;
}
.fb-search.focused, .fb-search.filled { border-color: #0f172a; background: #fff; }
.fb-search-icon { color: #94a3b8; flex-shrink: 0; }
.fb-search-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 13px; color: #0f172a;
}
.fb-search-input::placeholder { color: #94a3b8; }
.fb-search-clear {
  background: none; border: none; cursor: pointer; color: #94a3b8;
  padding: 0; display: flex; align-items: center;
}
.fb-toolbar-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: auto; }
.fb-tbtn {
  display: flex; align-items: center; gap: 5px;
  height: 32px; padding: 0 12px; border-radius: 7px;
  border: 1.5px solid #e2e8f0; background: #fff !important;
  font-size: 12px !important; font-weight: 500; color: #64748b !important;
  cursor: pointer; transition: all .15s; white-space: nowrap;
}
.fb-tbtn--active { border-color: #0f172a !important; color: #0f172a !important; }
.fb-adv-badge {
  background: #0f172a; color: #fff;
  font-size: 10px; font-weight: 700; border-radius: 10px;
  padding: 1px 5px; min-width: 16px; text-align: center;
}
.fb-clear-btn {
  display: flex; align-items: center; gap: 4px;
  height: 30px; padding: 0 10px; border-radius: 7px;
  border: none; background: none; font-size: 12px;
  color: #ef4444; cursor: pointer; transition: background .15s;
}
.fb-clear-btn:hover { background: #fef2f2; }

.fb-filterbar {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px 10px; flex-wrap: wrap;
}
.fb-combo {
  position: relative; display: flex; align-items: center;
  border: 1.5px solid #e2e8f0; border-radius: 20px;
  background: #fff; transition: border-color .15s; overflow: visible;
}
.fb-combo:hover { border-color: #cbd5e1; }
.fb-combo--on { border-color: #0f172a; background: #f8fafc; }
.fb-combo-btn {
  display: flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 10px 0 9px;
  background: none; border: none; cursor: pointer;
  font-size: 12px; font-weight: 500; color: #374151; border-radius: 20px;
}
.fb-combo--on .fb-combo-btn { color: #0f172a; }
.fb-combo-ico { color: #94a3b8; flex-shrink: 0; }
.fb-combo--on .fb-combo-ico { color: #0f172a; }
.fb-combo-label { white-space: nowrap; }
.fb-combo-multi {
  background: #0f172a; color: #fff; border-radius: 10px;
  font-size: 10px; font-weight: 700; padding: 0 5px;
}
.fb-combo-arrow { color: #94a3b8; }
.fb-combo-clear {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%;
  background: #0f172a; border: none; cursor: pointer;
  color: #fff; margin-right: 5px; flex-shrink: 0;
}
.fb-menu { border-radius: 10px !important; box-shadow: 0 4px 20px rgba(0,0,0,.10) !important; }
.fb-menu-item { transition: background .1s; }
.fb-menu-item--on { background: #f8fafc !important; }
.fb-menu-item-label { font-size: 13px; }

/* ── Table ── */
.table-container { background: #fff; }
.tiktok-table { background: #fff; }
:tiktok-table .q-table__top { display: none; }
:deep(.tiktok-table thead tr th) {
  /* `top: 0` e nao `$app-header-h`: o scrollport do thead e o `.q-table__middle`
     do Quasar (`overflow: auto`, altura livre -> nunca rola). Com scrollport que
     nao rola, qualquer `top:` vira empurrao permanente do cabecalho para baixo,
     por cima das primeiras linhas. Nada aqui gruda no viewport da pagina. */
  position: sticky; top: 0; z-index: 1;
  background: #f8fafc;
  font-size: 11px; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .4px;
  border-bottom: 1.5px solid #e2e8f0;
}
:deep(.tiktok-table tbody tr.hover-row:hover) { background: #f8fafc !important; }
:deep(.tiktok-table tbody td) {
  border-bottom: 1px solid #f1f5f9;
  min-height: 50px; height: auto; vertical-align: middle;
  padding-top: 8px; padding-bottom: 8px;
}

.badge-mono {
  background: #f1f5f9; color: #475569;
  padding: 1px 5px; border-radius: 5px;
  font-family: 'Roboto Mono', monospace;
  letter-spacing: -0.5px; font-size: 11px;
}
.border-grey { border: 1px solid #e2e8f0; }
.sku-inline {
  display: inline-block;
  font-family: 'Roboto Mono', monospace;
  font-size: 10px; color: #94a3b8;
  letter-spacing: -0.3px;
}

.status-dot {
  display: inline-block;
  width: 8px; height: 8px; border-radius: 50%;
  margin-right: 4px;
}
.status-dot--ACTIVE { background: #16a34a; }
.status-dot--INACTIVE { background: #dc2626; }
.status-dot--default { background: #94a3b8; }

@media (max-width: 600px) {
  .page-header { padding: 10px 12px; }
  .fb-search { max-width: 100%; min-width: 0; }
}
</style>
