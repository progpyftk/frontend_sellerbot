<template>
  <div v-if="aberto" class="sb-detalhe">
    <div class="sb-detalhe__fundo" @click="emit('fechar')" />
    <aside
      ref="painel"
      class="sb-detalhe__painel"
      role="dialog"
      aria-modal="true"
      :aria-label="titulo || 'Detalhe da linha'"
      tabindex="-1"
      :style="{ width: largura }"
    >
      <header class="sb-detalhe__cabecalho">
        <div class="sb-detalhe__titulos">
          <div v-if="eyebrow" class="sb-detalhe__eyebrow">{{ eyebrow }}</div>
          <h3 v-if="titulo" class="sb-detalhe__titulo">{{ titulo }}</h3>
          <div v-if="subtitulo" class="sb-detalhe__subtitulo">{{ subtitulo }}</div>
        </div>
        <q-btn flat round dense icon="close" aria-label="Fechar detalhe" @click="emit('fechar')" />
      </header>

      <div class="sb-detalhe__corpo">
        <slot />
      </div>
    </aside>
  </div>
</template>

<script setup>
// Painel lateral do detalhe da linha (ticket FINT-3).
//
// Decisão do dono (`P1`): o detalhe abre **à direita**, não em modal nem empurrando a linha. Ele é
// controlado (`aberto`) e só emite `fechar` — quem devolve o foco à linha é a `SbTabela`, que sabe
// qual elemento abriu. O painel cuida do que é dele: o Esc, o `role="dialog"` e o foco inicial.
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  aberto: { type: Boolean, default: false },
  titulo: { type: String, default: '' },
  subtitulo: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  largura: { type: String, default: '420px' },
})

const emit = defineEmits(['fechar'])

const painel = ref(null)

function aoTeclar(evento) {
  if (evento.key !== 'Escape') return
  evento.stopPropagation()
  emit('fechar')
}

watch(
  () => props.aberto,
  (aberto) => {
    if (aberto) {
      document.addEventListener('keydown', aoTeclar)
      nextTick(() => painel.value?.focus())
    } else {
      document.removeEventListener('keydown', aoTeclar)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => document.removeEventListener('keydown', aoTeclar))
</script>

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

.sb-detalhe {
  &__fundo {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.28);
    z-index: 1000;
  }

  &__painel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    max-width: 100vw;
    display: flex;
    flex-direction: column;
    background: $surface;
    border-left: 1px solid $border;
    box-shadow: $shadow-lg;
    z-index: 1001;
    outline: none;
  }

  &__cabecalho {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $space-3;
    padding: $space-4;
    border-bottom: 1px solid $border;
  }

  &__titulos {
    min-width: 0;
  }

  &__eyebrow {
    font-size: 11px;
    font-weight: $font-semibold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $text-muted;
  }

  &__titulo {
    margin: 2px 0 0;
    font-size: $text-h3-size;
    font-weight: $font-semibold;
    color: $text-primary;
  }

  &__subtitulo {
    margin-top: 2px;
    font-size: $text-xs-size;
    color: $text-muted;
  }

  &__corpo {
    flex: 1;
    overflow-y: auto;
    padding: $space-4;
  }
}
</style>
