<template>
  <q-page class="krivus-page">
    <div class="krivus-container">

      <!-- Page title -->
      <div class="page-header q-mb-lg">
        <div>
          <h1 class="page-title">Visão Geral</h1>
          <p class="page-subtitle">Performance consolidada de todos os clientes Krivus</p>
        </div>
        <div class="row q-gutter-sm">
          <q-select
            v-model="days"
            :options="daysOptions"
            dense
            outlined
            emit-value
            map-options
            style="min-width: 130px"
            @update:model-value="loadData"
          />
          <q-btn color="indigo-6" label="Novo Cliente" icon="add" no-caps unelevated @click="openNewClient" />
        </div>
      </div>

      <!-- Global KPI cards -->
      <div class="kpi-grid q-mb-xl" v-if="!loadingStats">
        <div class="kpi-card">
          <div class="kpi-label">GMV Total</div>
          <div class="kpi-value">{{ formatCurrency(stats.gmv_total) }}</div>
          <div class="kpi-sub">últimos {{ days }} dias</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Pedidos</div>
          <div class="kpi-value">{{ stats.orders_total?.toLocaleString('pt-BR') }}</div>
          <div class="kpi-sub">últimos {{ days }} dias</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Anúncios Ativos</div>
          <div class="kpi-value">{{ stats.active_items_total?.toLocaleString('pt-BR') }}</div>
          <div class="kpi-sub">Mercado Livre</div>
        </div>
        <div class="kpi-card kpi-card--accent">
          <div class="kpi-label">Receita da Krivus</div>
          <div class="kpi-value">{{ formatCurrency(stats.receita_consultoria_mensal) }}</div>
          <div class="kpi-sub">mensalidades ativas</div>
        </div>
      </div>
      <div class="kpi-grid q-mb-xl" v-else>
        <q-skeleton v-for="i in 4" :key="i" height="90px" class="kpi-card" />
      </div>

      <!-- Clients list -->
      <h2 class="section-title q-mb-md">Clientes</h2>

      <div class="clients-grid" v-if="!loadingClients">
        <div
          v-for="client in clients"
          :key="client.slug"
          class="client-card"
          :style="`border-left: 4px solid ${client.cor_hex}`"
          @click="$router.push(`/krivus/${client.slug}`)"
        >
          <div class="row items-center q-mb-sm">
            <div class="client-name">{{ client.nome }}</div>
            <q-space />
            <q-chip
              dense
              :color="statusColor(client.status)"
              text-color="white"
              :label="client.status"
              size="sm"
            />
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
        </div>
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
          <!-- Nome + auto-slug -->
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
            <q-input
              v-model="newClient.data_inicio"
              label="Início do contrato"
              type="date" outlined dense style="flex:1"
            />
            <q-input
              v-model.number="newClient.mensalidade"
              label="Mensalidade (R$)"
              type="number" outlined dense style="flex:1"
            />
          </div>

          <!-- Cor -->
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

          <!-- Contas ML -->
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
                color="orange"
                dense
              />
              <div v-if="!mlAccounts.length" class="text-caption text-grey-4">Nenhuma conta ML conectada.</div>
            </div>
          </div>

          <!-- Contas Shopee -->
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
            unelevated label="Criar Cliente" color="indigo-6"
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

const $q = useQuasar()

const days = ref(30)
const daysOptions = [
  { label: 'Últimos 7 dias', value: 7 },
  { label: 'Últimos 30 dias', value: 30 },
  { label: 'Últimos 90 dias', value: 90 },
]

const coresSugeridas = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']

const stats = ref({})
const clients = ref([])
const mlAccounts = ref([])
const shopeeAccounts = ref([])
const loadingStats = ref(true)
const loadingClients = ref(true)
const loadingAccounts = ref(false)
const newClientDialog = ref(false)
const saving = ref(false)

function freshClient() {
  return { nome: '', slug: '', data_inicio: '', mensalidade: 0, cor_hex: '#6366f1', ml_accounts: [], shopee_accounts: [] }
}
const newClient = ref(freshClient())

function autoSlug(nome) {
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
    mlAccounts.value = ml.data
    shopeeAccounts.value = sh.data
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

function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function statusColor(s) {
  return { ativo: 'positive', pausado: 'warning', encerrado: 'negative' }[s] || 'grey'
}

onMounted(() => {
  loadData()
  loadClients()
})
</script>

<style scoped>
.krivus-page { background: #f8fafc; }
.krivus-container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0; }
.page-subtitle { color: #64748b; font-size: 13px; margin: 4px 0 0; }

.section-title { font-size: 16px; font-weight: 600; color: #1e293b; margin: 0; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.kpi-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}
.kpi-card--accent { border-color: #6366f1; background: #eef2ff; }
.kpi-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.kpi-value { font-size: 26px; font-weight: 700; color: #1e293b; margin: 4px 0; }
.kpi-sub { font-size: 11px; color: #94a3b8; }

.clients-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.client-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
}
.client-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
.client-name { font-size: 16px; font-weight: 600; color: #1e293b; }
.meta-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; }
.meta-value { font-size: 13px; font-weight: 600; color: #334155; }

.color-swatch { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; transition: transform 0.1s; }
.color-swatch:hover { transform: scale(1.15); }

.accounts-checklist { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 0; }
</style>
