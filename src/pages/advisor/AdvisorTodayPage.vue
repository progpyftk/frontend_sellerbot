<template>
  <AdvisorShell
    active="hoje"
    pergunta="O que o robô fez hoje, o que espera por você e está tudo dentro do piso?"
  >
    <template #actions>
      <q-btn flat dense no-caps icon="refresh" label="Atualizar" :loading="carregando" @click="carregar" />
    </template>

    <AdvisorEmptyState v-if="erro" variant="erro" :message="erro">
      <template #action>
        <q-btn unelevated no-caps color="primary" icon="refresh" label="Tentar novamente" @click="carregar" />
      </template>
    </AdvisorEmptyState>

    <AdvisorEmptyState v-else-if="carregando && !data" variant="carregando" />

    <template v-else-if="data">
      <!-- Proteção: a resposta que o dono mais precisa, antes de qualquer número -->
      <div class="today__shield" :class="{ 'today__shield--warn': protecao.abaixo_do_piso > 0 }">
        <q-icon :name="protecao.abaixo_do_piso > 0 ? 'report' : 'shield'" size="20px" aria-hidden="true" />
        <div class="today__shieldText">
          <strong v-if="protecao.abaixo_do_piso > 0">
            {{ protecao.abaixo_do_piso }} anúncio(s) aplicado(s) abaixo do piso hoje
          </strong>
          <strong v-else>Nenhum preço saiu abaixo do piso</strong>
          <span>
            margem mínima aplicada {{ protecao.menor_margem_pct === null ? '—' : pct(protecao.menor_margem_pct) }} ·
            lucro mínimo {{ protecao.menor_lucro_brl === null ? '—' : brl(protecao.menor_lucro_brl) }} por unidade vendida ·
            última leitura {{ hora(protecao.ultima_escrita_at) }}
          </span>
        </div>
        <q-btn
          outline no-caps dense color="negative" icon="pause_circle"
          label="Pausar toda a escrita" :loading="pausando" @click="confirmarPausa = true"
        />
      </div>

      <p v-if="confirmarPausa" class="today__confirm" role="alert">
        Desliga a escrita automática em <strong>todas as contas</strong> agora (vale no meio do ciclo).
        As promoções já aplicadas <strong>continuam no ar</strong>.
        <q-btn unelevated no-caps dense color="negative" label="Confirmar pausa" :loading="pausando" @click="pausarTudo" />
        <q-btn flat no-caps dense label="Cancelar" @click="confirmarPausa = false" />
      </p>

      <!-- Números do dia: o que importa primeiro, cada um com unidade -->
      <div class="today__metrics">
        <AdvisorMetric :value="total.alterados" label="anúncios alterados hoje" :variant="total.alterados ? 'ok' : 'neutral'"
                       :hint="`${escrita.nomes || 'nenhuma conta ligada'} · leva de ${escrita.leva}`" />
        <AdvisorMetric :value="total.ja_no_alvo" label="já estavam no preço-alvo" hint="nada a fazer" />
        <AdvisorMetric :value="total.nao_confirmados" label="aguardando confirmação do ML" hint="o robô relê no ciclo seguinte" />
        <AdvisorMetric :value="total.recusados" label="recusados pelo Mercado Livre" hint="o preço não mudou" />
        <AdvisorMetric :value="naoMexidosQueAvaliou" label="não mexeu (avaliados)" hint="por regra de proteção" />
      </div>

      <!-- O que foi alterado: o dado vem ANTES da explicação -->
      <AdvisorSection title="O que foi alterado" :count="total.alterados">
        <AdvisorEmptyState v-if="!escritas.length" variant="vazio"
                           title="Nenhum anúncio alterado hoje"
                           message="Se o robô está ligado e nada mudou, veja os motivos abaixo — o mais comum é o preço já estar no alvo." />
        <div v-else class="today__tableWrap">
          <table class="today__table">
            <caption class="today__caption">Anúncios alterados hoje, com preço antes e depois</caption>
            <thead>
              <tr>
                <th scope="col">Anúncio</th><th scope="col">Antes</th><th scope="col">Depois</th>
                <th scope="col">Margem</th><th scope="col">Lucro/un.</th><th scope="col">Estado</th>
                <th scope="col">Hora</th><th scope="col"><span class="today__sr">Abrir</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in escritas" :key="`${w.item_id}-${w.at}`">
                <th scope="row" class="today__item">
                  <span class="today__mlb">{{ w.item_id }}</span>
                  <span class="today__title">{{ w.title || '—' }}</span>
                </th>
                <td data-label="Antes">{{ w.price_before ? brl(w.price_before) : '—' }}</td>
                <td data-label="Depois"><strong>{{ w.price_after ? brl(w.price_after) : '—' }}</strong></td>
                <td data-label="Margem">{{ w.margin_pct ? pct(Number(w.margin_pct)) : '—' }}</td>
                <td data-label="Lucro/un.">{{ w.profit_unit ? brl(w.profit_unit) : '—' }}</td>
                <td data-label="Estado">
                  <AdvisorStatusPill :status="w.origin === 'reconcile' ? 'aguardando' : 'verificado'
                                     ">{{ w.origin === 'reconcile' ? 'confirmado depois' : 'robô' }}</AdvisorStatusPill>
                </td>
                <td data-label="Hora">{{ hora(w.at) }}</td>
                <td>
                  <q-btn flat dense no-caps size="sm" icon="open_in_new" label="abrir"
                         :aria-label="`Abrir o anúncio ${w.item_id}`"
                         @click="$router.push({ name: 'promotions-advisor-anuncios', query: { item: w.item_id } })" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="total.alterados > escritas.length" class="today__hint">
          Exibindo {{ escritas.length }} de {{ total.alterados }} alterações de hoje — as mais recentes primeiro.
        </p>
        <p v-if="algumSemAntes" class="today__hint">
          Escritas anteriores a 11/09/2026 não têm o preço anterior registrado — aparecem como “—”.
        </p>
      </AdvisorSection>

      <!-- Espera de aval (só aparece quando existe) -->
      <AdvisorSection v-if="total.aguardando_aval" title="Esperando você" :count="total.aguardando_aval"
                      :lead="`${total.aguardando_aval} anúncios estão prontos e parados no portão da primeira leva. Sem o seu aval, o robô escreve no máximo ${escrita.leva} por dia e para.`">
        <q-btn unelevated no-caps color="primary" icon="check_circle" label="Aprovar a próxima leva"
               :loading="aprovando" @click="aprovarLeva" />
      </AdvisorSection>

      <!-- Por que não mexeu: proteção, não erro -->
      <AdvisorSection title="Por que ele não mexeu"
                      :lead="`${naoMexidosQueAvaliou} anúncios avaliados ficaram sem alteração — em todos por uma regra de proteção. Você não precisa fazer nada.`">
        <ul class="today__motivos">
          <li v-if="total.ja_no_alvo"><strong>{{ total.ja_no_alvo }}</strong> já estavam no preço-alvo</li>
          <li v-for="motivo in motivos" :key="motivo.codigo">
            <strong>{{ motivo.anuncios }}</strong> {{ motivo.label }}
          </li>
          <li v-if="!total.ja_no_alvo && !motivos.length">Nenhum bloqueio registrado hoje.</li>
        </ul>
        <p v-if="naoAvaliados" class="today__hint">
          Outros {{ naoAvaliados }} anúncios <strong>nem foram avaliados</strong>: a escrita automática
          está desligada nas contas deles.
        </p>
      </AdvisorSection>

      <!-- Ciclo e universo -->
      <div class="today__foot">
        <span>
          <template v-if="ciclo">
            última execução {{ hora(ciclo.started_at) }}, {{ duracao(ciclo.duration_seconds) }},
            {{ ciclo.items_processed || 0 }} anúncios passaram pelo ciclo
            <template v-if="ciclo.unreconciled"> · {{ ciclo.unreconciled }} aguardando confirmação</template>
            <template v-if="ciclo.errors_count"> · {{ ciclo.errors_count }} erro(s)</template>
            · status {{ STATUS_LABEL[ciclo.status] || ciclo.status }}
          </template>
          <template v-else-if="!cicloHoje">
            <strong>Sem registro do ciclo de hoje</strong> — provavelmente interrompido no limite de tempo.
          </template>
        </span>
        <span>
          próxima {{ proximo }} · suas {{ contas.length }} contas · {{ total.anuncios_ativos }} anúncios ativos ·
          {{ total.no_plano }} entraram no plano do dia
        </span>
      </div>
    </template>
  </AdvisorShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

