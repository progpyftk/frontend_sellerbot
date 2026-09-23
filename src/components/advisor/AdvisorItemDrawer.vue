<template>
  <!-- PROMO-IA-45: drawer lateral de drill-down — sem popup, a tabela continua visível. -->
  <aside class="adv-drawer" role="dialog" aria-label="Detalhe do anúncio">
    <header class="adv-drawer__header">
      <div>
        <strong class="adv-drawer__mlb">{{ item?.item_id || '—' }}</strong>
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
        <router-link :to="{ name: 'items-seo-review' }">Anúncios · Revisão SEO</router-link>.
      </p>
    </div>

    <p v-if="erro" class="adv-drawer__erro" role="alert">{{ erro }}</p>
    <p v-else-if="carregando" class="adv-drawer__nota" role="status">Carregando o retrato do anúncio…</p>

    <template v-else-if="detalhe">
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
        <h3>Histórico <span v-if="logs.length">({{ logs.length }})</span></h3>
        <p v-if="!logs.length" class="adv-drawer__nota">Nenhuma decisão registrada para este anúncio.</p>
        <ol class="adv-drawer__logs">
          <li v-for="(log, i) in logs" :key="i">
            <strong>{{ dataHora(log.created_at) }}</strong>
            <span>{{ log.acao || log.event_type }} · {{ log.execution_status }}</span>
            <em v-if="log.reason">{{ log.reason }}</em>
          </li>
        </ol>
      </section>
    </template>
  </aside>
</template>

<script setup>
import { computed } from 'vue';

import { brl, pct } from 'src/utils/advisorDecision';

const props = defineProps({
  detalhe: { type: Object, default: null },
  carregando: { type: Boolean, default: false },
  erro: { type: String, default: '' },
  revisaoEstado: { type: String, default: '' },   // '' | enviando | enviado | erro
  revisaoMensagem: { type: String, default: '' },
});
defineEmits(['fechar', 'enviar-revisao']);

const item = computed(() => props.detalhe?.item || null);
const promos = computed(() => props.detalhe?.promotions || {});
const ativas = computed(() => promos.value.active || []);
const programadas = computed(() => promos.value.scheduled || []);
const ofertadas = computed(() => promos.value.candidates || []);
const logs = computed(() => props.detalhe?.agent_logs || []);

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
