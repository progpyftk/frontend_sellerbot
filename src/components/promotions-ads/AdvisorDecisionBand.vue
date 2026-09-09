<template>
  <!--
    Faixa de decisão (PROMO-IA-15): a primeira leitura da página.
    Três blocos na ordem em que o dono precisa pensar — atenção, sugestão e
    proteção — separados visualmente dos filtros e da tabela.
  -->
  <section class="adb" aria-label="Leitura de decisão de hoje">
    <!-- 1. O que requer atenção hoje (números do escopo, calculados pelo servidor) -->
    <article class="adb-card adb-card--alert">
      <header class="adb-card__head">
        <q-icon name="priority_high" size="18px" aria-hidden="true" />
        <h2 class="adb-card__title">Requer atenção hoje</h2>
      </header>
      <p class="adb-card__value">
        <strong>{{ scope.below_floor ?? 0 }}</strong>
        <span>{{ (scope.below_floor ?? 0) === 1 ? 'anúncio abaixo do piso' : 'anúncios abaixo do piso' }} <em>no escopo</em></span>
      </p>
      <p class="adb-card__rule">
        Piso da operação: margem ≥ {{ FLOOR_MARGIN_PCT }}% <em>e</em> lucro ≥ {{ brl(FLOOR_PROFIT_BRL) }} por venda.
      </p>
      <ul class="adb-card__list">
        <li v-if="page.blockedFloor">
          <q-icon name="block" size="14px" aria-hidden="true" />
          {{ page.blockedFloor }} nesta página abaixo do piso
        </li>
        <li v-if="page.missingData">
          <q-icon name="help_outline" size="14px" aria-hidden="true" />
          {{ page.missingData }} nesta página sem dados para calcular margem
        </li>
        <li v-if="page.lowTraction">
          <q-icon name="trending_down" size="14px" aria-hidden="true" />
          {{ page.lowTraction }} nesta página parado{{ page.lowTraction === 1 ? '' : 's' }}/fraco{{ page.lowTraction === 1 ? '' : 's' }}
        </li>
      </ul>
      <q-btn
        v-if="(scope.below_floor ?? 0) > 0"
        class="adb-card__action" unelevated no-caps dense color="negative"
        icon="filter_alt" label="Ver e priorizar" :disable="onlyBelowFloor"
        @click="$emit('focus-below-floor')"
      />
    </article>

    <!-- 2. O que o assistente fará (sugestão da régua, por anúncio, nesta página) -->
    <article class="adb-card adb-card--assistant">
      <header class="adb-card__head">
        <q-icon name="auto_fix_high" size="18px" aria-hidden="true" />
        <h2 class="adb-card__title">O que o assistente sugere</h2>
      </header>
      <p class="adb-card__value">
        <strong>{{ page.total }}</strong>
        <span>anúncios nesta página</span>
      </p>
      <ul class="adb-chips">
        <li v-for="item in suggestionChips" :key="item.key">
          <SbBadge :variant="item.variant" :icon="item.icon">{{ item.label }} {{ item.count }}</SbBadge>
        </li>
        <li v-if="!suggestionChips.length" class="adb-chips__empty">Sem anúncios nesta página.</li>
      </ul>
      <p class="adb-card__rule adb-card__rule--muted">
        Sugestão da régua — nada é alterado no Mercado Livre.
      </p>
    </article>

    <!-- 3. O que está protegido/bloqueado -->
    <article class="adb-card adb-card--safe">
      <header class="adb-card__head">
        <q-icon name="shield" size="18px" aria-hidden="true" />
        <h2 class="adb-card__title">Protegido / bloqueado</h2>
      </header>
      <p class="adb-card__value">
        <strong>{{ page.blockedFloor }}</strong>
        <span>bloqueado{{ page.blockedFloor === 1 ? '' : 's' }} pelo piso nesta página</span>
      </p>
      <ul class="adb-card__list">
        <li><q-icon name="block" size="14px" aria-hidden="true" /> escrita barrada quando margem &lt; {{ FLOOR_MARGIN_PCT }}% ou lucro &lt; {{ brl(FLOOR_PROFIT_BRL) }}</li>
        <li><q-icon name="help_outline" size="14px" aria-hidden="true" /> sem custo/frete não há cálculo — e sem cálculo não há escrita</li>
        <li><q-icon name="lock" size="14px" aria-hidden="true" /> escrita automática desligada nesta entrega</li>
      </ul>
      <p class="adb-card__rule adb-card__rule--muted">
        {{ scope.below_floor ?? 0 }} no escopo · {{ scope.with_active_promo ?? 0 }} com promoção ativa.
      </p>
      <p class="adb-footnote">
        O primeiro cartão conta o escopo inteiro (conta + status); os cartões do meio e da direita resumem
        os {{ page.total }} anúncios desta página.
      </p>
    </article>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import SbBadge from 'src/components/common/SbBadge.vue';
