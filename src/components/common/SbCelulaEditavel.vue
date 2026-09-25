<template>
  <span class="sb-celula" :class="{ 'is-editando': editando, 'is-salvando': salvando }">
    <template v-if="editando">
      <select
        v-if="tipo === 'selecao'"
        ref="campo"
        v-model="rascunho"
        class="sb-celula__campo"
        :aria-label="rotulo || 'Editar valor'"
        @keydown.enter.prevent="confirmar"
        @keydown.esc.stop.prevent="cancelar"
        @blur="confirmar"
      >
        <option v-for="opcao in opcoes" :key="String(opcao.value)" :value="opcao.value">
          {{ opcao.label }}
        </option>
      </select>
      <input
        v-else
        ref="campo"
        v-model="rascunho"
        class="sb-celula__campo"
        :type="tipoDoCampo"
        :aria-label="rotulo || 'Editar valor'"
        :aria-invalid="!!erroLocal"
        @keydown.enter.prevent="confirmar"
        @keydown.esc.stop.prevent="cancelar"
        @blur="confirmar"
      />
    </template>

    <button
      v-else-if="podeEditarAgora"
      type="button"
      class="sb-celula__valor is-editavel"
      :title="rotulo ? `Editar ${rotulo}` : 'Editar'"
      @click="entrarEmEdicao"
    >
      {{ exibicao }}
    </button>

    <span v-else class="sb-celula__valor is-somente-leitura" :title="motivo || undefined">
      {{ exibicao }}
      <q-icon v-if="motivo" name="lock" size="12px" aria-hidden="true" />
    </span>

    <span v-if="salvando" class="sb-celula__estado">salvando…</span>
    <span v-else-if="erroLocal" class="sb-celula__erro" role="alert">{{ erroLocal }}</span>
  </span>
</template>

<script setup>
// Edição no lugar de uma célula (ticket FINT-4).
//
// Decisão do dono (`P2`): o campo simples se edita na própria célula; modal só para o que tem anexo.
//
// Por que o salvamento é uma **função prop** (`salvar`) e não um evento: o salvamento é **otimista** —
// a célula mostra o valor novo, e se a API recusar ela **volta** o valor antigo e mostra o motivo
// onde ele aconteceu. Essa coreografia precisa de um dono só; se ela ficasse com quem chama, cada
// aba repetiria o try/catch e o rollback.
//
// Regras: Enter ou blur salva · Esc cancela · valor inválido não sai da edição · sem mudança não
// dispara requisição · nunca em lote. Quem decide **se** o campo é editável é a régua do `FINT-5`
// (`podeEditar`), aplicada pela aba que monta a coluna.
import { computed, nextTick, ref } from 'vue'

import { paraNumero } from 'src/composables/useOrdenacao'

const SEM_VALOR = Symbol('sem-valor')

const props = defineProps({
  valor: { type: [String, Number, Boolean], default: null },
  /** `texto` · `numero` · `moeda` · `data` · `selecao` */
  tipo: { type: String, default: 'texto' },
  /** Opções do `selecao`: `[{ label, value }]`. */
  opcoes: { type: Array, default: () => [] },
  /** A coluna permite editar? A palavra final ainda passa pela origem (`podeEditar`). */
  editavel: { type: Boolean, default: false },
  /** `async (valorNovo) => …` — obrigatória para a célula abrir edição. */
  salvar: { type: Function, default: null },
  /** Formata o valor para leitura (`formatarMoeda`, `formatarCnpj`…). */
  formatar: { type: Function, default: null },
  /** `(valor) => true | string` — a string é a mensagem de erro mostrada na célula. */
  validar: { type: Function, default: null },
  /** Rótulo acessível do campo (`"Valor"` → lê "Editar Valor"). */
  rotulo: { type: String, default: '' },
  /** Por que a célula não edita (texto do `motivoNaoEditavel` do FINT-5). */
  motivo: { type: String, default: '' },
})

