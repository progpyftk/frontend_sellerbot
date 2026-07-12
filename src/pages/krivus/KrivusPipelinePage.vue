<template>
  <q-page class="krivus-page">
    <div class="pipeline-container">
      <SbPageHeader
        title="Pipeline"
        subtitle="Arraste os cards entre as colunas para mudar o estágio do cliente"
        icon="view_kanban"
      >
        <template #actions>
          <q-btn color="primary" label="Novo Cliente" icon="add" no-caps unelevated to="/krivus" />
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
              <div class="card-milestone" v-if="c.last_milestone">
                <q-icon name="flag" size="11px" /> {{ c.last_milestone.titulo }}
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
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import KrivusService from 'src/services/KrivusService'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import { computeHealthMap, HEALTH_COLOR, HEALTH_LABEL, healthOf } from 'src/utils/krivusHealth'

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
const loading = ref(true)
const draggingClient = ref(null)

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
    await KrivusService.updateStage(client.slug, newStage)
    $q.notify({ type: 'positive', message: `${client.nome} movido para "${stages.find((s) => s.value === newStage)?.label}"` })
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

onMounted(() => {
  loadClients()
  loadHealth()
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
.card-milestone { font-size: 10.5px; color: $text-disabled; margin-top: 4px; display: flex; align-items: center; gap: 3px; }
</style>