import {
  FLOOR_MARGIN_PCT, FLOOR_PROFIT_BRL, SUGGESTION_META, SUGGESTION_ORDER, brl,
} from 'src/utils/advisorDecision';

const props = defineProps({
  // Números do escopo (conta + status) calculados pelo backend.
  scope: { type: Object, default: () => ({}) },
  // Resumo derivado da página atual (decisionSummary).
  page: { type: Object, default: () => ({}) },
  onlyBelowFloor: { type: Boolean, default: false },
});

defineEmits(['focus-below-floor']);

const suggestionChips = computed(() => SUGGESTION_ORDER
  .filter((key) => props.page?.sugestoes?.[key])
  .map((key) => ({
    key,
    count: props.page.sugestoes[key],
    label: SUGGESTION_META[key]?.label || key,
    variant: SUGGESTION_META[key]?.variant || 'slate',
    icon: SUGGESTION_META[key]?.icon || '',
  })));
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.adb {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: $space-2;
  margin-bottom: $space-3;
}

.adb-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: $space-3;
  border: 1px solid $border;
  border-left-width: 4px;
  border-radius: $radius-lg;
  background: $surface;
  box-shadow: $shadow-xs;

  &--alert { border-left-color: $negative; }
  &--assistant { border-left-color: $indigo-8; }
  &--safe { border-left-color: $text-disabled; }
}

.adb-card__head {
  display: flex;
  align-items: center;
  gap: $space-2;
  color: $text-muted;
}

.adb-card__title {
  margin: 0;
  font-size: $text-xs-size;
  font-weight: $font-semibold;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: $text-muted;
}

.adb-card__value {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: $space-2;
  color: $text-primary;

  strong { font-size: 22px; line-height: 1.1; }
  span { font-size: $text-small-size; color: $text-muted; }
}

.adb-card__rule {
  margin: 0;
  font-size: $text-xs-size;
  color: $text-primary;

  &--muted { color: $text-muted; }
}

.adb-footnote {
  grid-column: 1 / -1;
  margin: $space-1 0 0;
  font-size: $text-xs-size;
  color: $text-muted;
}

.adb-card__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
  font-size: $text-xs-size;
  color: $text-primary;

  li { display: flex; align-items: flex-start; gap: 6px; }
}

.adb-card__action {
  align-self: flex-start;
  margin-top: auto;
}

.adb-chips {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;

  &__empty { font-size: $text-xs-size; color: $text-muted; }
}

@media (max-width: 768px) {
  .adb { grid-template-columns: 1fr; gap: $space-2; }
  .adb-card { padding: $space-3; }
  .adb-card__value strong { font-size: 20px; }
  /* No celular, o cartão de proteção fica só com a regra: a lista detalhada
     empurraria a tabela para longe sem responder nada novo. */
  /* No celular a faixa precisa caber na dobra com a tabela logo abaixo:
     o valor + a regra respondem as três perguntas; a lista é detalhe. */
  .adb-card__list { display: none; }
  .adb-footnote { display: none; }
}
</style>
