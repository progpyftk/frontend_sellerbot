<template>
  <q-page class="krivus-page">
    <div class="krivus-container" v-if="client">

      <!-- Client header -->
      <div class="client-header q-mb-lg">
        <div class="row items-center q-gutter-sm">
          <div class="color-dot" :style="`background: ${client.cor_hex}`" />
          <h1 class="page-title">{{ client.nome }}</h1>
          <q-chip dense :color="statusColor(client.status)" text-color="white" :label="client.status" size="sm" />
        </div>
        <div class="row items-center q-gutter-md q-mt-xs">
          <span class="meta-item"><q-icon name="calendar_today" size="14px" /> desde {{ formatDate(client.data_inicio) }}</span>
          <span class="meta-item"><q-icon name="payments" size="14px" /> {{ formatCurrency(client.mensalidade) }}/mês</span>
          <span class="meta-item" v-for="acc in client.ml_accounts_detail" :key="acc.id">
            <q-icon name="store" size="14px" color="orange" /> {{ acc.account_nickname }}
          </span>
          <span class="meta-item" v-for="acc in client.shopee_accounts_detail" :key="acc.id">
            <q-icon name="store" size="14px" color="deep-orange" /> {{ acc.shop_name }}
          </span>
        </div>
      </div>

      <!-- KPI cards -->
      <div class="kpi-grid q-mb-xl">
        <template v-if="!loadingStats">
          <div class="kpi-card">
            <div class="kpi-label">GMV</div>
            <div class="kpi-value">{{ formatCurrency(stats.total_gmv) }}</div>
            <div class="kpi-sub">últimos {{ days }} dias</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Pedidos</div>
            <div class="kpi-value">{{ stats.total_orders?.toLocaleString('pt-BR') || 0 }}</div>
            <div class="kpi-sub">últimos {{ days }} dias</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Anúncios Ativos</div>
            <div class="kpi-value">{{ stats.ml?.active_items?.toLocaleString('pt-BR') || 0 }}</div>
            <div class="kpi-sub">Mercado Livre</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Gasto Ads</div>
            <div class="kpi-value">{{ formatCurrency(stats.ml?.ads_cost) }}</div>
            <div class="kpi-sub">
              ROAS {{ stats.ml?.ads_roas ? stats.ml.ads_roas + 'x' : '—' }}
            </div>
          </div>
        </template>
        <q-skeleton v-else v-for="i in 4" :key="i" height="90px" class="kpi-card" />
      </div>

      <!-- Roadmap -->
      <div class="section-header q-mb-md">
        <h2 class="section-title">Roadmap</h2>
        <div class="row q-gutter-sm">
          <q-select
            v-model="days"
            :options="daysOptions"
            dense outlined emit-value map-options
            style="min-width: 130px"
            @update:model-value="loadStats"
          />
          <q-btn unelevated color="indigo-6" label="Novo Marco" icon="add" no-caps size="sm" @click="openNewMilestone" />
        </div>
      </div>

      <!-- Timeline -->
      <div class="timeline-wrapper q-mb-xl" v-if="milestones.length">
        <div class="timeline-track" />
        <div
          v-for="(m, idx) in milestones"
          :key="m.id"
          class="milestone-item"
          :class="{ 'milestone-item--active': activeMilestone?.id === m.id }"
          @click="openMilestone(m)"
        >
          <div class="milestone-dot" :style="`background: ${categoriaColor(m.categoria)}`" />
          <div class="milestone-card">
            <div class="milestone-date">{{ formatDate(m.data) }}</div>
            <div class="milestone-title">{{ m.titulo }}</div>
            <q-chip dense :style="`background: ${categoriaColor(m.categoria)}22; color: ${categoriaColor(m.categoria)}`" :label="m.categoria" size="xs" />
            <div class="milestone-docs q-mt-xs" v-if="m.document_count > 0">
              <q-icon name="description" size="12px" color="grey-5" />
              <span class="q-ml-xs text-grey-6" style="font-size:11px">{{ m.document_count }} doc(s)</span>
            </div>
          </div>
        </div>
      </div>
      <div class="empty-state q-mb-xl" v-else-if="!loadingMilestones">
        <q-icon name="timeline" size="40px" color="grey-4" />
        <p class="text-grey-5 q-mt-sm">Nenhum marco ainda. Adicione o primeiro!</p>
      </div>

    </div>

    <div class="krivus-container" v-else-if="loading">
      <q-skeleton height="40px" class="q-mb-md" />
      <div class="kpi-grid q-mb-xl">
        <q-skeleton v-for="i in 4" :key="i" height="90px" />
      </div>
    </div>

    <!-- Milestone Drawer -->
    <q-drawer
      v-model="drawerOpen"
      side="right"
      :width="520"
      elevated
      class="milestone-drawer"
    >
      <div class="drawer-inner q-pa-lg" v-if="activeMilestone">
        <!-- Drawer header -->
        <div class="row items-center q-mb-lg">
          <q-btn flat round icon="close" color="grey-6" @click="drawerOpen = false" />
          <q-space />
          <q-btn flat round icon="delete" color="negative" @click="confirmDeleteMilestone" />
          <q-btn unelevated color="indigo-6" label="Salvar" size="sm" :loading="savingMilestone" @click="saveMilestone" />
        </div>

        <!-- Title -->
        <q-input
          v-model="activeMilestone.titulo"
          borderless
          class="milestone-title-input q-mb-sm"
          placeholder="Título do marco"
          input-style="font-size:20px; font-weight:700; color:#1e293b"
        />

        <!-- Meta row -->
        <div class="row q-gutter-sm q-mb-lg items-center">
          <q-input v-model="activeMilestone.data" type="date" dense outlined style="width:150px" />
          <q-select
            v-model="activeMilestone.categoria"
            :options="categoriaOptions"
            emit-value map-options dense outlined style="width:160px"
          />
        </div>

        <!-- Description -->
        <div class="q-mb-lg">
          <div class="drawer-label q-mb-sm">Notas</div>
          <q-input
            v-model="activeMilestone.descricao"
            type="textarea"
            outlined
            dense
            autogrow
            placeholder="Descrição ou notas do marco..."
          />
        </div>

        <!-- Documents -->
        <div class="q-mb-md">
          <div class="row items-center q-mb-sm">
            <div class="drawer-label">Documentos</div>
            <q-space />
            <q-btn flat size="sm" icon="add" label="Novo doc" color="indigo-6" no-caps @click="openNewDoc" />
            <q-btn flat size="sm" icon="file_copy" label="Do template" color="grey-7" no-caps @click="openTemplateDialog" />
          </div>

          <div v-if="milestoneDocuments.length" class="doc-list">
            <div
              v-for="doc in milestoneDocuments"
              :key="doc.id"
              class="doc-item row items-center"
              @click="openDocument(doc)"
            >
              <q-icon :name="docIcon(doc.tipo)" size="18px" color="indigo-5" class="q-mr-sm" />
              <div>
                <div class="doc-title">{{ doc.titulo }}</div>
                <div class="doc-meta">{{ doc.tipo }} · {{ doc.status }}</div>
              </div>
              <q-space />
              <q-icon name="chevron_right" color="grey-4" />
            </div>
          </div>
          <div class="text-grey-5 text-caption" v-else>Nenhum documento neste marco.</div>
        </div>
      </div>
    </q-drawer>

    <!-- Document Editor Dialog -->
    <q-dialog v-model="docDialogOpen" full-width>
      <q-card style="max-width: 860px; width: 100%">
        <q-card-section class="row items-center q-pb-none">
          <q-input v-model="activeDoc.titulo" borderless placeholder="Título do documento" style="font-size:18px; font-weight:600; flex:1" />
          <q-chip :label="activeDoc.tipo" dense color="indigo-1" text-color="indigo-8" />
          <q-btn flat round icon="close" color="grey" v-close-popup />
        </q-card-section>
        <q-card-section>
          <TipTapEditor v-model="activeDoc.content" placeholder="Escreva o documento aqui..." />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Rascunho" color="grey" @click="saveDoc('rascunho')" />
          <q-btn unelevated label="Finalizar" color="indigo-6" @click="saveDoc('finalizado')" :loading="savingDoc" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Template picker Dialog -->
    <q-dialog v-model="templateDialogOpen">
      <q-card style="min-width: 380px">
        <q-card-section>
          <div class="text-h6">Criar do template</div>
        </q-card-section>
        <q-card-section>
          <q-list bordered separator>
            <q-item
              v-for="t in templates"
              :key="t.id"
              clickable
              @click="instantiateTemplate(t)"
            >
              <q-item-section avatar>
                <q-icon :name="docIcon(t.tipo)" color="indigo-5" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ t.nome }}</q-item-label>
                <q-item-label caption>{{ t.tipo }} · v{{ t.versao }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import KrivusService from 'src/services/KrivusService'
import TipTapEditor from 'src/components/krivus/TipTapEditor.vue'

const route = useRoute()
const $q = useQuasar()

const client = ref(null)
const stats = ref({})
const milestones = ref([])
const milestoneDocuments = ref([])
const templates = ref([])
const loading = ref(true)
const loadingStats = ref(true)
const loadingMilestones = ref(true)
const days = ref(30)
const daysOptions = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
]

