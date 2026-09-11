<template>
  <!--
    Bloco "Hoje" (PROMO-IA-21 · F0/F1/F2b): responde, nesta ordem, as perguntas do dono —
    o que o robô fez, o que espera por ele, por que não mexeu no resto, e como parar tudo.
    Todo número vem do backend (baldes disjuntos por anúncio); nada é calculado aqui além da
    soma entre contas quando o dono escolhe "todas".
  -->
  <section class="atw" aria-label="Trabalho do robô hoje">
    <!-- Camada 1: identidade + número grande + estado + emergência -->
    <header class="atw__top">
      <div class="atw__id">
        <span class="atw__what">Robô de promoções</span>
        <span class="atw__how">{{ identityLine }}</span>
      </div>
      <div class="atw__big">
        <strong>{{ total.alterados }}</strong>
        <span>{{ total.alterados === 1 ? 'anúncio alterado hoje' : 'anúncios alterados hoje' }}</span>
      </div>
      <div class="atw__state">
        <SbBadge :variant="stateBadge.variant" :icon="stateBadge.icon">{{ stateBadge.label }}</SbBadge>
        <q-btn
          outline no-caps dense color="negative" icon="pause_circle"
          label="Pausar toda a escrita" :loading="pausing"
          @click="confirmPause = true"
        />
      </div>
    </header>

    <p v-if="confirmPause" class="atw__confirm" role="alert">
      Isso desliga a escrita automática em <strong>todas as suas contas</strong> agora (inclusive no
      meio do ciclo). As promoções já aplicadas <strong>continuam no ar</strong>.
      <q-btn unelevated no-caps dense color="negative" label="Confirmar pausa" :loading="pausing" @click="pauseAll" />
      <q-btn flat no-caps dense label="Cancelar" @click="confirmPause = false" />
    </p>

    <!-- Proteção: o número que dá paz -->
    <div class="atw__protection" :class="{ 'atw__protection--warn': protecao.abaixo_do_piso > 0 }">
      <q-icon name="shield" size="16px" aria-hidden="true" />
      <span v-if="protecao.abaixo_do_piso > 0">
        <strong>Atenção:</strong> {{ protecao.abaixo_do_piso }} anúncio(s) aplicado(s) abaixo do piso hoje.
      </span>
      <span v-else>
        Hoje <strong>nenhum preço saiu abaixo do piso</strong>
        <template v-if="protecao.menor_margem_pct !== null"> · margem mínima aplicada {{ pct(protecao.menor_margem_pct) }}</template>
        <template v-if="protecao.menor_lucro_brl !== null"> · lucro mínimo {{ brl(protecao.menor_lucro_brl) }} por unidade vendida</template>
        <template v-if="protecao.ultima_escrita_at"> · última escrita às {{ hora(protecao.ultima_escrita_at) }}</template>
      </span>
    </div>

    <!-- Console: contas + busca -->
    <div class="atw__console">
      <q-select
        v-model="contaSelecionada" dense outlined emit-value map-options
        :options="contaOptions" label="Conta" aria-label="Filtrar o resumo por conta"
        class="atw__account"
      />
      <q-input
        v-model="busca" dense outlined clearable debounce="350"
        placeholder="Buscar anúncio (título, MLB ou SKU)" aria-label="Buscar anúncio"
        class="atw__search" @update:model-value="$emit('search', busca)"
      />
    </div>

    <!-- 1º: o que foi alterado -->
    <div class="atw__block">
      <h3 class="atw__h3">1. O que foi alterado ({{ lista.length }})</h3>
      <p v-if="!lista.length" class="atw__empty">
        Nenhum anúncio alterado hoje. Se o robô está ligado e nada mudou, veja os motivos abaixo —
        o mais comum é o preço já estar no alvo.
      </p>
      <div v-else class="atw__tableWrap">
        <table class="atw__table">
          <caption class="atw__caption">Anúncios alterados hoje, com preço antes e depois</caption>
          <thead>
            <tr>
              <th scope="col">Anúncio</th>
              <th scope="col">Antes</th>
              <th scope="col">Depois</th>
              <th scope="col">Margem</th>
              <th scope="col">Lucro/un.</th>
              <th scope="col">Quem aplicou</th>
              <th scope="col">Hora</th>
              <th scope="col"><span class="atw__sr">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in lista" :key="`${w.item_id}-${w.at}`">
              <th scope="row" class="atw__item">
                <span class="atw__mlb">{{ w.item_id }}</span>
                <span class="atw__title">{{ w.title || '—' }}</span>
              </th>
              <td data-label="Antes">{{ w.price_before ? brl(w.price_before) : '—' }}</td>
              <td data-label="Depois"><strong>{{ w.price_after ? brl(w.price_after) : '—' }}</strong></td>
              <td data-label="Margem">{{ w.margin_pct ? pct(Number(w.margin_pct)) : '—' }}</td>
              <td data-label="Lucro/un.">{{ w.profit_unit ? brl(w.profit_unit) : '—' }}</td>
              <td data-label="Quem aplicou">{{ w.origin === 'reconcile' ? 'confirmado depois' : 'robô' }}</td>
              <td data-label="Hora">{{ hora(w.at) }}</td>
              <td>
                <q-btn flat dense no-caps size="sm" icon="open_in_new" label="abrir"
                       :aria-label="`Abrir o anúncio ${w.item_id}`" @click="$emit('open-item', w.item_id)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="semDadoAntes" class="atw__hint">
        Escritas anteriores a 11/09/2026 não têm o preço anterior registrado — aparecem como “—”.
      </p>
    </div>

    <!-- 2º: quem espera você -->
    <div v-if="total.aguardando_aval" class="atw__block atw__block--action">
      <h3 class="atw__h3">2. Esperando você ({{ total.aguardando_aval }})</h3>
      <p>
        {{ total.aguardando_aval }} anúncios estão prontos e parados no portão da primeira leva.
        Se você não aprovar, o robô escreve no máximo {{ waveSize }} por dia e para —
        nada muda sozinho além disso.
      </p>
      <q-btn
        unelevated no-caps color="primary" icon="check_circle"
        label="Aprovar a próxima leva" :loading="approving"
        @click="approveCanary"
      />
    </div>

    <!-- 3º: por que não mexeu (proteção, não erro) -->
    <div class="atw__block">
      <h3 class="atw__h3">
        3. Ele não mexeu no preço de {{ naoMexidos }} anúncios que avaliou
      </h3>
      <p class="atw__lead">
        <strong>Isso é proteção, não erro.</strong> Você não precisa fazer nada — cada motivo:
      </p>
      <ul class="atw__motivos">
        <li v-if="total.ja_no_alvo">
          <strong>{{ total.ja_no_alvo }}</strong> já estavam no preço-alvo — nada a fazer.
        </li>
        <li v-for="motivo in motivos" :key="motivo.codigo">
          <strong>{{ motivo.anuncios }}</strong> {{ motivo.label }}.
        </li>
        <li v-if="!total.ja_no_alvo && !motivos.length">Nenhum bloqueio registrado hoje.</li>
      </ul>
      <p v-if="naoAvaliados" class="atw__hint">
        Outros {{ naoAvaliados }} anúncios <strong>nem foram avaliados</strong>: a escrita automática
        está desligada nas contas deles.
      </p>
    </div>

    <!-- 4º: ciclo e universo -->
    <footer class="atw__foot">
      <span>
        <template v-if="ciclo">
          Última execução: {{ hora(ciclo.started_at) }},
          {{ duracao(ciclo.duration_seconds) }},
          {{ ciclo.items_processed || 0 }} alterado(s)
          <template v-if="ciclo.unreconciled"> · {{ ciclo.unreconciled }} aguardando confirmação</template>
          <template v-if="ciclo.errors_count"> · {{ ciclo.errors_count }} erro(s)</template>
          · status {{ statusLabel(ciclo.status) }}
        </template>
        <template v-else-if="!cycleToday">
          <strong>Sem registro do ciclo de hoje</strong> — provavelmente interrompido no limite de tempo.
        </template>
      </span>
      <span>
        Próxima: {{ proximo }} ·
        {{ contasLabel }} · {{ total.anuncios_ativos }} anúncios ativos ·
        {{ total.no_plano }} entraram no plano do dia
      </span>
    </footer>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';

