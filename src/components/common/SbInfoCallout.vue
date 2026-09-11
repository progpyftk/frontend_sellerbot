<template>
  <!--
    Caixa explicativa reutilizável (PROMO-IA-21): texto em linguagem de negócio para quem NÃO é
    técnico. Sempre com título curto e corpo curto; o detalhe vai em `detalhe` (abre no clique).
  -->
  <section class="sb-callout" :class="`sb-callout--${variant}`" :aria-label="titulo">
    <header class="sb-callout__head">
      <q-icon :name="icon" size="18px" aria-hidden="true" />
      <h2 class="sb-callout__title">{{ titulo }}</h2>
      <q-btn
        v-if="detalhe"
        flat dense no-caps size="sm"
        :icon="aberto ? 'expand_less' : 'expand_more'"
        :label="aberto ? 'fechar' : 'ver detalhes'"
        :aria-expanded="aberto"
        aria-controls="sb-callout-detalhe"
        @click="aberto = !aberto"
      />
    </header>
    <div class="sb-callout__body">
      <slot />
    </div>
    <div v-if="detalhe && aberto" id="sb-callout-detalhe" class="sb-callout__detail">
      <slot name="detalhe" />
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  titulo: { type: String, required: true },
  icon: { type: String, default: 'info' },
  variant: { type: String, default: 'info' },   // info | protecao | atencao
  detalhe: { type: Boolean, default: false },
});

const aberto = ref(false);
</script>

<style scoped>
.sb-callout {
  border: 1px solid var(--sb-border, #e0e0e0);
  border-left-width: 3px;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: var(--sb-surface, #fff);
}
.sb-callout--protecao { border-left-color: #21ba45; }
.sb-callout--atencao { border-left-color: #f2c037; }
.sb-callout--info { border-left-color: #1976d2; }
.sb-callout__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.sb-callout__title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}
.sb-callout__body {
  font-size: 13px;
  line-height: 1.55;
}
.sb-callout__detail {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--sb-border, #e0e0e0);
  font-size: 13px;
  line-height: 1.55;
}
</style>