const drawerOpen = ref(false)
const activeMilestone = ref(null)
const savingMilestone = ref(false)

const docDialogOpen = ref(false)
const activeDoc = ref({ titulo: '', tipo: 'outro', content: {}, status: 'rascunho' })
const savingDoc = ref(false)

const templateDialogOpen = ref(false)

const categoriaOptions = [
  { label: 'Onboarding', value: 'onboarding' },
  { label: 'Contrato', value: 'contrato' },
  { label: 'Lançamento', value: 'lancamento' },
  { label: 'Conquista', value: 'conquista' },
  { label: 'Reunião', value: 'reuniao' },
  { label: 'Encerramento', value: 'encerramento' },
  { label: 'Outro', value: 'outro' },
]

const categoriaColors = {
  onboarding: '#6366f1', contrato: '#0ea5e9', lancamento: '#10b981',
  conquista: '#f59e0b', reuniao: '#8b5cf6', encerramento: '#ef4444', outro: '#94a3b8',
}

function categoriaColor(cat) { return categoriaColors[cat] || '#94a3b8' }
function statusColor(s) { return { ativo: 'positive', pausado: 'warning', encerrado: 'negative' }[s] || 'grey' }
function docIcon(tipo) { return { contrato: 'gavel', proposta: 'handshake', relatorio: 'bar_chart', nf: 'receipt', outro: 'description' }[tipo] || 'description' }
function formatCurrency(v) {
  if (!v && v !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

async function loadClient() {
  loading.value = true
  try {
    const res = await KrivusService.getClient(route.params.slug)
    client.value = res.data
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  loadingStats.value = true
  try {
    const res = await KrivusService.getClientStats(route.params.slug, days.value)
    stats.value = res.data
  } finally {
    loadingStats.value = false
  }
}

async function loadMilestones() {
  loadingMilestones.value = true
  try {
    const res = await KrivusService.getMilestones(route.params.slug)
    milestones.value = res.data
  } finally {
    loadingMilestones.value = false
  }
}

async function loadTemplates() {
  try {
    const res = await KrivusService.getTemplates()
    templates.value = res.data
  } catch {}
}

async function loadMilestoneDocuments(milestoneId) {
  try {
    const res = await KrivusService.getDocuments(route.params.slug, milestoneId)
    milestoneDocuments.value = res.data
  } catch {}
}

function openMilestone(m) {
  activeMilestone.value = { ...m }
  drawerOpen.value = true
  loadMilestoneDocuments(m.id)
}

function openNewMilestone() {
  const today = new Date().toISOString().split('T')[0]
  activeMilestone.value = { titulo: '', data: today, categoria: 'outro', descricao: '', ordem: 0 }
  milestoneDocuments.value = []
  drawerOpen.value = true
}

async function saveMilestone() {
  savingMilestone.value = true
  try {
    if (activeMilestone.value.id) {
      await KrivusService.updateMilestone(route.params.slug, activeMilestone.value.id, activeMilestone.value)
    } else {
      await KrivusService.createMilestone(route.params.slug, activeMilestone.value)
    }
    await loadMilestones()
    $q.notify({ type: 'positive', message: 'Marco salvo!' })
  } finally {
    savingMilestone.value = false
  }
}

function confirmDeleteMilestone() {
  $q.dialog({
    title: 'Deletar marco',
    message: `Deletar "${activeMilestone.value.titulo}"? Esta ação não pode ser desfeita.`,
    cancel: true, persistent: true,
  }).onOk(async () => {
    await KrivusService.deleteMilestone(route.params.slug, activeMilestone.value.id)
    drawerOpen.value = false
    await loadMilestones()
  })
}

function openNewDoc() {
  activeDoc.value = { titulo: '', tipo: 'outro', content: {}, status: 'rascunho', milestone: activeMilestone.value?.id }
  docDialogOpen.value = true
}

function openDocument(doc) {
  activeDoc.value = { ...doc }
  docDialogOpen.value = true
}

async function saveDoc(status) {
  savingDoc.value = true
  try {
    const payload = { ...activeDoc.value, status, client: client.value.id }
    if (activeDoc.value.id) {
      await KrivusService.updateDocument(route.params.slug, activeDoc.value.id, payload)
    } else {
      await KrivusService.createDocument(route.params.slug, payload)
    }
    docDialogOpen.value = false
    if (activeMilestone.value?.id) await loadMilestoneDocuments(activeMilestone.value.id)
    await loadMilestones()
    $q.notify({ type: 'positive', message: 'Documento salvo!' })
  } finally {
    savingDoc.value = false
  }
}

function openTemplateDialog() {
  templateDialogOpen.value = true
}

async function instantiateTemplate(template) {
  templateDialogOpen.value = false
  try {
    const res = await KrivusService.instantiateTemplate(template.id, route.params.slug, activeMilestone.value?.id)
    activeDoc.value = res.data
    docDialogOpen.value = true
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao carregar template.' })
  }
}

watch(() => route.params.slug, () => {
  loadClient()
  loadStats()
  loadMilestones()
  drawerOpen.value = false
})

onMounted(() => {
  loadClient()
  loadStats()
  loadMilestones()
  loadTemplates()
})
</script>

<style scoped>
.krivus-page { background: #f8fafc; }
.krivus-container { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }

.color-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.page-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0; }
.meta-item { font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 4px; }
.section-title { font-size: 16px; font-weight: 600; color: #1e293b; margin: 0; }
.section-header { display: flex; align-items: center; justify-content: space-between; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.kpi-card { background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #e2e8f0; }
.kpi-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.kpi-value { font-size: 26px; font-weight: 700; color: #1e293b; margin: 4px 0; }
.kpi-sub { font-size: 11px; color: #94a3b8; }

/* Timeline */
.timeline-wrapper {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 24px 0;
}
.timeline-track {
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  height: 2px;
  background: #e2e8f0;
  z-index: 0;
}
.milestone-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 1;
  min-width: 140px;
  max-width: 180px;
}
.milestone-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px currentColor;
  flex-shrink: 0;
  margin-bottom: 10px;
}
.milestone-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  transition: box-shadow 0.15s, border-color 0.15s;
  width: 100%;
}
.milestone-item--active .milestone-card,
.milestone-item:hover .milestone-card {
  border-color: #6366f1;
  box-shadow: 0 2px 12px rgba(99,102,241,0.12);
}
.milestone-date { font-size: 11px; color: #94a3b8; }
.milestone-title { font-size: 13px; font-weight: 600; color: #1e293b; margin: 2px 0; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px 0; }

/* Drawer */
.milestone-drawer { background: #fff; }
.drawer-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.milestone-title-input { font-size: 20px; }

.doc-list { display: flex; flex-direction: column; gap: 8px; }
.doc-item {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;
}
.doc-item:hover { background: #f8fafc; }
.doc-title { font-size: 13px; font-weight: 500; color: #1e293b; }
.doc-meta { font-size: 11px; color: #94a3b8; }
</style>
