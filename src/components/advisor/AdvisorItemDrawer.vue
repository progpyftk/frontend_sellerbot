<template>
  <!-- PROMO-IA-45: drawer lateral de drill-down — sem popup, a tabela continua visível. -->
  <aside ref="drawer" class="adv-drawer" role="dialog" aria-modal="false" aria-labelledby="adv-drawer-title" tabindex="-1">
    <header class="adv-drawer__header">
      <div>
        <strong id="adv-drawer-title" class="adv-drawer__mlb">{{ item?.item_id || 'Detalhe do anúncio' }}</strong>
        <span class="adv-drawer__titulo">{{ item?.title || '' }}</span>
        <span class="adv-drawer__conta">{{ item?.account_nickname || '' }}</span>
      </div>
      <q-btn flat dense no-caps icon="close" label="fechar" @click="$emit('fechar')" />
    </header>

    <!-- PROMO-IA-47 (portado): entrada manual na fila de revisão — a decisão continua
         com o dono em "Anúncios · Revisão SEO". -->
    <div v-if="detalhe" class="adv-drawer__acoes">
      <q-btn unelevated no-caps color="primary" icon="playlist_add"
             label="Enviar para revisão" :loading="revisaoEstado === 'enviando'"
             :disable="revisaoEstado === 'enviado'" @click="$emit('enviar-revisao')" />
      <p v-if="revisaoEstado === 'erro'" class="adv-drawer__erro" role="alert">{{ revisaoMensagem }}</p>
      <p v-if="revisaoEstado === 'enviado'" class="adv-drawer__nota" role="status">
        Enfileirado para revisão — você decide o que aplicar em
        <router-link :to="{ name: 'items-seo-review' }">Anúncios · Revisão</router-link>.
      </p>
    </div>

    <p v-if="erro" class="adv-drawer__erro" role="alert">{{ erro }}</p>
    <p v-else-if="carregando" class="adv-drawer__nota" role="status">Carregando o retrato do anúncio…</p>

    <template v-else-if="detalhe">
      <section class="adv-drawer__secao" aria-label="Situação atual do anúncio">
        <h3>Situação atual</h3>
        <p><strong>{{ promotionLabel }}</strong> · consultado {{ dataHora(detalhe.consulted_at) }}</p>
        <p v-if="detalhe.observed_price?.amount != null">
          Preço observado: <strong>{{ brl(detalhe.observed_price.amount) }}</strong>
          <span v-if="detalhe.observed_price.condition === 'coupon_at_checkout'"> (cupom condicionado ao carrinho)</span>
        </p>
        <p v-else>Preço ao comprador não confirmado nesta consulta.</p>
      </section>

      <section class="adv-drawer__secao" aria-label="Última atuação e próximo passo">
        <h3>Última atuação e próximo passo</h3>
        <p>{{ lastAction.label }} <span v-if="lastAction.at">· {{ dataHora(lastAction.at) }}</span></p>
        <p>{{ detalhe.next_step?.label || 'Próximo passo não registrado' }}</p>
        <p v-if="detalhe.next_step?.owner">Responsável: {{ ownerLabel(detalhe.next_step.owner) }}</p>
        <p v-if="detalhe.next_step?.next_attempt_at">Tentativa prevista: {{ dataHora(detalhe.next_step.next_attempt_at) }}</p>
      </section>

      <section class="adv-drawer__secao" aria-label="Bases dos cálculos financeiros">
        <h3>Cálculos financeiros</h3>
        <p class="adv-drawer__nota">Estimativas de momentos diferentes não são lucro realizado.</p>
        <div v-if="detalhe.financials?.execution_estimate" class="adv-drawer__calc">
          <strong>Na execução · {{ dataHora(detalhe.financials.execution_estimate.at) }}</strong>
          <p>Preço {{ brl(detalhe.financials.execution_estimate.price) }} · margem {{ pct(detalhe.financials.execution_estimate.gate?.margin_pct) }} · lucro {{ brl(detalhe.financials.execution_estimate.gate?.profit) }}</p>
        </div>
        <div v-if="detalhe.financials?.snapshot_estimate" class="adv-drawer__calc">
          <strong>No retrato · {{ dataHora(detalhe.financials.snapshot_estimate.at) }}</strong>
          <p>Preço {{ brl(detalhe.financials.snapshot_estimate.price) }} · margem {{ pct(detalhe.financials.snapshot_estimate.margin_pct) }} · lucro {{ brl(detalhe.financials.snapshot_estimate.profit_unit) }}</p>
          <p>Frete estimado {{ brl(detalhe.financials.snapshot_estimate.shipping_cost) }} · custo {{ brl(detalhe.financials.snapshot_estimate.cmv_unit) }}</p>
        </div>
        <p v-if="!detalhe.financials?.realized" class="adv-drawer__nota">Resultado realizado ainda não medido nesta visão.</p>
      </section>

      <section class="adv-drawer__secao">
        <h3>Ofertadas <span v-if="ofertadas.length">({{ ofertadas.length }})</span></h3>
        <p v-if="!ofertadas.length" class="adv-drawer__nota">Nenhuma oferta disponível agora.</p>
        <ul class="adv-drawer__promos">
          <li v-for="promo in ofertadas" :key="promo.promotion_id || promo.offer_id">
            <div class="adv-drawer__promoTopo">
              <strong>{{ promo.name || promo.promotion_type }}</strong>
              <span class="adv-drawer__tipo">{{ promo.promotion_type }}</span>
            </div>
            <dl class="adv-drawer__fin">
              <div><dt>Preço no desconto</dt><dd>{{ brl(promo.financials?.proposed_price) }}</dd></div>
              <div><dt>Desconto</dt><dd>{{ pct(promo.discount_pct ?? promo.financials?.discount_pct) }}</dd></div>
              <div><dt>Margem</dt><dd>{{ pct(promo.financials?.estimated_margin_pct) }}</dd></div>
              <div><dt>Lucro por venda</dt><dd>{{ brl(promo.financials?.estimated_profit_unit) }}</dd></div>
              <div v-if="promo.financials?.price_range">
                <dt>Faixa do preço</dt>
                <dd>{{ brl(promo.financials.price_range.min) }} a {{ brl(promo.financials.price_range.max) }}</dd>
              </div>
            </dl>
          </li>
        </ul>
      </section>

      <section class="adv-drawer__secao">
        <h3>Ativas <span v-if="ativas.length">({{ ativas.length }})</span></h3>
        <p v-if="!ativas.length" class="adv-drawer__nota">Nenhuma promoção ativa.</p>
        <ul class="adv-drawer__promos">
          <li v-for="promo in ativas" :key="promo.promotion_id || promo.offer_id">
            <div class="adv-drawer__promoTopo">
              <strong>{{ promo.name || promo.promotion_type }}</strong>
              <span class="adv-drawer__tipo">{{ promo.promotion_type }}</span>
            </div>
            <dl class="adv-drawer__fin">
              <div><dt>Preço na promoção</dt><dd>{{ brl(promo.financials?.proposed_price) }}</dd></div>
              <div><dt>Desconto</dt><dd>{{ pct(promo.discount_pct ?? promo.financials?.discount_pct) }}</dd></div>
              <div><dt>Margem</dt><dd>{{ pct(promo.financials?.estimated_margin_pct) }}</dd></div>
              <div><dt>Lucro por venda</dt><dd>{{ brl(promo.financials?.estimated_profit_unit) }}</dd></div>
              <div><dt>Início</dt><dd>{{ dataCurta(promo.start_date) }}</dd></div>
              <div><dt>Fim</dt><dd>{{ dataCurta(promo.finish_date) }}</dd></div>
            </dl>
          </li>
        </ul>
      </section>

      <section class="adv-drawer__secao">
        <h3>Programadas <span v-if="programadas.length">({{ programadas.length }})</span></h3>
        <p v-if="!programadas.length" class="adv-drawer__nota">Nada aguardando início.</p>
        <ul class="adv-drawer__promos">
          <li v-for="promo in programadas" :key="promo.promotion_id || promo.offer_id">
            <div class="adv-drawer__promoTopo">
              <strong>{{ promo.name || promo.promotion_type }}</strong>
              <span class="adv-drawer__tipo">{{ promo.promotion_type }} · {{ promo.status }}</span>
            </div>
            <dl class="adv-drawer__fin">
              <div><dt>Preço previsto</dt><dd>{{ brl(promo.financials?.proposed_price) }}</dd></div>
              <div><dt>Desconto</dt><dd>{{ pct(promo.discount_pct ?? promo.financials?.discount_pct) }}</dd></div>
              <div><dt>Margem</dt><dd>{{ pct(promo.financials?.estimated_margin_pct) }}</dd></div>
              <div><dt>Lucro por venda</dt><dd>{{ brl(promo.financials?.estimated_profit_unit) }}</dd></div>
              <div><dt>Início</dt><dd>{{ dataCurta(promo.start_date) }}</dd></div>
            </dl>
          </li>
        </ul>
      </section>

      <section class="adv-drawer__secao">
        <h3>Dados do anúncio</h3>
        <dl class="adv-drawer__fin">
          <div><dt>SKU</dt><dd>{{ item?.sku || '—' }}</dd></div>
          <div><dt>Situação no ML</dt><dd>{{ item?.status || '—' }}</dd></div>
          <div><dt>Preço-base</dt><dd>{{ brl(item?.price) }}</dd></div>
          <div><dt>Saúde de vendas</dt><dd>{{ item?.health || '—' }}</dd></div>
          <div><dt>Ritmo de vendas</dt><dd>{{ ritmo }}</dd></div>
          <div><dt>Vendas 30 dias</dt><dd>{{ item?.sales_30d ?? '—' }}</dd></div>
          <div>
            <dt>No Mercado Livre</dt>
            <dd>
              <a v-if="item?.permalink" :href="item.permalink" target="_blank" rel="noopener">abrir anúncio</a>
              <template v-else>—</template>
            </dd>
          </div>
        </dl>
      </section>

      <section class="adv-drawer__secao">
        <h3>Decisões registradas <span v-if="logs.length">({{ logs.length }})</span></h3>
        <p v-if="!logs.length" class="adv-drawer__nota">Nenhuma decisão registrada para este anúncio.</p>
        <ol class="adv-drawer__logs">
          <li v-for="(log, i) in logs" :key="i">
            <strong>{{ dataHora(log.created_at) }}</strong>
            <span>{{ log.acao || log.event_type }} · {{ log.execution_status }}</span>
            <em v-if="log.reason">{{ log.reason }}</em>
          </li>
        </ol>
      </section>
      <section class="adv-drawer__secao" v-if="detalhe.activity?.results?.length">
        <h3>Tentativas registradas ({{ detalhe.activity.total }})</h3>
        <ol class="adv-drawer__logs">
          <li v-for="event in detalhe.activity.results" :key="`${event.action_id}-${event.attempt_no}`">
            <strong>{{ dataHora(event.created_at) }}</strong>
            <span>{{ resultOf({ last_result: event }).label }} · tentativa {{ event.attempt_no }}</span>
          </li>
        </ol>
        <router-link v-if="detalhe.activity.total > detalhe.activity.results.length"
                     :to="{ name: 'promotions-advisor-activity', query: { item_id: item.item_id, account_id: item.account_id } }">
          Ver histórico completo
        </router-link>
      </section>
    </template>
  </aside>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { brl, pct, resultOf } from 'src/utils/advisorDecision';

