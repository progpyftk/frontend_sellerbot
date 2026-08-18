<template>
  <q-page class="fp-page">
    <header class="fp-page-header">
      <div>
        <span class="fp-eyebrow">MERCADO LIVRE · PLANEJAMENTO FULL</span>
        <h1>O que enviar, quanto e quando</h1>
        <p>O SellerBot analisa todo o catálogo — inclusive anúncios que ainda não estão no Full — e monta as próximas ondas de envio.</p>
      </div>
      <span v-if="!canWrite" class="fp-readonly"><q-icon name="visibility" /> Modo consulta</span>
    </header>

    <div v-if="error" class="fp-error" role="alert">
      <q-icon name="error_outline" /><span><strong>Não foi possível concluir</strong>{{ error }}</span><q-btn flat round dense icon="close" @click="error = ''" />
    </div>

    <section class="fp-planner">
      <div class="fp-planner__intro">
        <span class="fp-eyebrow">GERAR NOVO PLANO</span>
        <h2>Como você consegue operar os envios?</h2>
        <p>A frequência define o tamanho dos lotes e as datas possíveis. Quanto mais frequente, menores tendem a ser os envios.</p>
      </div>
      <div class="fp-planner__fields">
        <q-select v-model="accountId" :options="accountOptions" emit-value map-options outlined label="Conta Mercado Livre" :loading="loading.initialize" :disable="loading.generate" @update:model-value="flow.selectAccount" />
        <q-input v-model.number="parameters.frequencyDays" type="number" min="1" max="90" suffix="dias" outlined label="Frequência dos envios" hint="Ex.: toda semana = 7 dias" :disable="loading.generate" :error="parameters.frequencyDays < 1 || parameters.frequencyDays > 90" error-message="Informe de 1 a 90 dias." />
        <q-input v-model="parameters.nextDispatchDate" type="date" :min="today" outlined label="Próximo despacho" stack-label :disable="loading.generate" :error="Boolean(parameters.nextDispatchDate && parameters.nextDispatchDate < today)" error-message="O despacho não pode estar no passado." />
        <q-btn unelevated color="primary" no-caps icon="auto_awesome" label="Gerar plano de envios" :loading="loading.generate" :disable="!canGenerate" @click="generate" />
      </div>
      <div class="fp-planner__history">
        <span><q-icon name="verified" /> Dados conectados do ML, vendas, Ads, CMV e ERP</span>
        <q-btn-dropdown v-if="history.length" flat dense no-caps icon="history" label="Planos anteriores" :disable="loading.generate">
          <q-list style="min-width: 310px">
            <q-item v-for="row in history" :key="row.id" clickable v-close-popup @click="flow.openPlan(row.id)">
              <q-item-section><q-item-label>{{ formatDate(row.next_dispatch_date) }} · a cada {{ row.frequency_days }} dias</q-item-label><q-item-label caption>{{ statusLabel(row.status) }} · {{ row.summary?.actionable_lines || 0 }} ações</q-item-label></q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </section>

    <section v-if="isGenerating" class="fp-generation-state">
      <q-spinner-dots color="primary" size="44px" />
      <div><strong>Analisando todos os anúncios e variações...</strong><span>Estamos cruzando demanda, margem após Ads quando atribuível, estoque, frequência, desempenho e excesso de cobertura.</span></div>
    </section>

    <section v-else-if="!plan" class="fp-welcome">
      <div class="fp-welcome__visual"><q-icon name="route" /></div>
      <div><span class="fp-eyebrow">UMA LISTA OPERACIONAL, NÃO UMA PLANILHA</span><h2>Defina sua frequência e peça o plano</h2><p>Você receberá as reposições, os anúncios que devem começar no Full, a quantidade e o prazo de cada envio.</p></div>
      <ol><li><strong>1</strong><span>Todo o catálogo é analisado</span></li><li><strong>2</strong><span>A estratégia muda com os indicadores</span></li><li><strong>3</strong><span>Cada quantidade é explicada</span></li></ol>
    </section>

    <template v-else-if="isReady">
      <div class="fp-plan-context">
        <span>Plano #{{ plan.id }}</span><span><q-icon name="event" /> Próximo despacho {{ formatDate(plan.next_dispatch_date) }}</span><span><q-icon name="repeat" /> A cada {{ plan.frequency_days }} dias</span><span><q-icon name="schedule" /> Dados até {{ formatDate(plan.source_snapshot?.as_of) }}</span>
      </div>

      <section v-if="parametersChanged" class="fp-plan-alert fp-plan-alert--stale" role="alert">
        <q-icon name="update" /><span><strong>Os parâmetros foram alterados</strong>Este resultado continua preservado, mas revisão e execução ficam bloqueadas até gerar um novo plano.</span>
      </section>
      <section v-for="alert in planAlerts" :key="alert.key" class="fp-plan-alert" role="status">
        <q-icon :name="alert.icon" /><span><strong>{{ alert.title }}</strong>{{ alert.text }}</span>
      </section>

      <FulfillmentStrategyBanner :strategy="plan.strategy" @explain="strategyOpen = true" />
      <FulfillmentPlanSummary :summary="plan.summary" :active-actions="selectedActions" @filter="filterAction" />

      <section class="fp-results">
        <header class="fp-results__header">
          <div><span class="fp-eyebrow">AGENDA RECOMENDADA</span><h2>Anúncios e quantidades por ciclo</h2><p>{{ pagination.total.toLocaleString('pt-BR') }} resultado(s) no filtro atual.</p></div>
          <div class="fp-results__status"><span :class="`fp-status fp-status--${plan.status}`">{{ statusLabel(plan.status) }}</span></div>
        </header>
        <div class="fp-toolbar">
          <q-input v-model="search" outlined dense clearable debounce="400" placeholder="Buscar produto, SKU ou MLB" class="fp-search" @update:model-value="flow.applyFilters"><template #prepend><q-icon name="search" /></template></q-input>
          <q-select v-model="selectedActions" :options="actionOptions" multiple emit-value map-options outlined dense label="Ações" class="fp-action-filter" @update:model-value="flow.applyFilters"><template #selected-item="scope"><q-chip dense removable @remove="scope.removeAtIndex(scope.index)">{{ scope.opt.label }}</q-chip></template></q-select>
        </div>
        <FulfillmentPlanLines :lines="lines" :pagination="pagination" :loading="loading.lines" @select="openLine" @page="flow.changePage" />
      </section>

      <section v-if="canWrite && !parametersChanged" class="fp-execution">
        <div><span class="fp-eyebrow">PRÓXIMA AÇÃO</span><h2>{{ executionTitle }}</h2><p>{{ executionHelper }}</p></div>
        <div class="fp-execution__actions">
          <q-btn v-if="['ready', 'ready_with_warnings'].includes(plan.status)" unelevated color="primary" no-caps icon="fact_check" label="Confirmar revisão" :loading="loading.action" @click="review" />
          <q-btn v-else-if="plan.status === 'reviewed'" unelevated color="primary" no-caps icon="download" label="Baixar checklist" :loading="loading.action" @click="exportPlan" />
          <template v-else-if="plan.status === 'exported'">
            <q-input v-model="submissionReference" outlined dense label="Referência do envio no ML (opcional)" />
            <q-btn unelevated color="primary" no-caps icon="check_circle" label="Registrar criação no ML" :loading="loading.action" @click="submitPlan" />
          </template>
          <q-btn :href="MERCADO_LIVRE_FULL_URL" target="_blank" rel="noopener noreferrer" outline color="primary" no-caps icon-right="open_in_new" label="Abrir Planejamento do ML" />
        </div>
      </section>
    </template>

    <section v-else-if="plan?.status === 'generating'" class="fp-generation-state fp-generation-state--pending">
      <q-icon name="schedule" size="42px" /><div><strong>O plano continua sendo calculado</strong><span>Você pode sair desta tela e voltar depois; o processamento permanece no servidor.</span></div><q-btn outline color="primary" no-caps label="Atualizar status" :loading="loading.lines" @click="flow.refreshPlan" />
    </section>

    <section v-else-if="plan?.status === 'failed'" class="fp-generation-state fp-generation-state--failed">
      <q-icon name="error_outline" size="42px" /><div><strong>Este plano não pôde ser gerado</strong><span>{{ plan.error_detail || 'Gere uma nova versão para tentar novamente.' }}</span></div>
    </section>

    <FulfillmentPlanLineDialog v-model="lineOpen" :line="selectedLine" :adjustments="selectedAdjustments" :can-write="canWrite" :editable="!parametersChanged && ['ready', 'ready_with_warnings'].includes(plan?.status)" :saving="loading.adjust" @adjust="adjust" />

    <q-dialog v-model="strategyOpen">
      <q-card class="fp-strategy-dialog">
        <q-card-section><span class="fp-eyebrow">RACIOCÍNIO DA ESTRATÉGIA</span><h2>{{ strategyMeta(plan?.strategy?.regime).label }}</h2><p>{{ plan?.strategy?.rationale }}</p></q-card-section>
        <q-card-section class="fp-strategy-dialog__grid">
          <article><q-icon name="query_stats" /><strong>Demanda</strong><span>O modelo é escolhido por backtest entre ritmo recente, médias, tendência e demanda intermitente.</span></article>
          <article><q-icon name="payments" /><strong>Economia</strong><span>Margem após Ads, quando atribuível, pode bloquear o envio; ticket ajuda a ordenar as prioridades.</span></article>
          <article><q-icon name="warehouse" /><strong>Estoque e cobertura</strong><span>Saldo Full, estoque ERP, operações, ruptura e excesso mudam ação e prioridade. Espaço oficial desconhecido vira alerta.</span></article>
          <article><q-icon name="event_repeat" /><strong>Frequência</strong><span>O ciclo informado determina até quatro ondas, lote e prazo de despacho.</span></article>
        </q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps label="Entendi" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'
