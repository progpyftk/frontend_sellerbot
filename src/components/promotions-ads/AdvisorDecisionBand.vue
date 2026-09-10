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
        <span>{{ (scope.below_floor ?? 0) === 1 ? 'anúncio abaixo do piso' : 'anúncios abaixo do piso' }} <em>no total da operação</em></span>
      </p>
      <p class="adb-card__rule">
        Piso da operação: margem ≥ {{ FLOOR_MARGIN_PCT }}% <em>e</em> lucro ≥ {{ brl(FLOOR_PROFIT_BRL) }} por venda
        <span class="adb-card__rule-hint">(detalhe no cartão ao lado)</span>.
      </p>
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
        <h2 class="adb-card__title">Sugestões nesta página</h2>
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
        <h2 class="adb-card__title">Bloqueios nesta página</h2>
      </header>
      <p class="adb-card__value">
        <strong>{{ page.blockedFloor }}</strong>
        <span>bloqueado{{ page.blockedFloor === 1 ? '' : 's' }} pelo piso nesta página</span>
      </p>
      <ul class="adb-card__list">
        <li><q-icon name="block" size="14px" aria-hidden="true" /> alterações bloqueadas quando margem &lt; {{ FLOOR_MARGIN_PCT }}% ou lucro &lt; {{ brl(FLOOR_PROFIT_BRL) }}</li>
        <li><q-icon name="help_outline" size="14px" aria-hidden="true" /> sem custo ou frete não há cálculo — e não há alteração automática</li>
        <li><q-icon name="lock" size="14px" aria-hidden="true" /> modo Somente Sugestão ativo</li>
      </ul>
    </article>

  </section>

    <!-- Mobile: as três respostas em três linhas (sem swipe). -->
    <ul class="adb-compact">
      <li class="adb-compact__row adb-compact__row--alert">
        <q-icon name="priority_high" size="15px" aria-hidden="true" />
        <span><strong>{{ scope.below_floor ?? 0 }}</strong> abaixo do piso no escopo · <strong>{{ page.blockedFloor }}</strong> nesta página</span>
        <q-btn dense no-caps unelevated color="negative" size="sm" label="Ver e priorizar" @click="$emit('focus-below-floor')" />
      </li>
      <li class="adb-compact__row adb-compact__row--assistant">
        <q-icon name="auto_fix_high" size="15px" aria-hidden="true" />
        <span>Sugere: {{ suggestionChips.map((c) => `${c.label} ${c.count}`).join(' · ') || 'sem anúncios nesta página' }}</span>
      </li>
      <li class="adb-compact__row adb-compact__row--safe">
        <q-icon name="shield" size="15px" aria-hidden="true" />
        <span>Escrita barrada: margem &lt; {{ FLOOR_MARGIN_PCT }}% ou lucro &lt; {{ brl(FLOOR_PROFIT_BRL) }} (nada é alterado no ML)</span>
      </li>
    </ul>

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

.adb-compact {
  display: none;
  grid-column: 1 / -1;
  gap: 6px;
  margin: 0 0 $space-2;
  padding: 0;
  list-style: none;
}

.adb-compact__row {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: 6px $space-3;
  border: 1px solid $border;
  border-left-width: 4px;
  border-radius: $radius-sm;
  background: $surface;
  font-size: $text-xs-size;
  color: $text-primary;

  span { flex: 1 1 auto; }
  &--alert { border-left-color: $negative; }
  &--assistant { border-left-color: $indigo-8; }
  &--safe { border-left-color: $text-disabled; }
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
  /* No celular os três cartões viram três linhas: as três respostas continuam
     visíveis (sem swipe) e a tabela sobe para a primeira dobra. */
  .adb { display: none; }
  .adb-compact { display: grid; }
}
</style>
