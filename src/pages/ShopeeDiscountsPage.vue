<template>
  <q-page class="sd-page">

    <!-- ── HEADER ── -->
    <div class="sd-header">
      <div class="sd-header-left">
        <q-icon name="local_offer" size="20px" class="q-mr-sm text-orange-7" />
        <span class="sd-title">Descontos</span>
        <span class="sd-subtitle">Shopee</span>
      </div>
      <div class="sd-header-right">
        <!-- Filtro de conta -->
        <div class="sd-account-filter">
          <button v-for="a in accounts" :key="a.id"
            :class="['sd-acc-btn', selectedAccountId === a.id && 'sd-acc-btn--on']"
            @click="selectedAccountId = a.id; loadDiscounts()">
            {{ a.shop_name }}
          </button>
          <button :class="['sd-acc-btn', selectedAccountId === null && 'sd-acc-btn--on']"
            @click="selectedAccountId = null; loadDiscounts()">
            Todas
          </button>
        </div>

        <!-- Filtro de status -->
        <div class="sd-status-tabs">
          <button v-for="s in statusOptions" :key="s.value"
            :class="['sd-tab', statusFilter === s.value && 'sd-tab--on']"
            @click="statusFilter = s.value; loadDiscounts()">
            {{ s.label }}
          </button>
        </div>

        <q-btn unelevated color="orange-7" text-color="white" icon="add" label="Novo Desconto"
          size="sm" class="q-ml-sm" @click="openCreate()" />
        <q-btn v-if="selectedCount > 0" unelevated color="red-7" text-color="white"
          icon="stop_circle" :label="`Encerrar ${selectedCount} selecionado(s)`" size="sm"
          class="q-ml-sm" :disable="isProcessing" :loading="isProcessing" @click="bulkEnd()" />
      </div>
    </div>

    <!-- ── PROCESSING BANNER (lote) ── -->
    <div v-if="isProcessing" class="sd-processing">
      <q-spinner-gears color="white" size="20px" class="q-mr-sm" />
      <span>Processando {{ processingTotal }} desconto(s) em lote
        ({{ processingDone }}/{{ processingTotal }})…</span>
      <q-linear-progress :value="processingPct" color="white" class="sd-progress" stripe animated />
    </div>

    <!-- ── LOADING ── -->
    <div v-if="loading" class="sd-loading">
      <q-spinner-dots color="orange-7" size="32px" />
    </div>

    <!-- ── EMPTY ── -->
    <div v-else-if="!discounts.length" class="sd-empty">
      <q-icon name="local_offer" size="48px" color="grey-4" />
      <div class="text-grey-6 q-mt-sm">Nenhum desconto encontrado</div>
      <div class="text-caption text-grey-4">Crie seu primeiro desconto clicando em "Novo Desconto"</div>
    </div>

    <!-- ── LISTA ── -->
    <div v-else class="sd-list">
      <div v-for="d in discounts" :key="d.discount_id + '-' + d.account_id" class="sd-card"
        @click="openDetail(d)">

        <!-- Seleção (lote) -->
        <q-checkbox :model-value="isSelected(d)" @click.stop="toggleSelect(d)"
          class="sd-select" />

        <!-- Status badge -->
        <div :class="['sd-status-badge', `sd-status--${d.status}`]">
          <q-icon :name="statusIcon(d.status)" size="11px" class="q-mr-xs" />
          {{ d.status_label }}
        </div>

        <div class="sd-card-body">
          <div class="sd-card-main">
            <div class="sd-discount-name">{{ d.discount_name }}</div>
            <div class="sd-discount-meta">
              <span v-if="d.source === 'shopee'" class="sd-source-badge">
                <q-icon name="store" size="10px" class="q-mr-xs" />Shopee
              </span>
              <q-icon name="storefront" size="12px" class="q-mr-xs text-grey-5" />
              <span class="text-grey-6">{{ d.shop_name }}</span>
              <span class="sd-sep">·</span>
              <q-icon name="schedule" size="12px" class="q-mr-xs text-grey-5" />
              <span class="text-grey-6">{{ fmtTime(d.start_time) }} → {{ fmtTime(d.end_time) }}</span>
            </div>
          </div>

          <div class="sd-card-actions" @click.stop>
            <q-btn v-if="d.status === 'ongoing'" flat round icon="stop_circle" color="red-7" size="sm"
              title="Encerrar agora" :disable="isProcessing" @click="confirmEnd(d)" />
            <q-btn v-if="d.status === 'upcoming'" flat round icon="delete" color="grey-6" size="sm"
              title="Deletar desconto" :disable="isProcessing" @click="confirmDelete(d)" />
            <q-btn flat round icon="chevron_right" color="grey-5" size="sm" @click="openDetail(d)" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── DETAIL DRAWER ── -->
    <q-dialog v-model="detailOpen" position="right" full-height>
      <q-card style="width: 600px; max-width: 98vw;" class="column">
        <q-card-section class="row items-center bg-orange-8 text-white col-auto q-py-sm">
          <q-icon name="local_offer" size="sm" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold ellipsis" style="max-width:400px">
            {{ activeDiscount?.discount_name }}
          </div>
          <q-space />
          <div :class="['sd-status-badge sd-status-badge--sm', `sd-status--${activeDiscount?.status}`]" style="margin-right:8px">
            {{ activeDiscount?.status_label }}
          </div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="col-auto q-py-xs q-px-md bg-grey-1 text-caption text-grey-7 row items-center">
          <span v-if="activeDiscount?.source === 'shopee'" class="sd-source-badge q-mr-sm">
            <q-icon name="store" size="10px" class="q-mr-xs" />Campanha Shopee
          </span>
          <q-icon name="storefront" size="12px" class="q-mr-xs" />{{ activeDiscount?.shop_name }}
          <span class="sd-sep">·</span>
          <q-icon name="schedule" size="12px" class="q-mr-xs" />
          {{ fmtTime(activeDiscount?.start_time) }} → {{ fmtTime(activeDiscount?.end_time) }}
          <span class="sd-sep">·</span>
          ID: {{ activeDiscount?.discount_id }}
        </q-card-section>

        <q-card-section v-if="detailLoading" class="col flex-center">
          <q-spinner-dots color="orange-7" size="28px" />
        </q-card-section>

        <q-card-section v-else class="col scroll q-pa-none">
          <!-- Paginação -->
          <div v-if="detailData?.more || detailPage > 1" class="row items-center justify-end q-px-md q-pt-sm">
            <q-btn flat dense icon="chevron_left" size="sm" :disable="detailPage <= 1"
              @click="detailPage--; loadDetail()" />
            <span class="text-caption text-grey-6 q-mx-sm">Página {{ detailPage }}</span>
            <q-btn flat dense icon="chevron_right" size="sm" :disable="!detailData?.more"
              @click="detailPage++; loadDetail()" />
          </div>

          <table class="sd-items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-right">Preço Original</th>
                <th class="text-right">Preço Promo</th>
                <th class="text-right">Desconto</th>
                <th class="text-right">Estoque</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="item in detailData?.item_list || []" :key="item.item_id">
                <!-- Linha item (sem variações ou como header) -->
                <tr v-if="!item.model_list?.length" class="sd-item-row">
                  <td>
                    <div class="sd-item-name">{{ item.item_name }}</div>
                    <div class="text-caption text-grey-5">ID {{ item.item_id }}</div>
                  </td>
                  <td class="text-right text-grey-6">{{ fmtPrice(item.item_original_price) }}</td>
                  <td class="text-right text-weight-medium text-orange-9">{{ fmtPrice(item.item_promotion_price) }}</td>
                  <td class="text-right">
                    <span :class="['sd-pct-badge', discountClass(item.discount_pct)]">
                      {{ item.discount_pct != null ? `-${item.discount_pct}%` : '—' }}
                    </span>
                  </td>
                  <td class="text-right text-grey-6">{{ item.item_promotion_stock ?? '—' }}</td>
                </tr>

                <!-- Item com variações: header -->
                <tr v-else class="sd-item-row sd-item-row--parent">
                  <td colspan="5">
                    <div class="sd-item-name">{{ item.item_name }}</div>
                    <div class="text-caption text-grey-5">ID {{ item.item_id }} · {{ item.model_list.length }} variações</div>
                  </td>
                </tr>
                <!-- Variações -->
                <tr v-for="m in item.model_list" :key="m.model_id" class="sd-model-row">
                  <td class="sd-model-name">
                    <q-icon name="subdirectory_arrow_right" size="12px" class="text-grey-4 q-mr-xs" />
                    {{ m.model_name }}
                  </td>
                  <td class="text-right text-grey-6">{{ fmtPrice(m.model_original_price) }}</td>
                  <td class="text-right text-weight-medium text-orange-9">{{ fmtPrice(m.model_promotion_price) }}</td>
                  <td class="text-right">
                    <span :class="['sd-pct-badge', discountClass(m.discount_pct)]">
                      {{ m.discount_pct != null ? `-${m.discount_pct}%` : '—' }}
                    </span>
                  </td>
                  <td class="text-right text-grey-6">{{ m.model_promotion_stock ?? '—' }}</td>
                </tr>
              </template>

              <tr v-if="!detailData?.item_list?.length">
                <td colspan="5" class="text-center text-grey-5 q-py-lg">Nenhum item encontrado</td>
              </tr>
            </tbody>
          </table>
        </q-card-section>

        <q-card-section class="col-auto q-py-sm q-px-md row justify-between bg-grey-1 items-center" style="border-top:1px solid #eee">
          <div class="row items-center q-gutter-sm">
            <q-btn v-if="activeDiscount?.status !== 'expired'" unelevated color="teal-7" icon="add"
              label="Adicionar Itens" size="sm" @click="openAddItems(activeDiscount)" />
          </div>
          <div class="row items-center q-gutter-sm">
            <q-btn v-if="activeDiscount?.status === 'ongoing'" unelevated color="red-7" icon="stop_circle"
              label="Encerrar" size="sm" @click="confirmEnd(activeDiscount)" />
            <q-btn v-if="activeDiscount?.status === 'upcoming'" unelevated color="grey-7" icon="delete"
              label="Deletar" size="sm" @click="confirmDelete(activeDiscount)" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ── CREATE DIALOG ── -->
    <q-dialog v-model="createOpen">
      <q-card style="width: 480px; max-width: 98vw;">
        <q-card-section class="row items-center bg-orange-8 text-white">
          <q-icon name="add_circle" class="q-mr-sm" />
          <span class="text-subtitle1 text-weight-bold">Novo Desconto</span>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-md q-pt-md">
          <q-select v-model="form.account_id" :options="accountOptions" option-value="id" option-label="shop_name"
            emit-value map-options label="Conta Shopee *" outlined dense />
          <q-input v-model="form.discount_name" label="Nome do Desconto *" outlined dense
            placeholder="Ex: Oferta Relâmpago 07.07" />
          <div class="row q-gutter-sm">
            <q-input v-model="form.start_date" label="Início *" type="datetime-local" outlined dense class="col" />
            <q-input v-model="form.end_date" label="Fim *" type="datetime-local" outlined dense class="col" />
          </div>
          <div class="text-caption text-grey-6">
            Após criar, adicione itens ao desconto abrindo o detalhe e clicando em "Adicionar Itens".
          </div>
        </q-card-section>
        <q-card-section class="row justify-end q-pt-none q-gutter-sm">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="orange-7" label="Criar Desconto" :loading="createLoading"
            :disable="!form.account_id || !form.discount_name || !form.start_date || !form.end_date"
            @click="submitCreate()" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ── ADD ITEMS DIALOG ── -->
    <q-dialog v-model="addItemsOpen" maximized position="right">
      <q-card class="column" style="width: 700px; max-width: 98vw;">
        <q-card-section class="row items-center q-py-sm bg-teal-7 text-white">
          <q-icon name="playlist_add" class="q-mr-sm" />
          <span class="text-subtitle1 text-weight-bold">Adicionar Itens — {{ addItemsDiscount?.discount_name }}</span>
          <q-space /><q-btn flat round dense icon="close" v-close-popup @click="addItemsOpen = false" />
        </q-card-section>

        <q-card-section class="col-auto row items-center q-gutter-sm q-pt-sm">
          <q-input v-model="addItemSearch" label="Buscar item" outlined dense clearable
            placeholder="Nome ou ID do item" style="min-width: 200px;" />
          <q-btn flat color="teal-7" icon="refresh" size="sm" @click="loadAddItems()" />
          <q-space />
          <span class="text-caption text-grey-6">{{ filteredItems.length }} itens disponíveis</span>
        </q-card-section>

        <q-card-section v-if="hiddenVariationCount > 0" class="col-auto q-pt-none">
          <div class="sd-variation-notice">
            <q-icon name="info" size="14px" class="q-mr-xs" />
            {{ hiddenVariationCount }} item(ns) com variação (tamanho/cor) oculto(s) — ainda não
            suportados aqui, precisam ser adicionados pelo painel da Shopee.
          </div>
        </q-card-section>

        <q-card-section v-if="addItemsLoading" class="col flex-center">
          <q-spinner-dots color="teal-7" size="28px" />
        </q-card-section>

        <q-card-section v-else class="col scroll q-pa-none">
          <table class="sd-items-table">
            <thead>
              <tr>
                <th style="width:36px"></th>
                <th>Item</th>
                <th class="text-right">Preço</th>
                <th class="text-right" style="width:120px">Preço Promo</th>
                <th class="text-right" style="width:100px">Estoque Promo</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="item in filteredItems" :key="item.item_id">
                <tr :class="['sd-item-row', selectedAddItems.has(item.item_id) && 'sd-item-row--selected']"
                  @click="toggleAddItem(item)">
                  <td class="text-center">
                    <q-checkbox :model-value="selectedAddItems.has(item.item_id)" dense />
                  </td>
                  <td>
                    <div class="sd-item-name ellipsis" style="max-width: 280px;">{{ item.item_name }}</div>
                    <div class="text-caption text-grey-5">ID {{ item.item_id }}</div>
                  </td>
                  <td class="text-right text-grey-6">{{ fmtPrice(item.price) }}</td>
                  <td class="text-right">
                    <q-input v-model="addItemPrices[item.item_id]" type="number" dense outlined
                      :placeholder="String(item.price)" step="0.01" min="0.01"
                      style="width: 100px;" @click.stop
                      @update:model-value="v => { addItemPrices[item.item_id] = Math.min(Number(v || 0), item.price || Infinity) }" />
                  </td>
                  <td class="text-right">
                    <q-input v-model="addItemStocks[item.item_id]" type="number" dense outlined
                      :placeholder="String(item.stock || 10)" step="1" min="1"
                      style="width: 80px;" @click.stop
                      @update:model-value="v => { addItemStocks[item.item_id] = Math.max(1, Math.min(Math.round(Number(v || 1)), item.stock || 1)) }" />
                  </td>
                </tr>
              </template>
              <tr v-if="!filteredItems.length">
                <td colspan="5" class="text-center text-grey-5 q-py-lg">Nenhum item encontrado</td>
              </tr>
            </tbody>
          </table>
        </q-card-section>

        <q-card-section class="col-auto q-py-sm q-px-md row justify-between bg-grey-1 items-center" style="border-top:1px solid #eee">
          <span class="text-caption text-grey-6">{{ selectedAddItems.size }} item(ns) selecionado(s)</span>
          <div class="row q-gutter-sm">
            <q-btn flat label="Cancelar" v-close-popup @click="addItemsOpen = false" />
            <q-btn unelevated color="teal-7" label="Adicionar ao Desconto" :loading="addItemsSaving"
              :disable="!selectedAddItems.size" @click="submitAddItems()" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ── CONFIRM END ── -->
    <q-dialog v-model="confirmEndOpen">
      <q-card style="width:380px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="warning" color="red-7" size="md" class="q-mr-sm" />
          <span class="text-subtitle1 text-weight-bold">Encerrar desconto?</span>
        </q-card-section>
        <q-card-section class="text-grey-8">
          O desconto <strong>{{ confirmTarget?.discount_name }}</strong> será encerrado imediatamente.
          Itens voltarão ao preço original.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="red-7" label="Encerrar" :loading="actionLoading" @click="doEnd()" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── CONFIRM DELETE ── -->
    <q-dialog v-model="confirmDeleteOpen">
      <q-card style="width:380px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="delete_forever" color="red-7" size="md" class="q-mr-sm" />
          <span class="text-subtitle1 text-weight-bold">Deletar desconto?</span>
        </q-card-section>
        <q-card-section class="text-grey-8">
          O desconto <strong>{{ confirmTarget?.discount_name }}</strong> será deletado permanentemente.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="red-7" label="Deletar" :loading="actionLoading" @click="doDelete()" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import ShopeeService from 'src/services/ShopeeService'

