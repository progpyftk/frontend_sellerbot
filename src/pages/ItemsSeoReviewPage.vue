<template>
  <q-page class="seo-review q-pa-lg">
    <SbPageHeader
      eyebrow="Mercado Livre"
      title="Anúncios · Revisão SEO"
      subtitle="O revisor lê seus anúncios parados ou fracos e aponta o que melhorar em cada um. Você decide: aplica a correção, escala pra depois ou dispensa."
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
      <!-- Como funciona: 3 passos, sempre visível — a página existe pra isso. -->
      <SbCard class="seo-review__how q-mb-lg">
        <div class="seo-review__steps">
          <div class="seo-review__step">
            <div class="seo-review__step-num">1</div>
            <div>
              <div class="seo-review__step-title">Gerar o lote</div>
              <div class="seo-review__step-text">
                O botão audita ao vivo até 30 anúncios <strong>parados</strong> ou <strong>fracos</strong>
                — sem vender ou vendendo muito pouco. Nada é gravado no Mercado Livre nesta etapa.
              </div>
            </div>
          </div>
          <q-icon name="chevron_right" size="20px" class="seo-review__step-arrow" />
          <div class="seo-review__step">
            <div class="seo-review__step-num">2</div>
            <div>
              <div class="seo-review__step-title">Ler a proposta</div>
              <div class="seo-review__step-text">
                Cada linha mostra o que está fraco (descrição curta, atributos, título, fotos) e o que
                o revisor sugere no lugar — sempre com a evidência que justifica a mudança.
              </div>
            </div>
          </div>
          <q-icon name="chevron_right" size="20px" class="seo-review__step-arrow" />
          <div class="seo-review__step">
            <div class="seo-review__step-num">3</div>
            <div>
              <div class="seo-review__step-title">Decidir</div>
              <div class="seo-review__step-text">
                <SbBadge variant="green" icon="bolt">correção segura</SbBadge> você aplica com 1 clique.
                <SbBadge variant="amber" icon="priority_high">decisão do dono</SbBadge> — título, preço e
                fotos — só o revisor aponta; quem muda é você, fora daqui.
              </div>
            </div>
          </div>
        </div>
      </SbCard>

      <!-- Números da fila atual -->
      <SbKpiGrid :columns="4" class="q-mb-lg">
        <SbKpiCard label="Nesta lista" :value="kpis.total" variant="teal" :sub="statusLabel" />
        <SbKpiCard label="Parados" :value="kpis.parado" variant="red" sub="sem venda, sob promoção" />
        <SbKpiCard label="Fracos" :value="kpis.fraco" variant="amber" sub="menos de 1 venda/semana" />
        <SbKpiCard
          label="Prontos p/ aplicar" :value="kpis.autoFixReady" variant="green"
          sub="têm correção segura disponível"
        />
      </SbKpiGrid>

      <div v-if="lastRun" class="seo-review__runbar q-mb-lg">
        <q-icon name="info" size="18px" class="q-mr-xs" />
        Último lote gerado {{ formatDate(lastRun.generated_at) }}: {{ lastRun.selected }} anúncios
        analisados — <strong>{{ lastRun.queued }}</strong> novos, {{ lastRun.refreshed }} atualizados,
        {{ lastRun.skipped_already_decided }} já decididos, {{ lastRun.errors }} com erro.
        Contas: {{ (lastRun.accounts || []).join(', ') || '—' }}.
      </div>

      <div class="seo-review__toolbar q-mb-md">
        <q-btn-toggle
          v-model="statusFilter"
          no-caps unelevated toggle-color="primary" color="grey-3" text-color="grey-9"
          :options="statusOptions"
          @update:model-value="loadQueue"
        />
      </div>

      <SbEmptyState
        v-if="!loading && rows.length === 0"
        variant="empty"
        :title="statusFilter === 'pending' ? 'Fila vazia' : 'Nada aqui'"
        :message="statusFilter === 'pending'
          ? 'Nenhum anúncio pendente de revisão. Clique em “Gerar lote de hoje” para o revisor varrer os anúncios parados/fracos.'
          : 'Nenhum anúncio neste estado.'"
      />

      <q-table
        v-else
        class="seo-review__table"
        :rows="rows"
        :columns="columns"
        :loading="loading"
        row-key="id"
        flat bordered
        :pagination="{ rowsPerPage: 30 }"
        :rows-per-page-options="[30, 50, 100]"
      >
        <template #body="props">
          <q-tr class="seo-review__row" :props="props" @click="toggle(props.row.id)">
            <q-td auto-width>
              <q-icon
                :name="expanded.has(props.row.id) ? 'expand_less' : 'expand_more'"
                size="20px" color="grey-6"
              />
            </q-td>
            <q-td key="health" :props="props">
              <SbBadge :variant="healthVariant(props.row.health)">{{ props.row.health }}</SbBadge>
            </q-td>
            <q-td key="item" :props="props">
              <div class="text-weight-medium ellipsis" style="max-width: 420px">
                {{ props.row.proposal?.titulo || props.row.item_id }}
              </div>
              <div class="text-caption text-grey-7">{{ props.row.item_id }} · {{ props.row.account_nickname }}</div>
            </q-td>
            <q-td key="score" :props="props">
              <span :title="'Score de qualidade do próprio Mercado Livre (0–100, maior é melhor)'">
                {{ props.row.proposal?.score_ml ?? '—' }}
              </span>
            </q-td>
            <q-td key="gaps" :props="props">
              <div class="seo-review__gaps">
                <SbBadge v-for="g in (props.row.proposal?.gaps || [])" :key="g" variant="slate">
                  {{ gapLabel(g) }}
                </SbBadge>
                <span v-if="!(props.row.proposal?.gaps || []).length" class="text-caption text-grey-6">
                  sem lacuna local
                </span>
              </div>
            </q-td>
          </q-tr>

          <q-tr v-if="expanded.has(props.row.id)" :props="props" class="seo-review__detail">
            <q-td colspan="100%">
              <div class="seo-review__meta text-caption text-grey-7 q-mb-md">
                <q-icon :name="props.row.proposal?.tem_referencia ? 'inventory_2' : 'warning_amber'" size="14px" />
                {{ props.row.proposal?.tem_referencia
                  ? 'Tem linha de catálogo — as correções de conteúdo podem ser aplicadas.'
                  : 'Sem linha de catálogo — só dá pra escalar ou dispensar (aplicar apagaria a descrição real).' }}
                · gerado {{ formatDate(props.row.proposal?.generated_at || props.row.updated_at) }}
              </div>

              <div v-if="(props.row.proposal?.propostas || []).length" class="seo-review__cards">
                <div v-for="(p, i) in props.row.proposal.propostas" :key="i" class="seo-review__card">
                  <div class="seo-review__card-head">
                    <span class="seo-review__card-campo">{{ campoLabel(p.campo) }}</span>
                    <SbBadge :variant="classeVariant(p.classe)" :icon="classeIcon(p.classe)">
                      {{ classeLabel(p.classe) }}
                    </SbBadge>
                  </div>
                  <div class="seo-review__diff">
                    <div class="seo-review__diff-atual">
                      <q-icon name="close" size="13px" />
                      <span>{{ p.atual }}</span>
                    </div>
                    <q-icon name="arrow_downward" size="14px" class="seo-review__diff-arrow" />
                    <div class="seo-review__diff-proposto">
                      <q-icon name="check" size="13px" />
                      <span>{{ p.proposto }}</span>
                    </div>
                  </div>
                  <div class="seo-review__card-evidencia">{{ p.evidencia }}</div>
                  <div class="seo-review__card-confianca">confiança: {{ p.confianca }}</div>
                </div>
              </div>
              <div v-else class="text-grey-6">O revisor não achou lacunas locais neste anúncio.</div>

              <div v-if="(props.row.proposal?.ml_pending_rules || []).length" class="q-mt-md">
                <div class="text-caption text-grey-7 q-mb-xs">Pendências apontadas pelo próprio Mercado Livre:</div>
                <div class="seo-review__gaps">
                  <SbBadge v-for="r in props.row.proposal.ml_pending_rules" :key="r.key" variant="sky">
                    {{ r.title || r.key }}
                  </SbBadge>
                </div>
              </div>

              <div class="seo-review__actions q-mt-md">
                <template v-if="statusFilter === 'pending'">
                  <q-btn
                    unelevated color="green-7" no-caps icon="done_all"
                    label="Aplicar correções seguras"
                    :loading="busyRow === props.row.id"
                    :disable="!canApply(props.row) || busyRow !== null"
                    @click="confirmApply(props.row)"
                  />
                  <q-btn
                    outline color="amber-9" no-caps icon="north_east" label="Escalar"
                    :disable="busyRow !== null"
                    @click="rowAction(props.row, 'escalate')"
                  />
                  <q-btn
                    flat color="grey-8" no-caps icon="block" label="Dispensar"
                    :disable="busyRow !== null"
                    @click="rowAction(props.row, 'dismiss')"
                  />
                  <span v-if="!canApply(props.row)" class="text-caption text-grey-6 q-ml-sm">
                    {{ applyHint(props.row) }}
                  </span>
                </template>
                <template v-else>
                  <div v-if="props.row.proposal?.resolution" class="text-caption text-grey-7">
                    {{ resolutionLabel(props.row.proposal.resolution) }}
                  </div>
                  <div v-else-if="props.row.proposal?.applied" class="text-caption text-grey-7">
                    Aplicado {{ formatDate(props.row.proposal.applied.at) }} —
                    {{ (props.row.proposal.applied.fixes || []).join(', ') || 'nada a corrigir' }}
                  </div>
                  <q-btn
                    outline color="primary" no-caps icon="undo" label="Reabrir"
                    :loading="busyRow === props.row.id"
                    :disable="busyRow !== null"
                    @click="rowAction(props.row, 'reopen')"
                  />
                </template>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </template>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbKpiGrid from 'src/components/common/SbKpiGrid.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import MercadoLivreService from 'src/services/MercadoLivreService'

