<template>
  <!-- Estado de primeira classe: vazio, carregando, erro e sem-dado têm desenho e texto próprios. -->
  <div class="adv-empty" :class="`adv-empty--${variant}`" role="status">
    <q-icon :name="meta.icon" size="28px" aria-hidden="true" />
    <strong class="adv-empty__title">{{ title || meta.title }}</strong>
    <p class="adv-empty__msg">{{ message || meta.message }}</p>
    <slot name="action" />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  variant: { type: String, default: 'vazio' }, // vazio | carregando | erro | sem_dado
  title: { type: String, default: '' },
  message: { type: String, default: '' },
});

const MAPA = {
  vazio: { icon: 'inbox', title: 'Nada por aqui', message: 'Não há nada para mostrar com os filtros atuais.' },
  carregando: { icon: 'hourglass_empty', title: 'Carregando…', message: 'Buscando os dados do assistente.' },
  erro: { icon: 'cloud_off', title: 'Não conseguimos falar com o servidor agora', message: 'Tente novamente em alguns instantes — nada foi alterado no Mercado Livre.' },
  sem_dado: { icon: 'help_outline', title: 'Sem dado suficiente', message: 'Falta informação para calcular (custo, frete ou SKU).' },
};

const meta = computed(() => MAPA[props.variant] || MAPA.vazio);
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.adv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  padding: $space-8;
  text-align: center;
  color: $text-muted;

  &__title { font-size: $text-h3-size; color: $text-primary; }
  &__msg { margin: 0; max-width: 480px; font-size: $text-small-size; }
  &--erro { color: $negative; }
}
</style>