const $q = useQuasar()

// ── State ──────────────────────────────────────────────────────────────────
const accounts        = ref([])
const discounts       = ref([])
const loading         = ref(false)
const selectedAccountId = ref(null)
const statusFilter    = ref('all')

const detailOpen      = ref(false)
const detailLoading   = ref(false)
const activeDiscount  = ref(null)
const detailData      = ref(null)
const detailPage      = ref(1)

const createOpen      = ref(false)
const createLoading   = ref(false)
const form            = ref({ account_id: null, discount_name: '', start_date: '', end_date: '' })

const confirmEndOpen    = ref(false)
const confirmDeleteOpen = ref(false)
const confirmTarget     = ref(null)
const actionLoading     = ref(false)

// ── Add Items ──────────────────────────────────────────────────────────
const addItemsOpen      = ref(false)
const addItemsDiscount  = ref(null)
const addItemsLoading   = ref(false)
const addItemsSaving    = ref(false)
const addItemSearch     = ref('')
const availableItems    = ref([])
const selectedAddItems  = ref(new Set())
const addItemPrices     = ref({})
const addItemStocks     = ref({})
const hiddenVariationCount = ref(0)

const filteredItems = computed(() => {
  const q = (addItemSearch.value || '').toLowerCase().trim()
  if (!q) return availableItems.value
  return availableItems.value.filter(i =>
    (i.item_name || '').toLowerCase().includes(q) ||
    String(i.item_id).includes(q)
  )
})

