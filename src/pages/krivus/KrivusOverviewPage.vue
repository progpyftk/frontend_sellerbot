<template>
  <q-page class="krivus-page">
    <div class="krivus-container">

      <SbPageHeader title="Visão Geral" subtitle="Performance consolidada de todos os clientes Krivus" icon="dashboard">
        <template #actions>
          <q-select
            v-model="days"
            :options="daysOptions"
            dense outlined emit-value map-options
            style="min-width: 130px"
            @update:model-value="loadData"
          />
          <q-btn flat color="primary" label="Pipeline" icon="view_kanban" no-caps to="/krivus/pipeline" />
          <q-btn color="primary" label="Novo Cliente" icon="add" no-caps unelevated @click="openNewClient" />
        </template>
      </SbPageHeader>

      <!-- Alertas -->
      <router-link v-if="!loadingAlerts && alerts.total > 0" to="/krivus/alertas" class="alert-banner q-mb-lg">
        <q-icon name="warning" size="18px" class="q-mr-sm" />
        <span>{{ alerts.total }} alerta(s): cobranças atrasadas, tarefas vencidas ou clientes sem contato recente.</span>
        <q-space />
        <q-icon name="chevron_right" size="16px" />
      </router-link>

      <!-- Global KPI cards -->
      <SbKpiGrid :columns="4" class="q-mb-xl" v-if="!loadingStats">
        <SbKpiCard label="GMV Total" variant="teal" prefix="R$" :value="formatNumber(stats.gmv_total)" :sub="`últimos ${days} dias`" />
        <SbKpiCard label="Pedidos" variant="sky" :value="stats.orders_total?.toLocaleString('pt-BR') || '0'" :sub="`últimos ${days} dias`" />
        <SbKpiCard label="Anúncios Ativos" variant="indigo" :value="stats.active_items_total?.toLocaleString('pt-BR') || '0'" sub="Mercado Livre" />
        <SbKpiCard label="Receita da Krivus" variant="green" prefix="R$" :value="formatNumber(stats.receita_consultoria_mensal)" sub="mensalidades ativas" />
      </SbKpiGrid>
      <SbKpiGrid :columns="4" class="q-mb-xl" v-else>
        <q-skeleton v-for="i in 4" :key="i" height="90px" />
      </SbKpiGrid>

      <!-- Funil de estágios -->
      <h2 class="section-title q-mb-md">Funil de Clientes</h2>
      <div class="stage-funnel q-mb-xl" v-if="!loadingStats">
        <router-link to="/krivus/pipeline" v-for="s in stats.stage_distribution" :key="s.stage" class="funnel-item">
          <div class="funnel-count">{{ s.total }}</div>
          <div class="funnel-label">{{ s.label }}</div>
        </router-link>
      </div>

      <!-- Resumo de cobrança -->
      <h2 class="section-title q-mb-md">Cobrança</h2>
      <SbKpiGrid :columns="4" class="q-mb-xl" v-if="!loadingBilling">
        <SbKpiCard label="Pendente" variant="amber" prefix="R$" :value="formatNumber(billing.pendente_total)" />
        <SbKpiCard label="Atrasado" variant="red" prefix="R$" :value="formatNumber(billing.atrasado_total)" />
        <SbKpiCard label="Recebido no mês" variant="green" prefix="R$" :value="formatNumber(billing.recebido_mes_total)" />
        <SbKpiCard label="Faturas em aberto" variant="slate" :value="String(billing.invoices_pendentes || 0)" />
      </SbKpiGrid>
      <SbKpiGrid :columns="4" class="q-mb-xl" v-else>
        <q-skeleton v-for="i in 4" :key="i" height="90px" />
      </SbKpiGrid>

      <!-- Clients list -->
      <h2 class="section-title q-mb-md">Clientes</h2>

      <div class="clients-grid" v-if="!loadingClients">
        <SbCard
          v-for="client in clients"
          :key="client.slug"
          hover
          class="client-card"
          :style="`border-left: 3px solid ${client.cor_hex}`"
          @click="$router.push(`/krivus/${client.slug}`)"
        >
          <div class="row items-center q-mb-sm">
            <div class="health-dot" :style="`background:${healthColorOf(client.slug)}`">
              <q-tooltip>{{ healthLabelOf(client.slug) }}</q-tooltip>
            </div>
            <div class="client-name q-ml-sm">{{ client.nome }}</div>
            <q-space />
            <SbBadge :variant="statusVariant(client.status)">{{ client.status }}</SbBadge>
          </div>

          <div class="client-meta row q-gutter-md q-mt-xs">
            <div>
              <div class="meta-label">Desde</div>
              <div class="meta-value">{{ formatDate(client.data_inicio) }}</div>
            </div>
            <div>
              <div class="meta-label">Mensalidade</div>
              <div class="meta-value">{{ formatCurrency(client.mensalidade) }}</div>
            </div>
            <div>
              <div class="meta-label">Marcos</div>
              <div class="meta-value">{{ client.milestone_count }}</div>
            </div>
            <div>
              <div class="meta-label">Contas ML</div>
              <div class="meta-value">{{ client.ml_accounts_detail?.length || 0 }}</div>
            </div>
          </div>

          <div class="last-milestone q-mt-sm" v-if="client.last_milestone">
            <q-icon name="flag" size="12px" color="grey-5" />
            <span class="q-ml-xs text-grey-6" style="font-size:12px">
              Último marco: {{ client.last_milestone.titulo }} · {{ formatDate(client.last_milestone.data) }}
            </span>
          </div>

          <div class="last-milestone q-mt-xs" v-if="client.lead_origem || client.valor_proposta_enviada">
            <q-icon name="campaign" size="12px" color="grey-5" />
            <span class="q-ml-xs text-grey-6" style="font-size:12px">
              {{ client.lead_origem ? leadOrigemLabel(client.lead_origem) : '' }}
              {{ client.valor_proposta_enviada ? '· proposta ' + formatCurrency(client.valor_proposta_enviada) : '' }}
            </span>
          </div>
        </SbCard>
      </div>

      <div class="clients-grid" v-else>
        <q-skeleton v-for="i in 3" :key="i" height="120px" class="client-card" />
      </div>

    </div>

    <!-- New Client Dialog -->
    <q-dialog v-model="newClientDialog" persistent>
      <q-card style="min-width: 520px; max-width: 580px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Novo Cliente</div>
          <q-space />
          <q-btn flat round dense icon="close" color="grey" v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-sm">
          <q-input
            v-model="newClient.nome"
            label="Nome do cliente"
            outlined dense autofocus
            @update:model-value="autoSlug"
          />
          <q-input
            v-model="newClient.slug"
            label="Slug (identificador único)"
            outlined dense
            hint="Gerado automaticamente. Ex: mogivitta"
          />

          <div class="row q-gutter-sm">
            <q-input v-model="newClient.data_inicio" label="Início do contrato" type="date" outlined dense style="flex:1" />
            <q-input v-model.number="newClient.mensalidade" label="Mensalidade (R$)" type="number" outlined dense style="flex:1" />
          </div>

          <div class="row q-gutter-sm">
            <q-select
              v-model="newClient.current_stage"
              :options="stageOptions"
              emit-value map-options
              label="Estágio inicial" outlined dense style="flex:1"
            />
            <q-select
              v-model="newClient.lead_origem"
              :options="leadOrigemOptions"
              emit-value map-options clearable
              label="Origem do lead" outlined dense style="flex:1"
            />
          </div>
          <q-input
            v-if="newClient.current_stage === 'lead' || newClient.current_stage === 'proposta_enviada'"
            v-model.number="newClient.valor_proposta_enviada"
            label="Valor da proposta enviada (R$)"
            type="number" outlined dense
          />

          <div class="row items-center q-gutter-sm">
            <div class="text-caption text-grey-6">Cor de identificação:</div>
            <div class="row q-gutter-xs">
              <div
                v-for="cor in coresSugeridas"
                :key="cor"
                class="color-swatch"
                :style="`background:${cor}; outline: ${newClient.cor_hex === cor ? '2px solid #1e293b' : 'none'}`"
                @click="newClient.cor_hex = cor"
              />
            </div>
          </div>

          <div>
            <div class="text-caption text-grey-6 q-mb-xs">Contas Mercado Livre</div>
            <div v-if="loadingAccounts" class="text-caption text-grey-4">Carregando contas...</div>
            <div v-else class="accounts-checklist">
              <q-checkbox
                v-for="acc in mlAccounts"
                :key="acc.id"
                v-model="newClient.ml_accounts"
                :val="acc.id"
                :label="acc.account_nickname"
                color="amber-8"
                dense
              />
              <div v-if="!mlAccounts.length" class="text-caption text-grey-4">Nenhuma conta ML conectada.</div>
            </div>
          </div>

          <div>
            <div class="text-caption text-grey-6 q-mb-xs">Contas Shopee</div>
            <div class="accounts-checklist">
              <q-checkbox
                v-for="acc in shopeeAccounts"
                :key="acc.id"
                v-model="newClient.shopee_accounts"
                :val="acc.id"
                :label="acc.shop_name"
                color="deep-orange"
                dense
              />
              <div v-if="!shopeeAccounts.length" class="text-caption text-grey-4">Nenhuma conta Shopee conectada.</div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            unelevated label="Criar Cliente" color="primary"
            :loading="saving"
            :disable="!newClient.nome || !newClient.slug"
            @click="createClient"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import KrivusService from 'src/services/KrivusService'
