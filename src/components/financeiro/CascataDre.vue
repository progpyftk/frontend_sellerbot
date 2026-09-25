<template>
  <div class="cascata-dre">
    <SbTabela
      exportavel
      :nome-exportacao="nomeExportacao"
      :colunas="COLUNAS"
      :linhas="linhas"
      chave-linha="chave"
      rotulo="Cascata do DRE"
      :classe-linha="classeDaLinha"
      :detalhavel="temOrigem"
      :titulo-detalhe="tituloDetalhe"
      :subtitulo-detalhe="subtituloDetalhe"
      largura-detalhe="480px"
    >
      <template #celula-rotulo="{ linha }">
        {{ linha.rotulo }}
        <span v-if="linha.chave === 'margem_contribuicao' && dre?.margem_contribuicao_pct" class="texto-apoio">
          ({{ dre.margem_contribuicao_pct }}% da receita líquida)
        </span>
        <span v-if="linha.chave === 'ebitda' && dre?.ebitda_pct" class="texto-apoio">
          ({{ dre.ebitda_pct }}% da receita líquida)
        </span>
      </template>

      <template #celula-valor="{ valor }">{{ formatarMoeda(valor) }}</template>

      <template #detalhe="{ linha }">
        <DetalheContas :contas="linha.contas" :titulo="`Contas da linha “${linha.rotulo}”`" />
      </template>
    </SbTabela>
  </div>
</template>

<script setup>
// A cascata do DRE como tabela (ticket FINT-7).
//
// Existe como componente porque **duas abas mostram a mesma cascata** — a Visão geral (por empresa) e
// a aba DRE — e antes cada uma desenhava a sua grade. A tabela é somente leitura: o número vem do
// livro e a tela não recalcula.
//
// O valor de cada linha continua sendo o subtotal do backend (`subtotais`); o que muda é que a
// **origem do número** deixou de ser um bloco escondido no pé da tabela e virou o detalhe do clique
// na linha, filtrando as contas por `linha_do_dre` — recorte que o backend já entrega.
import { computed } from 'vue'

import SbTabela from 'src/components/common/SbTabela.vue'
import DetalheContas from 'src/components/financeiro/DetalheContas.vue'
import { contasDaLinhaDoDre, formatarMoeda, linhasDaCascata } from 'src/utils/contabil'

const props = defineProps({
  /** O objeto do DRE como o backend devolve (`subtotais` + `linhas`). */
  dre: { type: Object, default: () => ({}) },
  tituloDetalhe: { type: String, default: 'Origem do número' },
  subtituloDetalhe: { type: String, default: '' },
  /** Nome do arquivo do CSV — a aba passa o recorte para o link ser reconhecível. */
  nomeExportacao: { type: String, default: 'dre-cascata' },
})

const COLUNAS = [
  { chave: 'rotulo', rotulo: 'Linha do DRE', largura: '62%' },
  { chave: 'valor', rotulo: 'Valor (R$)', tipo: 'moeda', alinhamento: 'right' },
]

// A ordenação é **deliberadamente ausente**: a ordem da cascata é a informação (receita → deduções →
// custo → resultado), e ordenar por valor embaralharia a leitura do demonstrativo. A ordenação entra
// onde a linha é item de lista — extratos, despesas e livro (`FINT-6`/`FINT-9`/`FINT-10`).
const linhas = computed(() =>
  linhasDaCascata(props.dre?.subtotais).map((linha) => ({
    ...linha,
    contas: contasDaLinhaDoDre(props.dre, linha.chave),
  })),
)

const classeDaLinha = (linha) => `cascata--${linha.tipo}`
const temOrigem = (linha) => (linha.contas?.length ?? 0) > 0
</script>

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

.cascata-dre {
  :deep(.cascata--destaque) {
    font-weight: 700;
    color: $tint-teal-text;
  }

  :deep(.cascata--subtotal) {
    font-weight: 600;
  }
}

.texto-apoio {
  color: $text-muted;
}
</style>
