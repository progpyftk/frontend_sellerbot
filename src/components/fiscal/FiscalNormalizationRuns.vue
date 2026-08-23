<template>
  <div class="normalization-runs">
    <!-- Filtros compartilhados -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-3">
        <q-select
          v-model="filters.fiscalAccount"
          :options="accountOptions"
          emit-value
          map-options
          dense
          outlined
          clearable
          label="CNPJ fiscal"
          @update:model-value="reloadAll"
        />
      </div>
      <div class="col-12 col-md-2">
        <q-select
          v-model="filters.status"
          :options="statusOptions"
          emit-value
          map-options
          dense
          outlined
          clearable
          label="Status"
          @update:model-value="reloadAll"
        />
      </div>
      <div class="col-12 col-md-2">
        <q-input v-model="filters.ncm" dense outlined clearable label="NCM" @keyup.enter="reloadAll" @clear="reloadAll" />
      </div>
      <div class="col-12 col-md-3">
        <q-input
          v-model="filters.search"
          dense
          outlined
          clearable
          label="Produto, SKU ou descrição"
          @keyup.enter="reloadAll"
          @clear="reloadAll"
        >
          <template #append><q-icon name="search" class="cursor-pointer" @click="reloadAll" /></template>
        </q-input>
      </div>
      <div class="col-12 col-md-2 flex items-center justify-end">
        <q-btn flat dense icon="refresh" label="Atualizar" :loading="loadingAny" @click="reloadAll" />
      </div>
    </div>

    <!-- Seção: Execuções (runs) -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row items-center justify-between">
        <div>
          <div class="text-subtitle1 text-weight-bold">Execuções de normalização</div>
          <div class="text-caption text-grey-7">Cada run analisa um conjunto de itens e sugere conversões para revisão.</div>
        </div>
      </q-card-section>
      <q-table :rows="runs" :columns="runColumns" row-key="id" flat :loading="loadingRuns" :pagination="{ rowsPerPage: 10 }">
        <template #body-cell-version="props">
          <q-td :props="props"><span class="font-mono text-weight-bold">{{ props.row.normalization_version }}</span></q-td>
        </template>
        <template #body-cell-cnpj="props">
          <q-td :props="props"><span class="font-mono">{{ formatCnpj(props.row.fiscal_account_cnpj) }}</span></q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props"><q-chip dense :color="runStatusColor(props.row.status)" :text-color="runStatusTextColor(props.row.status)">{{ runStatusLabel(props.row.status) }}</q-chip></q-td>
        </template>
        <template #body-cell-counts="props">
          <q-td :props="props">
            <div class="text-caption">
              <span class="text-teal-9">{{ props.row.items_approved || 0 }}</span> aprovados ·
              <span class="text-amber-9">{{ props.row.items_pending || 0 }}</span> pendentes ·
              <span class="text-red-9">{{ props.row.items_rejected || 0 }}</span> rejeitados
            </div>
            <div class="text-caption text-grey-6">{{ props.row.items_analyzed || 0 }} analisados</div>
          </q-td>
        </template>
        <template #body-cell-dates="props">
          <q-td :props="props">
            <div class="text-caption">{{ formatDate(props.row.created_at) }}</div>
            <div v-if="props.row.finished_at" class="text-caption text-grey-6">fim: {{ formatDate(props.row.finished_at) }}</div>
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-lg text-grey-6">
            <q-icon name="science" size="2em" color="grey-4" />
            <div class="text-body2 q-mt-sm">Nenhuma execução de normalização encontrada.</div>
            <div class="text-caption">Execute <code>fiscal_normalization_run</code> para gerar uma run.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Seção: Regras de conversão -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row items-center justify-between">
        <div>
          <div class="text-subtitle1 text-weight-bold">Regras de conversão</div>
          <div class="text-caption text-grey-7">Aprovar uma regra propaga a aprovação para os itens sugeridos ligados a ela.</div>
        </div>
      </q-card-section>
      <q-table :rows="rules" :columns="ruleColumns" row-key="id" flat :loading="loadingRules" :pagination="{ rowsPerPage: 15 }">
        <template #body-cell-conversion="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.source_unit }} → {{ props.row.target_unit }}</div>
            <div class="text-caption text-grey-6">fator {{ props.row.conversion_factor }}</div>
          </q-td>
        </template>
        <template #body-cell-product="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.product_code || props.row.gtin || '—' }}</div>
            <div class="text-caption text-grey-7">{{ props.row.ncm || '—' }}</div>
          </q-td>
        </template>
        <template #body-cell-evidence="props">
          <q-td :props="props">
            <q-chip dense color="blue-grey-1" text-color="blue-grey-9">{{ evidenceLabel(props.row.evidence_type) }}</q-chip>
            <div class="text-caption text-grey-6 text-ellipsis" style="max-width: 200px;" :title="props.row.evidence_value">{{ props.row.evidence_value || '—' }}</div>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props"><q-chip dense :color="statusColor(props.row.status)" :text-color="statusTextColor(props.row.status)">{{ statusLabel(props.row.status) }}</q-chip></q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn v-if="props.row.status === 'suggested'" flat dense color="negative" icon="close" @click="reviewRule(props.row, 'rejected')"><q-tooltip>Rejeitar regra</q-tooltip></q-btn>
            <q-btn v-if="props.row.status === 'suggested'" unelevated dense color="teal-8" icon="check" label="Aprovar" @click="reviewRule(props.row, 'approved')" />
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-lg text-grey-6">
            <q-icon name="rule" size="2em" color="grey-4" />
            <div class="text-body2 q-mt-sm">Nenhuma regra encontrada.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Seção: Análises de itens -->
    <q-card flat bordered>
      <q-card-section class="row items-center justify-between">
        <div>
          <div class="text-subtitle1 text-weight-bold">Análises de itens</div>
          <div class="text-caption text-grey-7">Cada item normalizado pode ser aprovado individualmente ou devolvido para revisão.</div>
        </div>
      </q-card-section>
      <q-table :rows="items" :columns="itemColumns" row-key="id" flat :loading="loadingItems" :pagination="{ rowsPerPage: 25 }">
        <template #body-cell-product="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.item_code || props.row.item_gtin || '—' }}</div>
            <div class="text-caption text-grey-7 text-ellipsis" style="max-width: 220px;" :title="props.row.item_description">{{ props.row.item_description || '—' }}</div>
            <div class="text-caption font-mono text-grey-6">NCM {{ formatNcm(props.row.item_ncm) }}</div>
          </q-td>
        </template>
        <template #body-cell-conversion="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.original_unit }} → {{ props.row.normalized_unit }}</div>
            <div class="text-caption text-grey-6">fator {{ props.row.factor ?? props.row.rule_factor ?? '—' }}</div>
            <div class="text-caption text-grey-6">{{ formatNumber(props.row.original_quantity) }} → {{ formatNumber(props.row.normalized_quantity) }}</div>
          </q-td>
        </template>
        <template #body-cell-evidence="props">
          <q-td :props="props">
            <q-chip v-if="props.row.evidence_found" dense color="teal-1" text-color="teal-10">com evidência</q-chip>
            <q-chip v-else dense color="amber-1" text-color="amber-10">sem evidência</q-chip>
            <div v-if="props.row.evidence_alternatives" class="text-caption text-grey-6 text-ellipsis" style="max-width: 180px;" :title="props.row.evidence_alternatives">{{ props.row.evidence_alternatives }}</div>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props"><q-chip dense :color="statusColor(props.row.status)" :text-color="statusTextColor(props.row.status)">{{ statusLabel(props.row.status) }}</q-chip></q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn v-if="props.row.status === 'suggested'" flat dense color="amber-8" icon="undo" @click="reviewItem(props.row, 'needs_review')"><q-tooltip>Devolver para revisão</q-tooltip></q-btn>
            <q-btn v-if="props.row.status === 'suggested'" unelevated dense color="teal-8" icon="check" label="Aprovar" @click="reviewItem(props.row, 'approved')" />
            <q-btn v-if="props.row.status === 'needs_review'" unelevated dense color="teal-8" icon="check" label="Aprovar" @click="reviewItem(props.row, 'approved')" />
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-lg text-grey-6">
            <q-icon name="fact_check" size="2em" color="grey-4" />
            <div class="text-body2 q-mt-sm">Nenhuma análise de item encontrada.</div>
          </div>
        </template>
      </q-table>
    </q-card>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import FiscalService from 'src/services/FiscalService'