// ── Processamento em lote (segundo plano) ──────────────────────────────
const tasks          = ref([])
const selected       = ref(new Set())
let   pollTimer      = null

function isSelected(d) {
  return selected.value.has(`${d.account_id}-${d.discount_id}`)
}
function toggleSelect(d) {
  const key = `${d.account_id}-${d.discount_id}`
  if (selected.value.has(key)) selected.value.delete(key)
  else selected.value.add(key)
  selected.value = new Set(selected.value)
}
const selectedCount = computed(() => selected.value.size)

const isProcessing    = computed(() => tasks.value.some(t => t.status === 'processing'))
const processingTask  = computed(() => tasks.value.find(t => t.status === 'processing') || null)
const processingTotal  = computed(() => processingTask.value?.total || 0)
const processingDone   = computed(() => processingTask.value?.processed || 0)
const processingPct   = computed(() => processingTotal.value ? Math.round(processingDone.value / processingTotal.value * 100) : 0)

async function loadTasks() {
  try {
    const res = await ShopeeService.getDiscountTasks()
    tasks.value = res.data?.tasks || []
  } catch { tasks.value = [] }
}

async function bulkEnd() {
  const items = [...selected.value].map(key => {
    const [account_id, discount_id] = key.split('-')
    return { account_id: Number(account_id), discount_id: Number(discount_id), action: 'end' }
  })
  if (!items.length) return
  try {
    const res = await ShopeeService.bulkDiscounts(items)
    $q.notify({ type: 'positive', message: res.data?.message || 'Processamento iniciado.' })
    selected.value = new Set()
    await loadTasks()
    startPolling()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao iniciar: ' + (e?.response?.data?.error || e.message) })
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    await loadTasks()
    if (!isProcessing.value && pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }, 5000)
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}


