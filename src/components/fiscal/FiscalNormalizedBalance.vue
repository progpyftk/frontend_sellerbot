<template>
  <div class="normalized-balance">
    <!-- Banner de cobertura da normalização -->
    <q-banner
      rounded
      class="q-mb-md normalized-balance__banner"
      :class="coverageBannerClass"
    >
      <template #avatar>
        <q-icon :name="coverageIcon" :color="coverageIconColor" />
      </template>
      <div class="text-weight-bold">Balanço métrico normalizado</div>
      <div class="text-body2 q-mt-xs">
        <template v-if="!selectedAccountId">
          Selecione um CNPJ fiscal para consultar o balanço em unidades comparáveis (KG/L/UN).
        </template>
        <template v-else-if="loading">
          Consultando projeções aprovadas…
        </template>
        <template v-else-if="!kpis.normalization_version">
          Nenhuma normalização aplicada para este CNPJ. Aprove regras na aba
          <strong>Normalização métrica</strong> e execute
          <code>fiscal_normalization_apply</code> para gerar o balanço métrico.
        </template>
        <template v-else>
          Versão <strong class="font-mono">{{ kpis.normalization_version }}</strong> ·
          <strong>{{ kpis.items_normalized }}</strong> itens normalizados,
          <strong :class="kpis.items_pending > 0 ? 'text-amber-10' : ''">{{ kpis.items_pending }}</strong>
          pendentes · cobertura <strong>{{ formatPercent(kpis.coverage_ratio) }}</strong>
        </template>
      </div>
    </q-banner>

    <!-- Pendências por unidade original -->
    <transition name="q-transition--fade">
      <div
        v-if="pendingBreakdown.length > 0 && kpis.normalization_version"
        class="normalized-pending-banner q-pa-md q-mb-md rounded-borders"
      >
        <div class="row items-center no-wrap">
          <q-icon name="warning_amber" size="sm" color="amber-9" class="q-mr-sm" />
          <div class="text-body2 text-grey-9">
            <strong>{{ kpis.items_pending }} movimentos</strong> ainda sem normalização aprovada.
            As grandezas abaixo não foram somadas ao balanço métrico e ficam discriminadas por unidade original.
          </div>
        </div>
        <div class="row q-gutter-xs q-mt-sm">
          <q-chip
            v-for="p in pendingBreakdown.slice(0, 12)"
            :key="`${p.ncm}-${p.original_unit}`"
            dense
            color="amber-1"
            text-color="amber-10"
            class="text-weight-medium"
          >
            {{ formatNcm(p.ncm) }} · {{ p.original_unit }}
            <q-tooltip>{{ p.description || 'Sem descrição' }} — {{ p.movements_count }} movimento(s)</q-tooltip>
          </q-chip>
          <q-chip v-if="pendingBreakdown.length > 12" dense color="grey-3" text-color="grey-8">
            +{{ pendingBreakdown.length - 12 }} grupos
          </q-chip>
        </div>
      </div>
    </transition>

    <!-- KPIs do balanço métrico -->
    <div v-if="kpis.normalization_version" class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <SbKpiCard
          label="Entradas (normalizado)"
          :value="formatQtyByUnit(kpis.qty_by_dimension_unit, 'in')"
          :sub="kpis.quantity_status === 'mixed_dimensions' ? 'Múltiplas dimensões' : 'Unidade comparável'"
          variant="green"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <SbKpiCard
          label="Saídas (normalizado)"
          :value="formatQtyByUnit(kpis.qty_by_dimension_unit, 'out')"
          :sub="kpis.quantity_status === 'mixed_dimensions' ? 'Múltiplas dimensões' : 'Unidade comparável'"
          variant="red"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <SbKpiCard
          label="Cobertura"
          :value="formatPercent(kpis.coverage_ratio)"
          :sub="`${kpis.items_normalized} de ${kpis.items_normalized + kpis.items_pending} itens`"
          :variant="coverageVariant"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <SbKpiCard
          label="Versão aplicada"
          :value="kpis.normalization_version || '—'"
          :sub="kpis.account_cnpj ? formatCnpj(kpis.account_cnpj) : ''"
          variant="indigo"
        />
      </div>
    </div>

    <!-- Tabela do balanço métrico por NCM ou por SKU -->
    <SbCard>
      <div class="row items-center justify-between q-pb-md border-bottom">
        <div class="text-subtitle1 text-weight-bold text-grey-9">
          <template v-if="granularity === 'ncm'">Saldo métrico por NCM (KG / L / UN)</template>
          <template v-else>Saldo métrico por SKU (KG / L / UN + R$)</template>
        </div>
        <div class="row items-center q-gutter-sm">
          <q-btn
            flat
            dense
            no-caps
            icon="download"
            label="Exportar CSV"
            color="grey-7"
            :disable="rows.length === 0"
            @click="exportCsv"
          />
          <q-btn-toggle
            v-model="granularity"
            dense
            no-caps
            unelevated
            toggle-color="teal-8"
            color="grey-3"
            text-color="grey-8"
            :options="[
              { label: 'Por NCM', value: 'ncm' },
              { label: 'Por SKU', value: 'sku' },
            ]"
          />
          <q-btn
            flat
            dense
            no-caps
            icon="refresh"
            label="Atualizar"
            color="grey-7"
            :loading="loading"
            @click="load"
          />
        </div>
      </div>

      <!-- Tooltips explicativos das colunas métricas -->
      <div class="q-pb-sm text-caption text-grey-6">
        Quantidades normalizadas para <strong>KG</strong> (massa), <strong>L</strong> (volume) ou
        <strong>UN</strong> (contagem) com base na unidade da NF-e e na evidência do XML/descrição.
        <q-tooltip>Saldo = Entradas − Saídas na unidade normalizada. Itens sem regra aprovada ficam pendentes.</q-tooltip>
      </div>

      <q-table
        :rows="rows"
        :columns="columns"
        :row-key="(row) => granularity === 'sku' ? `${row.sku}|${row.ncm}|${row.dimension}|${row.unit}` : `${row.ncm}|${row.dimension}|${row.unit}`"
        :loading="loading"
        flat
        :pagination="{ rowsPerPage: 25 }"
        class="normalized-table"
      >
        <!-- Tooltips nos cabeçalhos -->
        <template #header-cell-qty_in="props">
          <q-th :props="props">Entradas
            <q-tooltip>Quantidade total de entrada na unidade normalizada (KG/L/UN).</q-tooltip>
          </q-th>
        </template>
        <template #header-cell-qty_out="props">
          <q-th :props="props">Saídas
            <q-tooltip>Quantidade total de saída na unidade normalizada (KG/L/UN).</q-tooltip>
          </q-th>
        </template>
        <template #header-cell-balance_qty="props">
          <q-th :props="props">Saldo Métrico
            <q-tooltip>Saldo fiscal documentado = Entradas − Saídas. Negativo indica mais saídas que entradas documentadas.</q-tooltip>
          </q-th>
        </template>
        <template v-if="granularity === 'sku'" #header-cell-value_in="props">
          <q-th :props="props">Entradas (R$)
            <q-tooltip>Valor financeiro das notas de entrada (product_value do item).</q-tooltip>
          </q-th>
        </template>
        <template v-if="granularity === 'sku'" #header-cell-value_out="props">
          <q-th :props="props">Saídas (R$)
            <q-tooltip>Valor financeiro das notas de saída (product_value do item).</q-tooltip>
          </q-th>
        </template>
        <template v-if="granularity === 'sku'" #header-cell-balance_value="props">
          <q-th :props="props">Saldo Financeiro
            <q-tooltip>Saldo financeiro = Entradas (R$) − Saídas (R$). Não é valor de estoque (sem método CMP/FIFO).</q-tooltip>
          </q-th>
        </template>
        <template #header-cell-movements_count="props">
          <q-th :props="props">Movs
            <q-tooltip>Número de movimentos (notas) agregados nesta linha.</q-tooltip>
          </q-th>
        </template>
        <template #body-cell-ncm="props">
          <q-td :props="props">
            <template v-if="granularity === 'sku'">
              <div class="text-weight-bold font-mono">{{ props.row.sku }}</div>
              <div class="text-caption text-grey-6 font-mono">NCM {{ formatNcm(props.row.ncm) }}</div>
            </template>
            <template v-else>
              <span class="text-weight-bold font-mono">{{ formatNcm(props.row.ncm) }}</span>
            </template>
          </q-td>
        </template>

        <template #body-cell-description="props">
          <q-td :props="props">
            <div class="text-ellipsis" style="max-width: 300px;" :title="props.row.description">
              {{ props.row.description || '—' }}
            </div>
          </q-td>
        </template>

        <template #body-cell-unit="props">
          <q-td :props="props">
            <q-chip dense size="sm" color="teal-1" text-color="teal-10" class="text-weight-bold">
              {{ dimensionIcon(props.row.dimension) }} {{ props.row.unit }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-qty_in="props">
          <q-td :props="props" class="text-green-8 text-weight-medium">
            +{{ formatNumber(props.row.qty_in) }}
          </q-td>
        </template>

        <template #body-cell-qty_out="props">
          <q-td :props="props" class="text-red-8 text-weight-medium">
            -{{ formatNumber(props.row.qty_out) }}
          </q-td>
        </template>

        <template #body-cell-balance_qty="props">
          <q-td :props="props">
            <span
              :class="[
                'text-weight-bold',
                props.row.balance_qty > 0 ? 'text-teal-9' : props.row.balance_qty < 0 ? 'text-red-9' : 'text-grey-7'
              ]"
            >
              {{ formatNumber(props.row.balance_qty) }}
            </span>
          </q-td>
        </template>

        <template v-if="granularity === 'sku'" #body-cell-value_in="props">
          <q-td :props="props" class="text-grey-9">
            {{ formatCurrency(props.row.value_in) }}
          </q-td>
        </template>

        <template v-if="granularity === 'sku'" #body-cell-value_out="props">
          <q-td :props="props" class="text-grey-9">
            {{ formatCurrency(props.row.value_out) }}
          </q-td>
        </template>

        <template v-if="granularity === 'sku'" #body-cell-balance_value="props">
          <q-td :props="props">
            <span
              :class="[
                'text-weight-bold',
                props.row.balance_value > 0 ? 'text-teal-9' : props.row.balance_value < 0 ? 'text-red-9' : 'text-grey-7'
              ]"
            >
              {{ formatCurrency(props.row.balance_value) }}
            </span>
          </q-td>
        </template>

        <template #body-cell-movements_count="props">
          <q-td :props="props" class="text-grey-7">
            {{ props.row.movements_count }}
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="straighten" size="3em" color="grey-4" />
            <div class="text-h6 q-mt-sm">Nenhum saldo métrico disponível</div>
            <div class="text-caption">
              <template v-if="!selectedAccountId">Selecione um CNPJ fiscal para consultar.</template>
              <template v-else>Aprove normalizações e execute <code>fiscal_normalization_apply</code> para projetar o saldo.</template>
            </div>
          </div>
        </template>
      </q-table>
    </SbCard>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useQuasar } from 'quasar'
