<template>
  <AdvisorShell
    active="automacao"
    pergunta="Quem está autorizado a escrever, qual é a régua — e como eu paro tudo?"
  >
    <template #actions>
      <q-btn flat dense no-caps icon="refresh" label="Atualizar" :loading="carregando" @click="recarregar" />
    </template>

    <AdvisorEmptyState v-if="erro && !data" variant="erro" :message="erro">
      <template #action>
        <q-btn unelevated no-caps color="primary" icon="refresh" label="Tentar novamente" @click="recarregar" />
      </template>
    </AdvisorEmptyState>

    <AdvisorEmptyState v-else-if="carregando && !data" variant="carregando" />

    <template v-else-if="data">
      <!-- 1. Estado agora: quem escreve, e o botão que para tudo -->
      <div class="aut__estado" :class="classeEstado">
        <q-icon :name="iconeEstado" size="20px" aria-hidden="true" />
        <div class="aut__estadoTexto">
          <strong>{{ tituloEstado }}</strong>
          <span>{{ detalheEstado }}</span>
        </div>
        <q-btn
          v-if="escrevendo.length" outline no-caps dense color="negative" icon="pause_circle"
          label="Pausar toda a escrita" :loading="salvando === 'todas'" @click="confirmarPausa = true"
        />
      </div>

      <p v-if="confirmarPausa" class="aut__confirmar" role="alert">
        Desliga a escrita automática em <strong>todas as contas</strong> agora — vale no meio do
        ciclo, antes de qualquer envio ao Mercado Livre. As promoções <strong>já aplicadas continuam
        no ar</strong>; nada é desfeito.
        <q-btn unelevated no-caps dense color="negative" label="Confirmar pausa"
               :loading="salvando === 'todas'" @click="pausar()" />
        <q-btn flat no-caps dense label="Cancelar" @click="confirmarPausa = false" />
      </p>

      <p v-if="aviso" class="aut__aviso" role="status">
        <q-icon name="check_circle" size="15px" aria-hidden="true" />{{ aviso }}
      </p>
      <p v-if="erro" class="aut__erro" role="alert">
        <q-icon name="error_outline" size="15px" aria-hidden="true" />{{ erro }}
      </p>

      <!-- 2. Por conta: o controle fica ao lado do que ele significa -->
      <AdvisorSection title="Suas contas" :count="contas.length"
                      lead="Cada conta decide sozinha. Desligar aqui não desfaz nada no Mercado Livre — só impede a próxima escrita.">
        <ul class="aut__contas">
          <li v-for="conta in contas" :key="conta.account_id" class="aut__conta">
            <header>
              <strong>{{ conta.account_nickname }}</strong>
              <AdvisorStatusPill :status="estadoDaConta(conta).status">{{ estadoDaConta(conta).label }}</AdvisorStatusPill>
            </header>

            <div class="aut__linha">
              <q-toggle
                :model-value="conta.auto_write" color="primary" keep-color
                :disable="salvando === conta.account_id"
                :label="conta.auto_write ? 'O robô escreve sozinho' : 'O robô só recomenda'"
                @update:model-value="(v) => ligarDesligar(conta, v)"
              />
              <q-input
                v-model="levas[conta.account_id]" type="number" dense outlined
                label="Leva (anúncios por onda)" class="aut__leva"
                :disable="salvando === conta.account_id || !conta.auto_write"
                @blur="salvarLeva(conta)"
              >
                <template #hint>Quantos anúncios o robô altera por onda antes de parar no portão.</template>
              </q-input>
            </div>

            <p v-if="conta.paused" class="aut__pausada">
              <q-icon name="pause_circle" size="14px" aria-hidden="true" />
              Pausada{{ conta.pause_reason ? `: ${conta.pause_reason}` : '' }}.
              <q-btn flat dense no-caps label="Retomar" :loading="salvando === conta.account_id"
                     @click="retomar(conta)" />
            </p>

            <p v-if="conta.canary_pending && conta.auto_write" class="aut__canario">
              <q-icon name="verified_user" size="14px" aria-hidden="true" />
              Primeira leva esperando o seu aval: até sair, o robô não escreve por essa conta.
              <q-btn unelevated dense no-caps color="primary" label="Aprovar a primeira leva"
                     :loading="salvando === conta.account_id" @click="aprovarLeva(conta)" />
            </p>

            <ul v-if="(conta.margin_alerts || []).length" class="aut__alertas">
              <li v-for="alerta in conta.margin_alerts" :key="alerta.item_id">
                <strong>{{ pct(alerta.margin_pct) }}</strong> de margem em
                <span class="aut__mlb">{{ alerta.item_id }}</span> {{ alerta.title }} —
                abaixo do limite de {{ pct(alerta.threshold_pct) }} para anúncio SMART.
                O robô <strong>não escreve</strong> nesses: só sinaliza.
              </li>
            </ul>
          </li>
        </ul>
      </AdvisorSection>

      <!-- 3. Como funciona: a régua ao lado do controle, não em outra página -->
      <AdvisorSection title="Como o robô decide" tight>
        <div class="aut__regua">
          <div>
            <h4>Margem-alvo por saúde de vendas</h4>
            <ul>
              <li><strong>Parado ou fraco</strong> (até 1 venda/semana): pode aprofundar desconto até <strong>30%</strong> de margem — o objetivo é destravar a venda.</li>
              <li><strong>Médio</strong> (1 a 3 vendas/semana): alvo de <strong>40%</strong>; abaixo disso o robô reduz o desconto.</li>
              <li><strong>Alto</strong> (3 ou mais/semana): <strong>não mexe</strong> — se vende, está bom.</li>
            </ul>
          </div>
          <div>
            <h4>Pisos que nunca são cruzados</h4>
            <ul>
              <li>Margem mínima de <strong>30%</strong> e lucro mínimo de <strong>R$ 12 por venda</strong>. Se o preço oferecido não fecha os dois, o robô não escreve.</li>
              <li>Se a margem atual já está <strong>abaixo de 30%</strong>, o caminho é <strong>rebase de preço</strong> no precificador — não mais desconto.</li>
              <li>Frete estimado com pouca amostra (&gt; R$ 25 ou &gt; 20% do preço): marcado como <strong>sem certeza</strong> e não é auto-ativado.</li>
            </ul>
          </div>
          <div>
            <h4>Trava de repetição</h4>
            <ul>
              <li><strong>Uma escrita por anúncio por dia</strong> — o robô não escreve duas vezes no mesmo anúncio.</li>
              <li><strong>SMART</strong> (preço definido pelo Mercado Livre) com margem abaixo de 25%: só sinaliza, nunca escreve.</li>
              <li>Anúncio com <strong>cupom ativo</strong> ou com <strong>variações</strong> fica fora da escrita automática.</li>
            </ul>
          </div>
          <div>
            <h4>O ciclo do dia</h4>
            <ul>
              <li>Roda todo dia às <strong>09:00 (Brasília)</strong>; a próxima execução aparece no rodapé da aba <strong>Hoje</strong>.</li>
              <li>Cada escrita é conferida no Mercado Livre; o que não confirma é relido no dia seguinte.</li>
              <li>O ciclo nunca passa do orçamento de tempo: o que não coube entra no próximo.</li>
            </ul>
          </div>
        </div>
      </AdvisorSection>

      <AdvisorSection title="Glossário" tight>
        <dl class="aut__glossario">
          <div v-for="termo in GLOSSARIO" :key="termo.nome">
            <dt>{{ termo.nome }}</dt><dd>{{ termo.texto }}</dd>
          </div>
        </dl>
      </AdvisorSection>
    </template>
  </AdvisorShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