const $q = useQuasar()

const rows = ref([])
const loading = ref(false)
const running = ref(false)
const error = ref('')
const lastRun = ref(null)
const expanded = ref(new Set())
const busyRow = ref(null)
const statusFilter = ref('pending')
const statusOptions = [
  { label: 'Pendentes', value: 'pending' },
  { label: 'Escaladas', value: 'escalated' },
  { label: 'Dispensadas', value: 'dismissed' },
  { label: 'Concluídas', value: 'done' },
]
const statusLabel = computed(() => statusOptions.find((o) => o.value === statusFilter.value)?.label || '')

const columns = [
  { name: 'expand', label: '', field: 'expand' },
  { name: 'health', label: 'Saúde', field: 'health', align: 'left' },
  { name: 'item', label: 'Anúncio', field: 'item_id', align: 'left' },
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
const CLASSE_VARIANTS = { auto_fix: 'green', owner_gate: 'amber', needs_evidence: 'slate' }
const CLASSE_ICONS = { auto_fix: 'bolt', owner_gate: 'priority_high', needs_evidence: 'help_outline' }

const gapLabel = (g) => GAP_LABELS[g] || g
const campoLabel = (c) => CAMPO_LABELS[c] || c
const classeLabel = (c) => CLASSE_LABELS[c] || c
const classeVariant = (c) => CLASSE_VARIANTS[c] || 'slate'
const classeIcon = (c) => CLASSE_ICONS[c] || ''
const healthVariant = (h) => (h === 'parado' ? 'red' : 'amber')
const resolutionLabel = (r) => {
  const who = r.resolution === 'escalado' ? 'Escalado ao dono' : 'Dispensado'
  return `${who} ${formatDate(r.at)}${r.note ? ` — ${r.note}` : ''}`
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const kpis = computed(() => {
  const total = rows.value.length
  const parado = rows.value.filter((r) => r.health === 'parado').length
  const fraco = rows.value.filter((r) => r.health === 'fraco').length
  const autoFixReady = rows.value.filter((r) => canApply(r)).length
  return { total, parado, fraco, autoFixReady }
})

function toggle(id) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

async function loadQueue() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await MercadoLivreService.getSeoReviewQueue({ status: statusFilter.value })
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
    statusFilter.value = 'pending'
    await loadQueue()
  } catch (e) {
    const msg = e?.response?.data?.detail || e?.message || 'Falha ao gerar o lote.'
    error.value = msg
    $q.notify({ type: 'negative', message: msg })
  } finally {
    running.value = false
  }
}