import SbCard from 'src/components/common/SbCard.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import FiscalService from 'src/services/FiscalService'

const $q = useQuasar()
const props = defineProps({
  selectedAccountId: { type: Number, default: null },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  search: { type: String, default: '' },
  refreshToken: { type: Number, default: 0 },
})

const loading = ref(false)
const rows = ref([])
const pendingBreakdown = ref([])
const granularity = ref('ncm')
const kpis = ref({
  normalization_version: null,
  items_normalized: 0,
  items_pending: 0,
  coverage_ratio: 1.0,
  quantity_status: 'known',
  qty_by_dimension_unit: {},
  total_value_in: 0,
  total_value_out: 0,
  net_value: 0,
  total_skus: 0,
  account_cnpj: '',
})

const ncmColumns = [
  { name: 'ncm', label: 'NCM', field: 'ncm', align: 'left', sortable: true },
  { name: 'description', label: 'Descrição', field: 'description', align: 'left' },
  { name: 'unit', label: 'Unidade', field: 'unit', align: 'center', sortable: true },
  { name: 'qty_in', label: 'Entradas', field: 'qty_in', align: 'right', sortable: true },
  { name: 'qty_out', label: 'Saídas', field: 'qty_out', align: 'right', sortable: true },
  { name: 'balance_qty', label: 'Saldo Métrico', field: 'balance_qty', align: 'right', sortable: true },
  { name: 'movements_count', label: 'Movs', field: 'movements_count', align: 'center', sortable: true },
]