import AdvisorEmptyState from 'src/components/advisor/AdvisorEmptyState.vue';
import AdvisorMetric from 'src/components/advisor/AdvisorMetric.vue';
import AdvisorSection from 'src/components/advisor/AdvisorSection.vue';
import AdvisorShell from 'src/components/advisor/AdvisorShell.vue';
import AdvisorStatusPill from 'src/components/advisor/AdvisorStatusPill.vue';
import { useAdvisorToday } from 'src/composables/advisor/useAdvisorToday';
import AdvisorService from 'src/services/AdvisorService';

const {
  data, carregando, erro, carregar, contas, total, motivos, naoAvaliados,
  naoMexidosQueAvaliou, escritas, protecao, escrita, ciclo, cicloHoje,
  brl, pct, STATUS_LABEL,
} = useAdvisorToday();

const pausando = ref(false);
const aprovando = ref(false);
const confirmarPausa = ref(false);

const algumSemAntes = computed(() => escritas.value.some((w) => !w.price_before));

function hora(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    .format(new Date(iso));
}

function duracao(segundos) {
  if (!segundos) return '—';
  const min = Math.floor(segundos / 60);
  const seg = Math.round(segundos % 60);
  return min ? `${min} min ${seg} s` : `${seg} s`;
}

const proximo = computed(() => {
  const iso = data.value?.next_cycle_at;
  if (!iso) return 'amanhã 09:00 (Brasília)';
  const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  return `${fmt.format(new Date(iso))} (Brasília)`;
});