const statusOptions = [
  { value: 'all',      label: 'Todas'       },
  { value: 'ongoing',  label: 'Em andamento' },
  { value: 'upcoming', label: 'Agendadas'   },
  { value: 'expired',  label: 'Encerradas'  },
]

const accountOptions = computed(() => accounts.value)

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadAccounts()
  await loadDiscounts()
  await loadTasks()
  if (isProcessing.value) startPolling()
})

onUnmounted(stopPolling)

// ── Loaders ────────────────────────────────────────────────────────────────
async function loadAccounts() {
  try {
    const res = await ShopeeService.listAccounts()
    accounts.value = res.data || []
  } catch { accounts.value = [] }
}

async function loadDiscounts() {
  loading.value = true
  try {
    const params = { status: statusFilter.value }
    if (selectedAccountId.value) params.account_id = selectedAccountId.value
    const res = await ShopeeService.getDiscounts(params)
    discounts.value = res.data?.discounts || []
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar descontos: ' + (e?.response?.data?.error || e.message) })
  } finally {
    loading.value = false
  }
}

async function loadDetail() {
  detailLoading.value = true
  try {
    const res = await ShopeeService.getDiscountDetail(activeDiscount.value.discount_id, {
      account_id: activeDiscount.value.account_id,
      page_no:    detailPage.value,
    })
    detailData.value = res.data
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar itens: ' + (e?.response?.data?.error || e.message) })
  } finally {
    detailLoading.value = false
  }
}

