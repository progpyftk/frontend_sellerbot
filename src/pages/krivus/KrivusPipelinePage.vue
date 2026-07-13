<template>
  <q-page class="krivus-page">
    <div class="pipeline-container">
      <SbPageHeader
        title="Pipeline"
        subtitle="Arraste os cards entre as colunas para mudar o estágio do cliente"
        icon="view_kanban"
      >
        <template #actions>
          <q-btn color="primary" label="Novo Cliente" icon="add" no-caps unelevated @click="newClientDialog = true" />
        </template>
      </SbPageHeader>

      <div class="board" v-if="!loading">
        <div
          v-for="stage in stages"
          :key="stage.value"
          class="column"
          @dragover.prevent
          @drop="onDrop(stage.value)"
        >
          <div class="column-header">
            <span class="column-title">{{ stage.label }}</span>
            <span class="column-count">{{ clientsByStage[stage.value]?.length || 0 }}</span>
          </div>

          <div class="column-body">
            <div
              v-for="c in clientsByStage[stage.value]"
              :key="c.slug"
              class="client-card"
              draggable="true"
              @dragstart="onDragStart(c)"
              @click="$router.push(`/krivus/${c.slug}`)"
            >
              <div class="card-top">
                <div class="color-dot" :style="`background:${c.cor_hex}`" />
                <div class="card-name">{{ c.nome }}</div>
                <div class="health-dot" :style="`background:${healthColorOf(c.slug)}`">
                  <q-tooltip>{{ healthLabelOf(c.slug) }}</q-tooltip>
                </div>
              </div>
              <div class="card-meta" v-if="c.current_stage === 'lead' || c.current_stage === 'proposta_enviada'">
                <span v-if="c.valor_proposta_enviada">{{ formatCurrency(c.valor_proposta_enviada) }}</span>
                <span v-if="c.lead_origem" class="q-ml-xs">· {{ c.lead_origem }}</span>
              </div>
              <div class="card-meta" v-else>{{ formatCurrency(c.mensalidade) }}/mês</div>

              <!-- Documentos da etapa atual: PDF a um clique do Kanban -->
              <div class="card-docs" v-if="c.current_stage_documents?.length">
                <div
                  v-for="doc in c.current_stage_documents"
                  :key="doc.id"
                  class="card-doc"
                  :class="{ 'card-doc--rascunho': doc.status === 'rascunho' }"
                  @click.stop="downloadDocPdf(c, doc)"
                >
                  <q-icon name="picture_as_pdf" size="12px" />
                  <span class="card-doc-title">{{ doc.titulo }}</span>
                  <q-tooltip>{{ doc.status === 'rascunho' ? 'Rascunho — ' : '' }}Baixar PDF</q-tooltip>
                </div>
              </div>

              <div class="card-footer">
                <div class="card-milestone" v-if="c.last_milestone">
                  <q-icon name="flag" size="11px" /> {{ c.last_milestone.titulo }}
                </div>
                <q-space />
                <q-btn
                  flat round dense size="xs" icon="post_add" color="grey-5"
                  @click.stop="openWizard(c)"
                >
                  <q-tooltip>Gerar documento</q-tooltip>
                </q-btn>
              </div>
            </div>

            <div v-if="!clientsByStage[stage.value]?.length" class="column-empty">Vazio</div>
          </div>
        </div>
      </div>

      <div class="board" v-else>
        <q-skeleton v-for="i in 4" :key="i" height="400px" width="260px" class="q-mr-md" />
      </div>
    </div>

    <KrivusNewClientDialog v-model="newClientDialog" @created="loadClients" />

    <KrivusDocWizard
      ref="wizardRef"
      v-model="wizardOpen"
      :client="wizardClient"
      :templates="templates"
      :preset-tipo="wizardPresetTipo"
      @created="loadClients"
      @client-updated="onClientUpdated"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import KrivusService from 'src/services/KrivusService'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import KrivusNewClientDialog from 'src/components/krivus/KrivusNewClientDialog.vue'
import KrivusDocWizard from 'src/components/krivus/KrivusDocWizard.vue'
import { computeHealthMap, HEALTH_COLOR, HEALTH_LABEL, healthOf } from 'src/utils/krivusHealth'
import { STAGE_TEMPLATE_MAP } from 'src/utils/krivusVariables'

const $q = useQuasar()

const stages = [
  { value: 'lead', label: 'Lead' },
  { value: 'proposta_enviada', label: 'Proposta Enviada' },
  { value: 'contrato_assinado', label: 'Contrato Assinado' },
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'setup_implementacao', label: 'Setup & Implementação' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'gestao_continua', label: 'Gestão Contínua' },
  { value: 'encerrado', label: 'Encerrado' },
]

const clients = ref([])
const healthMap = ref({})
const templates = ref([])
const loading = ref(true)
const draggingClient = ref(null)
const newClientDialog = ref(false)

const wizardRef = ref(null)
const wizardOpen = ref(false)
const wizardClient = ref(null)
const wizardPresetTipo = ref(null)