import { api } from 'src/boot/axios'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import SbKpiGrid from 'src/components/common/SbKpiGrid.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import { computeHealthMap, HEALTH_COLOR, HEALTH_LABEL, healthOf } from 'src/utils/krivusHealth'

const $q = useQuasar()

const days = ref(30)
const daysOptions = [
  { label: 'Últimos 7 dias', value: 7 },
  { label: 'Últimos 30 dias', value: 30 },
  { label: 'Últimos 90 dias', value: 90 },
]

const coresSugeridas = ['#0d9488', '#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

const stats = ref({})
const billing = ref({})
const alerts = ref({ total: 0, alerts: [] })
const healthMap = ref({})
const clients = ref([])
const mlAccounts = ref([])
const shopeeAccounts = ref([])
const loadingStats = ref(true)
const loadingBilling = ref(true)
const loadingAlerts = ref(true)
const loadingClients = ref(true)
const loadingAccounts = ref(false)
const newClientDialog = ref(false)
const saving = ref(false)

const stageOptions = [
  { label: 'Lead', value: 'lead' },
  { label: 'Proposta Enviada', value: 'proposta_enviada' },
  { label: 'Contrato Assinado', value: 'contrato_assinado' },
]

const leadOrigemOptions = [
  { label: 'Indicação', value: 'indicacao' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'Google', value: 'google' },
  { label: 'Evento', value: 'evento' },
  { label: 'Outro', value: 'outro' },
]

function freshClient() {
  return {
    nome: '', slug: '', data_inicio: '', mensalidade: 0, cor_hex: '#0d9488',
    ml_accounts: [], shopee_accounts: [],
    current_stage: 'lead', lead_origem: null, valor_proposta_enviada: null,
  }
}
const newClient = ref(freshClient())

function autoSlug(nome) {
  if (!nome) { newClient.value.slug = ''; return }
  newClient.value.slug = nome
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function loadData() {
  loadingStats.value = true
  try {
    const res = await KrivusService.getOverview(days.value)
    stats.value = res.data
  } finally {
    loadingStats.value = false
  }
}

async function loadBilling() {
  loadingBilling.value = true
  try {
    const res = await KrivusService.getBillingOverview()
    billing.value = res.data
  } finally {
    loadingBilling.value = false
  }
}

async function loadAlerts() {
  loadingAlerts.value = true
  try {
    const res = await KrivusService.getAlerts()
    alerts.value = res.data
    healthMap.value = computeHealthMap(res.data.alerts)
  } finally {
    loadingAlerts.value = false
  }
}

function healthColorOf(slug) { return HEALTH_COLOR[healthOf(healthMap.value, slug)] }
function healthLabelOf(slug) { return HEALTH_LABEL[healthOf(healthMap.value, slug)] }

async function loadClients() {
  loadingClients.value = true
  try {
    const res = await KrivusService.getClients()
    clients.value = res.data
  } finally {
    loadingClients.value = false
  }
}

async function loadAccounts() {
  loadingAccounts.value = true
  try {
    const [ml, sh] = await Promise.all([
      api.get('/mercadolivre/accounts/'),
      api.get('/shopee/accounts/'),
    ])
    mlAccounts.value = Array.isArray(ml.data) ? ml.data : (ml.data.results || [])
    shopeeAccounts.value = Array.isArray(sh.data) ? sh.data : (sh.data.results || [])
  } finally {
    loadingAccounts.value = false
  }
}

function openNewClient() {
  newClient.value = freshClient()
  newClientDialog.value = true
  if (!mlAccounts.value.length && !shopeeAccounts.value.length) loadAccounts()
}

async function createClient() {
  saving.value = true
  try {
    const created = await KrivusService.createClient(newClient.value)
    newClientDialog.value = false
    await loadClients()
    $q.notify({ type: 'positive', message: `Cliente "${created.data.nome}" criado!` })
  } catch (e) {
    const detail = e.response?.data
    $q.notify({ type: 'negative', message: detail ? JSON.stringify(detail) : 'Erro ao criar cliente.' })
  } finally {
    saving.value = false
  }
}

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

function statusVariant(s) {
  return { ativo: 'green', pausado: 'amber', encerrado: 'red' }[s] || 'slate'
}

function leadOrigemLabel(value) {
  return leadOrigemOptions.find((o) => o.value === value)?.label || value
}

onMounted(() => {
  loadData()
  loadBilling()
  loadAlerts()
  loadClients()
})
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.krivus-page { background: #f8fafc; }
.krivus-container { max-width: 1100px; margin: 0 auto; padding: $space-6 $space-6 $space-12; }

.section-title { font-size: $text-h3-size; font-weight: $font-semibold; color: $text-primary; margin: $space-8 0 $space-3; }

.stage-funnel { display: flex; flex-wrap: wrap; gap: $space-3; }
.funnel-item {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: $radius-lg;
  padding: $space-3 $space-4;
  min-width: 110px;
  text-align: center;
  text-decoration: none;
  transition: box-shadow $transition-base, transform $transition-base;
}
.funnel-item:hover { box-shadow: $shadow-sm; transform: translateY(-1px); }
.funnel-count { font-size: 20px; font-weight: $font-bold; color: #0f766e; }
.funnel-label { font-size: 11px; color: $text-muted; margin-top: 2px; }

.clients-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: $space-4; }
.client-card { cursor: pointer; }
.client-name { font-size: 15px; font-weight: $font-semibold; color: $text-primary; }
.health-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.meta-label { font-size: 10px; color: $text-disabled; text-transform: uppercase; }
.meta-value { font-size: $text-small-size; font-weight: $font-semibold; color: #334155; }

.color-swatch { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; transition: transform 0.1s; }
.color-swatch:hover { transform: scale(1.15); }

.accounts-checklist { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 0; }

.alert-banner {
  display: flex;
  align-items: center;
  background: $tint-amber-bg;
  border: 1px solid #fde68a;
  border-radius: $radius-lg;
  padding: $space-3 $space-4;
  font-size: $text-small-size;
  color: $tint-amber-text;
  text-decoration: none;
  transition: box-shadow $transition-base;
}
.alert-banner:hover { box-shadow: $shadow-sm; }
</style>
