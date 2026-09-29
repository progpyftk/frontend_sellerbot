<template>
  <AdvisorShell active="atividade" pergunta="Histórico de decisões, tentativas e confirmações. Cada linha é um evento, e vínculos só são agrupados quando o sistema os registrou.">
    <template #actions>
      <q-btn flat dense no-caps icon="refresh" label="Atualizar" :loading="loading" @click="load" />
    </template>

    <q-banner v-if="error" class="bg-red-1 text-red-10 q-mb-md" rounded role="alert">
      Não foi possível carregar a atividade. A lista não está vazia: está indisponível.
      <template #action><q-btn flat label="Tentar novamente" @click="load" /></template>
    </q-banner>
    <AdvisorEmptyState v-else-if="loading && !rows.length" variant="carregando" />
    <template v-else>
      <div class="activity__filters" role="search" aria-label="Filtrar atividade">
        <q-select v-model="filters.account_id" :options="accountOptions" clearable emit-value map-options outlined dense label="Conta" />
        <q-select v-model="filters.state" :options="stateOptions" clearable emit-value map-options outlined dense label="Resultado" />
        <q-select v-model="filters.origin" :options="originOptions" clearable emit-value map-options outlined dense label="Origem" />
        <q-input v-model="filters.date_from" outlined dense type="date" label="De" />
        <q-input v-model="filters.date_to" outlined dense type="date" label="Até" />
        <q-btn v-if="hasFilters" flat dense no-caps icon="filter_alt_off" label="Limpar" @click="clearFilters" />
        <router-link :to="{ name: 'promotions-advisor-hoje' }">Resumo detalhado do dia</router-link>
      </div>

      <p class="activity__scope" role="status">
        {{ total }} eventos registrados · conta e anúncio aparecem em cada linha. Motivos distintos podem pertencer à mesma decisão.
      </p>
      <q-banner v-if="invalidFilter" class="bg-orange-1 text-orange-10 q-mb-md" rounded role="alert">
        O filtro de data ou conta não é válido para este acesso. Corrija ou limpe os filtros; nenhum evento foi exibido.
      </q-banner>

      <AdvisorEmptyState v-if="!rows.length" variant="vazio" title="Nenhum evento neste recorte" message="Tente outro período, conta ou resultado." />
      <section v-else class="activity__list" aria-label="Eventos do assistente">
        <article v-for="event in rows" :key="`${event.action_id}-${event.attempt_no}`" class="activity__event">
          <div class="activity__eventTop">
            <div>
              <strong>{{ event.title || event.item_id }}</strong>
              <span>{{ event.item_id }} · {{ event.sku || 'sem SKU' }} · {{ event.account_nickname }}</span>
              <router-link :to="{ name: 'promotions-advisor-anuncios', query: { item: event.item_id } }">Abrir anúncio e situação atual</router-link>
            </div>
            <AdvisorStatusPill :status="pillStatus(resultOf({ last_result: event }).key)">{{ resultOf({ last_result: event }).label }}</AdvisorStatusPill>
          </div>
          <p class="activity__detail">{{ resultOf({ last_result: event }).detail }}</p>
          <dl class="activity__facts">
            <div><dt>Quando</dt><dd>{{ dateTime(event.created_at) }}</dd></div>
            <div><dt>Origem</dt><dd>{{ originLabel(event.origin) }}</dd></div>
            <div><dt>Tentativa</dt><dd>{{ event.attempt_no }}</dd></div>
            <div v-if="event.deal_price"><dt>Preço proposto</dt><dd>{{ brl(event.deal_price) }}</dd></div>
            <div v-if="event.financial_gate?.margin_pct != null"><dt>Margem estimada</dt><dd>{{ pct(event.financial_gate.margin_pct) }} · no registro da tentativa</dd></div>
            <div v-if="event.financial_gate?.profit != null"><dt>Lucro estimado por venda</dt><dd>{{ brl(event.financial_gate.profit) }} · no registro da tentativa</dd></div>
            <div v-if="event.blocked_code"><dt>Motivo registrado</dt><dd>{{ reasonLabel(event.blocked_code) }}</dd></div>
            <div v-if="event.sent_at"><dt>Enviado ao Mercado Livre</dt><dd>{{ dateTime(event.sent_at) }}</dd></div>
            <div v-if="event.accepted_at"><dt>Aceito pela plataforma</dt><dd>{{ dateTime(event.accepted_at) }}</dd></div>
            <div v-if="event.verified_at"><dt>Confirmado em</dt><dd>{{ dateTime(event.verified_at) }}</dd></div>
            <div v-if="Object.keys(event.chain_links || {}).length"><dt>Vínculos registrados</dt><dd>{{ chainLinksLabel(event.chain_links) }}</dd></div>
            <div><dt>Próximo passo desta tentativa</dt><dd>{{ nextStepLabel(event) }}</dd></div>
          </dl>
          <details class="activity__id">
            <summary>Identificador da decisão</summary>
            <code>{{ event.action_id }}</code>
            <span v-if="event.run_id">Execução: {{ event.run_id }}</span>
          </details>
        </article>
      </section>

      <footer class="activity__pagination" aria-label="Paginação da atividade">
        <span>{{ total ? firstIndex : 0 }}–{{ lastIndex }} de {{ total }} eventos</span>
        <div>
          <q-btn flat dense icon="chevron_left" aria-label="Página anterior" :disable="page <= 1" @click="page -= 1" />
          <span>{{ page }} / {{ totalPages }}</span>
          <q-btn flat dense icon="chevron_right" aria-label="Próxima página" :disable="page >= totalPages" @click="page += 1" />
        </div>
      </footer>
    </template>
  </AdvisorShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import AdvisorShell from 'src/components/advisor/AdvisorShell.vue';