const props = defineProps({
  detalhe: { type: Object, default: null },
  carregando: { type: Boolean, default: false },
  erro: { type: String, default: '' },
  revisaoEstado: { type: String, default: '' },   // '' | enviando | enviado | erro
  revisaoMensagem: { type: String, default: '' },
});
const emit = defineEmits(['fechar', 'enviar-revisao']);
const drawer = ref(null);
let previousFocus = null;
function onKeydown(event) { if (event.key === 'Escape') emit('fechar'); }
onMounted(async () => {
  previousFocus = document.activeElement;
  await nextTick();
  drawer.value?.focus();
  window.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  if (previousFocus?.isConnected) previousFocus.focus();
});

const item = computed(() => props.detalhe?.item || null);
const promos = computed(() => props.detalhe?.promotions || {});
const ativas = computed(() => promos.value.active || []);
const programadas = computed(() => promos.value.scheduled || []);
const ofertadas = computed(() => promos.value.candidates || []);
const logs = computed(() => props.detalhe?.agent_logs || []);
const lastAction = computed(() => resultOf({ last_result: props.detalhe?.last_action }));
const promotionLabel = computed(() => ({
  active: 'Promoção ativa na leitura ao vivo',
  scheduled_only: 'Somente promoção programada na leitura ao vivo',
  without_promotion: 'Sem promoção ativa ou programada na leitura ao vivo',
})[props.detalhe?.promotion_state?.state] || 'Estado promocional não confirmado');
function ownerLabel(owner) {
  return ({ robot: 'robô', sellerbot: 'plataforma SellerBot', marketplace: 'Mercado Livre',
    user: 'você', none: 'nenhuma ação pendente', unknown: 'não identificado' })[owner] || 'não identificado';
}

