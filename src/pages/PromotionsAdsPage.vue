<template>
  <q-page class="q-pa-lg">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Promoções → Por anúncios</div>
        <div class="text-caption text-grey-7">Consulta de promoções por anúncio. Ativação assistida disponível após confirmação.</div>
      </div>
      <q-btn flat icon="refresh" label="Atualizar" :loading="loading" @click="load" />
    </div>
    <div class="row q-col-gutter-sm q-mb-md">
      <q-input v-model="filters.q" outlined dense clearable label="Buscar anúncio ou SKU" class="col-12 col-md-5" @keyup.enter="load" />
      <q-input v-model="filters.sku" outlined dense clearable label="SKU" class="col-12 col-md-3" @keyup.enter="load" />
      <q-select v-model="filters.status" outlined dense clearable label="Status" :options="statuses" class="col-12 col-md-2" @update:model-value="load" />
      <q-select v-model="filters.promotion_type" outlined dense clearable label="Tipo" :options="promotionTypes" class="col-12 col-md-2" @update:model-value="load" />
    </div>
    <q-banner v-if="error" rounded class="bg-red-1 text-red-9 q-mb-md">{{ error }}</q-banner>
    <q-banner v-if="skipped.length" rounded class="bg-orange-1 text-orange-10 q-mb-md">
      {{ skipped.length }} anúncio(s) não puderam ser consultado(s) no Mercado Livre. Os demais resultados continuam disponíveis.
      <div v-for="item in skipped" :key="item.item_id" class="text-caption">{{ item.item_id }}: {{ item.reason }}</div>
    </q-banner>
    <q-inner-loading :showing="loading" />
    <q-card v-if="!loading && !rows.length" flat bordered class="q-pa-lg text-grey-7">Nenhum anúncio com promoção encontrado.</q-card>
    <q-card v-for="row in rows" :key="`${row.item_id}:${row.variation_id || ''}`" flat bordered class="q-mb-md">
      <q-card-section class="q-pb-none"><q-checkbox v-model="selected" :val="row" :disable="!row.promotions.some(promo => promo.financials?.estimable)" label="Selecionar para ativação" /></q-card-section>
      <q-card-section>
        <div class="row items-start justify-between">
          <div>
            <div class="text-subtitle1">{{ row.title }}</div>
            <div class="text-caption">{{ row.item_id }} · SKU: {{ row.sku || 'não informado' }}<span v-if="row.variation_id"> · {{ row.variation_name || row.variation_id }}</span></div>
          </div>
          <div class="text-weight-medium">R$ {{ money(row.current_price) }}</div>
        </div>
      </q-card-section>
      <q-separator />
      <q-list separator>
        <q-item v-for="promo in row.promotions" :key="`${promo.promotion_type}:${promo.promotion_id || promo.offer_id}`">
          <q-item-section>
            <q-item-label>{{ promo.name || promo.promotion_type }} · {{ promo.status }}</q-item-label>
            <q-item-label caption>Desconto {{ promo.discount_pct ?? '—' }}% · Preço proposto R$ {{ money(promo.price) }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-chip dense :color="promo.financials?.estimable ? 'green-2' : 'orange-2'" :text-color="promo.financials?.estimable ? 'green-9' : 'orange-10'">
              {{ promo.financials?.estimable ? `${promo.financials.estimated_margin_pct}% margem` : 'Não calculável' }}
            </q-chip>
            <div v-if="!promo.financials?.estimable" class="text-caption text-orange-10">Falta: {{ (promo.financials?.missing_inputs || []).join(', ') }}</div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
    <div v-if="selected.length" class="fixed-bottom q-pa-md bg-white shadow-4 row items-center justify-between">
      <span>{{ selected.length }} anúncio(s) selecionado(s)</span>
      <q-btn color="primary" label="Revisar e ativar" @click="confirmOpen = true" />
    </div>
    <q-btn v-if="nextCursor" outline label="Carregar mais" :loading="loadingMore" class="q-mt-md" @click="loadMore" />
    <q-dialog v-model="confirmOpen">
      <q-card style="min-width: 360px">
        <q-card-section><div class="text-h6">Confirmar ativação</div><div class="q-mt-sm">A ação será enviada ao Mercado Livre e não poderá ser desfeita automaticamente.</div><div class="q-mt-sm text-caption">Somente propostas com margem calculável são enviadas. Itens bloqueados retornam com o motivo.</div></q-card-section>
        <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup /><q-btn color="primary" label="Confirmar" :loading="activating" @click="activate" /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from 'src/boot/axios'

const rows = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const activating = ref(false)
const confirmOpen = ref(false)
const selected = ref([])
const error = ref('')
const skipped = ref([])
const nextCursor = ref(null)
const statuses = ['candidate', 'started', 'pending']
const promotionTypes = ['DEAL', 'SMART', 'LIGHTNING', 'PRICE_DISCOUNT', 'DOD', 'SELLER_CAMPAIGN']
const filters = reactive({ q: '', sku: '', status: null, promotion_type: null })
const params = () => Object.fromEntries(Object.entries({ ...filters, page_size: 50 }).filter(([, value]) => value !== null && value !== ''))

async function load () {
  loading.value = true
  error.value = ''
  nextCursor.value = null
  skipped.value = []
  try {
    const { data } = await api.get('/mercadolivre/promotions-ads/', { params: params() })
    rows.value = data.results || []
    skipped.value = data.skipped || []
    nextCursor.value = data.next_cursor || null
  } catch (err) {
    error.value = err.response?.data?.error || 'Não foi possível consultar as promoções.'
  } finally {
    loading.value = false
  }
}
async function loadMore () {
  if (!nextCursor.value) return
  loadingMore.value = true
  try {
    const { data } = await api.get('/mercadolivre/promotions-ads/', { params: { ...params(), cursor: nextCursor.value } })
    rows.value.push(...(data.results || []))
    skipped.value.push(...(data.skipped || []))
    nextCursor.value = data.next_cursor || null
  } catch (err) {
    error.value = err.response?.data?.error || 'Não foi possível carregar a próxima página.'
  } finally {
    loadingMore.value = false
  }
}
async function activate () {
  activating.value = true
  error.value = ''
  try {
    const { data } = await api.post('/mercadolivre/promotions-ads/activate/', {
      confirmed: true,
      max_discount_pct: 15,
      candidates: selected.value.flatMap(row => row.promotions.map(promo => ({
        account_id: row.account_id,
        item_id: row.item_id,
        promotion_id: promo.promotion_id,
        promotion_type: promo.promotion_type,
        financials: promo.financials,
      }))),
    })
    selected.value = []
    confirmOpen.value = false
    if (data.blocked?.length) {
      error.value = `${data.blocked.length} item(ns) bloqueado(s): ${data.blocked.map(item => item.reason).join('; ')}`
    }
    await load()
  } catch (err) { error.value = err.response?.data?.message || err.response?.data?.error || 'Não foi possível ativar os anúncios.' }
  finally { activating.value = false }
}
const money = value => value == null ? '—' : Number(value).toFixed(2).replace('.', ',')
onMounted(load)
</script>
