<template>
  <q-select
    :model-value="modelValue"
    :options="options"
    :label="label"
    :rules="rules"
    :hint="hint"
    :clearable="clearable"
    :disable="disable"
    emit-value
    map-options
    dense
    outlined
    options-dense
    bg-color="white"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup>
// Seletor de empresa (CNPJ) compartilhado — ticket FIN-22.
//
// O mesmo select estava repetido em quatro telas (Margem de Contribuição, Balanço fiscal,
// Documentos fiscais e Nova conexão bancária), cada uma com o seu par de props. Aqui ele
// recebe `v-model` com o valor da opção (CNPJ ou id, conforme a lista que vier por
// `opcoesDeEmpresa`) e repassa o evento, então `@update:model-value` do pai também dispara
// — é assim que as telas recarregam ao trocar de empresa.
//
// O componente é **agnóstico de valor**: quem monta as opções decide se o `value` é o CNPJ
// (telas de leitura) ou o id da conta fiscal (tela de conexões). `clearable` é falso por
// padrão porque no Balanço o CNPJ é obrigatório; quem quiser limpar passa a prop.
defineProps({
  modelValue: { type: [String, Number], default: null },
  /** Opções no formato Quasar: `[{ label, value }]` (ver `utils/seletores.js`). */
  options: { type: Array, default: () => [] },
  label: { type: String, default: "CNPJ / empresa" },
  rules: { type: Array, default: () => [] },
  hint: { type: String, default: "" },
  clearable: { type: Boolean, default: false },
  disable: { type: Boolean, default: false },
});
defineEmits(["update:modelValue"]);
</script>