const $q = useQuasar()
const props = defineProps({ refreshToken: { type: Number, default: 0 } })

const runs = ref([])
const rules = ref([])
const items = ref([])
const loadingRuns = ref(false)
const loadingRules = ref(false)
const loadingItems = ref(false)
const accountOptions = ref([])
const filters = ref({ fiscalAccount: null, status: 'suggested', ncm: '', search: '' })

const loadingAny = computed(() => loadingRuns.value || loadingRules.value || loadingItems.value)

const statusOptions = [
  { label: 'Pendentes', value: 'suggested' },
  { label: 'Aprovados', value: 'approved' },
  { label: 'Rejeitados', value: 'rejected' },
  { label: 'Revisão', value: 'needs_review' },
  { label: 'Todos', value: null },
]

const runColumns = [
  { name: 'version', label: 'Versão', align: 'left', sortable: true },
  { name: 'cnpj', label: 'CNPJ', align: 'left' },
  { name: 'status', label: 'Status', align: 'center', sortable: true },
  { name: 'counts', label: 'Itens', align: 'left' },
  { name: 'dates', label: 'Datas', align: 'left' },
]
const ruleColumns = [
  { name: 'product', label: 'Produto / NCM', align: 'left' },
  { name: 'conversion', label: 'Conversão', align: 'left' },
  { name: 'evidence', label: 'Evidência', align: 'left' },
  { name: 'status', label: 'Status', align: 'center', sortable: true },
  { name: 'actions', label: 'Revisão', align: 'right' },
]
const itemColumns = [
  { name: 'product', label: 'Item / NCM', align: 'left' },
  { name: 'conversion', label: 'Conversão', align: 'left' },
  { name: 'evidence', label: 'Evidência', align: 'left' },
  { name: 'status', label: 'Status', align: 'center', sortable: true },
  { name: 'actions', label: 'Revisão', align: 'right' },
]

