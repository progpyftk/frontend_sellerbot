<template>
  <q-page class="shopee-items-page">

    <!-- ══ HEADER ══════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="row items-center justify-between no-wrap">
        <div class="row items-center q-gutter-x-md">
          <div class="header-icon">
            <q-icon name="mdi-storefront" size="22px" />
          </div>
          <div>
            <div class="header-eyebrow">Shopee</div>
            <div class="header-title">Meus Anúncios</div>
          </div>
          <div v-if="pagination.rowsNumber" class="header-count">
            {{ pagination.rowsNumber.toLocaleString('pt-BR') }} anúncios
          </div>
        </div>
        <div class="row items-center q-gutter-x-sm">
          <q-btn unelevated color="deep-orange" icon="sync" label="Sincronizar"
            :loading="syncing" :disable="!selectedAccountId" size="sm" class="q-px-md"
            @click="syncItems">
            <q-tooltip v-if="!selectedAccountId">Selecione uma conta primeiro</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>

    <!-- ══ TOOLBAR ══════════════════════════════════════════════ -->
    <div class="fb">
      <div class="fb-toolbar">

        <!-- Busca -->
        <div class="fb-search" :class="{ focused: searchFocused, filled: !!search }">
          <q-icon name="search" size="18px" class="fb-search-icon" />
          <input v-model="search" class="fb-search-input"
            placeholder="Buscar por título, SKU ou ID..."
            @focus="searchFocused = true" @blur="searchFocused = false"
            @input="onSearch" />
          <transition name="fade">
            <button v-if="search" class="fb-search-clear" @click="search = ''; loadItems()">
              <q-icon name="close" size="14px" />
            </button>
          </transition>
        </div>

        <div class="fb-toolbar-actions">

          <!-- Ordenação -->
          <div class="fb-btn-group">
            <q-btn-dropdown flat dense no-icon-animation unelevated
              :label="currentSortLabel" icon="swap_vert"
              class="fb-tbtn" color="grey-7" size="sm">
              <q-list dense style="min-width:200px">
                <q-item v-for="opt in sortOptions" :key="opt.value"
                  clickable v-close-popup @click="applySort(opt.value)">
                  <q-item-section>{{ opt.label }}</q-item-section>
                  <q-item-section side v-if="currentSort === opt.value">
                    <q-icon name="check" color="deep-orange" size="14px" />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>

        </div>
      </div>

      <!-- Filterbar -->
      <div class="fb-filterbar">

        <!-- Conta -->
        <div class="fb-combo" :class="selectedAccountId && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="storefront" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!selectedAccountId">Conta</template>
              <template v-else>{{ accountOptions.find(a=>a.id===selectedAccountId)?.shop_name || 'Conta' }}</template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="selectedAccountId" class="fb-combo-clear" @click.stop="selectedAccountId = null; loadItems()">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:220px">
              <q-item v-for="acc in accountOptions" :key="acc.id" clickable v-close-popup
                :class="['fb-menu-item', selectedAccountId === acc.id && 'fb-menu-item--on']"
                @click="selectedAccountId = acc.id; loadItems()">
                <q-item-section>
                  <q-item-label>{{ acc.shop_name }}</q-item-label>
                  <q-item-label caption>ID: {{ acc.shop_id }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Status -->
        <div class="fb-combo" :class="filterStatus && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="toggle_on" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filterStatus">Status</template>
              <template v-else>{{ statusOptions.find(o=>o.value===filterStatus)?.label || 'Status' }}</template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filterStatus" class="fb-combo-clear" @click.stop="filterStatus = null; loadItems()">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:180px">
              <q-item v-for="opt in statusOptions" :key="opt.value" clickable v-close-popup
                :class="['fb-menu-item', filterStatus === opt.value && 'fb-menu-item--on']"
                @click="filterStatus = opt.value; loadItems()">
                <q-item-section class="fb-menu-item-label">
                  <span :style="`color:${opt.color};font-weight:600`">{{ opt.label }}</span>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Limpar filtros -->
        <transition name="fade">
          <button v-if="hasActiveFilters" class="fb-clear-btn" @click="clearFilters">
            <q-icon name="filter_alt_off" size="14px" />
            <span>Limpar</span>
          </button>
        </transition>

      </div>
    </div>

    <!-- ══ TABELA ══════════════════════════════════════════════ -->
    <q-table
      :rows="items"
      :columns="columns"
      row-key="item_id"
      flat
      :loading="loading"
      v-model:pagination="pagination"
      @request="onRequest"
      binary-state-sort
      class="sticky-header-table shopee-table"
      no-data-label="Nenhum anúncio encontrado.">

      <template v-slot:header="props">
        <q-tr :props="props" class="bg-grey-2 text-grey-8 text-uppercase text-caption">
          <q-th auto-width />
          <q-th v-for="col in props.cols" :key="col.name" :props="props" class="text-weight-bold">
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props" :class="[props.expand ? 'bg-orange-1' : 'hover-row']" class="cursor-pointer">

          <!-- Expand -->
          <q-td auto-width>
            <q-btn size="sm" flat round :color="props.expand ? 'deep-orange' : 'grey-6'"
              @click.stop="props.expand = !props.expand"
              :icon="props.expand ? 'expand_less' : 'expand_more'" />
          </q-td>

          <!-- Thumbnail -->
          <q-td key="thumbnail" :props="props" style="width:70px">
            <div class="relative-position">
              <q-img :src="props.row.thumbnail || ''" style="height:50px;width:50px" fit="contain"
                class="rounded-borders border-grey">
                <template v-slot:error>
                  <div class="absolute-full flex flex-center bg-grey-2">
                    <q-icon name="image_not_supported" size="20px" color="grey-5" />
                  </div>
                </template>
              </q-img>
              <div class="absolute-bottom-right" style="transform:translate(20%,20%)">
                <q-icon v-if="props.row.status === 'NORMAL'" name="check_circle" color="positive" size="16px"
                  class="bg-white rounded-borders" />
                <q-icon v-else-if="props.row.status === 'UNLIST'" name="pause_circle" color="orange" size="16px"
                  class="bg-white rounded-borders" />
                <q-icon v-else-if="props.row.status === 'BANNED'" name="cancel" color="negative" size="16px"
                  class="bg-white rounded-borders" />
              </div>
            </div>
          </q-td>

          <!-- Nome + SKU + ID -->
          <q-td key="item_name" :props="props" style="max-width:380px;white-space:normal">
            <div class="column q-gutter-y-xs">
              <div class="text-grey-9 text-weight-bold" style="font-size:13px;line-height:1.3">
                {{ props.row.item_name }}
              </div>
              <div class="row items-center q-gutter-x-sm text-caption">
                <span v-if="props.row.item_sku"
                  class="bg-grey-3 text-grey-8 q-px-xs rounded-borders font-mono cursor-pointer"
                  @click.stop="copyText(props.row.item_sku)">
                  {{ props.row.item_sku }}
                </span>
                <span class="bg-grey-3 text-grey-8 q-px-xs rounded-borders font-mono cursor-pointer"
                  @click.stop="copyText(props.row.item_id)" title="Copiar ID">
                  {{ props.row.item_id }}
                </span>
                <span class="text-deep-orange-6 text-weight-bold">
                  <q-icon name="storefront" size="10px" /> {{ props.row.shop_name }}
                </span>
              </div>
            </div>
          </q-td>

          <!-- Preço -->
          <q-td key="price" :props="props" align="right">
            <div class="text-subtitle1 text-weight-bold text-grey-9">
              {{ formatCurrency(props.row.price) }}
            </div>
          </q-td>

          <!-- Estoque -->
          <q-td key="stock" :props="props" align="center">
            <div class="text-subtitle2 text-weight-bold"
              :class="props.row.stock === 0 ? 'text-negative' : 'text-grey-9'">
              {{ props.row.stock }}
            </div>
          </q-td>

          <!-- Status -->
          <q-td key="status" :props="props" align="center">
            <q-badge :color="statusColor(props.row.status)" text-color="white"
              class="text-weight-bold text-uppercase" style="font-size:10px">
              {{ statusLabel(props.row.status) }}
            </q-badge>
          </q-td>

          <!-- Sincronizado -->
          <q-td key="last_synced_at" :props="props" align="right">
            <span class="text-caption text-grey-5">{{ formatDate(props.row.last_synced_at) }}</span>
          </q-td>

        </q-tr>

        <!-- Expand row -->
        <q-tr v-show="props.expand" :props="props">
          <q-td colspan="100%" class="q-pa-none">
            <div class="bg-orange-1 q-pa-md">
              <div class="row q-col-gutter-lg">
                <div class="col-12 col-md-4">
                  <div class="text-overline text-grey-7 q-mb-sm">Imagens</div>
                  <div class="row q-gutter-xs">
                    <q-img v-for="(img, i) in (props.row.images || []).slice(0,5)" :key="i"
                      :src="img" style="width:64px;height:64px" fit="cover"
                      class="rounded-borders border-grey" />
                    <div v-if="!props.row.images?.length" class="text-caption text-grey-5">Sem imagens</div>
                  </div>
                </div>
                <div class="col-12 col-md-4">
                  <div class="text-overline text-grey-7 q-mb-sm">Detalhes</div>
                  <div class="row q-col-gutter-sm text-caption text-grey-8">
                    <div class="col-12"><b>Item ID:</b> {{ props.row.item_id }}</div>
                    <div class="col-12" v-if="props.row.item_sku"><b>SKU:</b> {{ props.row.item_sku }}</div>
                    <div class="col-12"><b>Preço:</b> {{ formatCurrency(props.row.price) }}</div>
                    <div class="col-12"><b>Estoque:</b> {{ props.row.stock }} un</div>
                  </div>
                </div>
                <div class="col-12 col-md-4 flex items-start justify-end">
                  <q-btn flat dense color="deep-orange" icon="open_in_new" label="Abrir na Shopee"
                    :href="`https://shopee.com.br/product/${props.row.shop_id}/${props.row.item_id}`"
                    target="_blank" type="a" size="sm" />
                </div>
              </div>
            </div>
          </q-td>
        </q-tr>

      </template>

    </q-table>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { DateTime } from 'luxon'

const $q = useQuasar()

// ── Estado ──────────────────────────────────────────────────
const items           = ref([])
const loading         = ref(false)
const syncing         = ref(false)
const search          = ref('')
const searchFocused   = ref(false)
const filterStatus    = ref(null)
const selectedAccountId = ref(null)
const accountOptions  = ref([])
const currentSort     = ref('-last_synced_at')

const pagination = ref({
  sortBy: null,
  descending: false,
  page: 1,
  rowsPerPage: 40,
  rowsNumber: 0,
})

let searchTimeout = null

// ── Colunas da tabela ────────────────────────────────────────
const columns = [
  { name: 'thumbnail',     label: '',              field: 'thumbnail',     sortable: false, align: 'left' },
  { name: 'item_name',     label: 'Anúncio',       field: 'item_name',     sortable: true,  align: 'left' },
  { name: 'price',         label: 'Preço',         field: 'price',         sortable: true,  align: 'right' },
  { name: 'stock',         label: 'Estoque',       field: 'stock',         sortable: true,  align: 'center' },
  { name: 'status',        label: 'Status',        field: 'status',        sortable: false, align: 'center' },
  { name: 'last_synced_at',label: 'Sincronizado',  field: 'last_synced_at',sortable: true,  align: 'right' },
]

// ── Opções ───────────────────────────────────────────────────
const statusOptions = [
  { value: 'NORMAL',  label: 'Ativo',    color: '#22c55e' },
  { value: 'UNLIST',  label: 'Pausado',  color: '#f59e0b' },
  { value: 'BANNED',  label: 'Banido',   color: '#ef4444' },
  { value: 'DELETED', label: 'Deletado', color: '#94a3b8' },
]

const sortOptions = [
  { value: '-last_synced_at', label: 'Mais recente'   },
  { value: 'item_name',       label: 'Nome A→Z'        },
  { value: '-item_name',      label: 'Nome Z→A'        },
  { value: '-price',          label: 'Maior preço'     },
  { value: 'price',           label: 'Menor preço'     },
  { value: '-stock',          label: 'Maior estoque'   },
  { value: 'stock',           label: 'Menor estoque'   },
]

const currentSortLabel = computed(() =>
  sortOptions.find(o => o.value === currentSort.value)?.label || 'Ordenar'
)

const hasActiveFilters = computed(() => !!search.value || !!filterStatus.value || !!selectedAccountId.value)

// ── Helpers ──────────────────────────────────────────────────
const statusLabel = (s) => {
  const map = { NORMAL: 'Ativo', UNLIST: 'Pausado', BANNED: 'Banido', DELETED: 'Deletado' }
  return map[s] || s || '—'
}

const statusColor = (s) => {
  const map = { NORMAL: 'positive', UNLIST: 'orange', BANNED: 'negative', DELETED: 'grey-6' }
  return map[s] || 'grey-6'
}

const formatCurrency = (v) =>
  v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

const formatDate = (v) =>
  v ? DateTime.fromISO(v).setZone('America/Sao_Paulo').toFormat('dd/MM HH:mm') : '—'

const copyText = (text) => {
  navigator.clipboard.writeText(text)
  $q.notify({ message: `Copiado: ${text}`, color: 'dark', position: 'top', timeout: 1500 })
}

// ── API ──────────────────────────────────────────────────────
const loadAccounts = async () => {
  try {
    const { data } = await api.get('/shopee/accounts/')
    accountOptions.value = Array.isArray(data) ? data : (data.results || [])
    if (accountOptions.value.length === 1) {
      selectedAccountId.value = accountOptions.value[0].id
    }
    loadItems()
  } catch {
    $q.notify({ message: 'Erro ao carregar contas Shopee.', color: 'negative', position: 'top' })
  }
}

const buildParams = (pg = pagination.value) => {
  const p = {
    page: pg.page,
    page_size: pg.rowsPerPage,
    sort: currentSort.value,
  }
  if (selectedAccountId.value) p.account  = selectedAccountId.value
  if (filterStatus.value)       p.status   = filterStatus.value
  if (search.value)             p.search   = search.value
  return p
}

const loadItems = async (pg = null) => {
  loading.value = true
  if (pg) {
    pagination.value.page = pg.page
    pagination.value.rowsPerPage = pg.rowsPerPage
  } else {
    pagination.value.page = 1
  }
  try {
    const { data } = await api.get('/shopee/items/', { params: buildParams() })
    const list = Array.isArray(data) ? data : (data.results || [])
    items.value = list
    pagination.value.rowsNumber = data.count ?? list.length
  } catch {
    $q.notify({ message: 'Erro ao carregar anúncios.', color: 'negative', position: 'top' })
  } finally {
    loading.value = false
  }
}

const onRequest = (props) => {
  loadItems(props.pagination)
}

const onSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadItems(), 400)
}