const emit = defineEmits(['salvo', 'falha'])

const editando = ref(false)
const rascunho = ref('')
const salvando = ref(false)
const erroLocal = ref('')
const valorOtimista = ref(SEM_VALOR)
const campo = ref(null)

const podeEditarAgora = computed(
  () => props.editavel && !salvando.value && typeof props.salvar === 'function',
)

const valorAtual = computed(() => (valorOtimista.value === SEM_VALOR ? props.valor : valorOtimista.value))

const exibicao = computed(() => {
  const valor = valorAtual.value
  if (valor === null || valor === undefined || valor === '') return '—'
  return props.formatar ? props.formatar(valor) : valor
})

const tipoDoCampo = computed(() => {
  if (props.tipo === 'numero') return 'number'
  if (props.tipo === 'data') return 'date'
  return 'text'
})

function valorParaCampo(valor) {
  return valor === null || valor === undefined ? '' : String(valor)
}

function entrarEmEdicao() {
  if (!podeEditarAgora.value) return
  erroLocal.value = ''
  rascunho.value = valorParaCampo(valorAtual.value)
  editando.value = true
  nextTick(() => {
    campo.value?.focus?.()
    campo.value?.select?.()
  })
}

function cancelar() {
  editando.value = false
  erroLocal.value = ''
}

function valorConvertido() {
  if (props.tipo === 'numero' || props.tipo === 'moeda') return paraNumero(rascunho.value)
  return rascunho.value
}

function mesmoValor(a, b) {
  return String(a ?? '') === String(b ?? '')
}

function validarValor(valor) {
  if ((props.tipo === 'numero' || props.tipo === 'moeda') && valor === null) {
    return 'Informe um número.'
  }
  if (typeof props.validar !== 'function') return ''
  const resposta = props.validar(valor)
  if (resposta === true || resposta === undefined || resposta === null) return ''
  if (typeof resposta === 'string') return resposta
  return resposta === false ? 'Valor inválido.' : ''
}

function mensagemDoErro(erro) {
  const dados = erro?.response?.data
  if (typeof dados === 'string' && dados) return dados
  return dados?.detalhe || dados?.detail || erro?.message || 'Não foi possível salvar.'
}

async function confirmar() {
  if (!editando.value || salvando.value) return

  const convertido = valorConvertido()
  if (mesmoValor(convertido, valorAtual.value)) {
    editando.value = false
    return
  }

  const problema = validarValor(convertido)
  if (problema) {
    erroLocal.value = problema
    nextTick(() => campo.value?.focus?.())
    return
  }

  editando.value = false
  salvando.value = true
  erroLocal.value = ''
  valorOtimista.value = convertido

  try {
    await props.salvar(convertido)
    emit('salvo', convertido)
  } catch (erro) {
    valorOtimista.value = SEM_VALOR
    erroLocal.value = mensagemDoErro(erro)
    emit('falha', erro)
  } finally {
    salvando.value = false
  }
}
</script>

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

.sb-celula {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  max-width: 100%;

  &__valor {
    padding: 2px 4px;
    border-radius: $radius-sm;
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    text-align: inherit;

    &.is-editavel {
      cursor: pointer;
      border-bottom: 1px dashed $border-strong;

      &:hover {
        background: $surface-2;
      }

      &:focus-visible {
        outline: 2px solid $primary;
        outline-offset: 1px;
      }
    }

    &.is-somente-leitura {
      color: inherit;
      cursor: default;
    }
  }

  &__campo {
    width: 100%;
    min-width: 90px;
    padding: 4px 6px;
    border: 1px solid $primary;
    border-radius: $radius-sm;
    font: inherit;
    color: $text-primary;
    background: $surface;

    &:focus {
      outline: none;
    }
  }

  &__estado {
    font-size: $text-xs-size;
    color: $text-muted;
  }

  &__erro {
    font-size: $text-xs-size;
    color: $tint-red-text;
    font-weight: $font-medium;
  }
}
</style>
