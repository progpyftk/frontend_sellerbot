<template>
  <div class="normalization-review">
    <q-banner rounded class="q-mb-md normalization-review__banner">
      <template #avatar><q-icon name="verified" color="teal-8" /></template>
      <div class="text-weight-bold">Normalização métrica do saldo fiscal</div>
      <div class="text-body2 q-mt-xs">
        Apenas aliases e regras aprovados entram no saldo normalizado. Sugestões pendentes ficam fora do cálculo;
        o sistema preserva a unidade original da NF-e e nunca estima um fator sem evidência.
      </div>
    </q-banner>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-3">
        <q-select v-model="filters.status" :options="statusOptions" emit-value map-options dense outlined clearable label="Status" @update:model-value="loadAliases" />
      </div>
      <div class="col-12 col-md-3">
        <q-select v-model="filters.fiscalAccount" :options="accountOptions" emit-value map-options dense outlined clearable label="CNPJ fiscal" @update:model-value="loadAliases" />
      </div>
      <div class="col-12 col-md-2">
        <q-input v-model="filters.ncm" dense outlined clearable label="NCM" @keyup.enter="loadAliases" @clear="loadAliases" />
      </div>
      <div class="col-12 col-md-4">
        <q-input v-model="filters.search" dense outlined clearable label="Produto, SKU ou descrição" @keyup.enter="loadAliases" @clear="loadAliases">
          <template #append><q-icon name="search" class="cursor-pointer" @click="loadAliases" /></template>
        </q-input>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-4"><div class="review-kpi"><span>Pendentes</span><strong class="text-amber-9">{{ pendingCount }}</strong><small>aguardando revisão</small></div></div>
      <div class="col-12 col-sm-4"><div class="review-kpi"><span>Aprovados</span><strong class="text-teal-9">{{ approvedCount }}</strong><small>aptos para a próxima normalização</small></div></div>
      <div class="col-12 col-sm-4"><div class="review-kpi"><span>Exibidos</span><strong>{{ aliases.length }}</strong><small>nesta consulta</small></div></div>
    </div>

    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row items-center justify-between">
        <div>
          <div class="text-subtitle1 text-weight-bold">Aliases de produtos</div>
          <div class="text-caption text-grey-7">Relação entre o SKU/unidade da NF-e e o produto fiscal canônico.</div>
        </div>
        <q-btn flat dense icon="refresh" label="Atualizar" :loading="loading" @click="refresh" />
      </q-card-section>
      <q-table :rows="aliases" :columns="aliasColumns" row-key="id" flat :loading="loading" :pagination="{ rowsPerPage: 20 }">
        <template #body-cell-source="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.product_code || props.row.source_key }}</div>
            <div class="text-caption text-grey-7 alias-description">{{ props.row.product_description || 'Descrição não informada' }}</div>
            <div class="text-caption font-mono">{{ props.row.fiscal_account_cnpj }} · NCM {{ props.row.ncm || '—' }}</div>
          </q-td>
        </template>
        <template #body-cell-conversion="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.source_unit }} → {{ props.row.target_unit }}</div>
            <div class="text-caption">fator {{ props.row.conversion_factor }}</div>
          </q-td>
        </template>
        <template #body-cell-evidence="props">
          <q-td :props="props">
            <q-chip dense color="blue-grey-1" text-color="blue-grey-9">{{ evidenceLabel(props.row.evidence_type) }}</q-chip>
            <div class="text-caption text-grey-7 evidence-value">{{ props.row.evidence_value || 'Sem evidência detalhada' }}</div>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props"><q-chip dense :color="statusColor(props.row.status)" :text-color="statusTextColor(props.row.status)">{{ statusLabel(props.row.status) }}</q-chip></q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn v-if="props.row.status === 'suggested'" flat dense color="negative" icon="close" @click="reviewAlias(props.row, 'rejected')"><q-tooltip>Rejeitar sugestão</q-tooltip></q-btn>
            <q-btn v-if="props.row.status === 'suggested'" unelevated dense color="teal-8" icon="check" label="Aprovar" @click="reviewAlias(props.row, 'approved')" />
            <q-btn v-else flat dense icon="visibility" @click="selectedAlias = props.row; showAliasDialog = true"><q-tooltip>Ver evidência</q-tooltip></q-btn>
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="fact_check" size="3em" color="grey-4" />
            <div class="text-h6 q-mt-sm">Nenhum alias nesta fila</div>
            <div class="text-caption">As sugestões da matriz aparecerão aqui quando forem cadastradas para revisão.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-card flat bordered>
      <q-card-section class="row items-center justify-between">
        <div>
          <div class="text-subtitle1 text-weight-bold">Produtos canônicos</div>
          <div class="text-caption text-grey-7">O produto canônico precisa ser aprovado antes do alias.</div>
        </div>
        <q-btn flat dense icon="refresh" :loading="loadingCanonical" @click="loadCanonicalProducts" />
      </q-card-section>
      <q-list separator>
        <q-item v-for="product in canonicalProducts" :key="product.id">
          <q-item-section avatar><q-icon :name="product.dimension === 'mass' ? 'scale' : product.dimension === 'volume' ? 'local_drink' : 'inventory_2'" color="teal-8" /></q-item-section>
          <q-item-section>
            <q-item-label>{{ product.name }}</q-item-label>
            <q-item-label caption>{{ product.dimension }} · unidade padrão {{ product.default_unit }} · NCMs {{ (product.compatible_ncms || []).join(', ') || 'não informados' }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row items-center q-gutter-xs">
              <q-chip dense :color="statusColor(product.status)" :text-color="statusTextColor(product.status)">{{ statusLabel(product.status) }}</q-chip>
              <q-btn v-if="product.status === 'suggested'" unelevated dense color="teal-8" label="Aprovar produto" @click="reviewCanonical(product, 'approved')" />
              <q-btn v-if="product.status === 'suggested'" flat dense color="negative" icon="close" @click="reviewCanonical(product, 'rejected')" />
            </div>
          </q-item-section>
        </q-item>
        <q-item v-if="!loadingCanonical && canonicalProducts.length === 0"><q-item-section class="text-grey-6">Nenhum produto canônico cadastrado.</q-item-section></q-item>
      </q-list>
    </q-card>

    <q-dialog v-model="showAliasDialog">
      <q-card style="min-width: min(560px, 92vw)">
        <q-card-section class="row items-center justify-between"><div class="text-h6">Evidência do alias</div><q-btn flat round dense icon="close" v-close-popup /></q-card-section>
        <q-card-section v-if="selectedAlias">
          <div class="text-subtitle2">{{ selectedAlias.product_code || selectedAlias.source_key }}</div>
          <div class="text-body2 q-mb-md">{{ selectedAlias.product_description || 'Descrição não informada' }}</div>
          <div class="review-detail-grid">
            <div><span>Unidade original</span><strong>{{ selectedAlias.source_unit }}</strong></div>
            <div><span>Conversão</span><strong>{{ selectedAlias.conversion_factor }} {{ selectedAlias.target_unit }}</strong></div>
            <div><span>Tipo de evidência</span><strong>{{ evidenceLabel(selectedAlias.evidence_type) }}</strong></div>
            <div><span>Valor da evidência</span><strong>{{ selectedAlias.evidence_value || '—' }}</strong></div>
          </div>
          <q-banner class="q-mt-md bg-amber-1 text-amber-10" rounded icon="warning">A aprovação não altera a NF-e original. Ela apenas autoriza este vínculo para a futura projeção normalizada.</q-banner>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import FiscalService from 'src/services/FiscalService'

const $q = useQuasar()
const props = defineProps({ refreshToken: { type: Number, default: 0 } })
const aliases = ref([])
const canonicalProducts = ref([])
const loading = ref(false)
const loadingCanonical = ref(false)
const selectedAlias = ref(null)
const showAliasDialog = ref(false)
const filters = ref({ status: 'suggested', fiscalAccount: null, ncm: '', search: '' })
const accountOptions = ref([])
const statusOptions = [
  { label: 'Pendentes', value: 'suggested' },
  { label: 'Aprovados', value: 'approved' },
  { label: 'Rejeitados', value: 'rejected' },
  { label: 'Todos', value: null },
]
const aliasColumns = [
  { name: 'source', label: 'Produto da NF-e / CNPJ', align: 'left' },
  { name: 'canonical_product_name', label: 'Produto canônico', field: 'canonical_product_name', align: 'left' },
  { name: 'conversion', label: 'Conversão', align: 'left' },
  { name: 'evidence', label: 'Evidência', align: 'left' },
  { name: 'status', label: 'Status', align: 'center' },
  { name: 'actions', label: 'Revisão', align: 'right' },
]
const pendingCount = ref(0)
const approvedCount = ref(0)

function statusLabel(status) { return ({ suggested: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', expired: 'Expirado' })[status] || status }
function statusColor(status) { return ({ suggested: 'amber-2', approved: 'teal-2', rejected: 'red-2', expired: 'grey-3' })[status] || 'grey-3' }
function statusTextColor(status) { return ({ suggested: 'amber-10', approved: 'teal-10', rejected: 'red-10', expired: 'grey-8' })[status] || 'grey-8' }
function evidenceLabel(type) { return ({ xml_tax_unit: 'Unidade tributável XML', tiny_product: 'Cadastro Tiny', description: 'Descrição fiscal', manual: 'Manual' })[type] || type || 'Não informado' }

async function loadAliases() {
  loading.value = true
  try {
    const [{ data }, pendingSummary, approvedSummary] = await Promise.all([
      FiscalService.getProductAliases({ status: filters.value.status || undefined, fiscal_account: filters.value.fiscalAccount || undefined, ncm: filters.value.ncm || undefined, search: filters.value.search || undefined, page_size: 200 }),
      FiscalService.getProductAliases({ status: 'suggested', page_size: 1 }),
      FiscalService.getProductAliases({ status: 'approved', page_size: 1 }),
    ])
    aliases.value = data.results || data || []
    pendingCount.value = pendingSummary.data?.count ?? (pendingSummary.data?.results || []).length
    approvedCount.value = approvedSummary.data?.count ?? (approvedSummary.data?.results || []).length
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.detail || 'Não foi possível carregar os aliases.' })
  } finally { loading.value = false }
}

async function loadCanonicalProducts() {
  loadingCanonical.value = true
  try {
    const { data } = await FiscalService.getCanonicalProducts({ page_size: 200 })
    canonicalProducts.value = data.results || data || []
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Não foi possível carregar os produtos canônicos.' })
  } finally { loadingCanonical.value = false }
}

async function loadAccounts() {
  const { data } = await FiscalService.getCnpjs()
  const rows = data.results || data || []
  accountOptions.value = rows.map((account) => ({ label: `${account.cnpj} — ${account.razao_social || 'CNPJ fiscal'}`, value: account.id }))
}

async function reviewCanonical(product, status) {
  try {
    await FiscalService.reviewCanonicalProduct(product.id, { status })
    $q.notify({ type: 'positive', message: status === 'approved' ? 'Produto canônico aprovado.' : 'Produto canônico rejeitado.' })
    await Promise.all([loadCanonicalProducts(), loadAliases()])
  } catch (error) { $q.notify({ type: 'negative', message: error.response?.data?.detail || 'Não foi possível revisar o produto.' }) }
}

async function reviewAlias(alias, status) {
  try {
    await FiscalService.reviewProductAlias(alias.id, { status })
    $q.notify({ type: 'positive', message: status === 'approved' ? 'Alias aprovado para a futura normalização.' : 'Alias rejeitado.' })
    await loadAliases()
  } catch (error) {
    const message = error.response?.status === 409 ? 'Aprove primeiro o produto canônico relacionado.' : (error.response?.data?.detail || 'Não foi possível revisar o alias.')
    $q.notify({ type: 'warning', message })
  }
}

async function refresh() { await Promise.all([loadAliases(), loadCanonicalProducts()]) }
onMounted(async () => { await loadAccounts(); await refresh() })
watch(() => props.refreshToken, (value, previous) => { if (value !== previous) refresh() })
</script>

<style scoped>
.normalization-review__banner { background: #ecfdf5; border: 1px solid #a7f3d0; color: #134e4a; }
.review-kpi { display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; }
.review-kpi span { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
.review-kpi strong { font-size: 24px; line-height: 1.1; color: #0f172a; }
.review-kpi small { color: #64748b; }
.alias-description, .evidence-value { max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.review-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.review-detail-grid div { padding: 10px; border-radius: 8px; background: #f8fafc; }
.review-detail-grid span, .review-detail-grid strong { display: block; }
.review-detail-grid span { color: #64748b; font-size: 12px; margin-bottom: 3px; }
@media (max-width: 600px) { .review-detail-grid { grid-template-columns: 1fr; } }
</style>
