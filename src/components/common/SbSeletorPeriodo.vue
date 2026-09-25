<template>
  <div class="row q-col-gutter-md">
    <div :class="coluna">
      <q-input
        :model-value="modelValue?.de ?? ''"
        type="month"
        dense
        outlined
        bg-color="white"
        :label="labelDe"
        @update:model-value="atualizar('de', $event)"
      />
    </div>
    <div :class="coluna">
      <q-input
        :model-value="modelValue?.ate ?? ''"
        type="month"
        dense
        outlined
        bg-color="white"
        :label="labelAte"
        @update:model-value="atualizar('ate', $event)"
      />
    </div>
  </div>
  <div v-if="!valido" class="text-caption text-negative q-mt-xs">
    A competência final não pode ser anterior à inicial.
  </div>
</template>

<script setup>
// Seletor de período (competência) compartilhado — ticket FIN-22.
//
// Recebe `v-model` com `{ de, ate }` em `AAAA-MM` (o formato do `<input type="month">`) e
// emite o objeto inteiro a cada mudança, então o pai recarrega igual fazia com os dois
// inputs soltos. A regra de período invertido vem de `utils/seletores.js`: um recorte
// impossível não pode virar "sem filtro" em silêncio, então a tela avisa.
//
// `coluna` existe porque a largura do par muda de tela para tela (as telas usam `col-6
// col-md-3` no desktop e a largura cheia no celular).
import { computed } from "vue";

import { periodoValido } from "src/utils/seletores";

const props = defineProps({
  modelValue: { type: Object, default: () => ({ de: "", ate: "" }) },
  labelDe: { type: String, default: "Competência de" },
  labelAte: { type: String, default: "Competência até" },
  coluna: { type: String, default: "col-6 col-md-3" },
});
const emit = defineEmits(["update:modelValue"]);

const valido = computed(() => periodoValido(props.modelValue?.de, props.modelValue?.ate));

function atualizar(campo, valor) {
  emit("update:modelValue", { ...(props.modelValue || {}), [campo]: valor || "" });
}
</script>
