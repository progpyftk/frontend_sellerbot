<template>
  <div class="sb-tabela" :class="[`sb-tabela--${densidade}`, { 'sb-tabela--sticky': stickyHeader }]">
    <SbEmptyState v-if="carregando" variant="loading" :title="textoCarregando" />
    <slot v-else-if="erro" name="erro">
      <SbEmptyState variant="error" title="Não foi possível carregar" :message="erro" />
    </slot>
    <slot v-else-if="!linhasOrdenadas.length" name="vazio">
      <SbEmptyState :title="vazio.titulo" :message="vazio.mensagem" />
    </slot>

    <div v-else class="sb-tabela__rolagem" :style="estiloDaRolagem">
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
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(linha, indice) in linhasOrdenadas"
            :key="chaveDaLinha(linha, indice)"
            class="sb-tabela__linha"
            tabindex="0"
            @click="aoClicarNaLinha($event, linha)"
            @keydown.enter.prevent="emitirLinha(linha)"
            @keydown.space.prevent="emitirLinha(linha)"
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
          </tr>
        </tbody>
      </table>
    </div>
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
// Fora do contrato de propósito: paginação, seleção múltipla, agrupamento e edição (esta é do
// FINT-4). O detalhe da linha (painel) e o botão acessível explícito são do FINT-3.
//
// `stickyHeader` só gruda de verdade quando o contêiner tem altura limitada — passe
// `alturaMaxima` ou limite pelo pai (é a lição do DASH-18: `sticky` sem altura não gruda).
import { computed } from 'vue'

import {
  estadoDaColuna,
  ordenacaoInicial,
  ordenarLinhas,
  proximaOrdenacao,
  valorDaChave,
} from 'src/composables/useOrdenacao'
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
})

const emit = defineEmits(['update:ordenacao', 'ordenar', 'linha'])

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

function emitirLinha(linha) {
  emit('linha', linha)
}

function aoClicarNaLinha(evento, linha) {
  // Clicar em controle da linha (botão, link, campo) ou selecionar texto não abre o detalhe.
  const alvo = evento.target
  if (alvo?.closest?.('button, a, input, select, textarea, [data-sem-clique]')) return
  if (typeof window !== 'undefined' && window.getSelection?.()?.toString()) return
  emitirLinha(linha)
}

function chaveDaLinha(linha, indice) {
  const chave = typeof props.chaveLinha === 'function' ? props.chaveLinha(linha) : linha?.[props.chaveLinha]
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
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    tbody tr:last-child td {
      border-bottom: none;
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
