<template>
  <q-page class="q-pa-lg">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Promoções → Por anúncios</div>
        <div class="text-caption text-grey-7">Visão read-only. Nenhuma ativação é enviada nesta etapa.</div>
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
    <q-inner-loading :showing="loading" />
    <q-card v-if="!loading && !rows.length" flat bordered class="q-pa-lg text-grey-7">Nenhum anúncio com promoção encontrado.</q-card>
    <q-card v-for="row in rows" :key="`${row.item_id}:${row.variation_id || ''}`" flat bordered class="q-mb-md">
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
    <q-btn v-if="nextCursor" outline label="Carregar mais" :loading="loadingMore" class="q-mt-md" @click="loadMore" />
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from 'src/boot/axios'

const rows = ref([])
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const nextCursor = ref(null)
const statuses = ['candidate', 'started', 'pending']
const promotionTypes = ['DEAL', 'SMART', 'LIGHTNING', 'PRICE_DISCOUNT', 'DOD', 'SELLER_CAMPAIGN']
const filters = reactive({ q: '', sku: '', status: null, promotion_type: null })
const params = () => Object.fromEntries(Object.entries({ ...filters, page_size: 50 }).filter(([, value]) => value !== null && value !== ''))

async function load () {
  loading.value = true
  error.value = ''
  nextCursor.value = null
  try {
    const { data } = await api.get('/mercadolivre/promotions-ads/', { params: params() })
    rows.value = data.results || []
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
    nextCursor.value = data.next_cursor || null
  } catch (err) {
    error.value = err.response?.data?.error || 'Não foi possível carregar a próxima página.'
  } finally {
    loadingMore.value = false
  }
}
const money = value => value == null ? '—' : Number(value).toFixed(2).replace('.', ',')
onMounted(load)
</script>