const ritmo = computed(() => {
  const upw = item.value?.health_info?.units_per_week;
  return upw == null ? '—' : `${String(upw).replace('.', ',')} un./semana`;
});

function dataCurta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(d);
}

function dataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(d);
}
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.adv-drawer {
  /* PROMO-IA-48: deslocado do q-header do MainLayout (56px — ver .app-toolbar),
     senão o MLB/título do anúncio fica escondido atrás dele. */
  position: fixed;
  top: 56px;
  right: 0;
  z-index: 30;
  width: min(440px, 94vw);
  height: calc(100vh - 56px);
  overflow-y: auto;
  padding: $space-5;
  background: $surface;
  border-left: 1px solid $border;
  box-shadow: $shadow-md;

  &__header {
    position: sticky;
    top: -$space-5;      // cola no topo do scroll do drawer
    z-index: 2;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $space-3;
    margin: #{-$space-5} 0 $space-4;
    padding: $space-5 $space-5 $space-3;
    background: $surface;
    border-bottom: 1px solid $border;

    strong { font-variant-numeric: tabular-nums; }
  }
  &__mlb { display: block; font-size: $text-small-size; color: $text-primary; }
  &__titulo { display: block; font-weight: $font-medium; line-height: 1.3; }
  &__conta { display: block; font-size: $text-xs-size; color: $text-muted; }

  &__secao {
    margin-bottom: $space-5;

    h3 {
      font-size: $text-xs-size;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: $text-muted;
      margin: 0 0 $space-2;
    }
  }
  &__calc { border-left:2px solid $border; padding:$space-2 $space-3; margin:$space-3 0; background:$surface-2; }
  &__calc p { margin:$space-1 0 0; }

  &__promos {
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      padding: $space-2 0;
      border-bottom: 1px dashed $border;

      &:last-child { border-bottom: 0; }
    }
  }
  &__promoTopo {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: $space-2;
    margin-bottom: $space-1;
  }
  &__tipo { font-size: $text-xs-size; color: $text-muted; }

  &__fin {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: $space-2 $space-3;
    margin: 0;

    dt {
      font-size: $text-xs-size;
      color: $text-muted;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    dd { margin: 0; font-weight: $font-medium; }
  }

  &__logs {
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      display: flex;
      flex-wrap: wrap;
      gap: $space-2;
      padding: $space-1 0;
      font-size: $text-xs-size;

      em { width: 100%; color: $text-muted; font-style: normal; }
    }
  }

  &__nota { margin: 0; font-size: $text-xs-size; color: $text-muted; }
  &__erro { margin: 0; font-size: $text-small-size; color: $negative; }

  &__acoes {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-3;
    margin-bottom: $space-4;

    a { color: $primary; }
  }
}
</style>
