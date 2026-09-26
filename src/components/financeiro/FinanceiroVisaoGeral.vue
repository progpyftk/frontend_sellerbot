<template>
  <div>
    <FinanceiroRecorte
      v-model:empresa="empresa"
      v-model:periodo="periodo"
      :carregando="loading"
      :aviso="avisoDoRecorte"
      @carregar="carregar"
    />

    <SbEmptyState v-if="loading" variant="loading" title="Carregando o recorte…" />
    <SbEmptyState
      v-else-if="erro"
      variant="error"
      title="Não foi possível carregar o recorte"
      :message="erro"
    />
    <template v-else-if="empresas.length">
      <div v-if="grupo" class="row q-col-gutter-md q-mb-md">
        <div v-for="card in cardsDoGrupo" :key="card.label" class="col-12 col-sm-6 col-md-3">
          <SbKpiCard :label="card.label" :value="card.valor" :sub="card.sub" :variant="card.variant" />
        </div>
      </div>

      <SbCard
        v-for="item in empresas"
        :key="item.cnpj"
        class="q-mb-md"
        :title="item.razao_social || item.cnpj"
        :eyebrow="`${formatarCnpj(item.cnpj)} · ${item.de} a ${item.ate}`"
      >
        <div class="row q-col-gutter-md q-mb-md">
          <div v-for="card in cardsDaEmpresa(item)" :key="card.label" class="col-12 col-sm-6 col-md-3">
            <SbKpiCard :label="card.label" :value="card.valor" :sub="card.sub" :variant="card.variant" />
          </div>
        </div>

        <div class="row items-center q-gutter-sm q-mb-sm">
          <SbBadge :variant="item.dre?.confere ? 'green' : 'red'" icon="fact_check">
            DRE {{ item.dre?.confere ? 'confere' : 'não confere' }}
          </SbBadge>
          <SbBadge :variant="item.balanco?.equilibra ? 'green' : 'red'" icon="balance">
            Balanço {{ item.balanco?.equilibra ? 'equilibra' : `resíduo R$ ${item.balanco?.equacao}` }}
          </SbBadge>
          <SbBadge :variant="item.dfc?.confere ? 'green' : 'red'" icon="waterfall_chart">
            DFC {{ item.dfc?.confere ? 'confere' : 'não confere' }}
          </SbBadge>
        </div>

        <CascataDre
          :nome-exportacao="`visao-geral-${item.cnpj}`"
          :dre="item.dre"
          titulo-detalhe="Origem do número"
          subtitulo-detalhe="As contas do livro que compõem esta linha"
        />
      </SbCard>
    </template>
    <SbEmptyState
      v-else
      title="Sem leitura para este recorte"
      message="O backend não devolveu empresa nem grupo: escolha outra competência ou verifique se há lançamento no livro."
    />
  </div>
</template>

<script setup>
// Aba "Visão geral" do Módulo Financeiro/Contábil (ticket FIN-14, onda 1; tabela padrão no FINT-7).
//
// Carrega `GET /api/financeiro/contabil/resumo/` — DRE + Balanço + DFC + estoque de uma vez — e mostra
// os números **como o backend apurou**, com o selo de conferência de cada demonstrativo. A tela não
// recalcula margem nem imposto: a régua é a do livro (`FIN-18`).
//
// Sem empresa escolhida, o recorte é o **grupo somado** (`todas_juntas=1`); o aviso de que a eliminação
// intercompany não está feita vai como prop para o recorte compartilhado, para o número não ser lido
// como consolidado contábil.
//
// O recorte é o `FinanceiroRecorte` (FINT-20): esta aba tinha a própria cópia do cartão, com a sua
// própria busca de CNPJ — o mesmo formulário escrito duas vezes.
//
// A cascata é a mesma `CascataDre` da aba DRE — uma implementação só para as duas telas.
import { computed, onMounted, ref } from 'vue'

import { useEstadoNaUrl } from 'src/composables/useEstadoNaUrl'

import CascataDre from 'src/components/financeiro/CascataDre.vue'
import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import ContabilService from 'src/services/ContabilService'

import { formatarCnpj } from 'src/utils/seletores'
import { formatarMoeda, numerosDaVisaoGeral } from 'src/utils/contabil'

// Recorte na URL (FINT-11): a empresa e a competência vêm do link e voltam para ele.
const { empresa, periodo } = useEstadoNaUrl()
// O aviso do grupo somado acompanha o recorte, agora que ele é o componente compartilhado.
const avisoDoRecorte =
  'Sem empresa selecionada, o recorte é o grupo somado (leitura gerencial — a eliminação intercompany ainda não está feita).'

const empresas = ref([])
const grupo = ref(null)
const loading = ref(false)
const erro = ref('')

const cardsDoGrupo = computed(() => {
  if (!grupo.value) return []
  return [
    { label: 'Empresas somadas', valor: String(grupo.value.empresas ?? '—'), variant: 'slate' },
    { label: 'Resultado líquido do grupo', valor: formatarMoeda(grupo.value.resultado_liquido), variant: 'teal' },
    { label: 'Ativo do grupo', valor: formatarMoeda(grupo.value.ativo), variant: 'sky' },
    { label: 'Variação de caixa do grupo', valor: formatarMoeda(grupo.value.variacao_do_caixa), variant: 'indigo' },
  ]
})

function cardsDaEmpresa(item) {
  const n = numerosDaVisaoGeral(item)
  return [
    { label: 'Receita bruta', valor: formatarMoeda(n.receita_bruta), sub: 'livro contábil do período' },
    { label: '(−) Impostos sobre a receita', valor: formatarMoeda(n.impostos_sobre_a_receita), sub: 'DAS declarado (DRE-7)', variant: 'amber' },
    { label: '= Receita líquida', valor: formatarMoeda(n.receita_liquida), variant: 'sky' },
    {
      label: 'Margem de contribuição',
      valor: formatarMoeda(n.margem_contribuicao),
      sub: n.margem_contribuicao_pct ? `${n.margem_contribuicao_pct}% da receita líquida` : '',
      variant: 'green',
    },
    { label: 'Resultado líquido', valor: formatarMoeda(n.resultado_liquido), variant: 'teal' },
    { label: 'EBITDA', valor: formatarMoeda(n.ebitda), sub: n.ebitda_pct ? `${n.ebitda_pct}% da receita líquida` : '' },
    { label: 'Ativo', valor: formatarMoeda(n.ativo), sub: 'Balanço na data final', variant: 'sky' },
    { label: 'Variação de caixa', valor: formatarMoeda(n.variacao_do_caixa), sub: 'DFC do período', variant: 'indigo' },
  ]
}

async function carregar() {
  loading.value = true
  erro.value = ''
  try {
    const params = {}
    if (empresa.value) params.fiscal_account = empresa.value
    else params.todas_juntas = 1
    if (periodo.value?.de) params.de = periodo.value.de
    if (periodo.value?.ate) params.ate = periodo.value.ate
    const resposta = await ContabilService.getResumo(params)
    const dados = resposta.data || {}
    empresas.value = Array.isArray(dados.empresas) ? dados.empresas : []
    grupo.value = empresas.value.length > 1 ? dados.resumo : null
  } catch (e) {
    empresas.value = []
    grupo.value = null
    erro.value =
      e?.response?.data?.detail ||
      e?.response?.data?.competencia ||
      'Verifique a competência escolhida e o vínculo da conta com o CNPJ.'
  } finally {
    loading.value = false
  }
}

onMounted(carregar)
</script>
