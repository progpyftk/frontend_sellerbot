<template>
  <q-select
    v-model="modelo"
    :options="opcoes"
    use-input
    input-debounce="0"
    @filter="filtrar"
    @popup-show="limparBusca"
    @update:model-value="limparBusca"
    emit-value
    map-options
    option-label="rotulo"
    options-dense
    clearable
  >
    <template #no-option>
      <q-item>
        <q-item-section class="text-grey-6">Nenhuma categoria encontrada.</q-item-section>
      </q-item>
    </template>

    <template #option="scope">
      <q-item-label v-if="scope.opt.inicioGrupo" header class="categoria-grupo">
        {{ scope.opt.grupo }}
      </q-item-label>
      <q-item v-bind="scope.itemProps" class="categoria-opcao">
        <q-item-section>
          <q-item-label>{{ scope.opt.rotulo }}</q-item-label>
          <q-item-label caption class="text-grey-6">{{ scope.opt.codigo }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row items-center q-gutter-xs">
            <q-badge v-if="scope.opt.mc" color="teal-1" text-color="teal-9" class="text-bold">
              custo variável
            </q-badge>
            <q-badge
              v-if="scope.opt.foraDoResultado"
              color="purple-1"
              text-color="purple-9"
              class="text-bold"
            >
              fora do DRE
            </q-badge>
            <q-icon v-if="scope.opt.ajuda" name="help_outline" size="14px" color="grey-6">
              <q-tooltip max-width="280px">{{ scope.opt.ajuda }}</q-tooltip>
            </q-icon>
          </div>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script setup>
// Seleção de categoria do plano de contas: a lista vem do backend e é agrupada por grupo,
// com as marcas que mudam a leitura do DRE (`mc`, `fora_do_resultado`) e a ajuda da conta.
// Recebe v-model com o CÓDIGO da conta (emit-value + map-options).
import { computed, ref } from "vue";
import { montarOpcoes } from "src/components/common/categoriaOptions";

const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  /** Grupos do plano de contas: [{ nome, categorias: [...] }] */
  grupos: { type: Array, default: () => [] },
});
const emit = defineEmits(["update:modelValue"]);

const busca = ref("");

const modelo = computed({
  get: () => (props.modelValue === null || props.modelValue === undefined ? "" : props.modelValue),
  set: (valor) => emit("update:modelValue", valor),
});

// A lista completa fica sempre disponível: o filtro só recorta a exibição.
const opcoes = computed(() => montarOpcoes(props.grupos, busca.value));

// O Quasar chama `@filter` com o **rótulo da opção escolhida** ao selecionar e ao reabrir o
// menu (`updateInputValue`/`showPopup` em QSelect.js). Sem zerar a busca, o select reabriria
// filtrado por esse rótulo e mostraria só a categoria já escolhida. Zerar nos dois momentos
// é o que mantém a lista inteira navegável depois de qualquer seleção.
function limparBusca() {
  busca.value = "";
}

function filtrar(valor, update) {
  update(() => {
    busca.value = valor;
  });
}
</script>

<style lang="scss" scoped>
.categoria-grupo {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0f766e;
}
</style>
