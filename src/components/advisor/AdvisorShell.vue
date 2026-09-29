<template>
  <!--
    Shell da área do advisor (PROMO-IA-22): identidade + navegação por superfície.
    Cada superfície responde UMA pergunta; a navegação é por rota (deep link), não por aba interna.
  -->
  <q-page class="adv-shell">
    <header class="adv-shell__head">
      <div class="adv-shell__id">
        <span class="adv-shell__eyebrow">Mercado Livre</span>
        <h1 class="adv-shell__title">Assistente de promoções</h1>
      </div>
      <nav class="adv-shell__tabs" aria-label="Seções do assistente">
        <router-link
          v-for="tab in tabs"
          :key="tab.to"
          :to="tabRoute(tab)"
          class="adv-shell__tab"
          :class="{ 'adv-shell__tab--on': tab.name === active }"
          :aria-current="tab.name === active ? 'page' : undefined"
        >
          <q-icon :name="tab.icon" size="16px" aria-hidden="true" />
          <span>{{ tab.label }}</span>
        </router-link>
      </nav>
      <div class="adv-shell__actions"><slot name="actions" /></div>
    </header>

    <p v-if="pergunta" class="adv-shell__question">{{ pergunta }}</p>

    <!-- PROMO-IA-45: estado do robô sempre visível, em qualquer aba. -->
    <AdvisorStatusStrip />

    <div class="adv-shell__body" role="region" aria-label="Conteúdo do assistente de promoções"><slot /></div>
  </q-page>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AdvisorStatusStrip from 'src/components/advisor/AdvisorStatusStrip.vue';

let activeShells = 0;
const route = useRoute();
function tabRoute(tab) {
  const query = {};
  if (route.query.account_id) query.account_id = route.query.account_id;
  if (route.query.status) query.status = route.query.status;
  return { ...tab.to, query };
}
onMounted(() => { activeShells += 1; document.body.classList.add('advisor-page'); });
onBeforeUnmount(() => {
  activeShells -= 1;
  if (activeShells === 0) document.body.classList.remove('advisor-page');
});

defineProps({
  active: { type: String, required: true },      // visao-geral | anuncios | atividade | automacao
  pergunta: { type: String, default: '' },       // a pergunta que esta superfície responde
});

// PROMO-IA-45: Análises vira a primeira aba (o retrato completo por anúncio).
const tabs = [
  { name: 'visao-geral', to: { name: 'promotions-advisor' }, label: 'Visão geral', icon: 'space_dashboard' },
  { name: 'anuncios', to: { name: 'promotions-advisor-anuncios' }, label: 'Anúncios', icon: 'inventory_2' },
  { name: 'atividade', to: { name: 'promotions-advisor-activity' }, label: 'Atividade', icon: 'history' },
  { name: 'automacao', to: { name: 'promotions-advisor-automacao' }, label: 'Automação', icon: 'settings_suggest' },
];
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.adv-shell {
  padding: $space-6 $space-8 $space-10;


  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-4;
    border-bottom: 1px solid $border;
  }

  &__eyebrow {
    display: block;
    font-size: $text-xs-size;
    font-weight: $font-semibold;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: $primary;
  }

  &__title {
    margin: 0;
    font-size: $text-h2-size;
    font-weight: $font-bold;
    color: $text-primary;
    line-height: 1.2;
  }

  /* PROMO-IA-48: abas de VERDADE — sentam na régua do header, com indicador
     primário de 2px na ativa (antes pareciam chips soltos). */
  &__tabs {
    display: flex;
    gap: $space-1;
    flex: 1 1 auto;
    align-self: stretch;
    align-items: flex-end;
  }

  &__tab {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    padding: $space-3 $space-5;
    border-bottom: 2px solid transparent;
    border-radius: $radius-md $radius-md 0 0;
    font-size: $text-small-size;
    font-weight: $font-medium;
    color: $text-muted;
    text-decoration: none;
    transition: $transition-fast;

    &:hover { background: $surface-2; color: $text-body; }

    &--on {
      background: transparent;
      color: $primary;
      font-weight: $font-semibold;
      border-bottom-color: $primary;
      &:hover { background: transparent; color: $primary; }
    }

    &:focus-visible { outline: 2px solid $primary; outline-offset: 2px; }
  }

  &__question {
    margin: $space-4 0 $space-5;
    font-size: $text-body-size;
    color: $text-muted;
  }
}
@media (max-width: 599px) {
  .adv-shell { padding:$space-4; }
  .adv-shell__tabs { flex:1 1 100%; min-width:0; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0; }
  .adv-shell__tab { min-width:0; justify-content:center; padding:$space-2; }
  .adv-shell__actions { flex:1 1 100%; }
  .adv-shell__question { display:none; }
}
:global(body.advisor-page .feedback-fab-container) { display:none; }
</style>
