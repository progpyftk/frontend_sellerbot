<template>
  <q-page class="shopee-items-page">

    <!-- ══ HEADER ══════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <q-icon name="mdi-storefront" size="20px" />
        </div>
        <div>
          <div class="header-eyebrow">Shopee</div>
          <div class="header-title">Meus Anúncios</div>
        </div>
        <div v-if="totalCount !== null" class="header-count">
          {{ totalCount.toLocaleString('pt-BR') }} anúncios
        </div>
      </div>
      <div class="header-right">
        <q-btn unelevated color="deep-orange" icon="sync" label="Sincronizar"
          :loading="syncing" :disable="!selectedAccount" size="sm"
          @click="syncItems">
          <q-tooltip v-if="!selectedAccount">Selecione uma conta primeiro</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ══ TOOLBAR ══════════════════════════════════════════════ -->
    <div class="fb">
      <div class="fb-toolbar">

        <!-- Busca -->
        <div class="fb-search" :class="{ focused: searchFocused, filled: !!search }">
          <q-icon name="search" size="18px" class="fb-search-icon" />
          <input v-model="search" class="fb-search-input"
            placeholder="Buscar por título ou SKU..."
            @focus="searchFocused = true" @blur="searchFocused = false"
            @input="onSearch" />
          <transition name="fade">
            <button v-if="search" class="fb-search-clear" @click="search = ''; loadItems()">
              <q-icon name="close" size="14px" />
            </button>
          </transition>
        </div>

        <!-- Conta -->
        <q-select v-model="selectedAccount" :options="accountOptions"
          option-label="shop_name" option-value="id"
          label="Conta" outlined dense clearable
          :loading="loadingAccounts" style="min-width:200px"
          @update:model-value="loadItems()">
          <template v-slot:prepend><q-icon name="storefront" color="deep-orange" /></template>
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <q-item-label>{{ scope.opt.shop_name }}</q-item-label>
                <q-item-label caption>ID: {{ scope.opt.shop_id }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <!-- Status -->
        <div class="fb-btn-group">
          <button v-for="s in statusOptions" :key="s.value"
            :class="['fb-tbtn', filterStatus === s.value && 'fb-tbtn--active']"
            @click="setStatus(s.value)">
            <span :style="filterStatus === s.value ? `color:${s.color}` : ''">{{ s.label }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- ══ CONTEÚDO ══════════════════════════════════════════════ -->
    <div class="content-wrap">

      <!-- Loading inicial -->
      <div v-if="loading && items.length === 0" class="flex flex-center q-pa-xl">
        <q-spinner color="deep-orange" size="3em" />
      </div>

      <!-- Empty state -->
      <div v-else-if="!loading && items.length === 0" class="empty-state">
        <div class="shopee-empty-icon">
          <q-icon name="mdi-storefront" size="48px" style="color:#EE4D2D;opacity:.3" />
        </div>
        <div v-if="!selectedAccount" style="font-size:15px;font-weight:600;color:#1a1f36">
          Selecione uma conta para ver os anúncios
        </div>
        <div v-else>
          <div style="font-size:15px;font-weight:600;color:#1a1f36">Nenhum anúncio encontrado</div>
          <div style="color:#9aa0ac;font-size:13px">Clique em "Sincronizar" para importar seus anúncios da Shopee</div>
        </div>
      </div>

      <!-- Grid de cards -->
      <div v-else class="items-grid">
        <div v-for="item in items" :key="item.id" class="item-card">

          <!-- Thumbnail -->
          <div class="item-thumb">
            <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.item_name"
              class="thumb-img" @error="onImgError($event)" />
            <div v-else class="thumb-placeholder">
              <q-icon name="image_not_supported" size="28px" style="color:#ccc" />
            </div>
            <!-- Status badge -->
            <div :class="['status-badge', `status-badge--${item.status?.toLowerCase()}`]">
              {{ statusLabel(item.status) }}
            </div>
          </div>

          <!-- Info -->
          <div class="item-info">
            <div class="item-name" :title="item.item_name">{{ item.item_name }}</div>
            <div class="item-sku" v-if="item.item_sku">SKU: {{ item.item_sku }}</div>
            <div class="item-id">ID: {{ item.item_id }}</div>

            <div class="item-metrics">
              <div class="metric">
                <div class="metric-label">Preço</div>
                <div class="metric-value metric-value--price">{{ formatCurrency(item.price) }}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Estoque</div>
                <div class="metric-value" :class="item.stock === 0 ? 'metric-value--zero' : ''">
                  {{ item.stock }}
                </div>
              </div>
            </div>

            <div class="item-footer">
              <span class="item-shop">{{ item.shop_name }}</span>
              <span class="item-sync">{{ formatDate(item.last_synced_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Load more -->
      <div v-if="hasMore && !loading" class="load-more-wrap">
        <q-btn flat color="deep-orange" label="Carregar mais" :loading="loadingMore"
          @click="loadMore" />
      </div>
      <div v-if="loading && items.length > 0" class="flex flex-center q-pa-md">
        <q-spinner color="deep-orange" size="24px" />
      </div>

    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { DateTime } from 'luxon'

const $q = useQuasar()

// ── Estado ──────────────────────────────────────────────────
const items          = ref([])
const loading        = ref(false)
const loadingMore    = ref(false)
const loadingAccounts = ref(true)
const syncing        = ref(false)
const totalCount     = ref(null)
const search         = ref('')
const searchFocused  = ref(false)
const filterStatus   = ref('NORMAL')
const selectedAccount = ref(null)
const accountOptions = ref([])
const nextCursor     = ref(null)
const hasMore        = ref(false)
const PAGE_SIZE      = 40

let searchTimeout = null

// ── Opções de status ─────────────────────────────────────────
const statusOptions = [
  { value: 'NORMAL', label: 'Ativos',    color: '#22c55e' },
  { value: 'UNLIST', label: 'Pausados',  color: '#f59e0b' },
  { value: 'BANNED', label: 'Banidos',   color: '#ef4444' },
  { value: '',       label: 'Todos',     color: '#6b7280' },
]

const statusLabel = (s) => {
  const map = { NORMAL: 'Ativo', UNLIST: 'Pausado', BANNED: 'Banido', DELETED: 'Deletado' }
  return map[s] || s || '—'
}

// ── Helpers ──────────────────────────────────────────────────
const formatCurrency = (v) =>
  v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

const formatDate = (v) =>
  v ? DateTime.fromISO(v).setZone('America/Sao_Paulo').toFormat('dd/MM HH:mm') : '—'

const onImgError = (e) => { e.target.style.display = 'none' }

// ── API ──────────────────────────────────────────────────────
const loadAccounts = async () => {
  loadingAccounts.value = true
  try {
    const { data } = await api.get('/shopee/accounts/')
    accountOptions.value = Array.isArray(data) ? data : (data.results || [])
    if (accountOptions.value.length > 0) {
      selectedAccount.value = accountOptions.value[0]
      loadItems()
    }
  } catch (e) {
    $q.notify({ message: 'Erro ao carregar contas Shopee.', color: 'negative', position: 'top' })
  } finally {
    loadingAccounts.value = false
  }
}

const buildParams = (cursor = null) => {
  const p = { page_size: PAGE_SIZE }
  if (selectedAccount.value) p.account = selectedAccount.value.id
  if (filterStatus.value)    p.status  = filterStatus.value
  if (search.value)          p.search  = search.value
  if (cursor)                p.cursor  = cursor
  return p
}

const loadItems = async () => {
  loading.value = true
  items.value   = []
  nextCursor.value = null
  hasMore.value    = false
  try {
    const { data } = await api.get('/shopee/items/', { params: buildParams() })
    const list = Array.isArray(data) ? data : (data.results || [])
    items.value   = list
    totalCount.value = data.count ?? list.length
    nextCursor.value = data.next_cursor || null
    hasMore.value    = !!data.next_cursor
  } catch (e) {
    $q.notify({ message: 'Erro ao carregar anúncios.', color: 'negative', position: 'top' })
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (!nextCursor.value) return
  loadingMore.value = true
  try {
    const { data } = await api.get('/shopee/items/', { params: buildParams(nextCursor.value) })
    const list = Array.isArray(data) ? data : (data.results || [])
    items.value.push(...list)
    nextCursor.value = data.next_cursor || null
    hasMore.value    = !!data.next_cursor
  } catch (e) {
    $q.notify({ message: 'Erro ao carregar mais.', color: 'negative', position: 'top' })
  } finally {
    loadingMore.value = false
  }
}

const onSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(loadItems, 400)
}

const setStatus = (v) => {
  filterStatus.value = v
  loadItems()
}

const syncItems = async () => {
  if (!selectedAccount.value) return
  syncing.value = true
  try {
    const { data } = await api.post(`/shopee/accounts/${selectedAccount.value.id}/sync_items/`)
    $q.notify({
      message: `Sync concluído: ${data.stats?.synced ?? 0} anúncios sincronizados.`,
      color: 'positive', position: 'top', timeout: 4000,
    })
    loadItems()
  } catch (e) {
    $q.notify({ message: 'Erro ao sincronizar anúncios.', color: 'negative', position: 'top' })
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
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px 16px; background: #fff;
  border-bottom: 1.5px solid #e8edf3; gap: 16px; flex-wrap: wrap;
}
.header-left  { display: flex; align-items: center; gap: 12px; }
.header-right { display: flex; align-items: center; gap: 10px; }
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
  flex-wrap: wrap; padding: 10px 0;
}
.fb-search {
  display: flex; align-items: center; gap: 6px;
  background: #f5f7fa; border: 1.5px solid #e8edf3; border-radius: 8px;
  padding: 0 10px; transition: border-color .15s; min-width: 220px; flex: 1; max-width: 360px;
}
.fb-search.focused { border-color: #EE4D2D; }
.fb-search-icon { color: #9aa0ac; flex-shrink: 0; }
.fb-search-input {
  border: none; background: transparent; outline: none;
  font-size: 13px; color: #1a1f36; flex: 1; padding: 7px 0;
}
.fb-search-clear {
  background: none; border: none; cursor: pointer; padding: 2px;
  color: #9aa0ac; display: flex; align-items: center;
}
.fb-btn-group {
  display: flex; border: 1.5px solid #e8edf3; border-radius: 8px; overflow: hidden;
}
.fb-tbtn {
  background: #fff; border: none; cursor: pointer; padding: 6px 12px;
  font-size: 12px; font-weight: 600; color: #6b7280;
  transition: background .15s, color .15s; white-space: nowrap;
}
.fb-tbtn:not(:last-child) { border-right: 1px solid #e8edf3; }
.fb-tbtn--active { background: rgba(238,77,45,.07); color: #EE4D2D; }
.fb-tbtn:hover:not(.fb-tbtn--active) { background: #f5f7fa; }

/* ── Content ─────────────────────────────────────────────── */
.content-wrap { padding: 20px 24px; }

.empty-state {
  text-align: center; padding: 80px 24px; color: #9aa0ac;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}

/* ── Grid de cards ───────────────────────────────────────── */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}

.item-card {
  background: #fff; border-radius: 10px;
  border: 1.5px solid #e8edf3; overflow: hidden;
  transition: box-shadow .15s, border-color .15s; cursor: default;
}
.item-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,.08);
  border-color: #EE4D2D;
}

/* Thumbnail */
.item-thumb {
  position: relative; width: 100%; padding-top: 100%;
  background: #f5f7fa; overflow: hidden;
}
.thumb-img {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%; object-fit: cover;
}
.thumb-placeholder {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.status-badge {
  position: absolute; top: 6px; right: 6px;
  font-size: 10px; font-weight: 700; padding: 2px 7px;
  border-radius: 6px; text-transform: uppercase; letter-spacing: .3px;
}
.status-badge--normal  { background: #dcfce7; color: #16a34a; }
.status-badge--unlist  { background: #fef9c3; color: #a16207; }
.status-badge--banned  { background: #fee2e2; color: #dc2626; }
.status-badge--deleted { background: #f1f5f9; color: #64748b; }

/* Info */
.item-info { padding: 10px 12px 12px; }
.item-name {
  font-size: 12px; font-weight: 600; color: #1a1f36;
  line-height: 1.4; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  margin-bottom: 4px;
}
.item-sku { font-size: 11px; color: #9aa0ac; margin-bottom: 1px; }
.item-id  { font-size: 10px; color: #c4c9d4; margin-bottom: 8px; }

.item-metrics {
  display: flex; gap: 10px; margin-bottom: 8px;
}
.metric { flex: 1; }
.metric-label {
  font-size: 10px; color: #9aa0ac; font-weight: 600;
  text-transform: uppercase; letter-spacing: .3px; margin-bottom: 2px;
}
.metric-value { font-size: 13px; font-weight: 700; color: #1a1f36; }
.metric-value--price { color: #EE4D2D; }
.metric-value--zero  { color: #ef4444; }

.item-footer {
  display: flex; justify-content: space-between; align-items: center;
  border-top: 1px solid #f1f5f9; padding-top: 7px; margin-top: 4px;
}
.item-shop { font-size: 10px; font-weight: 600; color: #6b7280; }
.item-sync { font-size: 10px; color: #c4c9d4; }

/* Load more */
.load-more-wrap { display: flex; justify-content: center; padding: 20px 0; }
</style>
