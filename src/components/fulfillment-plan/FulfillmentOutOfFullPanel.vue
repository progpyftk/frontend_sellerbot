<template>
  <div class="oof-panel">
    <section class="oof-planner">
      <div class="oof-planner__intro">
        <span class="fp-eyebrow">DESCOBERTA DE CATÁLOGO</span>
        <h2>Quais produtos ainda não estão no Full?</h2>
        <p>Lista priorizada de anúncios fora do Full que valem começar a enviar, com a média de vendas, a janela usada pelo modelo e o lote inicial de referência.</p>
      </div>
      <div class="oof-planner__fields">
        <q-select v-model="accountId" :options="accountOptions" emit-value map-options outlined label="Conta Mercado Livre" :loading="loading.initialize" :disable="loading.generate" @update:model-value="selectAccount" />
        <q-input v-model.number="frequencyDays" type="number" min="1" max="90" suffix="dias" outlined label="Frequência dos envios" hint="Escala o lote de referência" :disable="loading.generate" :error="frequencyDays < 1 || frequencyDays > 90" error-message="Informe de 1 a 90 dias." />
        <q-btn unelevated color="primary" no-caps icon="auto_awesome" label="Gerar sugestões" :loading="loading.generate" :disable="!accountId || loading.generate" @click="generate" />
      </div>
      <div class="oof-planner__history">
        <span><q-icon name="verified" /> Reusa o mesmo motor do plano — sem fórmula nova</span>
        <q-btn-dropdown v-if="history.length" flat dense no-caps icon="history" label="Versões anteriores" :disable="loading.generate">
          <q-list style="min-width: 300px">
            <q-item v-for="row in history" :key="row.id" clickable v-close-popup @click="openSuggestion(row.id)">
              <q-item-section><q-item-label>{{ formatDate(row.created_at) }} · a cada {{ row.frequency_days }} dias</q-item-label><q-item-label caption>{{ statusLabel(row.status) }} · {{ row.summary?.total_candidates || 0 }} candidatos</q-item-label></q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </section>

    <section v-if="isGenerating" class="fp-generation-state">
      <q-spinner-dots color="primary" size="44px" />
      <div><strong>Analisando os anúncios fora do Full...</strong><span>Cruzando demanda, margem, conversão, confiança e estoque ERP para ranquear quem vale começar a enviar.</span></div>
    </section>

    <section v-else-if="!suggestion" class="fp-welcome">
      <div class="fp-welcome__visual"><q-icon name="rocket_launch" /></div>
      <div><span class="fp-eyebrow">QUEM VALE COMEÇAR NO FULL</span><h2>Peça a lista de itens fora do Full</h2><p>Você recebe os candidatos ordenados por oportunidade, com o lote inicial de referência e a explicação de cada um.</p></div>
    </section>

    <template v-else-if="isReady">
      <div class="fp-plan-context">
        <span>Versão #{{ suggestion.id }}</span><span><q-icon name="repeat" /> A cada {{ suggestion.frequency_days }} dias</span><span><q-icon name="schedule" /> Dados até {{ formatDate(suggestion.source_snapshot?.as_of) }}</span>
      </div>

      <section class="fp-summary" aria-label="Resumo da descoberta">
        <article class="fp-summary-card fp-summary-card--growth"><span class="fp-summary-card__icon"><q-icon name="rocket_launch" /></span><span><strong>{{ summary.start_full || 0 }}</strong><small>entrar no Full</small></span></article>
        <article class="fp-summary-card fp-summary-card--next"><span class="fp-summary-card__icon"><q-icon name="event_repeat" /></span><span><strong>{{ summary.next_cycle || 0 }}</strong><small>observar</small></span></article>
        <article class="fp-summary-card fp-summary-card--review"><span class="fp-summary-card__icon"><q-icon name="warning_amber" /></span><span><strong>{{ summary.data_review || 0 }}</strong><small>revisar dados</small></span></article>
        <article class="fp-summary-card fp-summary-card--capital"><span class="fp-summary-card__icon"><q-icon name="payments" /></span><span><strong>{{ capitalLabel }}</strong><small>capital estimado</small></span></article>
      </section>

      <section class="fp-results">
        <header class="fp-results__header">
          <div><span class="fp-eyebrow">SUGESTÕES DE ENTRADA NO FULL</span><h2>Produtos ordenados por oportunidade</h2><p>{{ pagination.total.toLocaleString('pt-BR') }} candidato(s) no filtro atual.</p></div>
        </header>
        <div class="fp-toolbar">
          <q-input v-model="search" outlined dense clearable debounce="400" placeholder="Buscar produto, SKU ou MLB" class="fp-search" @update:model-value="applyFilters"><template #prepend><q-icon name="search" /></template></q-input>
          <q-select v-model="selectedActions" :options="actionOptions" multiple emit-value map-options outlined dense label="Sugestão" class="fp-action-filter" @update:model-value="applyFilters"><template #selected-item="scope"><q-chip dense removable @remove="scope.removeAtIndex(scope.index)">{{ scope.opt.label }}</q-chip></template></q-select>
        </div>

        <q-markup-table v-if="loading.lines" class="fp-loading-table"><q-tr><q-td colspan="6"><q-spinner color="primary" size="32px" /></q-td></q-tr></q-markup-table>
        <q-list v-else-if="lines.length" separator class="fp-line-list">
          <q-item v-for="line in lines" :key="line.id" clickable @click="openLine(line)">
            <q-item-section avatar><q-icon :name="actionMeta(line.action).icon" :color="actionMeta(line.action).tone" size="28px" /></q-item-section>
            <q-item-section>
              <q-item-label class="fp-line-title">{{ line.title }}</q-item-label>
              <q-item-label caption>{{ line.item_id_ml }}<template v-if="line.variation_name"> · {{ line.variation_name }}</template><template v-if="line.sku"> · {{ line.sku }}</template></q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="fp-line-badge">{{ actionMeta(line.action).short }}</div>
              <q-item-label caption class="fp-line-qty"><template v-if="line.suggested_quantity != null">{{ line.suggested_quantity }} un.</template><template v-else>—</template></q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <div v-else class="fp-empty"><q-icon name="search_off" size="40px" /><span>Nenhuma sugestão para estes filtros.</span></div>

        <div v-if="pagination.hasNext || pagination.page > 1" class="fp-pagination">
          <q-btn flat no-caps dense icon="chevron_left" label="Anterior" :disable="pagination.page <= 1 || loading.lines" @click="changePage(pagination.page - 1)" />
          <span>Página {{ pagination.page }}</span>
          <q-btn flat no-caps dense icon-right="chevron_right" label="Próxima" :disable="!pagination.hasNext || loading.lines" @click="changePage(pagination.page + 1)" />
        </div>
      </section>
    </template>

    <section v-else-if="suggestion?.status === 'generating'" class="fp-generation-state fp-generation-state--pending">
      <q-icon name="schedule" size="42px" /><div><strong>As sugestões continuam sendo calculadas</strong><span>Você pode sair desta tela e voltar depois.</span></div><q-btn outline color="primary" no-caps label="Atualizar status" :loading="loading.lines" @click="refreshSuggestion" />
    </section>

    <section v-else-if="suggestion?.status === 'failed'" class="fp-generation-state fp-generation-state--failed">
      <q-icon name="error_outline" size="42px" /><div><strong>As sugestões não puderam ser geradas</strong><span>{{ suggestion.error_detail || 'Gere uma nova versão para tentar novamente.' }}</span></div>
    </section>

    <q-dialog v-model="lineOpen">
      <q-card class="oof-line-dialog">
        <q-card-section>
          <span class="fp-eyebrow">ENTENDA ESTA SUGESTÃO</span>
          <h2>{{ selectedLine?.title }}</h2>
          <p class="oof-line-dialog__sub">{{ selectedLine?.item_id_ml }}<template v-if="selectedLine?.sku"> · {{ selectedLine.sku }}</template></p>
        </q-card-section>
        <q-card-section class="oof-line-dialog__grid">
          <article><q-icon name="trending_up" /><strong>Sugestão</strong><span>{{ actionMeta(selectedLine?.action).label }}</span></article>
          <article><q-icon name="query_stats" /><strong>Média de vendas</strong><span>{{ formatNumber(selectedLine?.forecast?.daily_units) }} un/dia{{ selectedLine?.forecast?.window_days ? ` — últimos ${selectedLine.forecast.window_days} dias` : '' }} ({{ selectedLine?.forecast?.model || '—' }})</span></article>
          <article><q-icon name="payments" /><strong>Margem</strong><span>{{ formatPercent(selectedLine?.economics?.contribution_margin_rate) }}</span></article>
          <article><q-icon name="inventory" /><strong>Lote inicial</strong><span>{{ selectedLine?.suggested_quantity != null ? `${selectedLine.suggested_quantity} un.` : 'Revisar dados' }}</span></article>
          <article><q-icon name="psychology" /><strong>Confiança</strong><span>{{ confidenceLabel(selectedLine?.forecast?.confidence) }}</span></article>
          <article><q-icon name="leaderboard" /><strong>Rank</strong><span>#{{ selectedLine?.rank }}</span></article>
        </q-card-section>
        <q-card-section>
          <h3 class="oof-reasons-title">Por que esta sugestão</h3>
          <ul class="oof-reasons"><li v-for="reason in reasons" :key="reason">{{ reason }}</li></ul>
          <p v-if="selectedLine?.plan_context?.has_recent_plan" class="oof-plan-context"><q-icon name="link" /> No plano recente: {{ actionMeta(selectedLine.plan_context.plan_action).label }}<template v-if="selectedLine.plan_context.plan_quantity != null"> · {{ selectedLine.plan_context.plan_quantity }} un.</template></p>
        </q-card-section>
        <q-card-actions align="right"><q-btn unelevated color="primary" no-caps label="Levar ao plano de envios" @click="useInPlan" /><q-btn flat no-caps label="Fechar" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useFulfillmentOutOfFull } from 'src/composables/useFulfillmentOutOfFull'
