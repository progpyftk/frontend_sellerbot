<template>
  <q-page class="seo-review q-pa-lg">
    <SbPageHeader
      eyebrow="Mercado Livre"
      title="Anúncios · Revisão SEO"
      subtitle="O revisor aponta os anúncios parados/fracos que valem revisão e o que mudaria em cada um. Leitura apenas — nada é gravado no Mercado Livre."
      icon="fact_check"
    >
      <template #actions>
        <q-btn
          unelevated color="primary" no-caps icon="playlist_add_check"
          :label="running ? 'Gerando lote…' : 'Gerar lote de hoje'"
          :loading="running" @click="runBatch"
        />
        <q-btn
          flat no-caps icon="refresh" label="Recarregar fila"
          :loading="loading" :disable="running" @click="loadQueue"
        />
      </template>
    </SbPageHeader>

    <SbEmptyState
      v-if="error"
      variant="error"
      title="Não foi possível carregar a fila de revisão"
      :message="error"
    >
      <template #action>
        <q-btn unelevated color="primary" no-caps icon="refresh" label="Tentar novamente" @click="loadQueue" />
      </template>
    </SbEmptyState>

    <template v-else>
      <div v-if="lastRun" class="seo-review__runbar q-mb-md">
        <q-icon name="info" size="18px" class="q-mr-xs" />
        Último lote ({{ lastRun.cohort_key }}): {{ lastRun.selected }} anúncios analisados —
        <strong>{{ lastRun.queued }}</strong> novos, {{ lastRun.refreshed }} atualizados,
        {{ lastRun.skipped_already_decided }} já decididos, {{ lastRun.errors }} com erro.
        Contas: {{ (lastRun.accounts || []).join(', ') || '—' }}.
      </div>

      <SbEmptyState
        v-if="!loading && rows.length === 0"
        variant="empty"
        title="Fila vazia"
        message="Nenhum anúncio pendente de revisão. Clique em “Gerar lote de hoje” para o revisor varrer os anúncios parados/fracos."
      />

      <q-table
        v-else
        :rows="rows"
        :columns="columns"
        :loading="loading"
        row-key="id"
        flat bordered
        :pagination="{ rowsPerPage: 30 }"
        :rows-per-page-options="[30, 50, 100]"
      >
        <template #body="props">
          <q-tr :props="props">
            <q-td auto-width>
              <q-btn
                size="sm" flat round dense
                :icon="expanded.has(props.row.id) ? 'expand_less' : 'expand_more'"
                @click="toggle(props.row.id)"
              />
            </q-td>
            <q-td key="health" :props="props">
              <q-chip dense square :color="healthColor(props.row.health)" text-color="white" :label="props.row.health" />
            </q-td>
            <q-td key="item" :props="props">
              <div class="text-weight-medium ellipsis" style="max-width: 420px">
                {{ props.row.proposal?.titulo || props.row.item_id }}
              </div>
              <div class="text-caption text-grey-7">{{ props.row.item_id }} · {{ props.row.account_nickname }}</div>
            </q-td>
            <q-td key="priority" :props="props">{{ props.row.priority }}</q-td>
            <q-td key="score" :props="props">{{ props.row.proposal?.score_ml ?? '—' }}</q-td>
            <q-td key="gaps" :props="props">
              <q-chip
                v-for="g in (props.row.proposal?.gaps || [])" :key="g"
                dense square outline color="deep-orange-8" :label="gapLabel(g)"
              />
              <span v-if="!(props.row.proposal?.gaps || []).length" class="text-grey-6">sem lacuna local</span>
            </q-td>
          </q-tr>

          <q-tr v-if="expanded.has(props.row.id)" :props="props" class="seo-review__detail">
            <q-td colspan="100%">
              <div class="text-caption text-grey-7 q-mb-sm">
                {{ props.row.proposal?.tem_referencia ? 'Com linha de catálogo (referência de conteúdo).' : 'Sem linha de catálogo — completude vira “analisar com evidência”.' }}
                Gerado em {{ props.row.proposal?.generated_at || props.row.updated_at }}.
              </div>

              <div v-if="(props.row.proposal?.propostas || []).length" class="seo-review__cards">
                <div v-for="(p, i) in props.row.proposal.propostas" :key="i" class="seo-review__card">
                  <div class="row items-center q-gutter-xs q-mb-xs">
                    <strong>{{ campoLabel(p.campo) }}</strong>
                    <q-chip dense square :color="classeColor(p.classe)" text-color="white" :label="classeLabel(p.classe)" />
                    <q-chip dense square outline color="grey-8" :label="`confiança: ${p.confianca}`" />
                  </div>
                  <div class="seo-review__diff">
                    <div><span class="text-grey-6">atual:</span> {{ p.atual }}</div>
                    <div><span class="text-grey-6">proposto:</span> {{ p.proposto }}</div>
                  </div>
                  <div class="text-caption text-grey-7 q-mt-xs">{{ p.evidencia }}</div>
                </div>
              </div>
              <div v-else class="text-grey-6">O revisor não achou lacunas locais neste anúncio.</div>

              <div v-if="(props.row.proposal?.ml_pending_rules || []).length" class="q-mt-sm">
                <div class="text-caption text-grey-7">Pendências apontadas pelo próprio Mercado Livre:</div>
                <q-chip
                  v-for="r in props.row.proposal.ml_pending_rules" :key="r.key"
                  dense square outline color="blue-grey-7"
                  :label="r.title || r.key"
                />
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </template>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import MercadoLivreService from 'src/services/MercadoLivreService'