import AdvisorEmptyState from 'src/components/advisor/AdvisorEmptyState.vue';
import AdvisorSection from 'src/components/advisor/AdvisorSection.vue';
import AdvisorShell from 'src/components/advisor/AdvisorShell.vue';
import AdvisorStatusPill from 'src/components/advisor/AdvisorStatusPill.vue';
import { useAdvisorAutomation } from 'src/composables/advisor/useAdvisorAutomation';
import { pct } from 'src/utils/advisorDecision';

const {
  data, carregando, erro, salvando, aviso, contas, levas, alertas,
  modoGlobal, killSwitch, travada, escrevendo, esperandoAval,
  carregar, sincronizarLevas, ligarDesligar, salvarLeva, aprovarLeva, retomar, pausarTudo,
} = useAdvisorAutomation();

const confirmarPausa = ref(false);

const GLOSSARIO = [
  { nome: 'Leva', texto: 'Quantos anúncios o robô altera numa onda antes de parar no portão.' },
  { nome: 'Piso', texto: 'Margem mínima de 30% e lucro mínimo de R$ 12 por venda. Nenhuma escrita passa por baixo.' },
  { nome: 'Portão', texto: 'Trava que segura a próxima onda: pode ser o seu aval (primeira leva) ou o teto do dia.' },
  { nome: 'Ciclo', texto: 'A execução diária das 09:00 (Brasília) que lê o mercado e decide.' },
  { nome: 'Confirmada', texto: 'Escrita conferida no Mercado Livre — o preço realmente mudou.' },
  { nome: 'Aguardando confirmação', texto: 'O robô enviou e o Mercado Livre ainda não confirmou; ele relê no próximo ciclo.' },
  { nome: 'Recusada', texto: 'O Mercado Livre não aceitou a mudança; o preço ficou como estava.' },
  { nome: 'SMART', texto: 'Anúncio cujo preço é definido pelo Mercado Livre. O robô só sinaliza a margem.' },
  { nome: 'Saúde de vendas', texto: 'Parado (0 venda em 14 dias sob promoção), fraco (até 1/semana), médio (1 a 3) ou alto (3+).' },
];

const tituloEstado = computed(() => {
  if (killSwitch.value) return 'A escrita está barrada pelo interruptor de emergência';
  if (!modoGlobal.value) return 'A escrita automática está desligada no ambiente';
  if (!escrevendo.value.length) return 'Nenhuma conta está escrevendo agora';
  const nomes = escrevendo.value.map((c) => c.account_nickname).join(', ');
  return `${escrevendo.value.length} conta(s) escrevendo agora: ${nomes}`;
});

