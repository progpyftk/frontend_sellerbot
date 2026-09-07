<template>
  <div class="pod">
    <SbEmptyState
      v-if="error"
      variant="error"
      title="Não foi possível carregar o detalhe"
      :message="error"
    />
    <div v-else-if="loading" class="pod-loading">
      <q-spinner-dots size="28px" color="grey-6" />
      <span>Consultando o Mercado Livre…</span>
    </div>

    <div v-else class="pod-grid">
      <!-- 1. Promoções (ativas + candidatas, ao vivo) -->
      <section class="pod-block">
        <h4 class="pod-block__t">Promoções</h4>
        <SbEmptyState
          v-if="!activePromos.length && !candidatePromos.length"
          title="Nenhuma promoção no ML agora"
          message="Sem ativas e sem candidatas — o anúncio vende pelo preço-base."
        />
        <template v-else>
          <div v-for="promo in activePromos" :key="`a-${promo.promotion_id}`" class="pod-promo">
            <SbBadge variant="teal">Ativa</SbBadge>
            <span class="pod-promo__name">{{ promoName(promo) }}</span>
            <span class="pod-promo__meta">{{ promoMeta(promo) }}</span>
          </div>
          <div
            v-for="promo in candidatePromos" :key="`c-${promo.promotion_id ?? promo.promotion_type}`"
            class="pod-promo pod-promo--cand"
          >
            <SbBadge variant="slate">Candidata</SbBadge>
            <span class="pod-promo__name">{{ promoName(promo) }}</span>
            <span class="pod-promo__meta">{{ promoMeta(promo) }}</span>
          </div>
        </template>
        <p class="pod-note">Margem de hoje = CMV + tarifa + frete reais sobre o preço de cada promoção.</p>
      </section>

      <!-- 2. Assistente (timeline de decisões) -->
      <section class="pod-block">
        <h4 class="pod-block__t">Assistente</h4>
        <SbEmptyState
          v-if="!logs.length"
          title="O assistente ainda não atuou neste anúncio"
          message="Recomendações e ações executadas aparecem aqui."
        />
        <ol v-else class="pod-timeline">
          <li v-for="(log, idx) in logs" :key="idx" class="pod-timeline__item">
            <span class="pod-dot" :class="`pod-dot--${log.event_type}`" />
            <div class="pod-timeline__body">
              <div class="pod-timeline__head">
                <strong>{{ eventLabel(log.event_type) }}</strong>
                <SbBadge v-if="log.acao" :variant="acaoMeta(log.acao).variant">{{ acaoMeta(log.acao).label }}</SbBadge>
                <SbBadge v-if="log.event_type === 'action'" :variant="statusVariant(log.execution_status)">
                  {{ statusLabel(log.execution_status) }}
                </SbBadge>
                <SbBadge v-if="log.vigente === false" variant="red">não vigente — ML invalidou</SbBadge>
                <span class="pod-timeline__date">{{ dateTime(log.created_at) }}</span>
              </div>
              <p v-if="log.deal_price != null || log.proposed_margin_pct != null" class="pod-timeline__meta">
                <template v-if="log.deal_price != null">Preço {{ brl(log.deal_price) }} · </template>
                <template v-if="log.proposed_margin_pct != null">margem proposta {{ pct(log.proposed_margin_pct) }} · </template>
                <template v-if="log.current_margin_pct != null">margem atual {{ pct(log.current_margin_pct) }}</template>
              </p>
              <p v-if="log.reason" class="pod-timeline__reason">{{ log.reason }}</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- 3. Retrato -->
      <section class="pod-block">
        <h4 class="pod-block__t">Retrato</h4>
        <dl class="pod-retrato">
          <dt>Saúde</dt>
          <dd>
            <SbBadge :variant="healthMeta(item.health).variant">{{ healthMeta(item.health).label }}</SbBadge>
            <span v-if="healthInfo?.units_per_week != null" class="pod-retrato__extra">
              {{ healthInfo.units_per_week }} un./semana
            </span>
            <SbBadge v-if="healthInfo?.parado_sob_promocao" variant="red">parado sob promoção</SbBadge>
          </dd>
          <dt>Vendas 30d</dt><dd>{{ item.sales_30d ?? '—' }}</dd>
          <dt>Preço-base</dt><dd>{{ brl(item.price) }}</dd>
          <dt>Conversão / visitas</dt>
          <dd>
            {{ healthInfo?.conversion_pct != null ? pct(healthInfo.conversion_pct) : '—' }}
            <span v-if="healthInfo?.visits != null" class="pod-retrato__extra">{{ healthInfo.visits }} visitas</span>
          </dd>
          <dt>Status no ML</dt><dd>{{ item.status }}</dd>
          <dt>Link</dt>
          <dd><a v-if="item.permalink" :href="item.permalink" target="_blank" rel="noopener">abrir no ML</a><template v-else>—</template></dd>
        </dl>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

import SbBadge from 'src/components/common/SbBadge.vue';
import SbEmptyState from 'src/components/common/SbEmptyState.vue';

import MercadoLivreService from 'src/services/MercadoLivreService';

const ACAO_META = {
  aprofundar: { label: 'Aprofundar', variant: 'amber' },
  reduzir: { label: 'Reduzir desconto', variant: 'sky' },
  manter: { label: 'Manter', variant: 'slate' },
  rebase: { label: 'Rebase de preço', variant: 'indigo' },
  remover: { label: 'Remover', variant: 'red' },
  sem_oferta: { label: 'Sem oferta ML', variant: 'slate' },
};