// ── Add Items ──────────────────────────────────────────────────────────
async function loadAddItems() {
  addItemsLoading.value = true
  try {
    const accId = addItemsDiscount.value?.account_id
    const res = await ShopeeService.listItems({ account_id: accId, page_size: 100 })
    const normal = (res.data?.items || []).filter(i => i.status === 'NORMAL')
    // add_discount_items só aceita item_promotion_price/stock no nível do item —
    // itens com variação (has_model) exigem model_list por variação, que esta
    // tela ainda não monta. Esconder em vez de deixar falhar contra a Shopee.
    availableItems.value = normal.filter(i => !i.has_model)
    hiddenVariationCount.value = normal.length - availableItems.value.length
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar itens: ' + (e?.response?.data?.error || e.message) })
    availableItems.value = []
    hiddenVariationCount.value = 0
  } finally {
    addItemsLoading.value = false
  }
}

function openAddItems(d) {
  addItemsDiscount.value = d
  selectedAddItems.value = new Set()
  addItemPrices.value = {}
  addItemStocks.value = {}
  addItemSearch.value = ''
  addItemsOpen.value = true
  loadAddItems()
}

function toggleAddItem(item) {
  const id = item.item_id
  if (selectedAddItems.value.has(id)) {
    selectedAddItems.value.delete(id)
  } else {
    selectedAddItems.value.add(id)
    if (!(id in addItemPrices.value)) {
      addItemPrices.value[id] = item.price || 0
    }
    if (!(id in addItemStocks.value)) {
      addItemStocks.value[id] = Math.min(item.stock || 10, 50)
    }
  }
  selectedAddItems.value = new Set(selectedAddItems.value)
}