async function pausarTudo() {
  pausando.value = true;
  try {
    await AdvisorService.patchAutomation({ pause_all: true });
    confirmarPausa.value = false;
    await carregar();
  } finally {
    pausando.value = false;
  }
}

async function aprovarLeva() {
  aprovando.value = true;
  try {
    const alvo = contas.value.find((c) => c.canary_pending) || contas.value[0];
    if (alvo) await AdvisorService.patchAutomation({ account_id: alvo.account_id, canary_approved: true });
    await carregar();
  } finally {
    aprovando.value = false;
  }
}

onMounted(carregar);
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.today {
  &__shield {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: $space-4 $space-5;
    border-radius: $radius-lg;
    background: $tint-green-bg;
    color: $tint-green-text;
    margin-bottom: $space-5;

    &--warn { background: $tint-red-bg; color: $tint-red-text; }
  }

  &__shieldText {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong { font-size: $text-h3-size; }
    span { font-size: $text-xs-size; opacity: .9; }
  }

  &__confirm {
    margin: 0 0 $space-5;
    font-size: $text-small-size;
    color: $text-body;
  }

  &__metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: $space-3;
    padding: $space-5;
    background: $surface;
    border: 1px solid $border;
    border-radius: $radius-lg;
    box-shadow: $shadow-xs;
    margin-bottom: $space-4;
  }

  &__tableWrap { overflow-x: auto; }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: $text-small-size;

    th, td { text-align: left; padding: $space-2 $space-3; border-bottom: 1px solid $border; white-space: nowrap; }
    thead th { font-size: $text-xs-size; text-transform: uppercase; letter-spacing: .03em; color: $text-muted; }
    tbody tr:hover { background: $surface-2; }
    td:nth-child(2), td:nth-child(3), td:nth-child(4), td:nth-child(5) { font-variant-numeric: tabular-nums; }
  }

  &__caption { text-align: left; font-size: $text-xs-size; color: $text-muted; padding-bottom: $space-2; }
  &__item { display: flex; flex-direction: column; }
  &__mlb { font-weight: $font-semibold; color: $text-primary; }
  &__title { font-size: $text-xs-size; color: $text-muted; white-space: normal; max-width: 260px; }
  &__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

  &__motivos {
    margin: 0;
    padding-left: $space-5;
    font-size: $text-small-size;
    color: $text-body;

    li { margin-bottom: $space-1; }
  }

  &__hint { margin: $space-3 0 0; font-size: $text-xs-size; color: $text-muted; }

  &__foot {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: $space-4;
    font-size: $text-xs-size;
    color: $text-muted;
  }
}

/* Mobile: empilha a faixa de proteção, respira o grid de métricas e cada anúncio vira cartão */
@media (max-width: 599px) {
  .today__shield {
    flex-direction: column;
    align-items: flex-start;
    gap: $space-2;
    padding: $space-4;

    .q-btn { width: 100%; }
  }

  .today__shieldText strong { font-size: $text-h3-size; line-height: 1.25; display: block; }

  .today__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $space-4 $space-3;
    padding: $space-4;
  }

  .today__table {
    thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    tr { display: block; border: 1px solid $border; border-radius: $radius-md; padding: $space-3; margin-bottom: $space-2; }
    th, td { display: block; border: 0; padding: 2px 0; white-space: normal; }
    td::before { content: attr(data-label) ': '; font-weight: $font-semibold; color: $text-muted; }
  }
}
</style>
