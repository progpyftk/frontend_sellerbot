<template>
  <AdvisorShell active="visao-geral" pergunta="Veja o que o robô registrou, o que está pendente e como estão seus anúncios.">
    <template #actions>
      <q-select v-model="selectedAccount" :options="accountOptions" dense outlined clearable emit-value map-options
                label="Conta" aria-label="Conta da visão geral" class="overview__account" />
      <q-btn flat dense no-caps icon="refresh" label="Atualizar" :loading="loading" @click="load" />
    </template>
    <q-banner v-if="error" class="bg-red-1 text-red-10 q-mb-md" rounded role="alert">
      Não foi possível consultar o estado do assistente. Nenhum zero ou horário foi inferido.
      <template #action><q-btn flat label="Tentar novamente" @click="load" /></template>
    </q-banner>
    <div v-if="loading && !today" class="q-pa-xl text-center">Carregando estado registrado…</div>
    <template v-if="today">
      <section class="overview__cycle" aria-labelledby="cycle-title">
        <div>
          <span class="overview__eyebrow">Último registro de execução por conta</span>
          <h2 id="cycle-title">{{ cycleTitle }}</h2>
          <p>{{ cycleDetail }}</p>
        </div>
        <div class="overview__actions">
          <router-link :to="{ name: 'promotions-advisor-activity' }">Ver atividade e pendências</router-link>
          <router-link :to="{ name: 'promotions-advisor-anuncios' }">Abrir anúncios</router-link>
        </div>
      </section>
      <p class="overview__scope" role="status" v-if="!today.facts_error">
        {{ userActionCount
          ? `${userActionCount} anúncio(s) têm decisão sua registrada como pendente; abra Atividade para ver o motivo.`
          : 'Nenhuma decisão sua pendente aparece nos registros disponíveis.' }}
      </p>
    </template>
    <section class="overview__portfolio" aria-labelledby="portfolio-title">
      <div class="overview__portfolioHead">
        <div>
          <h2 id="portfolio-title">Promoções nos anúncios ativos</h2>
          <p>Retrato salvo pelo sistema; uma promoção pode ter mudado depois da coleta.</p>
        </div>
        <router-link :to="{ name: 'promotions-advisor-anuncios' }">Examinar anúncios</router-link>
      </div>
      <q-banner v-if="catalogError" class="bg-red-1 text-red-10" rounded role="alert">
        Não foi possível consultar a cobertura promocional. Os números não estão disponíveis.
        <template #action><q-btn flat label="Tentar novamente" @click="loadCatalog" /></template>
      </q-banner>
      <p v-else-if="catalogLoading && !catalog" role="status">Carregando retrato dos anúncios…</p>
      <template v-else-if="catalog">
        <div class="overview__metrics" aria-label="Cobertura promocional observada">
          <article><strong>{{ catalog.summary?.ads ?? '—' }}</strong><span>Anúncios ativos no catálogo</span></article>
          <article><strong>{{ coverage.active ?? '—' }}</strong><span>Promoção ativa confirmada no retrato</span><router-link :to="coverageLink('active')">Ver anúncios</router-link></article>
          <article><strong>{{ coverage.scheduled_only ?? '—' }}</strong><span>Somente promoção programada</span><router-link :to="coverageLink('scheduled_only')">Ver anúncios</router-link></article>
          <article><strong>{{ coverage.without_promotion ?? '—' }}</strong><span>Sem promoção, com leitura completa</span><router-link :to="coverageLink('without_promotion')">Ver anúncios</router-link></article>
          <article><strong>{{ coverage.unconfirmed ?? '—' }}</strong><span>Estado da promoção não confirmado</span><router-link :to="coverageLink('unconfirmed')">Ver anúncios</router-link></article>
        </div>
        <q-banner v-if="catalog.snapshot?.stale || catalog.snapshot?.empty || catalog.snapshot?.partial" class="bg-orange-1 text-orange-10 q-mt-md" rounded role="status">
          Parte da coleta está ausente, incompleta ou desatualizada. Consulte os anúncios com estado não confirmado antes de concluir que estão sem promoção.
        </q-banner>
        <p class="overview__scope">{{ snapshotScope }}</p>
      </template>
    </section>
    <template v-if="today">
      <q-banner v-if="today.facts_error" class="bg-orange-1 text-orange-10 q-mt-md" rounded role="status">
        A agregação dos números falhou. Os totais não estão disponíveis; isso não significa que o robô não fez nada.
      </q-banner>
      <section v-else class="overview__metrics" aria-label="Resumo do dia">
        <article><strong>{{ total.alterados }}</strong><span>Anúncios alterados e confirmados hoje</span></article>
        <article><strong>{{ total.ja_no_alvo }}</strong><span>Mantidos: já estavam no preço-alvo</span></article>
        <article><strong>{{ total.aguardando_aval }}</strong><span>Aguardando aval da próxima leva</span></article>
        <article><strong>{{ total.bloqueados + total.recusados + total.nao_confirmados }}</strong><span>Outros resultados; veja motivos e detalhes</span></article>
      </section>
      <q-banner v-if="(today.failures || []).some((f) => f.exige_acao)" class="bg-red-1 text-red-10 q-mt-md" rounded role="status">
        Há falhas que exigem atenção. Abra Atividade para ver anúncios, motivos e próximo passo registrado.
      </q-banner>
      <section class="overview__pending" aria-labelledby="pending-title">
        <div class="overview__portfolioHead">
          <div>
            <h2 id="pending-title">Recuperações em aberto</h2>
            <p>{{ today.recuperacao?.anuncios_em_recuperacao ?? '—' }} anúncios em {{ today.recuperacao?.cadeias_em_recuperacao ?? '—' }} cadeias registradas.</p>
          </div>
          <router-link :to="{ name: 'promotions-advisor-activity' }">Ver atividade</router-link>
        </div>
        <p v-if="!today.recuperacao" class="overview__scope">Dados de recuperação indisponíveis nesta consulta.</p>
        <ul v-else-if="recoveryOpen.length" class="overview__pendingList">
          <li v-for="job in recoveryOpen.slice(0, 5)" :key="job.job_id">
            <span><strong>{{ job.item_id }}</strong> · {{ job.account_nickname }}</span>
            <span>Etapa {{ job.etapa || 'não informada' }} · {{ job.proxima_execucao ? `tentativa prevista para ${timeLabel(job.proxima_execucao)}` : 'sem próxima tentativa registrada' }}</span>
          </li>
        </ul>
        <p v-else class="overview__scope">Nenhuma cadeia de recuperação aberta aparece nesta leitura.</p>
        <p v-if="recoveryOpen.length > 5" class="overview__scope">Mais {{ recoveryOpen.length - 5 }} cadeias no registro de recuperação.</p>
      </section>
      <p class="overview__scope">Os totais são por anúncio no dia de negócio ({{ today.day_window?.timezone || 'fuso não informado' }}). Motivos podem se sobrepor. A data de execução é a registrada pelo sistema.</p>
    </template>
  </AdvisorShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdvisorShell from 'src/components/advisor/AdvisorShell.vue';
