<template>
  <AdvisorShell active="visao-geral" pergunta="Veja o que o robô registrou, o que está pendente e como estão seus anúncios.">
    <template #actions>
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
      <p class="overview__scope">Os totais são por anúncio no dia de negócio ({{ today.day_window?.timezone || 'fuso não informado' }}). Motivos podem se sobrepor. A data de execução é a registrada pelo sistema.</p>
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
            <article><strong>{{ catalog.summary?.with_active_promo ?? '—' }}</strong><span>Com promoção ativa no retrato</span></article>
            <article><strong>{{ catalog.summary?.scheduled_only ?? '—' }}</strong><span>Somente com promoção programada no retrato</span></article>
            <article><strong>{{ catalog.summary?.without_active_or_scheduled_snapshot ?? '—' }}</strong><span>Sem promoção ativa ou programada no retrato</span></article>
          </div>
          <q-banner v-if="catalog.snapshot?.stale || catalog.snapshot?.empty" class="bg-orange-1 text-orange-10 q-mt-md" rounded role="status">
            O retrato de uma ou mais contas está ausente ou desatualizado. Estes números não confirmam o estado atual das promoções.
          </q-banner>
          <p class="overview__scope">{{ snapshotScope }}</p>
        </template>
      </section>
  </AdvisorShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import AdvisorShell from 'src/components/advisor/AdvisorShell.vue';
import AdvisorService from 'src/services/AdvisorService';

const today = ref(null);
const catalog = ref(null);
const loading = ref(false);
const catalogLoading = ref(false);
const error = ref(false);
const catalogError = ref(false);
async function load() {
  loading.value = true;
  error.value = false;
  loadCatalog();
  try { today.value = (await AdvisorService.getToday()).data; } catch { error.value = true; today.value = null; }
  finally { loading.value = false; }
}
async function loadCatalog() {
  catalogLoading.value = true;
  catalogError.value = false;
  try { catalog.value = (await AdvisorService.getCatalog({ status: 'active', page_size: 1 })).data; }
  catch { catalogError.value = true; catalog.value = null; }
  finally { catalogLoading.value = false; }
}
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
.overview__metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:$space-3; margin-top:$space-4; }
.overview__metrics article { display:flex; flex-direction:column; gap:$space-2; padding:$space-4; border:1px solid $border; border-radius:$radius-md; background:$surface; }
.overview__metrics strong { font-size:$text-h2-size; color:$text-primary; }
.overview__metrics span { color:$text-muted; font-size:$text-small-size; }
.overview__scope { margin-top:$space-4; font-size:$text-xs-size; }
.overview__portfolio { margin-top:$space-6; }
.overview__portfolioHead { display:flex; justify-content:space-between; align-items:center; gap:$space-3; }
.overview__portfolioHead h2 { font-size:$text-h3-size; margin:0; }
.overview__portfolioHead p { color:$text-muted; margin:$space-1 0 0; }
.overview__portfolioHead a { color:$primary; font-weight:$font-semibold; white-space:nowrap; }
@media(max-width:700px) { .overview__portfolioHead { align-items:flex-start; flex-direction:column; } }
@media(max-width:700px) { .overview__cycle { flex-direction:column; } .overview__metrics { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:420px) { .overview__metrics { grid-template-columns:1fr; } }
</style>