const skuColumns = [
  { name: 'ncm', label: 'SKU / NCM', field: 'sku', align: 'left', sortable: true },
  { name: 'description', label: 'Descrição', field: 'description', align: 'left' },
  { name: 'unit', label: 'Unidade', field: 'unit', align: 'center', sortable: true },
  { name: 'qty_in', label: 'Entradas (Qtd)', field: 'qty_in', align: 'right', sortable: true },
  { name: 'qty_out', label: 'Saídas (Qtd)', field: 'qty_out', align: 'right', sortable: true },
  { name: 'balance_qty', label: 'Saldo Métrico', field: 'balance_qty', align: 'right', sortable: true },
  { name: 'value_in', label: 'Entradas (R$)', field: 'value_in', align: 'right', sortable: true },
  { name: 'value_out', label: 'Saídas (R$)', field: 'value_out', align: 'right', sortable: true },
  { name: 'balance_value', label: 'Saldo Financeiro', field: 'balance_value', align: 'right', sortable: true },
  { name: 'movements_count', label: 'Movs', field: 'movements_count', align: 'center', sortable: true },
]

const columns = computed(() => (granularity.value === 'sku' ? skuColumns : ncmColumns))

const coverageVariant = computed(() => {
  const r = kpis.value.coverage_ratio
  if (r >= 0.9) return 'teal'
  if (r >= 0.5) return 'amber'
  return 'red'
})
const coverageBannerClass = computed(() => {
  if (!kpis.value.normalization_version) return 'normalized-balance__banner--empty'
  const r = kpis.value.coverage_ratio
  if (r >= 0.9) return 'normalized-balance__banner--good'
  if (r >= 0.5) return 'normalized-balance__banner--warn'
  return 'normalized-balance__banner--bad'
})
const coverageIcon = computed(() => {
  if (!kpis.value.normalization_version) return 'info'
  const r = kpis.value.coverage_ratio
  if (r >= 0.9) return 'check_circle'
  if (r >= 0.5) return 'warning'
  return 'error'
})
const coverageIconColor = computed(() => {
  if (!kpis.value.normalization_version) return 'grey-7'
  const r = kpis.value.coverage_ratio
  if (r >= 0.9) return 'teal-8'
  if (r >= 0.5) return 'amber-9'
  return 'red-8'
})