const applySort = (val) => {
  currentSort.value = val
  loadItems()
}

const clearFilters = () => {
  search.value        = ''
  filterStatus.value  = null
  selectedAccountId.value = null
  loadItems()
}

const syncItems = async () => {
  if (!selectedAccountId.value) return
  syncing.value = true
  try {
    const { data } = await api.post(`/shopee/accounts/${selectedAccountId.value}/sync_items/`)
    $q.notify({
      message: `Sync concluído: ${data.stats?.synced ?? 0} anúncios sincronizados.`,
      color: 'positive', position: 'top', timeout: 4000,
    })
    loadItems()
  } catch (e) {
    $q.notify({ message: `Erro ao sincronizar: ${e?.response?.data?.error || e.message}`, color: 'negative', position: 'top' })
  } finally {
    syncing.value = false
  }
}

onMounted(loadAccounts)
</script>

<style scoped>
.shopee-items-page { background: #f5f7fa; min-height: 100vh; }

/* ── Header ─────────────────────────────────────────────── */
.page-header {
  padding: 18px 24px 16px; background: #fff;
  border-bottom: 1.5px solid #e8edf3;
}
.header-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #ff6600, #EE4D2D); color: #fff;
}
.header-eyebrow { font-size: 10px; color: #9aa0ac; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.header-title   { font-size: 17px; font-weight: 700; color: #1a1f36; }
.header-count {
  font-size: 12px; font-weight: 600; color: #EE4D2D;
  background: rgba(238,77,45,.1); border-radius: 12px; padding: 3px 12px;
}

/* ── Toolbar ─────────────────────────────────────────────── */
.fb { background: #fff; border-bottom: 1.5px solid #e8edf3; padding: 0 24px; }
.fb-toolbar {
  display: flex; align-items: center; gap: 10px;
  flex-wrap: wrap; padding: 10px 0 6px;
}
.fb-toolbar-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }

.fb-search {
  display: flex; align-items: center; gap: 6px;
  background: #f5f7fa; border: 1.5px solid #e8edf3; border-radius: 8px;
  padding: 0 10px; transition: border-color .15s; min-width: 240px; flex: 1; max-width: 400px;
}
.fb-search.focused { border-color: #EE4D2D; }
.fb-search-icon   { color: #9aa0ac; flex-shrink: 0; }
.fb-search-input  {
  border: none; background: transparent; outline: none;
  font-size: 13px; color: #1a1f36; flex: 1; padding: 7px 0;
}
.fb-search-clear  {
  background: none; border: none; cursor: pointer; padding: 2px;
  color: #9aa0ac; display: flex; align-items: center;
}
.fb-btn-group {
  display: flex; border: 1.5px solid #e8edf3; border-radius: 8px; overflow: hidden;
}
.fb-tbtn {
  background: #fff !important; border: none; cursor: pointer; padding: 6px 12px;
  font-size: 12px !important; font-weight: 600; color: #6b7280 !important;
  transition: background .15s; white-space: nowrap;
}
.fb-tbtn:hover { background: #f5f7fa !important; }
.fb-clear-btn {
  display: flex; align-items: center; gap: 5px;
  background: none; border: 1.5px solid #fca5a5; border-radius: 8px; cursor: pointer;
  padding: 5px 10px; font-size: 12px; font-weight: 600; color: #ef4444;
  transition: background .15s;
}
.fb-clear-btn:hover { background: #fef2f2; }

/* Filterbar */
.fb-filterbar {
  display: flex; align-items: center; gap: 8px; padding: 6px 0 10px; flex-wrap: wrap;
}
.fb-combo {
  position: relative; display: flex; align-items: center;
  border: 1.5px solid #e8edf3; border-radius: 8px; overflow: hidden;
  transition: border-color .15s; background: #fff;
}
.fb-combo--on { border-color: #EE4D2D; background: rgba(238,77,45,.04); }
.fb-combo-btn {
  display: flex; align-items: center; gap: 5px; background: none; border: none;
  cursor: pointer; padding: 5px 10px; font-size: 12px; font-weight: 600; color: #374151;
  white-space: nowrap;
}
.fb-combo--on .fb-combo-btn { color: #EE4D2D; }
.fb-combo-ico   { color: #9aa0ac; flex-shrink: 0; }
.fb-combo--on .fb-combo-ico { color: #EE4D2D; }
.fb-combo-arrow { color: #c4c9d4; }
.fb-combo-clear {
  background: none; border: none; cursor: pointer;
  padding: 0 6px 0 0; color: #c4c9d4; display: flex; align-items: center;
}
.fb-combo-clear:hover { color: #EE4D2D; }
.fb-menu { border: 1.5px solid #e8edf3; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.08); }
.fb-menu-item { border-radius: 0 !important; }
.fb-menu-item--on { background: rgba(238,77,45,.06) !important; }
.fb-menu-item-label { font-size: 13px; font-weight: 500; }

/* ── Tabela ──────────────────────────────────────────────── */
.shopee-table { background: #fff; }
:deep(.shopee-table .q-table__top) { display: none; }
:deep(.shopee-table thead tr th) {
  position: sticky; top: 0; z-index: 1;
  background: #f8fafc; font-size: 11px; font-weight: 700;
  color: #6b7280; text-transform: uppercase; letter-spacing: .4px;
  border-bottom: 1.5px solid #e8edf3;
}
:deep(.shopee-table tbody tr.hover-row:hover) {
  background: #fff8f7 !important;
}
:deep(.shopee-table tbody td) { border-bottom: 1px solid #f1f5f9; }

.border-grey { border: 1px solid #e8edf3; }
.font-mono { font-family: 'Courier New', monospace; font-size: 11px; }

/* Animations */
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