async function submitAddItems() {
  if (!selectedAddItems.value.size) return
  addItemsSaving.value = true
  try {
    const items = [...selectedAddItems.value].map(itemId => ({
      item_id: Number(itemId),
      item_promotion_price: Number(addItemPrices.value[itemId] || 0),
      item_promotion_stock: Number(addItemStocks.value[itemId] || 10),
      purchase_limit: 0,
    }))
    await ShopeeService.addDiscountItems(addItemsDiscount.value.discount_id, {
      account_id: addItemsDiscount.value.account_id,
      items,
    })
    $q.notify({ type: 'positive', message: `${items.length} item(ns) adicionado(s) ao desconto!` })
    addItemsOpen.value = false
    // Recarrega o detalhe para mostrar os novos itens
    if (detailOpen.value) loadDetail()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao adicionar itens: ' + (e?.response?.data?.error || e.message) })
  } finally {
    addItemsSaving.value = false
  }
}

// ── Actions ────────────────────────────────────────────────────────────────
function openDetail(d) {
  activeDiscount.value = d
  detailPage.value = 1
  detailData.value = null
  detailOpen.value = true
  loadDetail()
}

function openCreate() {
  if (!accounts.value.length) {
    $q.notify({
      type: 'warning',
      message: 'Nenhuma conta Shopee conectada ou compartilhada com você. Conecte uma conta em Contas Shopee para criar descontos.',
    })
    return
  }
  form.value = { account_id: accounts.value[0]?.id || null, discount_name: '', start_date: '', end_date: '' }
  createOpen.value = true
}