import { useStore } from 'src/stores/store'
import { useFulfillmentShipmentPlan } from 'src/composables/useFulfillmentShipmentPlan'
import { ACTIONS, formatDate, localISODate, strategyMeta } from 'src/utils/fulfillmentPlan'
import FulfillmentPlanLineDialog from 'src/components/fulfillment-plan/FulfillmentPlanLineDialog.vue'
import FulfillmentPlanLines from 'src/components/fulfillment-plan/FulfillmentPlanLines.vue'
import FulfillmentPlanSummary from 'src/components/fulfillment-plan/FulfillmentPlanSummary.vue'
import FulfillmentStrategyBanner from 'src/components/fulfillment-plan/FulfillmentStrategyBanner.vue'

const MERCADO_LIVRE_FULL_URL = 'https://www.mercadolivre.com.br/anuncios/lista/space_management?filters=with-fulfillment'
const $q = useQuasar()
const store = useStore()
const { canWrite } = storeToRefs(store)
const flow = useFulfillmentShipmentPlan()
const { accountId, accountOptions, history, plan, lines, selectedLine, adjustments, parameters, search, selectedActions, pagination, loading, error, isReady, isGenerating, parametersChanged } = flow
const lineOpen = ref(false)
const strategyOpen = ref(false)
const submissionReference = ref('')
const actionOptions = Object.entries(ACTIONS).map(([value, row]) => ({ value, label: row.label }))
const today = localISODate()
const canGenerate = computed(() => Boolean(
  accountId.value
  && Number(parameters.frequencyDays) >= 1
  && Number(parameters.frequencyDays) <= 90
  && parameters.nextDispatchDate
  && parameters.nextDispatchDate >= today
  && !loading.generate
))
const selectedAdjustments = computed(() => adjustments.value.filter(
  row => String(row.line_id) === String(selectedLine.value?.id),
))
const planAlerts = computed(() => {
  const rows = []
  if (plan.value?.summary?.capital_missing_lines > 0) rows.push({ key: 'capital', icon: 'payments', title: 'Capital parcialmente desconhecido', text: `${plan.value.summary.capital_missing_lines} recomendação(ões) não possuem custo atual confiável; o sistema não apresenta R$ 0 como estimativa.` })
  if (plan.value?.summary?.blocked_send_lines > 0) rows.push({ key: 'blocked', icon: 'inventory', title: 'Separação ainda não confirmada', text: `${plan.value.summary.blocked_send_lines} necessidade(s) dependem de saldo ERP confiável antes de virar envio.` })
  if (plan.value?.source_snapshot?.erp_sync?.truncated) rows.push({ key: 'erp', icon: 'sync_problem', title: 'Catálogo ERP parcial', text: 'A sincronização atingiu o limite operacional; revise as linhas sem saldo antes de executar.' })
  const unknownSpace = plan.value?.summary?.warning_counts?.space_capacity_unavailable || 0
  if (unknownSpace > 0) rows.push({ key: 'space', icon: 'warehouse', title: 'Capacidade do Full não confirmada', text: `A API não informou o espaço disponível para ${unknownSpace} recomendação(ões). Confirme a capacidade no Mercado Livre antes de criar a remessa.` })
  return rows
})
const executionTitle = computed(() => ({ ready: 'Revise antes de executar', ready_with_warnings: 'Revise os alertas antes de executar', reviewed: 'Checklist pronto para baixar', exported: 'Conclua a criação no Mercado Livre', submitted_manually: 'Envio registrado no SellerBot' }[plan.value?.status] || 'Continue o plano'))
const executionHelper = computed(() => ({ reviewed: 'O arquivo contém somente linhas com quantidade positiva.', exported: 'Depois de criar a remessa no painel oficial, registre a referência para acompanhar.', submitted_manually: 'A próxima etapa será conciliar o que o centro de distribuição recebeu.' }[plan.value?.status] || 'Abra cada recomendação para conferir fórmula, indicadores e fontes.'))