function statusLabel(s) { return ({ suggested: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', needs_review: 'Revisão', applied: 'Aplicado', expired: 'Expirado' })[s] || s }
function statusColor(s) { return ({ suggested: 'amber-2', approved: 'teal-2', rejected: 'red-2', needs_review: 'orange-2', applied: 'teal-2', expired: 'grey-3' })[s] || 'grey-3' }
function statusTextColor(s) { return ({ suggested: 'amber-10', approved: 'teal-10', rejected: 'red-10', needs_review: 'orange-10', applied: 'teal-10', expired: 'grey-8' })[s] || 'grey-8' }
function runStatusLabel(s) { return ({ review: 'Em revisão', applied: 'Aplicada', draft: 'Rascunho', error: 'Erro' })[s] || s }
function runStatusColor(s) { return ({ review: 'amber-2', applied: 'teal-2', draft: 'grey-3', error: 'red-2' })[s] || 'grey-3' }
function runStatusTextColor(s) { return ({ review: 'amber-10', applied: 'teal-10', draft: 'grey-8', error: 'red-10' })[s] || 'grey-8' }
function evidenceLabel(t) { return ({ xml_tax_unit: 'Unid. tributável XML', tiny_product: 'Cadastro Tiny', description: 'Descrição', manual: 'Manual' })[t] || t || '—' }
function formatNumber(val) { const n = parseFloat(val) || 0; return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }
function formatCnpj(cnpj) { if (!cnpj || cnpj.length !== 14) return cnpj || '—'; return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') }
function formatNcm(ncm) { if (!ncm || ncm.length !== 8) return ncm || '—'; return ncm.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3') }
function formatDate(iso) { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

async function loadAccounts() {
  const { data } = await FiscalService.getCnpjs()
  const rows = data.results || data || []
  accountOptions.value = rows.map((a) => ({ label: `${formatCnpj(a.cnpj)} — ${a.razao_social || 'CNPJ'}`, value: a.id }))
}

async function loadRuns() {
  loadingRuns.value = true
  try {
    const params = { fiscal_account: filters.value.fiscalAccount || undefined, status: filters.value.status || undefined, page_size: 50 }
    const { data } = await FiscalService.getNormalizationRuns(params)
    runs.value = data.results || data || []
  } catch (e) { $q.notify({ type: 'negative', message: 'Erro ao carregar execuções.' }) }
  finally { loadingRuns.value = false }
}

async function loadRules() {
  loadingRules.value = true
  try {
    const params = { fiscal_account: filters.value.fiscalAccount || undefined, status: filters.value.status || undefined, ncm: filters.value.ncm || undefined, search: filters.value.search || undefined, page_size: 100 }
    const { data } = await FiscalService.getNormalizationRules(params)
    rules.value = data.results || data || []
  } catch (e) { $q.notify({ type: 'negative', message: 'Erro ao carregar regras.' }) }
  finally { loadingRules.value = false }
}

async function loadItems() {
  loadingItems.value = true
  try {
    const params = { fiscal_account: filters.value.fiscalAccount || undefined, status: filters.value.status || undefined, ncm: filters.value.ncm || undefined, search: filters.value.search || undefined, page_size: 100 }
    const { data } = await FiscalService.getNormalizationItems(params)
    items.value = data.results || data || []
  } catch (e) { $q.notify({ type: 'negative', message: 'Erro ao carregar análises.' }) }
  finally { loadingItems.value = false }
}

async function reloadAll() { await Promise.all([loadRuns(), loadRules(), loadItems()]) }

async function reviewRule(rule, status) {
  try {
    await FiscalService.reviewNormalizationRule(rule.id, { status })
    $q.notify({ type: 'positive', message: status === 'approved' ? 'Regra aprovada. Itens sugeridos propagados.' : 'Regra rejeitada.' })
    await reloadAll()
  } catch (e) {
    const msg = e.response?.status === 409 ? 'Regra já aplicada em projeções. Crie uma nova versão.' : (e.response?.data?.detail || 'Erro ao revisar regra.')
    $q.notify({ type: 'warning', message: msg })
  }
}

async function reviewItem(item, status) {
  try {
    await FiscalService.reviewNormalizationItem(item.id, { status })
    $q.notify({ type: 'positive', message: status === 'approved' ? 'Item aprovado.' : 'Item devolvido para revisão.' })
    await loadItems()
  } catch (e) {
    const msg = e.response?.status === 409 ? 'Item já projetado. Crie uma nova versão.' : (e.response?.data?.detail || 'Erro ao revisar item.')
    $q.notify({ type: 'warning', message: msg })
  }
}

onMounted(async () => { await loadAccounts(); await reloadAll() })
defineExpose({ reloadAll })
</script>

<style scoped>
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.text-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
