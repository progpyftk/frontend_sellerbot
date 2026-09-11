<template>
  <!-- Seção da superfície: título com hierarquia, ação opcional e conteúdo. Substitui as caixas soltas. -->
  <section class="adv-section" :class="{ 'adv-section--tight': tight }">
    <header v-if="title || $slots.action" class="adv-section__head">
      <h2 class="adv-section__title">
        {{ title }}
        <span v-if="count !== null && count !== undefined" class="adv-section__count">{{ count }}</span>
      </h2>
      <div class="adv-section__action"><slot name="action" /></div>
    </header>
    <p v-if="lead" class="adv-section__lead">{{ lead }}</p>
    <slot />
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  count: { type: [String, Number], default: null },
  lead: { type: String, default: '' },
  tight: { type: Boolean, default: false },
});
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.adv-section {
  background: $surface;
  border: 1px solid $border;
  border-radius: $radius-lg;
  box-shadow: $shadow-xs;
  padding: $space-5;
  margin-bottom: $space-4;

  &--tight { padding: $space-4; }

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-3;
    margin-bottom: $space-3;
  }

  &__title {
    margin: 0;
    font-size: $text-h3-size;
    font-weight: $font-semibold;
    color: $text-primary;
  }

  &__count { color: $text-muted; font-weight: $font-medium; }

  &__lead {
    margin: 0 0 $space-3;
    font-size: $text-small-size;
    color: $text-body;
  }
}
</style>