async function submitCreate() {
  createLoading.value = true
  try {
    const startTs = Math.floor(new Date(form.value.start_date).getTime() / 1000)
    const endTs   = Math.floor(new Date(form.value.end_date).getTime()   / 1000)
    await ShopeeService.createDiscount({
      account_id:    form.value.account_id,
      discount_name: form.value.discount_name,
      start_time:    startTs,
      end_time:      endTs,
    })
    $q.notify({ type: 'positive', message: 'Desconto criado com sucesso!' })
    createOpen.value = false
    await loadDiscounts()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao criar: ' + (e?.response?.data?.error || e.message) })
  } finally {
    createLoading.value = false
  }
}

function confirmEnd(d) {
  confirmTarget.value = d
  confirmEndOpen.value = true
}

function confirmDelete(d) {
  confirmTarget.value = d
  confirmDeleteOpen.value = true
}

async function doEnd() {
  actionLoading.value = true
  try {
    await ShopeeService.endDiscount(confirmTarget.value.discount_id, {
      account_id: confirmTarget.value.account_id,
    })
    $q.notify({ type: 'positive', message: 'Desconto encerrado.' })
    confirmEndOpen.value = false
    detailOpen.value = false
    await loadDiscounts()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro: ' + (e?.response?.data?.error || e.message) })
  } finally {
    actionLoading.value = false
  }
}