const autoFixCount = (row) => (row.proposal?.propostas || []).filter((p) => p.classe === 'auto_fix').length
const canApply = (row) => Boolean(row.proposal?.tem_referencia) && autoFixCount(row) > 0
function applyHint(row) {
  if (!row.proposal?.tem_referencia) return 'sem linha de catálogo — só escalar ou dispensar'
  if (autoFixCount(row) === 0) return 'só decisões do dono nesta linha — use Escalar'
  return ''
}

function confirmApply(row) {
  $q.dialog({
    title: 'Aplicar correções seguras',
    message: `Vai gravar no Mercado Livre as ${autoFixCount(row)} correção(ões) segura(s) do anúncio `
      + `${row.item_id} (descrição/atributos/fotos com referência de catálogo). `
      + 'Título, preço e fotos sem referência não são tocados. Confirmar?',
    cancel: true,
    ok: { label: 'Aplicar', color: 'green-7', noCaps: true },
  }).onOk(() => applyRow(row))
}

async function applyRow(row) {
  busyRow.value = row.id
  try {
    const { data } = await MercadoLivreService.applySeoReviewRow(row.id)
    const fixes = (data.fixes || []).join(', ') || 'nada a corrigir'
    const escala = (data.escala || []).length
      ? ` Escalado ao dono: ${data.escala.map((e) => e.campo).join(', ')}.` : ''
    $q.notify(
      data.landed
        ? { type: 'positive', icon: 'done_all', message: `Aplicado em ${row.item_id}: ${fixes}.${escala}` }
        : { type: 'warning', icon: 'error_outline', timeout: 6000,
            message: `Gravação parcial em ${row.item_id} (${fixes}). A linha segue pendente — revise.${escala}` },
    )
    await loadQueue()
  } catch (e) {
    $q.notify({ type: 'negative', message: e?.response?.data?.detail || e?.message || 'Falha ao aplicar.' })
  } finally {
    busyRow.value = null
  }
}