import SbBadge from 'src/components/common/SbBadge.vue';
import MercadoLivreService from 'src/services/MercadoLivreService';
import { brl, pct } from 'src/utils/advisorDecision';

const props = defineProps({
  automation: { type: Object, required: true },
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(['updated', 'search', 'open-item']);

const pausing = ref(false);
const approving = ref(false);
const confirmPause = ref(false);
const busca = ref('');
const contaSelecionada = ref('');
const SEM_DADO_MOTIVO = 'registro anterior ao acompanhamento';

// Cada conta vem como `{account_id: {...estado}}` — a chave É o account_id do Mercado Livre.
const contas = computed(() => Object.entries(props.automation?.by_account || {})
  .map(([id, estado]) => ({ account_id: id, ...estado })));
const contaOptions = computed(() => [
  { value: '', label: `Todas as ${contas.value.length} contas` },
  ...contas.value.map((c) => ({ value: c.account_id, label: c.account_nickname || c.account_id })),
]);
const selecionadas = computed(() => (
  contaSelecionada.value
    ? contas.value.filter((c) => c.account_id === contaSelecionada.value)
    : contas.value
));
const contasLabel = computed(() => (contaSelecionada.value ? '1 conta' : `suas ${contas.value.length} contas`));

/** Soma os baldes das contas visíveis — os baldes são por conta no payload. */
const total = computed(() => {
  const base = { alterados: 0, ja_no_alvo: 0, nao_confirmados: 0, recusados: 0, bloqueados: 0,
                 no_plano: 0, anuncios_ativos: 0, aguardando_aval: 0, sem_dado_de_custo: 0 };
  for (const conta of selecionadas.value) {
    const t = conta.today || {};
    for (const k of Object.keys(base)) base[k] += Number(t[k] || 0);
  }
  return base;
});

// `WRITE_DISABLED` não é decisão sobre o anúncio: é conta desligada (não avaliado). Fica
// separado para o dono não ler "o robô decidiu não mexer" onde na verdade ele nem olhou.
const motivos = computed(() => {
  const acc = new Map();
  for (const conta of selecionadas.value) {
    for (const [codigo, info] of Object.entries(conta.today?.motivos || {})) {
      if (codigo === 'WRITE_DISABLED') continue;
      const atual = acc.get(codigo) || { codigo, anuncios: 0, label: info.label };
      atual.anuncios += Number(info.anuncios || 0);
      acc.set(codigo, atual);
    }
  }
  return [...acc.values()].sort((a, b) => b.anuncios - a.anuncios);
});

const naoAvaliados = computed(() => {
  let total = 0;
  for (const conta of selecionadas.value) {
    total += Number(conta.today?.motivos?.WRITE_DISABLED?.anuncios || 0);
  }
  return total;
});

// O que o robô **avaliou e decidiu não mexer** (exclui conta desligada, que nem foi olhada).
const naoMexidos = computed(() => total.value.ja_no_alvo + Math.max(total.value.bloqueados - naoAvaliados.value, 0));

const lista = computed(() => {
  const todas = selecionadas.value.flatMap((conta) => conta.last_writes || []);
  return todas.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 10);
});

const semDadoAntes = computed(() => lista.value.some((w) => w.price_before === null || w.price_before === undefined));

const protecao = computed(() => {
  const aplicadas = selecionadas.value.map((conta) => conta.protection).filter(Boolean);
  if (!aplicadas.length) return { aplicadas: 0, abaixo_do_piso: 0, menor_margem_pct: null, menor_lucro_brl: null, ultima_escrita_at: null };
  const margens = aplicadas.map((p) => p.menor_margem_pct === null ? Infinity : p.menor_margem_pct);
  const lucros = aplicadas.map((p) => p.menor_lucro_brl === null ? Infinity : p.menor_lucro_brl);
  const horas = aplicadas.map((p) => p.ultima_escrita_at).filter(Boolean).sort();
  return {
    aplicadas: aplicadas.reduce((s, p) => s + (p.aplicadas || 0), 0),
    abaixo_do_piso: aplicadas.reduce((s, p) => s + (p.abaixo_do_piso || 0), 0),
    menor_margem_pct: Number.isFinite(Math.min(...margens)) ? Math.min(...margens) : null,
    menor_lucro_brl: Number.isFinite(Math.min(...lucros)) ? Math.min(...lucros) : null,
    ultima_escrita_at: horas.length ? horas[horas.length - 1] : null,
  };
});

function quandoProximo(iso) {
  if (!iso) return 'amanhã 09:00 (Brasília)';
  const alvo = new Date(iso);
  const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const hoje = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date());
  const dia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(alvo);
  const horaTxt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(alvo);
  return dia === hoje ? `hoje ${horaTxt} (Brasília)` : `${dia} ${horaTxt} (Brasília)`;
}