function formatNumber(val) {
  const num = parseFloat(val) || 0
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}
function formatCurrency(val) {
  const num = parseFloat(val) || 0
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatPercent(val) {
  const num = parseFloat(val) || 0
  return `${(num * 100).toFixed(1)}%`
}
function formatCnpj(cnpj) {
  if (!cnpj || cnpj.length !== 14) return cnpj || '—'
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}
function formatNcm(ncm) {
  if (!ncm || ncm.length !== 8) return ncm || '—'
  return ncm.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3')
}
function dimensionIcon(dim) {
  return ({ mass: '⚖', volume: '🫗', count: 'pcs' })[dim] || '·'
}
function formatQtyByUnit(qtyMap, direction) {
  if (!qtyMap || Object.keys(qtyMap).length === 0) return '—'
  const parts = Object.entries(qtyMap).map(([key, vals]) => {
    const v = direction === 'in' ? vals.qty_in : vals.qty_out
    return `${formatNumber(v)} ${key.split('/')[1]}`
  })
  return parts.join(' · ')
}

async function load() {
  if (!props.selectedAccountId) return
  loading.value = true
  try {
    const params = {
      fiscal_account_id: props.selectedAccountId,
      start_date: props.startDate || undefined,
      end_date: props.endDate || undefined,
      search: props.search || undefined,
    }
    const { data } = granularity.value === 'sku'
      ? await FiscalService.getNormalizedSkuBalance(params)
      : await FiscalService.getNormalizedBalance(params)
    kpis.value = data.kpis || {}
    rows.value = data.results || []
    pendingBreakdown.value = data.pending_breakdown || []
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.detail || 'Erro ao carregar balanço métrico.' })
    rows.value = []
    pendingBreakdown.value = []
  } finally {
    loading.value = false
  }
}

function exportCsv() {
  if (!rows.value.length) return
  const isSku = granularity.value === 'sku'
  const headers = isSku
    ? ['SKU', 'NCM', 'Descricao', 'Dimensao', 'Unidade', 'Qtd_Entrada', 'Qtd_Saida', 'Saldo_Metrico', 'R$_Entrada', 'R$_Saida', 'R$_Saldo', 'Movs']
    : ['NCM', 'Descricao', 'Dimensao', 'Unidade', 'Qtd_Entrada', 'Qtd_Saida', 'Saldo_Metrico', 'Movs']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.value.map((r) => {
    const base = isSku ? [r.sku, r.ncm] : [r.ncm]
    return [
      ...base.map(esc),
      esc(r.description || ''),
      esc(r.dimension),
      esc(r.unit),
      r.qty_in,
      r.qty_out,
      r.balance_qty,
      ...(isSku ? [r.value_in, r.value_out, r.balance_value] : []),
      r.movements_count,
    ].join(',')
  })
  const csv = '\uFEFF' + [headers.join(','), ...lines].join('\n')
  const link = document.createElement('a')
  link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
  link.download = isSku
    ? `balanco_metrico_sku_${new Date().toISOString().slice(0, 10)}.csv`
    : `balanco_metrico_ncm_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

watch(() => props.selectedAccountId, (v) => { if (v) load() })
watch(() => props.startDate, () => { if (props.selectedAccountId) load() })
watch(() => props.endDate, () => { if (props.selectedAccountId) load() })
watch(() => props.search, (v, old) => { if (v !== old && props.selectedAccountId) load() })
watch(() => props.refreshToken, (v, old) => { if (v !== old) load() })
watch(granularity, () => load())

defineExpose({ load })
</script>

<style scoped>
.normalized-balance__banner { border: 1px solid #a7f3d0; }
.normalized-balance__banner--good { background: #ecfdf5; color: #134e4a; }
.normalized-balance__banner--warn { background: #fffbeb; border-color: #fde68a; color: #78350f; }
.normalized-balance__banner--bad { background: #fef2f2; border-color: #fecaca; color: #7f1d1d; }
.normalized-balance__banner--empty { background: #f8fafc; border-color: #e2e8f0; color: #475569; }
.normalized-pending-banner { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; }
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.text-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.border-bottom { border-bottom: 1px solid #f1f5f9; }
.normalized-table :deep(.q-table__middle) { overflow-x: auto; }
</style>
