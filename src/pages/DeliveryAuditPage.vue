<template>
  <q-page class="q-pa-lg">
    <SbPageHeader
      eyebrow="Logística"
      title="Auditoria de entregas"
      subtitle="Compare o que o marketplace repassou com o custo teórico da transportadora."
      icon="fact_check"
    />

    <SbCard class="q-mb-md">
      <div class="row q-col-gutter-md items-end">
        <q-input v-model="filters.start_date" type="date" label="Início" outlined dense class="col-12 col-sm-3" />
        <q-input v-model="filters.end_date" type="date" label="Fim" outlined dense class="col-12 col-sm-3" />
        <q-select
          v-model="filters.marketplace" :options="marketplaceOptions" emit-value map-options
          clearable label="Marketplace" outlined dense class="col-12 col-sm-3"
        />
        <q-btn color="teal-7" label="Consultar" icon="search" :loading="loading" class="col-12 col-sm-3" @click="load" />
      </div>
    </SbCard>

    <SbEmptyState
      v-if="loadError"
      variant="error"
      title="Não foi possível gerar a auditoria"
      :message="loadError"
      class="q-mb-md"
    >
      <template #action>
        <q-btn color="teal-7" label="Tentar novamente" @click="load" />
      </template>
    </SbEmptyState>

    <template v-if="!loadError">
      <SbKpiGrid :columns="4" class="q-mb-md">
        <SbKpiCard label="Pedidos auditados" :value="summary.resolved_count" variant="teal"
          :sub="`${summary.total_orders} no período · ${summary.unresolved_count} pendentes`" />
        <SbKpiCard label="Repassado" :value="money(summary.total_repassed)" variant="sky"
          sub="Valor recebido do marketplace" />
        <SbKpiCard label="Custo teórico" :value="money(summary.total_theoretical)" variant="indigo"
          sub="Somando transportadora configurada" />
        <SbKpiCard
          label="Divergência" :value="money(summary.divergence)" :variant="divergenceVariant"
          :sub="`${formatPercent(summary.divergence_percent)} sobre o repassado · ${summary.divergent_count} acima de ${money(summary.divergence_threshold)}`"
        />
      </SbKpiGrid>

      <q-banner v-if="summary.missing_dimensions_count" class="bg-amber-1 text-amber-10 q-mb-md rounded-borders">
        <template #avatar><q-icon name="straighten" /></template>
        {{ summary.missing_dimensions_count }} pedido(s) sem dimensões cadastradas ficaram fora dos totais financeiros.
        <template #action>
          <q-btn flat color="amber-10" label="Cadastrar dimensões" @click="goToDimensions" />
        </template>
      </q-banner>

      <q-banner v-if="summary.missing_rate_tier_count" class="bg-amber-1 text-amber-10 q-mb-md rounded-borders">
        <template #avatar><q-icon name="tune" /></template>
        {{ summary.missing_rate_tier_count }} pedido(s) não têm faixa de preço aplicável na tabela da transportadora.
        <template #action>
          <q-btn flat color="amber-10" label="Ajustar faixas" @click="goToCarriers" />
        </template>
      </q-banner>

      <q-banner v-if="summary.missing_repass_count" class="bg-amber-1 text-amber-10 q-mb-md rounded-borders">
        <template #avatar><q-icon name="sync_problem" /></template>
        {{ summary.missing_repass_count }} pedido(s) ainda não trouxeram o valor de repasse do marketplace.
        Rode a sincronização financeira da conta para concluir a auditoria.
      </q-banner>

      <SbCard :padded="false" class="q-mb-md">
        <template #header>
          <div class="text-subtitle1 text-weight-medium">Resumo por transportadora</div>
        </template>
        <SbEmptyState v-if="!summary.by_carrier.length" title="Sem dados suficientes"
          message="Nenhum pedido concluído no período para resumir." />
        <SbTable v-else>
          <thead>
            <tr>
              <th>Transportadora</th>
              <th class="text-right">Pedidos</th>
              <th class="text-right">Repassado</th>
              <th class="text-right">Custo teórico</th>
              <th class="text-right">Divergência</th>
              <th class="text-right">%</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary.by_carrier" :key="row.carrier_name">
              <td class="text-weight-medium">{{ row.carrier_name }}</td>
              <td class="text-right">{{ row.orders_count }}</td>
              <td class="text-right">{{ money(row.repassed) }}</td>
              <td class="text-right">{{ money(row.theoretical) }}</td>
              <td class="text-right" :class="divergenceClass(row.divergence)">{{ money(row.divergence) }}</td>
              <td class="text-right" :class="divergenceClass(row.divergence)">
                {{ formatPercent(percent(row.divergence, row.repassed)) }}
              </td>
            </tr>
          </tbody>
        </SbTable>
      </SbCard>

      <SbCard :padded="false">
        <template #header>
          <div class="text-subtitle1 text-weight-medium">Pedidos</div>
        </template>
        <template #actions>
          <q-input v-model="search" dense outlined placeholder="Buscar pedido ou SKU" clearable style="min-width: 200px">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </template>

        <SbEmptyState v-if="loading" variant="loading" title="Auditando entregas..." />
        <SbEmptyState
          v-else-if="!summary.entries.length"
          title="Nenhuma entrega encontrada no período 🎉"
          message="Ajuste o intervalo para auditar outras entregas próprias."
        />
        <SbEmptyState v-else-if="!filteredEntries.length" title="Nenhum pedido corresponde à busca"
          message="Tente outro pedido, SKU ou nome de produto." />
        <SbTable v-else>
          <thead>
            <tr>
              <th>Data</th>
              <th>Pedido</th>
              <th>Marketplace</th>
              <th>Produto</th>
              <th class="text-right">Faturável</th>
              <th class="text-right">Repassado</th>
              <th class="text-right">Teórico</th>
              <th class="text-right">Divergência</th>
              <th class="text-right">%</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in filteredEntries" :key="entry.id">
              <td>{{ formatDate(entry.order_date) }}</td>
              <td class="text-weight-medium">{{ entry.order_ref }}</td>
              <td>
                <SbBadge :variant="entry.marketplace === 'ml' ? 'ml' : 'shopee'">
                  {{ entry.marketplace === 'ml' ? 'ML' : 'Shopee' }}
                </SbBadge>
              </td>
              <td>
                <div class="ellipsis" style="max-width: 220px" :title="productLabel(entry)">
                  {{ productLabel(entry) }}
                </div>
              </td>
              <td class="text-right">{{ formatKg(entry.billable_weight_kg) }}</td>
              <td class="text-right">{{ entry.has_repass ? money(entry.repassed_amount) : '—' }}</td>
              <td class="text-right">{{ entry.has_dimensions ? money(entry.theoretical_cost) : '—' }}</td>
              <td class="text-right" :class="divergenceClass(entry.divergence)">{{ money(entry.divergence) }}</td>
              <td class="text-right" :class="divergenceClass(entry.divergence)">
                {{ formatPercent(percent(entry.divergence, entry.repassed_amount)) }}
              </td>
              <td>
                <div class="row items-center no-wrap q-gutter-xs">
                  <SbBadge :variant="statusVariant(entry)">{{ statusLabel(entry) }}</SbBadge>
                  <q-icon v-if="entry.volume_warning" name="warning" color="amber-9" size="16px">
                    <q-tooltip>Pacote acima do limite da transportadora</q-tooltip>
                  </q-icon>
                </div>
              </td>
            </tr>
          </tbody>
        </SbTable>

        <div v-if="summary.entries_truncated" class="q-pa-md text-caption text-grey-7">
          Mostrando {{ summary.entries_returned }} de {{ summary.total_orders }} pedidos.
          Reduza o intervalo para ver os demais.
        </div>
      </SbCard>
    </template>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { date as quasarDate } from 'quasar'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import SbKpiGrid from 'src/components/common/SbKpiGrid.vue'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import SbTable from 'src/components/common/SbTable.vue'