const identityLine = computed(() => {
  const ligadas = contas.value.filter((c) => c.auto_write);
  const quando = `próxima: ${quandoProximo(props.automation?.next_cycle_at)}`;
  if (!ligadas.length) return `escrita automática desligada · ${quando}`;
  const nomes = ligadas.map((c) => c.account_nickname || c.account_id).join(', ');
  return `ligado em ${nomes} · escreve 1×/dia às 09:00 · ${quando}`;
});

const stateBadge = computed(() => {
  if (total.value.aguardando_aval) return { variant: 'amber', icon: 'hourglass_top', label: `${total.value.aguardando_aval} esperam você` };
  if (contas.value.some((c) => c.paused)) return { variant: 'amber', icon: 'pause', label: 'escrita pausada' };
  if (!contas.value.some((c) => c.auto_write)) return { variant: 'slate', icon: 'pause', label: 'escrita desligada' };
  if (total.value.alterados) return { variant: 'green', icon: 'check_circle', label: 'nada a fazer' };
  return { variant: 'green', icon: 'check_circle', label: 'nada a fazer hoje' };
});

const ciclo = computed(() => props.automation?.last_cycle || null);
const cycleToday = computed(() => Boolean(props.automation?.cycle_today));
const proximo = computed(() => quandoProximo(props.automation?.next_cycle_at));
const waveSize = computed(() => selecionadas.value[0]?.wave_size || 10);
const ligadoAgora = computed(() => contas.value.some((c) => c.auto_write));