import AdvisorService from 'src/services/AdvisorService';

const today = ref(null);
const route = useRoute();
const router = useRouter();
const selectedAccount = ref(typeof route.query.account_id === 'string' ? route.query.account_id : null);
const catalog = ref(null);
const loading = ref(false);
const catalogLoading = ref(false);
const error = ref(false);
const catalogError = ref(false);
const coverage = computed(() => catalog.value?.summary?.promotion_coverage || {});
const userActionCount = computed(() => new Set((today.value?.failures || [])
  .filter((failure) => failure.exige_acao)
  .map((failure) => `${failure.account_id || failure.account_nickname}:${failure.item_id}`)).size);
const accountOptions = computed(() => [
  { label: 'Todas as contas', value: null },
  ...(catalog.value?.accounts || []).map((account) => ({
    label: account.account_nickname, value: account.account_id,
  })),
]);
function coverageLink(promotion_state) {
  return { name: 'promotions-advisor-anuncios', query: {
    promotion_state, account_id: selectedAccount.value || undefined,
  } };
}
let todaySequence = 0;
let catalogSequence = 0;
async function load() {
  const sequence = ++todaySequence;
  loading.value = true;
  error.value = false;
  loadCatalog();
  try {
    const response = await AdvisorService.getToday(selectedAccount.value ? { account_id: selectedAccount.value } : {});
    if (sequence === todaySequence) today.value = response.data;
  } catch { if (sequence === todaySequence) { error.value = true; today.value = null; } }
  finally { if (sequence === todaySequence) loading.value = false; }
}
async function loadCatalog() {
  const sequence = ++catalogSequence;
  catalogLoading.value = true;
  catalogError.value = false;
  const params = { status: 'active', page_size: 1 };
  if (selectedAccount.value) params.account_id = selectedAccount.value;
  try {
    const response = await AdvisorService.getCatalog(params);
    if (sequence === catalogSequence) catalog.value = response.data;
  } catch { if (sequence === catalogSequence) { catalogError.value = true; catalog.value = null; } }
  finally { if (sequence === catalogSequence) catalogLoading.value = false; }
}
watch(selectedAccount, (account_id) => {
  router.replace({ query: { ...route.query, account_id: account_id || undefined } });
  load();
});
const snapshotScope = computed(() => {
  const accounts = Object.values(catalog.value?.snapshot?.by_account || {});
  if (!accounts.length) return 'Horário da coleta não disponível.';
  return accounts.map((account) => {
    const name = account.account_nickname || 'Conta sem nome';
    if (!account.computed_at) return `${name}: sem retrato coletado`;
    const at = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(account.computed_at));
    return `${name}: coleta em ${at} (Brasília)${account.stale ? ', desatualizada' : ''}`;
  }).join(' · ');
});
const accounts = computed(() => Object.values(today.value?.by_account || {}));
const recoveryOpen = computed(() => (today.value?.recuperacao?.itens || []).filter((job) => ['queued', 'processing'].includes(job.status)));
function timeLabel(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
}
const total = computed(() => accounts.value.reduce((acc, account) => {
  for (const k of ['alterados', 'ja_no_alvo', 'aguardando_aval', 'bloqueados', 'recusados', 'nao_confirmados']) {
    acc[k] += Number(account.today?.[k] || 0);
  }
  return acc;
}, { alterados: 0, ja_no_alvo: 0, aguardando_aval: 0, bloqueados: 0, recusados: 0, nao_confirmados: 0 }));
const cycleTitle = computed(() => {
  if (!today.value?.last_cycle) return 'Ainda não há execução registrada';
  const status = { success: 'Concluída', partial: 'Concluída com pendências', error: 'Terminou com erro', skipped: 'Não executada' };
  return status[today.value.last_cycle.status] || 'Resultado não classificado';
});
const cycleDetail = computed(() => {
  const cycle = today.value?.last_cycle;
  if (!cycle?.finished_at) return 'A agenda ou o estado de execução não estão disponíveis.';
  const at = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(cycle.finished_at));
  const conta = today.value?.by_account?.[cycle.account_ref]?.account_nickname || cycle.account_ref;
  return `${at} (Brasília), conta ${conta}. ${Number(cycle.items_processed || 0)} confirmações no último registro desta conta; o ciclo completo não está vinculado neste dado.`;
});
onMounted(load);
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';
.overview__cycle { display:flex; justify-content:space-between; align-items:flex-start; gap:$space-5; padding:$space-5; border:1px solid $border; border-radius:$radius-md; background:$surface; }
.overview__eyebrow { color:$text-muted; font-size:$text-xs-size; text-transform:uppercase; font-weight:$font-semibold; }
.overview__cycle h2 { margin:$space-2 0; font-size:$text-h3-size; color:$text-primary; }
.overview__cycle p,.overview__scope { color:$text-muted; margin:0; }
.overview__actions { display:flex; flex-direction:column; gap:$space-2; white-space:nowrap; }
.overview__actions a { color:$primary; font-weight:$font-semibold; }
.overview__account { min-width:170px; }
.overview__metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:$space-3; margin-top:$space-4; }
.overview__portfolio .overview__metrics { grid-template-columns:repeat(5,minmax(0,1fr)); }
.overview__metrics article { display:flex; flex-direction:column; gap:$space-2; padding:$space-4; border:1px solid $border; border-radius:$radius-md; background:$surface; }
.overview__metrics strong { font-size:$text-h2-size; color:$text-primary; }
.overview__metrics span { color:$text-muted; font-size:$text-small-size; }
.overview__metrics a { color:$primary; font-size:$text-small-size; font-weight:$font-semibold; }
.overview__scope { margin-top:$space-4; font-size:$text-xs-size; }
.overview__portfolio { margin-top:$space-6; }
.overview__pending { margin-top:$space-5; padding:$space-5; padding-right:72px; border:1px solid $border; border-radius:$radius-md; background:$surface; }
.overview__pendingList { list-style:none; padding:0; margin:$space-3 0 0; display:grid; gap:$space-2; }
.overview__pendingList li { display:flex; justify-content:space-between; gap:$space-3; padding:$space-2 0; border-top:1px solid $border; }
.overview__pendingList li span:last-child { color:$text-muted; }
.overview__portfolioHead { display:flex; justify-content:space-between; align-items:center; gap:$space-3; }
.overview__portfolioHead h2 { font-size:$text-h3-size; margin:0; }
.overview__portfolioHead p { color:$text-muted; margin:$space-1 0 0; }
.overview__portfolioHead a { color:$primary; font-weight:$font-semibold; white-space:nowrap; }
@media(max-width:700px) { .overview__portfolioHead,.overview__pendingList li { align-items:flex-start; flex-direction:column; } }
@media(max-width:700px) { .overview__cycle { flex-direction:column; } .overview__metrics { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:700px) { .overview__portfolio .overview__metrics { grid-template-columns:repeat(2,minmax(0,1fr)); } }
</style>