async function generate() { await flow.generate(); if (flow.isReady.value) $q.notify({ type: 'positive', message: 'Plano estratégico gerado para todo o catálogo.' }) }
function openLine(line) { selectedLine.value = line; lineOpen.value = true }
async function filterAction(action) { selectedActions.value = selectedActions.value.length === 1 && selectedActions.value[0] === action ? ['replenish_full', 'start_full', 'next_cycle'] : [action]; await flow.applyFilters() }
async function adjust(payload) { try { await flow.adjustLine(payload); $q.notify({ type: 'positive', message: 'Ajuste registrado com justificativa.' }) } catch { /* banner global */ } }
async function review() { try { await flow.reviewPlan(); $q.notify({ type: 'positive', message: 'Plano revisado e congelado.' }) } catch { /* banner global */ } }
async function exportPlan() { try { await flow.exportPlan(); $q.notify({ type: 'positive', message: 'Checklist baixado.' }) } catch { /* banner global */ } }
async function submitPlan() { try { await flow.markSubmitted(submissionReference.value); $q.notify({ type: 'positive', message: 'Criação manual registrada.' }) } catch { /* banner global */ } }
function statusLabel(value) { return { generating: 'Calculando', ready: 'Pronto para revisar', ready_with_warnings: 'Pronto com alertas', reviewed: 'Revisado', exported: 'Checklist baixado', submitted_manually: 'Criado no ML', failed: 'Falhou' }[value] || value }
onMounted(flow.initialize)
</script>

<style lang="scss">
@import 'src/css/fulfillment-plan.scss';
</style>