const $q = useQuasar()

const rows = ref([])
const loading = ref(false)
const running = ref(false)
const error = ref('')
const lastRun = ref(null)
const expanded = ref(new Set())

const columns = [
  { name: 'expand', label: '', field: 'expand' },
  { name: 'health', label: 'Saúde', field: 'health', align: 'left' },
  { name: 'item', label: 'Anúncio', field: 'item_id', align: 'left' },
  { name: 'priority', label: 'Prioridade', field: 'priority', align: 'left', sortable: true },
  { name: 'score', label: 'Score ML', field: (r) => r.proposal?.score_ml, align: 'left', sortable: true },
  { name: 'gaps', label: 'Lacunas', field: 'gaps', align: 'left' },
]

const GAP_LABELS = {
  descricao_curta: 'descrição curta',
  atributos: 'atributos',
  titulo: 'título',
  fotos: 'fotos',
  componentes: 'componentes',
  sku: 'SKU',
}
const CAMPO_LABELS = { descricao: 'Descrição', atributos: 'Atributos', titulo: 'Título', fotos: 'Fotos', preco: 'Preço' }
const CLASSE_LABELS = { auto_fix: 'correção segura', owner_gate: 'decisão do dono', needs_evidence: 'precisa de evidência' }

const gapLabel = (g) => GAP_LABELS[g] || g
const campoLabel = (c) => CAMPO_LABELS[c] || c
const classeLabel = (c) => CLASSE_LABELS[c] || c
const healthColor = (h) => (h === 'parado' ? 'red-7' : 'orange-8')
const classeColor = (c) => (c === 'auto_fix' ? 'green-7' : c === 'owner_gate' ? 'deep-orange-8' : 'blue-grey-6')

function toggle(id) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

async function loadQueue() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await MercadoLivreService.getSeoReviewQueue({ status: 'pending' })
    rows.value = data.items || []
  } catch (e) {
    error.value = e?.response?.data?.detail || e?.message || 'Erro ao carregar a fila.'
  } finally {
    loading.value = false
  }
}

async function runBatch() {
  running.value = true
  error.value = ''
  try {
    const { data } = await MercadoLivreService.runSeoReviewBatch({ limit: 30 })
    lastRun.value = data
    $q.notify({
      type: 'positive',
      message: `Lote gerado: ${data.queued} novos, ${data.refreshed} atualizados.`,
      icon: 'playlist_add_check',
    })
    await loadQueue()
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || 'Falha ao gerar o lote.'
    error.value = msg
    $q.notify({ type: 'negative', message: msg })
  } finally {
    running.value = false
  }
}

onMounted(loadQueue)
</script>

<style scoped>
.seo-review__runbar {
  font-size: 13px;
  color: #4b5563;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 8px 12px;
}
.seo-review__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 10px;
}
.seo-review__card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;
}
.seo-review__diff {
  font-size: 13px;
  line-height: 1.5;
}
.seo-review__detail > td {
  background: #f8fafc;
}
</style>