import { ACTIONS, actionMeta, formatDate, formatNumber, formatMoney, reasonText } from 'src/utils/fulfillmentPlan'

const emit = defineEmits(['use-in-plan'])
const $q = useQuasar()
const flow = useFulfillmentOutOfFull()
const { accountId, accountOptions, history, suggestion, lines, search, selectedActions, pagination, frequencyDays, loading, isReady, isGenerating } = flow
const lineOpen = ref(false)
const selectedLine = ref(null)
const actionOptions = Object.entries(ACTIONS).filter(([value]) => ['start_full', 'next_cycle', 'do_not_send', 'data_review'].includes(value)).map(([value, row]) => ({ value, label: row.label }))

const summary = computed(() => suggestion.value?.summary || {})
const reasons = computed(() => (selectedLine.value?.decision?.reasons || []).map(reasonText).filter(Boolean))
const capitalLabel = computed(() => {
  if (summary.value.estimated_capital != null) return formatMoney(summary.value.estimated_capital)
  if (Number(summary.value.known_estimated_capital || 0) > 0) return `${formatMoney(summary.value.known_estimated_capital)}+`
  return 'Não calculado'
})

async function generate() { await flow.generate(); if (flow.isReady.value) $q.notify({ type: 'positive', message: 'Sugestões de itens fora do Full geradas.' }) }
function selectAccount(value) { flow.selectAccount(value) }
function openSuggestion(id) { flow.openSuggestion(id) }
function applyFilters() { flow.applyFilters() }
function changePage(page) { flow.changePage(page) }
function openLine(line) { selectedLine.value = line; lineOpen.value = true }
function useInPlan() { lineOpen.value = false; emit('use-in-plan', selectedLine.value) }
function formatPercent(value) { return value == null ? '—' : `${(Number(value) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` }
function confidenceLabel(value) { return { high: 'Alta', medium: 'Média', low: 'Baixa' }[value] || value || '—' }
function statusLabel(value) { return { generating: 'Calculando', ready: 'Pronto', ready_with_warnings: 'Pronto com alertas', failed: 'Falhou' }[value] || value }

onMounted(flow.initialize)
</script>

<style lang="scss">
@import 'src/css/fulfillment-plan.scss';

.oof-panel .fp-line-list .q-item { min-height: 64px; }
.oof-panel .fp-line-title { font-weight: 600; }
.oof-panel .fp-line-badge { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--q-primary); font-weight: 700; }
.oof-panel .fp-line-qty { margin-top: 2px; }
.oof-panel .fp-loading-table { width: 100%; }
.oof-panel .fp-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; color: #8a94a6; padding: 48px 0; }
.oof-panel .fp-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px 0; }
.oof-line-dialog { min-width: min(560px, 92vw); }
.oof-line-dialog__sub { color: #8a94a6; margin: 0; }
.oof-line-dialog__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.oof-line-dialog__grid article { display: flex; flex-direction: column; gap: 4px; padding: 12px; background: #f6f8fb; border-radius: 8px; }
.oof-line-dialog__grid article strong { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #8a94a6; }
.oof-reasons-title { margin: 0 0 8px; font-size: 14px; }
.oof-reasons { margin: 0; padding-left: 18px; }
.oof-plan-context { margin-top: 12px; color: #5b6b84; }
</style>
