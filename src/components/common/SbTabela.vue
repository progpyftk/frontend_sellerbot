<template>
  <div class="sb-tabela" :class="[`sb-tabela--${densidade}`, { 'sb-tabela--sticky': stickyHeader }]">
    <SbEmptyState v-if="carregando" variant="loading" :title="textoCarregando" />
    <slot v-else-if="erro" name="erro">
      <SbEmptyState variant="error" title="Não foi possível carregar" :message="erro" />
    </slot>
    <slot v-else-if="!linhasOrdenadas.length" name="vazio">
      <SbEmptyState :title="vazio.titulo" :message="vazio.mensagem" />
    </slot>

    <template v-else>
      <!-- Exportação (FINT-12): o botão vive na tabela porque o que se exporta é **esta visão** —
           as linhas já filtradas e na ordem que está na tela. -->
      <div v-if="exportavel" class="sb-tabela__barra">
        <q-btn
          flat
          dense
          no-caps
          size="sm"
          color="teal-8"
          icon="download"
          :label="`Exportar ${linhasOrdenadas.length} linha(s)`"
          @click="exportar"
        >
          <q-tooltip>Baixa o CSV desta tabela, já filtrada e na ordem da tela</q-tooltip>
        </q-btn>
      </div>

    <div class="sb-tabela__rolagem" :style="estiloDaRolagem">
      <table class="sb-tabela__grade">
        <caption v-if="rotulo" class="sb-tabela__legenda">{{ rotulo }}</caption>
        <thead>
          <tr>
            <th
              v-for="coluna in colunas"
              :key="coluna.chave"
              scope="col"
              :class="classesDoCabecalho(coluna)"
              :style="estiloDaColuna(coluna)"
              :aria-sort="coluna.ordenavel ? estadoDaColuna(ordenacao, coluna.chave) : null"
            >
              <slot :name="`cabecalho-${coluna.chave}`" :coluna="coluna">
                <button
                  v-if="coluna.ordenavel"
                  type="button"
                  class="sb-tabela__ordenar"
                  @click="ordenarPor(coluna)"
                >
                  <span>{{ coluna.rotulo }}</span>
                  <q-icon
                    :name="iconeDaOrdem(coluna)"
                    :class="{ 'is-inativo': estadoDaColuna(ordenacao, coluna.chave) === 'none' }"
                    size="14px"
                    aria-hidden="true"
                  />
                </button>
                <template v-else>{{ coluna.rotulo }}</template>
              </slot>
            </th>
            <th v-if="mostrarAcao" scope="col" class="is-center sb-tabela__col-acao">
              <span class="sb-tabela__oculto">{{ rotuloAcao }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(linha, indice) in linhasOrdenadas"
            :key="chaveDaLinha(linha, indice)"
            :class="[classeDaLinha(linha, indice), 'sb-tabela__linha']"
            tabindex="0"
            @click="aoClicarNaLinha($event, linha)"
            @keydown.enter.prevent="emitirLinha(linha, $event.currentTarget)"
            @keydown.space.prevent="emitirLinha(linha, $event.currentTarget)"
          >
            <td
              v-for="coluna in colunas"
              :key="coluna.chave"
              :class="classesDaCelula(coluna)"
              :data-rotulo="coluna.rotulo"
            >
              <slot
                :name="`celula-${coluna.chave}`"
                :linha="linha"
                :valor="valorDaChave(linha, coluna.chave)"
                :indice="indice"
              >{{ textoPadrao(linha, coluna) }}</slot>
            </td>
            <td v-if="mostrarAcao" class="is-center sb-tabela__col-acao">
              <button
                v-if="podeAbrirDetalhe(linha)"
                type="button"
                class="sb-tabela__abrir"
                :aria-label="`Abrir detalhes da linha ${indice + 1}`"
                @click.stop="emitirLinha(linha, $event.currentTarget)"
              >
                <q-icon name="chevron_right" size="18px" aria-hidden="true" />
              </button>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="$slots.rodape">
          <slot name="rodape" />
        </tfoot>
      </table>
      </div>
    </template>

    <SbDetalheLinha
      v-if="temDetalhe"
      :aberto="!!linhaAberta"
      :titulo="tituloDetalhe"
      :subtitulo="subtituloDetalhe"
      :largura="larguraDetalhe"
      @fechar="fecharDetalhe"
    >
      <slot name="detalhe" :linha="linhaAberta" />
    </SbDetalheLinha>
  </div>
</template>

<script setup>
// Tabela minimalista do Financeiro & Contábil (ticket FINT-1).
//
// Um primitivo só para todas as abas: colunas declarativas, ordenação por clique no
// cabeçalho (a regra pura vive em `composables/useOrdenacao.js`), linha clicável e os três
// estados de tela (carregando/vazio/erro). O que é específico de uma aba entra por
// **slot** (`#celula-<chave>`), não por prop nova — é o que impede isto de virar um `q-table`.
//
// O detalhe (`FINT-3`): se a aba passar o slot `#detalhe`, a tabela **já** abre o painel no clique
// (e no Enter/Espaço), acrescenta o **botão acessível de abrir** em coluna própria e devolve o foco
// a quem abriu quando o painel fecha. Sem o slot, a tabela só emite `linha`.
//
// `stickyHeader` só gruda de verdade quando o contêiner tem altura limitada — passe
// `alturaMaxima` ou limite pelo pai (é a lição do DASH-18: `sticky` sem altura não gruda).
import { computed, nextTick, ref, useSlots, watch } from 'vue'

import {
  estadoDaColuna,
  ordenacaoInicial,
  ordenarLinhas,
  proximaOrdenacao,
  valorDaChave,
} from 'src/composables/useOrdenacao'
import { baixarCsv, paraCsv } from 'src/utils/csv'
import SbDetalheLinha from './SbDetalheLinha.vue'
import SbEmptyState from './SbEmptyState.vue'

const props = defineProps({
  /** `[{ chave, rotulo, alinhamento, tipo, ordenavel, largura, ocultaEm }]` */
  colunas: { type: Array, required: true },
  linhas: { type: Array, default: () => [] },
  chaveLinha: { type: [String, Function], default: 'id' },
  /** `v-model:ordenacao` — `{ chave, direcao }`, o mesmo formato de `useOrdenacao`. */
  ordenacao: { type: Object, default: () => ordenacaoInicial() },
  densidade: {
    type: String,
    default: 'compacta',
    validator: (valor) => ['compacta', 'confortavel'].includes(valor),
  },
  stickyHeader: { type: Boolean, default: true },
  /** Altura máxima da área de rolagem (`"520px"`); sem ela o cabeçalho fixo não tem onde grudar. */
  alturaMaxima: { type: String, default: '' },
  carregando: { type: Boolean, default: false },
  textoCarregando: { type: String, default: 'Carregando…' },
  erro: { type: String, default: '' },
  vazio: { type: Object, default: () => ({ titulo: 'Nada para mostrar', mensagem: '' }) },
  /** Vira o `<caption>` (só para leitor de tela) — diz o que a tabela lista. */
  rotulo: { type: String, default: '' },
  /** Força a coluna de ação mesmo sem o slot `#detalhe` (raro). */
  acaoAbrir: { type: Boolean, default: false },
  rotuloAcao: { type: String, default: 'Abrir' },
  /** Título do painel de detalhe (slot `#detalhe`). */
  tituloDetalhe: { type: String, default: '' },
  subtituloDetalhe: { type: String, default: '' },
  larguraDetalhe: { type: String, default: '420px' },
  /**
   * Classe — ou função `(linha, indice) => classe` — aplicada à `<tr>`. Existe porque a cascata
   * precisa destacar subtotais sem a tabela conhecer regra de negócio.
   */
  classeLinha: { type: [String, Function], default: '' },
  /**
   * `(linha) => boolean`: a linha **tem** detalhe? Sem isto o painel abriria vazio nas linhas cuja
   * origem o backend não manda (o subtotal do Balanço, por exemplo) — e a tela não inventa origem.
   */
  detalhavel: { type: Function, default: null },
  /** Mostra o botão de exportar CSV da **visão atual** (linhas filtradas e na ordem da tela). */
  exportavel: { type: Boolean, default: false },
  /** Nome do arquivo, sem `.csv` — a aba passa o recorte para o link ser reconhecível. */
  nomeExportacao: { type: String, default: 'tabela' },
})

const emit = defineEmits(['update:ordenacao', 'ordenar', 'linha'])

/** Exporta a **visão**: as colunas declaradas × as linhas já filtradas e na ordem da tela. */
function exportar() {
  baixarCsv(
    props.nomeExportacao,
    paraCsv({ colunas: props.colunas, linhas: linhasOrdenadas.value }),
  )
}

const slots = useSlots()
const temDetalhe = computed(() => !!slots.detalhe)
const mostrarAcao = computed(() => temDetalhe.value || props.acaoAbrir)

const linhaAberta = ref(null)
const chaveAberta = ref(null)
const elementoOrigem = ref(null)

const colunaOrdenada = computed(
  () => props.colunas.find((coluna) => coluna.chave === props.ordenacao?.chave) || null,
)

const linhasOrdenadas = computed(() =>
  ordenarLinhas(props.linhas, colunaOrdenada.value, props.ordenacao?.direcao),
)

const estiloDaRolagem = computed(() => (props.alturaMaxima ? { maxHeight: props.alturaMaxima } : null))

function ordenarPor(coluna) {
  const proxima = proximaOrdenacao(props.ordenacao, coluna.chave)
  emit('update:ordenacao', proxima)
  emit('ordenar', proxima)
}

function podeAbrirDetalhe(linha) {
  if (!temDetalhe.value) return false
  if (typeof props.detalhavel !== 'function') return true
  return props.detalhavel(linha) !== false
}

function classeDaLinha(linha, indice) {
  return typeof props.classeLinha === 'function' ? props.classeLinha(linha, indice) : props.classeLinha
}

function emitirLinha(linha, elemento) {
  emit('linha', linha)
  if (podeAbrirDetalhe(linha)) abrirDetalhe(linha, elemento)
}

function aoClicarNaLinha(evento, linha) {
  // Clicar em controle da linha (botão, link, campo) ou selecionar texto não abre o detalhe.
  const alvo = evento.target
  if (alvo?.closest?.('button, a, input, select, textarea, [data-sem-clique]')) return
  if (typeof window !== 'undefined' && window.getSelection?.()?.toString()) return
  emitirLinha(linha, evento.currentTarget)
}

function abrirDetalhe(linha, elemento) {
  elementoOrigem.value = elemento || null
  linhaAberta.value = linha
  chaveAberta.value = chaveDaLinha(linha, -1)
}

/** Fecha o painel e **devolve o foco** a quem o abriu (o botão ou a própria linha). */
function fecharDetalhe() {
  const elemento = elementoOrigem.value
  linhaAberta.value = null
  chaveAberta.value = null
  nextTick(() => {
    if (elemento?.isConnected) elemento.focus()
  })
}

// A linha aberta pode sair da lista (filtro, recorte, novo carregamento): o painel não pode ficar
// mostrando um detalhe que já não está na tela.
watch(
  () => props.linhas,
  () => {
    if (!linhaAberta.value) return
    const aindaExiste = props.linhas.some(
      (linha, indice) => String(chaveDaLinha(linha, indice)) === String(chaveAberta.value),
    )
    if (!aindaExiste) fecharDetalhe()
  },
)

function chaveDaLinha(linha, indice) {
  // A função recebe o índice: quem monta a chave com campos que podem repetir precisa dele.
  const chave =
    typeof props.chaveLinha === 'function' ? props.chaveLinha(linha, indice) : linha?.[props.chaveLinha]
  return chave ?? indice
}

function estiloDaColuna(coluna) {
  return coluna.largura ? { width: coluna.largura } : null
}

function classesDoCabecalho(coluna) {
  const classes = [`is-${coluna.alinhamento || 'left'}`]
  if (coluna.ordenavel) classes.push('is-ordenavel')
  if (estadoDaColuna(props.ordenacao, coluna.chave) !== 'none') classes.push('is-ativa')
  if (coluna.ocultaEm) classes.push(`oculta-${coluna.ocultaEm}`)
  return classes
}

function classesDaCelula(coluna) {
  const classes = [`is-${coluna.alinhamento || 'left'}`]
  if (coluna.tipo === 'numero' || coluna.tipo === 'moeda') classes.push('is-numerico')
  if (coluna.ocultaEm) classes.push(`oculta-${coluna.ocultaEm}`)
  return classes
}

function iconeDaOrdem(coluna) {
  const estado = estadoDaColuna(props.ordenacao, coluna.chave)
  if (estado === 'ascending') return 'arrow_upward'
  if (estado === 'descending') return 'arrow_downward'
  return 'unfold_more'
}

/** Ausência não é zero: sem valor a célula mostra `—`. A aba formata número/moeda pelo slot. */
function textoPadrao(linha, coluna) {
  const valor = valorDaChave(linha, coluna.chave)
  return valor === null || valor === undefined || valor === '' ? '—' : valor
}
</script>

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

.sb-tabela {
  width: 100%;

  &__barra {
    display: flex;
    justify-content: flex-end;
    margin-bottom: $space-1;
  }

  &__rolagem {
    width: 100%;
    overflow: auto;
    border: 1px solid $border;
    border-radius: $radius-lg;
    background: $surface;
  }

  /* Só para leitor de tela — o título visível é do SbPageHeader da página. */
  &__legenda {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  &__grade {
    width: 100%;
    border-collapse: collapse;
    font-size: $text-small-size;
    color: $text-body;

    thead th {
      background: $surface-2;
      color: $text-muted;
      font-size: 11px;
      font-weight: $font-semibold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: left;
      white-space: nowrap;
      border-bottom: 1px solid $border;
    }

    tbody td {
      border-bottom: 1px solid $surface-2;
      vertical-align: middle;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    /* Rodapé de totais (slot `#rodape`): existe para a linha de somatório da conferência. */
    tfoot td {
      background: $surface-2;
      border-top: 1px solid $border;
      font-weight: $font-semibold;
      color: $text-primary;
    }

    .is-right {
      text-align: right;
    }

    .is-center {
      text-align: center;
    }

    .is-numerico {
      font-variant-numeric: tabular-nums;
    }
  }

  &--compacta &__grade {
    th,
    td {
      padding: 10px 14px;
    }
  }

  &--confortavel &__grade {
    th,
    td {
      padding: 14px 16px;
    }
  }

  &--sticky &__grade thead th {
    position: sticky;
    top: 0;
    z-index: 1;
  }

  &__ordenar {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    cursor: pointer;

    .is-inativo {
      visibility: hidden;
    }
  }

  .is-ordenavel {
    cursor: pointer;
  }

  .is-ativa {
    color: $text-primary;
  }

  &__col-acao {
    width: 44px;
  }

  &__abrir {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: $radius-sm;
    background: none;
    color: $text-muted;
    cursor: pointer;

    &:hover {
      background: $surface-2;
      color: $text-primary;
    }

    &:focus-visible {
      outline: 2px solid $primary;
      outline-offset: 1px;
    }
  }

  &__oculto {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  &__linha {
    cursor: pointer;
    transition: background $transition-fast;

    &:hover {
      background: $surface-2;
    }

    &:focus-visible {
      outline: 2px solid $primary;
      outline-offset: -2px;
    }
  }
}

@media (max-width: 640px) {
  .oculta-sm {
    display: none;
  }
}

@media (max-width: 1024px) {
  .oculta-md {
    display: none;
  }
}

@media (max-width: 1280px) {
  .oculta-lg {
    display: none;
  }
}
</style>