async function rowAction(row, action) {
  busyRow.value = row.id
  try {
    await MercadoLivreService.setSeoReviewRowAction(row.id, action)
    $q.notify({ type: 'positive', message: action === 'escalate' ? 'Escalado ao dono.' : 'Linha dispensada.' })
    await loadQueue()
  } catch (e) {
    $q.notify({ type: 'negative', message: e?.response?.data?.detail || e?.message || 'Falha na ação.' })
  } finally {
    busyRow.value = null
  }
}

onMounted(loadQueue)
</script>

<style scoped>
.seo-review__how :deep(.sb-card-body) {
  padding: 18px 22px;
}
.seo-review__steps {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.seo-review__step {
  display: flex;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.seo-review__step-arrow {
  color: #cbd5e1;
  margin-top: 10px;
  flex-shrink: 0;
}
.seo-review__step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #f0fdf9;
  color: #0d9488;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.seo-review__step-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2px;
}
.seo-review__step-text {
  font-size: 12.5px;
  line-height: 1.5;
  color: #475569;
}
.seo-review__step-text .sb-badge {
  margin: 0 2px;
}

.seo-review__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.seo-review__runbar {
  font-size: 13px;
  color: #4b5563;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 10px 14px;
}

.seo-review__row {
  cursor: pointer;
}
.seo-review__row:hover {
  background: #f8fafc;
}
.seo-review__gaps {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.seo-review__meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.seo-review__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}
.seo-review__card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  background: #fff;
}
.seo-review__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.seo-review__card-campo {
  font-weight: 700;
  font-size: 13px;
  color: #0f172a;
}
.seo-review__diff {
  font-size: 13px;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.seo-review__diff-atual,
.seo-review__diff-proposto {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
}
.seo-review__diff-atual {
  color: #991b1b;
  background: #fef2f2;
  text-decoration: line-through;
  text-decoration-color: #fca5a5;
}
.seo-review__diff-atual .q-icon {
  margin-top: 2px;
  flex-shrink: 0;
}
.seo-review__diff-proposto {
  color: #166534;
  background: #f0fdf4;
  font-weight: 500;
}
.seo-review__diff-proposto .q-icon {
  margin-top: 2px;
  flex-shrink: 0;
}
.seo-review__diff-arrow {
  color: #cbd5e1;
  align-self: center;
}
.seo-review__card-evidencia {
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
}
.seo-review__card-confianca {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
  text-transform: capitalize;
}

.seo-review__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
}
.seo-review__detail > td {
  background: #f8fafc;
}
</style>
