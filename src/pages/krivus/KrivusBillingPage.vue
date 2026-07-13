<template>
  <q-page class="krivus-page">
    <div class="krivus-container">

      <SbPageHeader title="Cobranças" subtitle="Faturas de gestão contínua de todos os clientes" icon="payments">
        <template #actions>
          <q-select
            v-model="statusFilter"
            :options="statusOptions"
            dense outlined emit-value map-options clearable
            label="Filtrar por status"
            style="min-width: 200px"
            @update:model-value="loadInvoices"
          />
          <q-btn color="primary" label="Nova cobrança" icon="add" no-caps unelevated @click="openNewInvoice" />
        </template>
      </SbPageHeader>

      <SbKpiGrid :columns="3" class="q-mb-xl" v-if="!loadingOverview">
        <SbKpiCard label="Pendente" variant="amber" prefix="R$" :value="formatNumber(overview.pendente_total)" />
        <SbKpiCard label="Atrasado" variant="red" prefix="R$" :value="formatNumber(overview.atrasado_total)" />
        <SbKpiCard label="Recebido no mês" variant="green" prefix="R$" :value="formatNumber(overview.recebido_mes_total)" />
      </SbKpiGrid>
      <SbKpiGrid :columns="3" class="q-mb-xl" v-else>
        <q-skeleton v-for="i in 3" :key="i" height="90px" />
      </SbKpiGrid>

      <SbCard :padded="false">
        <q-table
          :rows="invoices"
          :columns="columns"
          row-key="id"
          flat
          :loading="loadingInvoices"
          :pagination="{ rowsPerPage: 20 }"
          class="krivus-qtable"
        >
          <template #body-cell-client_nome="props">
            <q-td :props="props">
              <router-link :to="`/krivus/${props.row.client_slug}`" class="text-primary">
                {{ props.value }}
              </router-link>
            </q-td>
          </template>
          <template #body-cell-status="props">
            <q-td :props="props">
              <SbBadge :variant="statusVariant(props.value)">{{ props.value }}</SbBadge>
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                v-if="props.row.status !== 'pago'"
                flat dense no-caps size="sm" color="positive" label="Marcar pago"
                @click="markPaid(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </SbCard>

    </div>

    <!-- Dialog: nova cobrança manual -->
    <q-dialog v-model="newInvoiceDialog">
      <q-card style="min-width: 440px">
        <q-card-section><div class="text-h6">Nova cobrança</div></q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-select
            v-model="newInvoice.client_slug"
            :options="clientOptions"
            emit-value map-options
            label="Cliente" outlined dense autofocus
          />
          <q-select
            v-model="newInvoice.tipo"
            :options="[{label:'Setup/Implementação',value:'setup'},{label:'Mensalidade Gestão Contínua',value:'mensalidade'}]"
            emit-value map-options label="Tipo" outlined dense
          />
          <div class="row q-gutter-sm">
            <q-input v-model="newInvoice.competencia" label="Competência" type="date" outlined dense style="flex:1" hint="Mês faturado" />
            <q-input v-model="newInvoice.data_vencimento" label="Vencimento" type="date" outlined dense style="flex:1" />
          </div>
          <q-input v-model.number="newInvoice.valor" label="Valor" prefix="R$" type="number" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            unelevated color="primary" label="Criar"
            :loading="savingInvoice"
            :disable="!newInvoice.client_slug || !newInvoice.valor || !newInvoice.competencia || !newInvoice.data_vencimento"
            @click="saveInvoice"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import KrivusService from 'src/services/KrivusService'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import SbKpiGrid from 'src/components/common/SbKpiGrid.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'

const $q = useQuasar()

const invoices = ref([])
const overview = ref({})
const clients = ref([])
const loadingInvoices = ref(true)
const loadingOverview = ref(true)
const statusFilter = ref(null)
const newInvoiceDialog = ref(false)
const savingInvoice = ref(false)
const newInvoice = ref({})

const clientOptions = computed(() => clients.value.map((c) => ({ label: c.nome, value: c.slug })))

const statusOptions = [
  { label: 'Pendente', value: 'pendente' },
  { label: 'Pago', value: 'pago' },
  { label: 'Atrasado', value: 'atrasado' },
  { label: 'Cancelado', value: 'cancelado' },
]

const columns = [
  { name: 'client_nome', label: 'Cliente', field: 'client_nome', align: 'left' },
  { name: 'competencia', label: 'Competência', field: (row) => formatMonth(row.competencia), align: 'left' },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'valor', label: 'Valor', field: (row) => formatCurrency(row.valor), align: 'right' },
  { name: 'data_vencimento', label: 'Vencimento', field: (row) => formatDate(row.data_vencimento), align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

function formatCurrency(v) {
  if (!v && v !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatNumber(v) {
  if (!v && v !== 0) return '0,00'
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function formatMonth(d) {
  if (!d) return '—'
  const [y, m] = d.split('-')
  return `${m}/${y}`
}

function statusVariant(s) {
  return { pendente: 'amber', pago: 'green', atrasado: 'red', cancelado: 'slate' }[s] || 'slate'
}

async function loadInvoices() {
  loadingInvoices.value = true
  try {
    const res = await KrivusService.getAllInvoices(statusFilter.value)
    invoices.value = res.data
  } finally {
    loadingInvoices.value = false
  }
}

async function loadOverview() {
  loadingOverview.value = true
  try {
    const res = await KrivusService.getBillingOverview()
    overview.value = res.data
  } finally {
    loadingOverview.value = false
  }
}

async function markPaid(invoice) {
  try {
    await KrivusService.markInvoicePaid(invoice.client_slug, invoice.id)
    await Promise.all([loadInvoices(), loadOverview()])
    $q.notify({ type: 'positive', message: 'Cobrança marcada como paga — recibo gerado!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao marcar como pago.' })
  }
}

async function loadClients() {
  try {
    const res = await KrivusService.getClients()
    clients.value = res.data
  } catch { /* noop */ }
}

function openNewInvoice() {
  const today = new Date()
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  newInvoice.value = {
    client_slug: null,
    tipo: 'setup',
    competencia: firstOfMonth,
    data_vencimento: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    valor: null,
  }
  newInvoiceDialog.value = true
  if (!clients.value.length) loadClients()
}

async function saveInvoice() {
  savingInvoice.value = true
  try {
    const { client_slug: slug, ...payload } = newInvoice.value
    await KrivusService.createInvoice(slug, payload)
    await Promise.all([loadInvoices(), loadOverview()])
    newInvoiceDialog.value = false
    $q.notify({ type: 'positive', message: 'Cobrança criada!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao criar cobrança.' })
  } finally {
    savingInvoice.value = false
  }
}

onMounted(() => {
  loadInvoices()
  loadOverview()
})
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.krivus-page { background: #f8fafc; }
.krivus-container { max-width: 1100px; margin: 0 auto; padding: $space-6 $space-6 $space-12; }

.krivus-qtable {
  :deep(thead th) {
    font-size: 11px; font-weight: 600; color: $text-muted; text-transform: uppercase; letter-spacing: 0.05em;
  }
  :deep(tbody td) { font-size: $text-small-size; }
}
</style>