import AdvisorEmptyState from 'src/components/advisor/AdvisorEmptyState.vue';
import AdvisorStatusPill from 'src/components/advisor/AdvisorStatusPill.vue';
import AdvisorService from 'src/services/AdvisorService';
import { brl, pct, resultOf } from 'src/utils/advisorDecision';

const rows = ref([]), total = ref(0), accounts = ref([]), loading = ref(false), error = ref(false), invalidFilter = ref(false), page = ref(1);
const filters = reactive({ account_id: null, state: null, origin: null, date_from: '', date_to: '' });
const stateOptions = [
  { label: 'Todos os resultados', value: null }, { label: 'Preparado, não enviado', value: 'intent' },
  { label: 'Envio sem resposta conclusiva', value: 'sending' }, { label: 'Aguardando confirmação', value: 'accepted_unverified' },
  { label: 'Confirmado', value: 'executed_verified' }, { label: 'Proteção: não enviado', value: 'blocked' },
  { label: 'Falha registrada', value: 'failed' }, { label: 'Sem confirmação', value: 'unknown' },
];
const originOptions = [
  { label: 'Todas as origens', value: null }, { label: 'Automação', value: 'automation' },
  { label: 'Manual', value: 'manual' }, { label: 'Reconciliação', value: 'reconcile' },
];
const accountOptions = computed(() => [
  { label: 'Todas as contas', value: null },
  ...accounts.value.map((account) => ({ label: account.account_nickname, value: account.account_id })),
]);
const hasFilters = computed(() => Object.values(filters).some(Boolean));
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / 30)));
const firstIndex = computed(() => (page.value - 1) * 30 + 1);
const lastIndex = computed(() => Math.min(page.value * 30, total.value));
let requestSequence = 0;
async function load() {
  const sequence = ++requestSequence;
  loading.value = true;
  error.value = false;
  try {
    const params = { page: page.value, page_size: 30 };
    for (const [key, value] of Object.entries(filters)) if (value) params[key] = value;
    const { data } = await AdvisorService.getActivity(params);
    if (sequence !== requestSequence) return;
    rows.value = data.results || [];
    total.value = Number(data.total || 0);
    accounts.value = data.scope?.accounts || [];
    invalidFilter.value = Boolean(data.data_quality?.invalid_date_filter || data.scope?.invalid_account_filter);
  } catch {
    if (sequence !== requestSequence) return;
    error.value = true;
    invalidFilter.value = false;
    rows.value = [];
    total.value = 0;
  } finally { if (sequence === requestSequence) loading.value = false; }
}
function clearFilters() { Object.assign(filters, { account_id: null, state: null, origin: null, date_from: '', date_to: '' }); }
function dateTime(value) { if (!value) return '—'; return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value)); }
function originLabel(value) { return ({ automation: 'Automação diária', manual: 'Ação manual', reconcile: 'Reconciliação' })[value] || 'Origem não classificada'; }
function pillStatus(key) { return ({ confirmado: 'verificado', mantido: 'verificado', aguardando: 'aguardando', preparado: 'neutral', falha: 'recusado', recusado: 'recusado', sem_confirmacao: 'bloqueado', bloqueado: 'bloqueado' })[key] || 'neutral'; }
function reasonLabel(code) { return ({ SKIP_ALREADY_AT_TARGET: 'Já estava no preço-alvo; nenhuma escrita', WRITE_REJECTED: 'Recusa confirmada pelo Mercado Livre', ML_HTTP_500: 'Erro transitório do Mercado Livre', NOT_SENT: 'Intenção registrada, sem envio' })[code] || `Motivo técnico não classificado (código ${code})`; }
function chainLinksLabel(links) {
  const labels = { pending_removal_id: 'remoção relacionada', child_run_id: 'execução filha', recovery_of_action_id: 'ação recuperada' };
  return Object.keys(links).map((key) => labels[key] || 'vínculo registrado').join(' · ');
}
function nextStepLabel(event) {
  if (event.blocked_code === 'SKIP_ALREADY_AT_TARGET') return 'Nenhuma ação: preço-alvo já atendido.';
  if (event.state === 'executed_verified') return 'Nenhuma pendência nesta tentativa. Confira a situação atual da oferta no anúncio.';
  if (event.state === 'accepted_unverified' || event.state === 'sending' || event.state === 'unknown') {
    return 'Confirmação pendente; próxima verificação não vinculada a este registro.';
  }
  if (event.state === 'intent') return 'Sem envio registrado; continuação não vinculada a este registro.';
  if (event.state === 'failed' || event.state === 'blocked') return 'Nenhuma nova tentativa vinculada; consulte o motivo registrado.';
  return 'Próximo passo não registrado.';
}
watch(filters, () => { page.value = 1; load(); }, { deep: true });
watch(page, load);
onMounted(load);
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';
.activity__filters { display:flex; flex-wrap:wrap; align-items:center; gap:$space-3; padding:$space-4; border:1px solid $border; border-radius:$radius-md; background:$surface; }
.activity__filters > * { min-width:145px; }
.activity__filters a { color:$primary; font-weight:$font-semibold; }
.activity__scope { margin:$space-4 0; color:$text-muted; font-size:$text-small-size; }
.activity__list { display:grid; gap:$space-3; }
.activity__event { padding:$space-4; border:1px solid $border; border-radius:$radius-md; background:$surface; }
.activity__eventTop { display:flex; justify-content:space-between; align-items:flex-start; gap:$space-3; }
.activity__eventTop > div { display:flex; flex-direction:column; gap:$space-1; }
.activity__eventTop span,.activity__detail { color:$text-muted; font-size:$text-small-size; }
.activity__eventTop a { color:$primary; font-size:$text-small-size; }
.activity__detail { margin:$space-3 0; }
.activity__facts { display:grid; grid-template-columns:repeat(auto-fit,minmax(165px,1fr)); gap:$space-3; margin:0; }
.activity__facts div { min-width:0; }
.activity__facts dt { color:$text-muted; font-size:$text-xs-size; }
.activity__facts dd { margin:2px 0 0; color:$text-body; overflow-wrap:anywhere; }
.activity__id { margin-top:$space-3; color:$text-muted; font-size:$text-xs-size; }
.activity__id summary { cursor:pointer; }
.activity__id code,.activity__id span { display:block; overflow-wrap:anywhere; margin-top:$space-2; }
.activity__pagination { display:flex; justify-content:space-between; align-items:center; gap:$space-3; padding:$space-4 0; color:$text-muted; }
.activity__pagination > div { display:flex; align-items:center; gap:$space-2; }
@media(max-width:599px) { .activity__filters > * { flex:1 1 100%; } .activity__eventTop { flex-direction:column; } }
</style>