const HEALTH_META = {
  parado: { label: 'Parado', variant: 'red' },
  fraco: { label: 'Fraco', variant: 'amber' },
  medio: { label: 'Médio', variant: 'sky' },
  alto: { label: 'Alto', variant: 'green' },
};

const PROMO_LABELS = {
  PRICE_DISCOUNT: 'Oferta do dia',
  DEAL: 'O melhor de todos os dias',
  SMART: 'O melhor de todos os dias',
  LIGHTNING: 'Oferta relâmpago',
  SELLER_CAMPAIGN: 'Promo DoseVerde',
  SELLER_COUPON_CAMPAIGN: 'Cupom da loja',
};

const props = defineProps({
  itemId: { type: String, required: true },
});

const loading = ref(false);
const error = ref('');
const payload = ref(null);

const item = computed(() => payload.value?.item || {});
const activePromos = computed(() => payload.value?.promotions?.active || []);
const candidatePromos = computed(() => payload.value?.promotions?.candidates || []);
const logs = computed(() => payload.value?.agent_logs || []);
const healthInfo = computed(() => item.value.health_info || null);

function promoName(promo) {
  return promo.promotion_name || PROMO_LABELS[promo.promotion_type] || promo.promotion_type || '—';
}

function promoMeta(promo) {
  const parts = [];
  const fin = promo.financials || {};
  if (promo.status === 'started') {
    parts.push(`${brl(fin.proposed_price)} · ${pct(fin.estimated_margin_pct)} margem`);
  } else {
    const desconto = promo.discount_pct != null ? `${pct(promo.discount_pct)} desc.` : null;
    const margem = fin.estimated_margin_pct != null ? `${pct(fin.estimated_margin_pct)} margem` : 'sem margem calculável';
    parts.push([desconto, margem].filter(Boolean).join(' · '));
  }
  if (promo.start_date) {
    const fim = promo.finish_date ? ` → ${dateShort(promo.finish_date)}` : ' → …';
    parts.push(`${dateShort(promo.start_date)}${fim}`);
  }
  return parts.join(' · ');
}

function eventLabel(eventType) {
  return eventType === 'action' ? 'Ação executada' : eventType === 'snapshot' ? 'Baseline' : 'Recomendação';
}

function statusVariant(status) {
  if (status === 'executed') return 'teal';
  if (status === 'failed' || status === 'error') return 'red';
  return 'amber';
}

function statusLabel(status) {
  return { executed: 'executado', failed: 'falhou', error: 'erro', pending: 'pendente', skipped: 'ignorado' }[status] || status;
}

function acaoMeta(acao) {
  return ACAO_META[acao] || { label: acao || '—', variant: 'slate' };
}

function healthMeta(health) {
  return HEALTH_META[health] || { label: health || '—', variant: 'slate' };
}

// ── Formatação ────────────────────────────────────────────────────────────────
function brl(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pct(value) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(1).replace('.', ',')}%`;
}

function dateShort(iso) {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('pt-BR');
}

function dateTime(iso) {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await MercadoLivreService.getPromoOverviewDetail(props.itemId);
    payload.value = data;
  } catch (err) {
    error.value = err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Erro inesperado.';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.pod {
  padding: $space-4;
  background: #f8fafc;
  border-radius: 10px;
}

.pod-loading {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-4;
  font-size: $text-small-size;
  color: $text-muted;
}

.pod-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: $space-6;
}

.pod-block__t {
  margin: 0 0 $space-3;
  font-size: $text-xs-size;
  font-weight: $font-semibold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: $text-muted;
}

.pod-promo {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-2;
  padding: $space-2 0;
  border-bottom: 1px solid $border;
  font-size: $text-small-size;

  &:last-of-type {
    border-bottom: none;
  }

  &--cand &__name {
    color: $text-muted;
  }

  &__name {
    font-weight: $font-medium;
    color: $text-primary;
  }

  &__meta {
    flex-basis: 100%;
    font-size: $text-xs-size;
    color: $text-muted;
    font-variant-numeric: tabular-nums;
  }
}

.pod-note {
  margin: $space-3 0 0;
  font-size: $text-xs-size;
  color: $text-disabled;
}

// Timeline em bolinhas
.pod-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
}

.pod-timeline__item {
  position: relative;
  display: flex;
  gap: $space-3;
  padding: 0 0 $space-4 $space-5;
  border-left: 2px solid $border;
  margin-left: $space-2;

  &:last-child {
    border-left-color: transparent;
    padding-bottom: 0;
  }
}

.pod-dot {
  position: absolute;
  left: -5px;
  top: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $text-disabled;

  &--action { background: $positive; }
  &--snapshot { background: $text-disabled; }
  &--recommendation { background: $info; }
}

.pod-timeline__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-2;

  strong {
    font-size: $text-small-size;
    color: $text-primary;
  }
}

.pod-timeline__date {
  font-size: $text-xs-size;
  color: $text-disabled;
}

.pod-timeline__meta {
  margin: $space-1 0 0;
  font-size: $text-xs-size;
  color: $text-muted;
  font-variant-numeric: tabular-nums;
}

.pod-timeline__reason {
  margin: $space-1 0 0;
  font-size: $text-xs-size;
  color: $text-muted;
}

// Retrato
.pod-retrato {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: $space-2 $space-4;
  margin: 0;
  font-size: $text-small-size;

  dt {
    color: $text-muted;
  }

  dd {
    margin: 0;
    color: $text-primary;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $space-2;
  }
}

.pod-retrato__extra {
  font-size: $text-xs-size;
  color: $text-muted;
}
</style>