import DeliveryAuditService from 'src/services/DeliveryAuditService'
import { formatCurrency } from 'src/utils/itemAnalytics'

const router = useRouter()
const today = quasarDate.formatDate(new Date(), 'YYYY-MM-DD')

const filters = ref({
  start_date: quasarDate.formatDate(new Date(), 'YYYY-MM-01'),
  end_date: today,
  marketplace: null,
})
const loading = ref(false)
const loadError = ref('')
const search = ref('')
const audit = ref({})

const marketplaceOptions = [
  { label: 'Mercado Livre', value: 'ml' },
  { label: 'Shopee', value: 'shopee' },
]

const blankSummary = {
  total_orders: 0, resolved_count: 0, unresolved_count: 0,
  missing_dimensions_count: 0, missing_rate_tier_count: 0, missing_repass_count: 0,
  total_repassed: 0, total_theoretical: 0, divergence: 0, divergence_percent: 0,
  by_carrier: [], entries: [], divergent_count: 0, divergence_threshold: 2,
  entries_returned: 0, entries_truncated: false,
}

const summary = computed(() => ({ ...blankSummary, ...audit.value }))

const filteredEntries = computed(() => {
  const term = (search.value || '').trim().toLowerCase()
  if (!term) return summary.value.entries
  return summary.value.entries.filter((entry) =>
    [entry.order_ref, entry.product_sku, entry.product_name]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(term)),
  )
})

const divergenceVariant = computed(() => (Number(summary.value.divergence) >= 0 ? 'green' : 'red'))
const divergenceClass = (value) => (Number(value) >= 0 ? 'text-positive' : 'text-negative')

const money = (value) => formatCurrency(value)

function percent(divergence, repassed) {
  const base = Number(repassed)
  if (!base) return null
  return (Number(divergence) / base) * 100
}

function formatPercent(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function formatKg(value) {
  if (value === null || value === undefined || value === '') return '—'
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
}

function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : quasarDate.formatDate(parsed, 'DD/MM/YYYY')
}

function productLabel(entry) {
  if (entry.product_sku && entry.product_name) return `${entry.product_sku} · ${entry.product_name}`
  return entry.product_sku || entry.product_name || '—'
}

function statusLabel(entry) {
  if (entry.audit_status === 'calculated') return 'Calculado'
  if (entry.audit_status === 'missing_rate_tier') return 'Sem faixa'
  if (entry.audit_status === 'missing_repass') return 'Sem repasse'
  if (entry.audit_status === 'missing_dimensions') return 'Sem dimensões'
  return entry.audit_status || '—'
}

function statusVariant(entry) {
  if (entry.audit_status === 'calculated') return 'green'
  return 'amber'
}

function goToDimensions() {
  router.push({ name: 'delivery-carriers', query: { tab: 'dimensions' } })
}

function goToCarriers() {
  router.push({ name: 'delivery-carriers' })
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { data } = await DeliveryAuditService.getAudit({
      start_date: filters.value.start_date,
      end_date: filters.value.end_date,
      marketplace: filters.value.marketplace || undefined,
    })
    audit.value = data
  } catch (error) {
    audit.value = {}
    loadError.value =
      error?.response?.data?.error ||
      error?.response?.data?.detail ||
      'Falha ao consultar a auditoria. Verifique o período informado.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
