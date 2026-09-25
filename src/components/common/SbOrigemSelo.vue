<template>
  <SbBadge :variant="info?.variante || 'slate'" :icon="info?.derivada ? 'lock' : 'edit_note'" :title="titulo">
    {{ info?.rotulo || '—' }}
  </SbBadge>
</template>

<script setup>
// Selo da origem do número (ticket FINT-5).
//
// Ele existe para o dono **saber por que a célula não abre**: o número que veio de nota, extrato,
// PGDASD ou do livro sai marcado com a origem e com o cadeado, em vez de a tela simplesmente não
// reagir ao clique. O vocabulário é o do backend (`utils/editabilidade.js`).
import { computed } from 'vue'

import { motivoNaoEditavel, origemInfo } from 'src/utils/editabilidade'
import SbBadge from './SbBadge.vue'

const props = defineProps({
  origem: { type: String, default: '' },
})

const info = computed(() => origemInfo(props.origem))
const titulo = computed(() => motivoNaoEditavel(props.origem) || `Origem: ${info.value?.rotulo || '—'}`)
</script>