const detalheEstado = computed(() => {
  if (killSwitch.value) {
    return 'Nada é enviado ao Mercado Livre enquanto o interruptor estiver ligado, mesmo com conta autorizada.';
  }
  if (!modoGlobal.value) return 'O ambiente está em modo somente recomendação: o robô decide e mostra, mas não escreve.';
  if (!escrevendo.value.length) {
    const aval = esperandoAval.value.length
      ? ` ${esperandoAval.value.length} conta(s) já autorizada(s) só esperam o seu aval abaixo.`
      : '';
    return 'Nenhuma conta vai escrever no próximo ciclo — ligue a escrita na conta que deve agir '
      + `sozinha.${aval}`;
  }
  const leva = Math.min(...escrevendo.value.map((c) => Number(c.wave_size) || 10));
  const aval = esperandoAval.value.length
    ? ` Outra(s) ${esperandoAval.value.length} conta(s) esperam o seu aval abaixo.`
    : '';
  return `O robô altera no máximo uma leva por onda (a menor leva entre elas é de ${leva}) e para `
    + `no próximo portão.${aval}`;
});

const classeEstado = computed(() => ({
  'aut__estado--travada': travada.value,
  'aut__estado--livre': !travada.value && escrevendo.value.length > 0,
}));

const iconeEstado = computed(() => {
  if (killSwitch.value) return 'report';
  if (!modoGlobal.value) return 'power_settings_new';
  return escrevendo.value.length ? 'smart_toy' : 'pause_circle';
});

function estadoDaConta(conta) {
  if (conta.paused) return { label: 'Pausada', status: 'pausado' };
  if (!conta.auto_write) return { label: 'Só recomenda', status: 'desligado' };
  if (killSwitch.value || !modoGlobal.value) return { label: 'Autorizada, mas travada', status: 'bloqueado' };
  if (conta.canary_pending) return { label: 'Esperando seu aval', status: 'aguardando' };
  return { label: 'Escrevendo', status: 'ligado' };
}

async function recarregar() {
  await carregar();
  sincronizarLevas();
}

async function pausar() {
  await pausarTudo();
  confirmarPausa.value = false;
}

onMounted(async () => {
  await carregar();
  sincronizarLevas();
});
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.aut {
  &__estado {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: $space-4 $space-5;
    border-radius: $radius-lg;
    background: $tint-slate-bg;
    color: $tint-slate-text;
    margin-bottom: $space-4;

    &--livre { background: $tint-teal-bg; color: $tint-teal-text; }
    &--travada { background: $tint-amber-bg; color: $tint-amber-text; }
  }
  &__estadoTexto {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    strong { font-size: $text-h3-size; }
    span { font-size: $text-xs-size; opacity: .95; }
  }

  &__confirmar, &__aviso, &__erro {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-2;
    font-size: $text-small-size;
    border-radius: $radius-md;
    padding: $space-2 $space-3;
    margin: 0 0 $space-3;
  }
  &__confirmar { background: $tint-red-bg; color: $tint-red-text; }
  &__aviso { background: $tint-green-bg; color: $tint-green-text; }
  &__erro { background: $tint-red-bg; color: $tint-red-text; }

  &__contas { list-style: none; margin: 0; padding: 0; }
  &__conta {
    padding: $space-3 0;
    border-bottom: 1px solid $border;

    &:last-child { border-bottom: 0; }
    header {
      display: flex;
      align-items: center;
      gap: $space-2;
      margin-bottom: $space-2;
    }
  }
  &__linha {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $space-2;
  }
  &__leva { width: 100%; max-width: 320px; }

  // O rótulo do interruptor é a informação principal do cartão: não pode sair em letra miúda.
  &__linha :deep(.q-toggle__label) {
    font-size: $text-small-size;
    color: $text-body;
  }

  &__pausada, &__canario {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-2;
    font-size: $text-small-size;
    margin: $space-2 0 0;
  }
  &__pausada { color: $text-muted; }
  &__canario { color: $text-body; }

  &__alertas {
    list-style: none;
    margin: $space-2 0 0;
    padding: $space-2 $space-3;
    background: $tint-amber-bg;
    color: $tint-amber-text;
    border-radius: $radius-md;
    font-size: $text-xs-size;

    li + li { margin-top: $space-2; }
  }
  &__mlb { font-variant-numeric: tabular-nums; }

  &__regua {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: $space-5;

    h4 {
      font-size: $text-small-size;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: $text-muted;
      margin: 0 0 $space-2;
    }
    ul { margin: 0; padding-left: $space-4; }
    li { font-size: $text-small-size; line-height: 1.5; margin-bottom: $space-2; }
  }

  &__glossario {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: $space-3 $space-5;
    margin: 0;

    dt { font-weight: $font-semibold; font-size: $text-small-size; }
    dd { margin: 0 0 $space-2; font-size: $text-xs-size; color: $text-muted; line-height: 1.5; }
  }
}

@media (max-width: 640px) {
  .aut {
    &__estado { flex-direction: column; align-items: stretch; }
    &__linha { gap: $space-3; }
    &__leva { max-width: none; }
  }
}
</style>