async function doDelete() {
  actionLoading.value = true
  try {
    await ShopeeService.deleteDiscount(confirmTarget.value.discount_id, {
      account_id: confirmTarget.value.account_id,
    })
    $q.notify({ type: 'positive', message: 'Desconto deletado.' })
    confirmDeleteOpen.value = false
    detailOpen.value = false
    await loadDiscounts()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro: ' + (e?.response?.data?.error || e.message) })
  } finally {
    actionLoading.value = false
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtTime(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtPrice(v) {
  if (v == null) return '—'
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function statusIcon(s) {
  return s === 'ongoing' ? 'play_circle' : s === 'upcoming' ? 'pending' : 'check_circle'
}

function discountClass(pct) {
  if (pct == null) return ''
  if (pct >= 30) return 'sd-pct--high'
  if (pct >= 15) return 'sd-pct--mid'
  return 'sd-pct--low'
}
</script>

<style scoped>
.sd-page { padding: 16px; max-width: 1100px; margin: 0 auto; }

/* Header */
.sd-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.sd-header-left { display: flex; align-items: center; }
.sd-title { font-size: 16px; font-weight: 700; color: #1a1a2e; }
.sd-subtitle { font-size: 11px; color: #e07b39; margin-left: 6px; background: #fff3e0; padding: 2px 7px; border-radius: 10px; font-weight: 600; }
.sd-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* Account filter */
.sd-account-filter, .sd-status-tabs { display: flex; gap: 4px; }
.sd-acc-btn, .sd-tab { font-size: 12px; padding: 4px 10px; border-radius: 16px; border: 1px solid #e0e0e0; background: #fff; cursor: pointer; color: #555; transition: all .15s; }
.sd-acc-btn--on, .sd-tab--on { background: #e65100; color: #fff; border-color: #e65100; }

/* Loading / Empty */
.sd-loading { display: flex; justify-content: center; padding: 60px; }
.sd-empty { text-align: center; padding: 60px 20px; color: #aaa; }

/* Processing banner (lote) */
.sd-processing {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: linear-gradient(90deg, #e65100, #f57c00);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}
.sd-progress { flex: 1; min-width: 120px; }

/* Seleço de cards (lote) */
.sd-select { position: absolute; top: 10px; right: 10px; z-index: 2; }

/* Card list */
.sd-list { display: flex; flex-direction: column; gap: 8px; }
.sd-card { background: #fff; border-radius: 10px; border: 1px solid #f0f0f0; padding: 12px 14px; cursor: pointer; transition: box-shadow .15s, border-color .15s; position: relative; }
.sd-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,.08); border-color: #e07b39; }
.sd-card-body { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
.sd-card-main { flex: 1; min-width: 0; }
.sd-card-actions { display: flex; align-items: center; gap: 2px; }
.sd-discount-name { font-size: 14px; font-weight: 600; color: #1a1a2e; }
.sd-discount-meta { font-size: 12px; color: #888; margin-top: 2px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.sd-sep { margin: 0 4px; color: #ddd; }

/* Status badge */
.sd-status-badge { display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; letter-spacing: .3px; text-transform: uppercase; }
.sd-status-badge--sm { font-size: 10px; padding: 2px 7px; }
.sd-source-badge { display: inline-flex; align-items: center; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 6px; background: #e0f2fe; color: #0369a1; }
.sd-status--ongoing  { background: #e8f5e9; color: #2e7d32; }
.sd-status--upcoming { background: #fff8e1; color: #f57f17; }
.sd-status--expired  { background: #f5f5f5; color: #9e9e9e; }
.sd-status--all      { background: #e3f2fd; color: #1565c0; }

/* Items table */
.sd-variation-notice { font-size: 12px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; }
.sd-items-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sd-items-table thead th { background: #fafafa; color: #888; font-weight: 600; font-size: 11px; text-transform: uppercase; padding: 8px 12px; border-bottom: 1px solid #eee; letter-spacing: .4px; }
.sd-item-row td, .sd-model-row td { padding: 8px 12px; border-bottom: 1px solid #f5f5f5; vertical-align: middle; }
.sd-item-row--selected { background: #f0fdfa !important; }
.sd-item-row--selected td { background: transparent !important; }
.sd-item-row--parent td { background: #fafafa; padding-top: 10px; padding-bottom: 4px; }
.sd-model-row td { background: #fff; color: #555; font-size: 12px; }
.sd-item-name { font-weight: 600; color: #333; }
.sd-model-name { color: #777; font-size: 12px; }

/* Pct badge */
.sd-pct-badge { display: inline-block; padding: 1px 7px; border-radius: 8px; font-size: 11px; font-weight: 700; }
.sd-pct--high { background: #fce4ec; color: #c62828; }
.sd-pct--mid  { background: #fff3e0; color: #e65100; }
.sd-pct--low  { background: #f1f8e9; color: #558b2f; }

@media (max-width: 600px) {
  .page-header { flex-wrap: wrap; gap: 8px; padding: 8px 12px; }
  .filter-bar { overflow-x: auto; display: flex; }
  .sd-items-table-wrap { overflow-x: auto; }
}
</style>