const STATUS_LABEL = { success: 'concluído', partial: 'parcial (com pendências)', error: 'com erro', skipped: 'pulado' };
function statusLabel(status) { return STATUS_LABEL[status] || status || '—'; }
function hora(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
}
function duracao(segundos) {
  if (!segundos) return '—';
  const min = Math.floor(segundos / 60);
  const seg = Math.round(segundos % 60);
  return min ? `${min} min ${seg} s` : `${seg} s`;
}

async function pauseAll() {
  pausing.value = true;
  try {
    await MercadoLivreService.pauseAllAdvisorWrites({ pause_all: true });
    confirmPause.value = false;
    emit('updated');
  } finally {
    pausing.value = false;
  }
}

async function approveCanary() {
  approving.value = true;
  try {
    const alvo = selecionadas.value.find((c) => c.canary_pending) || selecionadas.value[0];
    if (alvo) {
      await MercadoLivreService.patchAdvisorPolicy({ account_id: alvo.account_id, canary_approved: true });
    }
    emit('updated');
  } finally {
    approving.value = false;
  }
}
</script>

<style scoped>
.atw { display: block; margin-bottom: 16px; }
.atw__top { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
.atw__id { flex: 1 1 220px; }
.atw__what { display: block; font-weight: 700; font-size: 14px; }
.atw__how { display: block; font-size: 12px; opacity: .75; }
.atw__big { display: flex; align-items: baseline; gap: 8px; }
.atw__big strong { font-size: 32px; line-height: 1; }
.atw__big span { font-size: 13px; }
.atw__state { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.atw__confirm { margin: 12px 0 0; font-size: 13px; }
.atw__protection { display: flex; align-items: center; gap: 6px; margin: 12px 0; font-size: 13px; }
.atw__protection--warn { color: #c10015; font-weight: 600; }
.atw__console { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.atw__account { min-width: 180px; }
.atw__search { flex: 1 1 220px; }
.atw__block { margin: 16px 0; }
.atw__h3 { font-size: 14px; font-weight: 700; margin: 0 0 8px; }
.atw__lead, .atw__empty, .atw__hint { font-size: 13px; margin: 0 0 8px; }
.atw__hint { opacity: .75; }
.atw__tableWrap { overflow-x: auto; }
.atw__table { width: 100%; border-collapse: collapse; font-size: 13px; }
.atw__caption { text-align: left; font-size: 12px; opacity: .75; padding-bottom: 6px; }
.atw__table th, .atw__table td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--sb-border, #eee); white-space: nowrap; }
.atw__item { display: flex; flex-direction: column; }
.atw__mlb { font-weight: 600; }
.atw__title { font-size: 12px; opacity: .75; white-space: normal; }
.atw__motivos { margin: 0; padding-left: 20px; font-size: 13px; }
.atw__motivos li { margin-bottom: 4px; }
.atw__foot { display: flex; flex-direction: column; gap: 4px; font-size: 12px; opacity: .85; }
.atw__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

/* Mobile: cada anúncio vira cartão com rótulo (antes/depois não podem virar dois números soltos) */
@media (max-width: 599px) {
  .atw__table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .atw__table tr { display: block; border: 1px solid var(--sb-border, #eee); border-radius: 8px; padding: 8px; margin-bottom: 8px; }
  .atw__table th, .atw__table td { display: block; border: 0; padding: 2px 0; white-space: normal; }
  .atw__table td::before { content: attr(data-label) ': '; font-weight: 600; }
}
</style>
