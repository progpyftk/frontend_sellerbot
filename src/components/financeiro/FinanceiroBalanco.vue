<template>
  <div>
    <FinanceiroRecorte
      v-model:empresa="empresa"
      v-model:periodo="periodo"
      :carregando="loading"
      :aviso="aviso"
      @carregar="carregar"
    />

    <SbEmptyState v-if="loading" variant="loading" title="Carregando o Balanço…" />
    <SbEmptyState v-else-if="erro" variant="error" title="Não foi possível carregar o Balanço" :message="erro" />
    <template v-else-if="lista.length">
      <SbCard
        v-for="item in lista"
        :key="item.cnpj"
        class="q-mb-md"
        :title="item.razao_social || item.cnpj"
        :eyebrow="`${formatarCnpj(item.cnpj)} · posição em ${item.ate}`"
      >
        <div class="row items-center q-gutter-sm q-mb-sm">
          <SbBadge :variant="item.equilibra ? 'green' : 'red'" icon="balance">
            {{ item.equilibra ? 'Ativo = Passivo + PL' : `resíduo R$ ${item.equacao}` }}
          </SbBadge>
          <SbBadge v-if="item.contas_sem_classificacao?.length" variant="amber" icon="help_outline">
            {{ item.contas_sem_classificacao.length }} conta(s) sem grupo no Balanço
          </SbBadge>
          <SbBadge v-if="item.controle_e_fora_do_resultado !== '0.00'" variant="indigo" icon="block">
            R$ {{ item.controle_e_fora_do_resultado }} em controle/fora do resultado
          </SbBadge>
        </div>

        <div class="balanco-tabela">
          <SbTabela
            :colunas="COLUNAS"
            :linhas="linhasDoBalanco(item)"
            chave-linha="chave"
            rotulo="Balanço patrimonial"
            :classe-linha="classeDaLinha"
            :detalhavel="temContas"
            titulo-detalhe="Contas do grupo"
            subtitulo-detalhe="Os saldos do livro que compõem o total"
            largura-detalhe="480px"
          >
            <template #celula-valor="{ valor }">{{ formatarMoeda(valor) }}</template>
            <template #detalhe="{ linha }">
              <DetalheContas :contas="linha.contas" :titulo="`Contas de ${linha.grupo}`" />
            </template>
          </SbTabela>
        </div>

        <div class="text-caption text-grey-7 q-mt-md">
          Resultado do exercício ainda não encerrado: {{ formatarMoeda(item.resultado_do_exercicio) }} ·
          Passivo + PL + resultado: {{ formatarMoeda(item.passivo_mais_pl) }}
        </div>
        <ul v-if="item.observacoes?.length" class="text-caption text-grey-7 q-mt-sm">
          <li v-for="(obs, i) in item.observacoes" :key="i">{{ obs }}</li>
        </ul>
      </SbCard>
    </template>
    <SbEmptyState v-else title="Sem Balanço para este recorte" message="Escolha outra competência ou verifique se há lançamento no livro." />
  </div>
</template>

<script setup>
// Aba "Balanço" do módulo (ticket FIN-14, onda 2).
//
// Lê `GET /api/financeiro/contabil/balanco/` e mostra Ativo, Passivo e PL com os subtotais e as contas,
// a **equação** (Ativo = Passivo + PL + resultado) e as contas sem grupo — que, sem aviso, sumiriam da
// equação e o número fecharia por sorte.
import { computed, onMounted, ref } from 'vue'

import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import DetalheContas from 'src/components/financeiro/DetalheContas.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbTabela from 'src/components/common/SbTabela.vue'
import ContabilService from 'src/services/ContabilService'
import { formatarCnpj } from 'src/utils/seletores'
import { formatarMoeda, linhasDoBalanco } from 'src/utils/contabil'

const empresa = ref(null)
const periodo = ref({ de: '', ate: '' })
const lista = ref([])
const loading = ref(false)
const erro = ref('')

const aviso = computed(() =>
  empresa.value
    ? ''
    : 'Sem empresa escolhida, o recorte é o grupo somado (leitura gerencial — a eliminação intercompany não está feita).',
)

// O Balanço é uma **demonstração**, não uma lista: a ordem dos grupos é a estrutura do patrimônio.
// Por isso nenhuma coluna é ordenável — ordenar por valor embaralharia a leitura do balanço.
const COLUNAS = [
  { chave: 'grupo', rotulo: 'Grupo', largura: '150px', ocultaEm: 'sm' },
  { chave: 'rotulo', rotulo: 'Linha' },
  { chave: 'valor', rotulo: 'Valor (R$)', tipo: 'moeda', alinhamento: 'right' },
]

const classeDaLinha = (linha) => `balanco--${linha.tipo}`
const temContas = (linha) => (linha.contas?.length ?? 0) > 0

async function carregar() {
  loading.value = true
  erro.value = ''
  try {
    const params = {}
    if (empresa.value) params.fiscal_account = empresa.value
    else params.todas_juntas = 1
    if (periodo.value?.ate) params.ate = periodo.value.ate
    else if (periodo.value?.de) params.de = periodo.value.de
    const resposta = await ContabilService.getBalanco(params)
    lista.value = resposta.data?.balanco || []
  } catch (e) {
    lista.value = []
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

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

.balanco-tabela {
  :deep(.balanco--total) {
    font-weight: 600;
  }
}
</style>