const clientsByStage = computed(() => {
  const map = {}
  for (const stage of stages) map[stage.value] = []
  for (const c of clients.value) {
    if (map[c.current_stage]) map[c.current_stage].push(c)
  }
  return map
})

function healthColorOf(slug) { return HEALTH_COLOR[healthOf(healthMap.value, slug)] }
function healthLabelOf(slug) { return HEALTH_LABEL[healthOf(healthMap.value, slug)] }

function formatCurrency(v) {
  if (!v && v !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

async function openWizard(client, presetTipo = null) {
  wizardClient.value = client
  wizardPresetTipo.value = presetTipo
  wizardOpen.value = true
  await nextTick()
  wizardRef.value?.start()
}

function onClientUpdated(updated) {
  const idx = clients.value.findIndex((c) => c.slug === updated.slug)
  if (idx >= 0) clients.value[idx] = { ...clients.value[idx], ...updated }
}

async function downloadDocPdf(client, doc) {
  try {
    const res = await KrivusService.downloadDocumentPdf(client.slug, doc.id)
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(blobUrl, '_blank')
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao gerar PDF.' })
  }
}

function onDragStart(client) {
  draggingClient.value = client
}

async function onDrop(newStage) {
  const client = draggingClient.value
  draggingClient.value = null
  if (!client || client.current_stage === newStage) return

  const previousStage = client.current_stage
  client.current_stage = newStage // otimista

  try {
    const res = await KrivusService.updateStage(client.slug, newStage)
    Object.assign(client, res.data)
    const stageLabel = stages.find((s) => s.value === newStage)?.label

    // Etapa com documento padrão? Oferece gerar na hora, sem obrigar.
    const templateTipo = STAGE_TEMPLATE_MAP[newStage]
    const template = templateTipo && templates.value.find((t) => t.tipo === templateTipo)
    if (template) {
      $q.notify({
        type: 'positive',
        message: `${client.nome} movido para "${stageLabel}"`,
        timeout: 6000,
        actions: [{
          label: `Gerar ${template.nome}`,
          color: 'white',
          noCaps: true,
          handler: () => openWizard(client, templateTipo),
        }],
      })
    } else {
      $q.notify({ type: 'positive', message: `${client.nome} movido para "${stageLabel}"` })
    }
  } catch (e) {
    client.current_stage = previousStage // desfaz em caso de erro
    $q.notify({ type: 'negative', message: 'Erro ao mover cliente.' })
  }
}

async function loadClients() {
  loading.value = true
  try {
    const res = await KrivusService.getClients()
    clients.value = res.data
  } finally {
    loading.value = false
  }
}

async function loadHealth() {
  try {
    const res = await KrivusService.getAlerts()
    healthMap.value = computeHealthMap(res.data.alerts)
  } catch { /* noop */ }
}

async function loadTemplates() {
  try {
    const res = await KrivusService.getTemplates()
    templates.value = res.data
  } catch { /* noop */ }
}

onMounted(() => {
  loadClients()
  loadHealth()
  loadTemplates()
})
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.krivus-page { background: #f8fafc; }
.pipeline-container { max-width: 100%; padding: $space-6; }

.board {
  display: flex;
  gap: $space-4;
  overflow-x: auto;
  padding-bottom: $space-4;
}

.column {
  flex: 0 0 260px;
  background: #f1f5f9;
  border-radius: $radius-lg;
  padding: $space-3;
  min-height: 200px;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-1 $space-3;
}
.column-title { font-size: $text-small-size; font-weight: $font-semibold; color: $text-primary; }
.column-count {
  font-size: 11px; font-weight: 700; color: $text-muted;
  background: #e2e8f0; border-radius: 999px; padding: 1px 8px;
}

.column-body { display: flex; flex-direction: column; gap: $space-2; min-height: 60px; }
.column-empty { text-align: center; font-size: 11px; color: $text-disabled; padding: $space-4 0; }

.client-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: $radius-md;
  padding: $space-3;
  cursor: grab;
  transition: box-shadow $transition-base, transform $transition-base;
}
.client-card:hover { box-shadow: $shadow-sm; transform: translateY(-1px); }
.client-card:active { cursor: grabbing; }

.card-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.color-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.card-name { font-size: $text-small-size; font-weight: $font-semibold; color: $text-primary; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.health-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.card-meta { font-size: 11px; color: $text-muted; }

.card-docs { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; }
.card-doc {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: #0f766e;
  background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: $radius-sm;
  padding: 2px 6px; cursor: pointer;
  transition: background $transition-fast;
}
.card-doc:hover { background: #ccfbf1; }
.card-doc--rascunho { color: $text-muted; background: #f8fafc; border-color: #e2e8f0; }
.card-doc-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.card-footer { display: flex; align-items: center; margin-top: 4px; }
.card-milestone { font-size: 10.5px; color: $text-disabled; display: flex; align-items: center; gap: 3px; }
</style>
