<template>
  <q-page class="sf-page">

    <!-- ══ HEADER ══ -->
    <div class="sf-header">
      <div class="sf-header-left">
        <q-icon name="bolt" size="20px" class="q-mr-sm" style="color:#f57c00" />
        <span class="sf-title">Oferta Relâmpago</span>
        <span class="sf-badge">Shopee</span>
      </div>
      <div class="sf-header-right">
        <div class="sf-pills">
          <button v-for="a in accounts" :key="a.id"
            :class="['sf-pill', accountId === a.id && 'sf-pill--on']"
            @click="selectAccount(a.id)">{{ a.shop_name }}</button>
        </div>
        <div class="sf-pills">
          <button v-for="t in TIPOS" :key="t.value"
            :class="['sf-pill', tipo === t.value && 'sf-pill--on']"
            @click="tipo = t.value; loadFlashSales()">{{ t.label }}</button>
        </div>
        <q-btn v-if="canWrite" unelevated color="orange-8" text-color="white" icon="add"
          label="Nova Oferta Relâmpago" size="sm" class="q-ml-md" @click="openCreate()" />
      </div>
    </div>

    <div class="sf-note">
      A Shopee agenda Ofertas Relâmpago da loja só para os próximos ~10 dias, uma por dia (00:00–24:00), com até
      20 anúncios. O preço sugerido nunca fica abaixo do piso de margem do projeto.
    </div>

    <!-- ══ LISTA ══ -->
    <div v-if="loading" class="sf-center"><q-spinner-dots color="orange-7" size="36px" /></div>
    <div v-else-if="!flashSales.length" class="sf-center sf-empty">
      <q-icon name="bolt" size="48px" color="grey-4" />
      <div class="text-grey-6 q-mt-sm">Nenhuma Oferta Relâmpago nesta visão</div>
    </div>
    <div v-else class="sf-table-wrap">
      <table class="sf-table">
        <thead>
          <tr><th>Dia</th><th>Situação</th><th>Anúncios</th><th>ID</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="f in flashSales" :key="f.flash_sale_id" @click="openDetail(f)" class="sf-row">
            <td>{{ fmtDia(f.start_time) }}</td>
            <td><span :class="['sf-status', `sf-status--${situacao(f).key}`]">{{ situacao(f).label }}</span></td>
            <td>{{ f.enabled_item_count ?? f.item_count ?? '—' }}</td>
            <td class="text-grey-6">{{ f.flash_sale_id }}</td>
            <td class="text-right">
              <q-btn flat dense size="sm" icon="chevron_right" aria-label="Ver detalhe" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ DETALHE ══ -->
    <q-dialog v-model="detailOpen">
      <q-card style="width: 760px; max-width: 98vw;">
        <q-card-section class="row items-center bg-orange-8 text-white q-py-sm">
          <q-icon name="bolt" class="q-mr-sm" />
          <span class="text-subtitle1 text-weight-bold">
            Oferta Relâmpago · {{ activeFlash ? fmtDia(activeFlash.start_time) : '' }}
          </span>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section v-if="detailLoading" class="text-center"><q-spinner-dots color="orange-7" size="28px" /></q-card-section>
        <q-card-section v-else style="max-height: 60vh; overflow:auto">
          <table class="sf-table">
            <thead><tr><th>Anúncio</th><th>Variação</th><th>De</th><th>Por</th><th>Estoque</th><th>Ativo</th></tr></thead>
            <tbody>
              <tr v-for="m in detailRows" :key="`${m.item_id}-${m.model_id}`">
                <td>{{ m.item_name }}</td>
                <td>{{ m.model_name || '—' }}</td>
                <td>{{ fmtBRL(m.original_price) }}</td>
                <td class="text-weight-bold">{{ fmtBRL(m.input_promotion_price) }}</td>
                <td>{{ m.campaign_stock }}</td>
                <td>{{ m.status === 1 ? 'Sim' : 'Não' }}</td>
              </tr>
              <tr v-if="!detailRows.length"><td colspan="6" class="text-grey-6">Sem anúncios nesta oferta.</td></tr>
            </tbody>
          </table>
        </q-card-section>
        <q-card-actions v-if="canWrite && activeFlash" align="right" class="q-gutter-sm">
          <q-btn v-if="isFuture(activeFlash)" flat color="grey-8" icon="pause_circle" label="Desabilitar"
            :loading="actionLoading" @click="mudarStatus(2)" />
          <q-btn v-if="isFuture(activeFlash)" flat color="green-8" icon="play_circle" label="Habilitar"
            :loading="actionLoading" @click="mudarStatus(1)" />
          <q-btn v-if="isFuture(activeFlash)" flat color="red-7" icon="delete" label="Apagar"
            :loading="actionLoading" @click="confirmDeleteOpen = true" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmDeleteOpen">
      <q-card style="width: 380px; max-width: 98vw;">
        <q-card-section class="text-subtitle1 text-weight-bold">Apagar Oferta Relâmpago?</q-card-section>
        <q-card-section>A oferta do dia {{ activeFlash ? fmtDia(activeFlash.start_time) : '' }} e seus anúncios serão removidos.</q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="red-7" label="Apagar" :loading="actionLoading" @click="apagar()" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ══ CRIAR ══ -->
    <q-dialog v-model="createOpen" persistent>
      <q-card style="width: 920px; max-width: 98vw;">
        <q-card-section class="row items-center bg-orange-8 text-white q-py-sm">
          <q-icon name="bolt" class="q-mr-sm" />
          <span class="text-subtitle1 text-weight-bold">Nova Oferta Relâmpago</span>
          <q-space /><q-btn flat round dense icon="close" v-close-popup :disable="createLoading" />
        </q-card-section>

        <q-card-section style="max-height: 68vh; overflow:auto">
          <div class="sf-label">Dia da oferta *</div>
          <div v-if="slotsLoading" class="text-grey-6">Carregando dias livres…</div>
          <div v-else-if="!slots.length" class="text-grey-6">Nenhum dia livre nos próximos dias (já há oferta em todos).</div>
          <div v-else class="sf-pills sf-pills--wrap">
            <button v-for="s in slots" :key="s.timeslot_id"
              :class="['sf-pill', slotId === s.timeslot_id && 'sf-pill--on']"
              @click="slotId = s.timeslot_id">{{ fmtDia(s.start_time) }}</button>
          </div>

          <div class="sf-label q-mt-md">Anúncios * <span class="text-grey-6">({{ anunciosNaOferta }} de 20)</span></div>
          <q-select v-model="picked" :options="itemOptions" use-input outlined dense stack-label
            option-value="item_id" option-label="item_name" label="Buscar anúncio por nome, SKU ou ID"
            input-debounce="300" :disable="anunciosNaOferta >= 20" @filter="filterItems" @update:model-value="addItem">
            <template #no-option>
              <q-item><q-item-section class="text-grey">Digite para buscar anúncios da conta</q-item-section></q-item>
            </template>
            <template #option="{ itemProps, opt }">
              <q-item v-bind="itemProps">
                <q-item-section>
                  <q-item-label lines="1">{{ opt.item_name }}</q-item-label>
                  <q-item-label caption>{{ opt.item_sku || opt.item_id }} · {{ fmtBRL(opt.price) }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <div v-for="e in entries" :key="e.item_id" class="sf-entry">
            <div class="row items-center">
              <div class="col text-weight-medium">{{ e.item_name }}</div>
              <q-btn flat dense round size="sm" icon="close" aria-label="Remover anúncio" @click="removeItem(e.item_id)" />
            </div>
            <div v-if="e.loading" class="text-grey-6 q-pa-sm"><q-spinner-dots size="18px" /> calculando preço pelo piso…</div>
            <div v-else-if="e.error" class="text-negative q-pa-sm">{{ e.error }}</div>
            <table v-else class="sf-table sf-table--inner">
              <thead><tr><th></th><th>Variação</th><th>Hoje</th><th>Piso</th><th>Preço relâmpago</th><th>Estoque</th></tr></thead>
              <tbody>
                <tr v-for="v in e.variacoes" :key="v.model_id ?? 'x'" :class="{ 'sf-row-off': !v.entra }">
                  <td><q-checkbox v-model="v.incluir" dense :disable="!v.entra" /></td>
                  <td>{{ v.model_name || v.sku || '—' }}
                    <div v-if="!v.entra" class="text-caption text-grey-6">{{ v.motivo }}</div></td>
                  <td>{{ fmtBRL(v.preco_hoje) }}</td>
                  <td>{{ v.piso ? fmtBRL(v.piso) : '—' }}</td>
                  <td>
                    <q-input v-if="v.entra" v-model.number="v.preco_flash" type="number" dense outlined step="0.01"
                      prefix="R$" style="width:120px" :error="precoInvalido(v)" hide-bottom-space />
                  </td>
                  <td>
                    <q-input v-if="v.entra" v-model.number="v.estoque_sugerido" type="number" dense outlined
                      min="1" max="1000" style="width:90px" :error="!(v.estoque_sugerido >= 1)" hide-bottom-space />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </q-card-section>

        <q-card-actions align="between" class="q-px-md">
          <div class="text-caption text-grey-6">
            {{ variacoesSelecionadas }} variação(ões) selecionada(s). Preço abaixo do piso é bloqueado.
          </div>
          <div>
            <q-btn flat label="Cancelar" v-close-popup :disable="createLoading" />
            <q-btn unelevated color="orange-8" text-color="white" label="Criar Oferta" icon="bolt"
              :disable="!criarValido" :loading="createLoading" @click="submitCreate()" />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import ShopeeService from 'src/services/ShopeeService'
import { useStore } from 'src/stores/store'

const $q = useQuasar()
const authStore = useStore()
const canWrite = computed(() => authStore.canWrite)

const TIPOS = [
  { value: 1, label: 'Futuras' },
  { value: 2, label: 'Em curso' },
  { value: 3, label: 'Encerradas' },
  { value: 0, label: 'Todas' },
]

const accounts = ref([])
const accountId = ref(null)
const tipo = ref(1)
const flashSales = ref([])
const loading = ref(false)

onMounted(async () => {
  try {
    const res = await ShopeeService.listAccounts()
    accounts.value = res.data || []
    if (accounts.value.length) accountId.value = accounts.value[0].id
  } catch { accounts.value = [] }
  await loadFlashSales()
})

function selectAccount(id) { accountId.value = id; loadFlashSales() }

async function loadFlashSales() {
  if (!accountId.value) return
  loading.value = true
  try {
    const res = await ShopeeService.getFlashSales({ account_id: accountId.value, type: tipo.value })
    flashSales.value = (res.data?.flash_sales || []).slice().sort((a, b) => a.start_time - b.start_time)
  } catch (e) {
    flashSales.value = []
    $q.notify({ type: 'negative', message: 'Erro ao carregar ofertas: ' + (e?.response?.data?.error || e.message) })
  } finally {
    loading.value = false
  }
}

// ── Formatação ─────────────────────────────────────────────────────────────
function fmtDia(ts) {
  return new Date(ts * 1000).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}
function fmtBRL(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
}
const agora = () => Math.floor(Date.now() / 1000)
function isFuture(f) { return f.start_time > agora() }
function situacao(f) {
  if (f.status === 2) return { key: 'off', label: 'Desabilitada' }
  if (f.status === 3) return { key: 'off', label: 'Rejeitada' }
  if (f.end_time <= agora()) return { key: 'end', label: 'Encerrada' }
  if (f.start_time <= agora()) return { key: 'on', label: 'Em curso' }
  return { key: 'up', label: 'Agendada' }
}

// ── Detalhe ────────────────────────────────────────────────────────────────
const detailOpen = ref(false)
const detailLoading = ref(false)
const activeFlash = ref(null)
const detailRows = ref([])
const actionLoading = ref(false)
const confirmDeleteOpen = ref(false)

async function openDetail(f) {
  activeFlash.value = f
  detailRows.value = []
  detailOpen.value = true
  detailLoading.value = true
  try {
    const res = await ShopeeService.getFlashSale(f.flash_sale_id, { account_id: accountId.value })
    const nomes = Object.fromEntries((res.data?.items || []).map(i => [i.item_id, i.item_name]))
    detailRows.value = (res.data?.models || []).map(m => ({ ...m, item_name: nomes[m.item_id] || m.item_id }))
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar a oferta: ' + (e?.response?.data?.error || e.message) })
  } finally {
    detailLoading.value = false
  }
}

async function mudarStatus(status) {
  actionLoading.value = true
  try {
    await ShopeeService.setFlashSaleStatus(activeFlash.value.flash_sale_id, { account_id: accountId.value, status })
    $q.notify({ type: 'positive', message: status === 1 ? 'Oferta habilitada.' : 'Oferta desabilitada.' })
    detailOpen.value = false
    await loadFlashSales()
  } catch (e) {
    $q.notify({ type: 'negative', message: e?.response?.data?.error || e.message })
  } finally {
    actionLoading.value = false
  }
}

async function apagar() {
  actionLoading.value = true
  try {
    await ShopeeService.deleteFlashSale(activeFlash.value.flash_sale_id, { account_id: accountId.value })
    $q.notify({ type: 'positive', message: 'Oferta apagada.' })
    confirmDeleteOpen.value = false
    detailOpen.value = false
    await loadFlashSales()
  } catch (e) {
    $q.notify({ type: 'negative', message: e?.response?.data?.error || e.message })
  } finally {
    actionLoading.value = false
  }
}

// ── Criação ────────────────────────────────────────────────────────────────
const createOpen = ref(false)
const createLoading = ref(false)
const slots = ref([])
const slotsLoading = ref(false)
const slotId = ref(null)
const picked = ref(null)
const itemOptions = ref([])
const entries = ref([])

async function openCreate() {
  if (!accountId.value) return
  entries.value = []
  slotId.value = null
  picked.value = null
  createOpen.value = true
  slotsLoading.value = true
  try {
    const res = await ShopeeService.getFlashSaleSlots({ account_id: accountId.value })
    slots.value = res.data?.slots || []
  } catch (e) {
    slots.value = []
    $q.notify({ type: 'negative', message: 'Erro ao carregar dias livres: ' + (e?.response?.data?.error || e.message) })
  } finally {
    slotsLoading.value = false
  }
}

async function filterItems(texto, update) {
  try {
    const res = await ShopeeService.listItems({
      account: accountId.value, search: texto || undefined, status: 'NORMAL', page_size: 20,
    })
    const lista = res.data?.results || res.data || []
    update(() => { itemOptions.value = lista })
  } catch {
    update(() => { itemOptions.value = [] })
  }
}

async function addItem(item) {
  picked.value = null
  if (!item || entries.value.some(e => e.item_id === item.item_id)) return
  const entry = { item_id: Number(item.item_id), item_name: item.item_name, loading: true, error: null, variacoes: [] }
  entries.value.push(entry)
  try {
    const res = await ShopeeService.suggestFlashSaleItem({ account_id: accountId.value, item_id: entry.item_id })
    entry.variacoes = (res.data?.variacoes || []).map(v => ({
      ...v,
      preco_flash: v.preco_flash ? Number(v.preco_flash) : null,
      estoque_sugerido: v.estoque_sugerido ?? null,
      incluir: !!v.entra,
    }))
  } catch (e) {
    entry.error = e?.response?.data?.error || e.message
  } finally {
    entry.loading = false
  }
}

function removeItem(id) { entries.value = entries.value.filter(e => e.item_id !== id) }

// Preço relâmpago válido: abaixo do preço de hoje e nunca abaixo do piso de margem.
function precoInvalido(v) {
  const p = Number(v.preco_flash)
  return !(p > 0) || p >= Number(v.preco_hoje) || (v.piso && p < Number(v.piso))
}

const anunciosNaOferta = computed(() => entries.value.filter(e => e.variacoes.some(v => v.incluir)).length)
const variacoesSelecionadas = computed(() =>
  entries.value.reduce((n, e) => n + e.variacoes.filter(v => v.incluir).length, 0))
const criarValido = computed(() => {
  if (!slotId.value || anunciosNaOferta.value < 1 || anunciosNaOferta.value > 20) return false
  return entries.value.every(e => e.variacoes.filter(v => v.incluir)
    .every(v => !precoInvalido(v) && v.estoque_sugerido >= 1 && v.estoque_sugerido <= Number(v.estoque_real)))
})

function montarItens() {
  return entries.value.map(e => {
    const sel = e.variacoes.filter(v => v.incluir)
    if (!sel.length) return null
    if (sel[0].model_id == null) {
      return { item_id: e.item_id, purchase_limit: 0,
        item_input_promo_price: Number(sel[0].preco_flash), item_stock: Number(sel[0].estoque_sugerido) }
    }
    return { item_id: e.item_id, purchase_limit: 0,
      models: sel.map(v => ({ model_id: Number(v.model_id),
        input_promo_price: Number(v.preco_flash), stock: Number(v.estoque_sugerido) })) }
  }).filter(Boolean)
}

async function submitCreate() {
  createLoading.value = true
  try {
    const res = await ShopeeService.createFlashSale({
      account_id: accountId.value, timeslot_id: slotId.value, items: montarItens(),
    })
    const falhas = res.data?.failed_items || []
    if (falhas.length) {
      $q.notify({ type: 'warning', timeout: 9000,
        message: `Oferta criada, mas a Shopee recusou ${falhas.length} anúncio(s): ` +
          falhas.slice(0, 3).map(f => f.err_msg || f.fail_message || f.item_id).join('; ') })
    } else {
      $q.notify({ type: 'positive', message: 'Oferta Relâmpago criada!' })
    }
    createOpen.value = false
    tipo.value = 1
    await loadFlashSales()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao criar oferta: ' + (e?.response?.data?.error || e.message) })
  } finally {
    createLoading.value = false
  }
}
</script>

<style scoped>
.sf-page { padding: 16px; max-width: 1200px; margin: 0 auto; }
.sf-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
.sf-header-left { display: flex; align-items: center; }
.sf-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sf-title { font-size: 18px; font-weight: 700; }
.sf-badge { margin-left: 8px; font-size: 11px; padding: 1px 8px; border-radius: 10px; background: #fff3e0; color: #e65100; }
.sf-note { font-size: 12px; color: #78909c; margin-bottom: 12px; }
.sf-pills { display: flex; gap: 4px; }
.sf-pills--wrap { flex-wrap: wrap; }
.sf-pill { border: 1px solid #cfd8dc; background: #fff; border-radius: 14px; padding: 3px 12px; font-size: 12px; cursor: pointer; }
.sf-pill--on { background: #f57c00; border-color: #f57c00; color: #fff; }
.sf-center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; }
.sf-table-wrap { overflow-x: auto; }
.sf-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sf-table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #78909c; padding: 6px 8px; border-bottom: 1px solid #eceff1; }
.sf-table td { padding: 8px; border-bottom: 1px solid #f5f5f5; vertical-align: middle; }
.sf-row { cursor: pointer; }
.sf-row:hover { background: #fffaf3; }
.sf-row-off { opacity: 0.55; }
.sf-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.sf-status--on { background: #e8f5e9; color: #2e7d32; }
.sf-status--up { background: #fff8e1; color: #f57f17; }
.sf-status--end { background: #eceff1; color: #546e7a; }
.sf-status--off { background: #ffebee; color: #c62828; }
.sf-label { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
.sf-entry { border: 1px solid #eceff1; border-radius: 6px; padding: 8px 10px; margin-top: 10px; }
.sf-table--inner td, .sf-table--inner th { padding: 4px 6px; }
</style>
