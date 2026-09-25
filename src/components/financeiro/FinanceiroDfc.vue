<template>
  <div>
    <FinanceiroRecorte
      v-model:empresa="empresa"
      v-model:periodo="periodo"
      :carregando="loading"
      :aviso="aviso"
      @carregar="carregar"
    />

    <SbEmptyState v-if="loading" variant="loading" title="Carregando o DFC…" />
    <SbEmptyState v-else-if="erro" variant="error" title="Não foi possível carregar o DFC" :message="erro" />
    <template v-else-if="lista.length">
      <SbCard
        v-for="item in lista"
        :key="item.cnpj"
        class="q-mb-md"
        :title="item.razao_social || item.cnpj"
        :eyebrow="`${formatarCnpj(item.cnpj)} · ${item.de} a ${item.ate}`"
      >
        <div class="row items-center q-gutter-sm q-mb-sm">
          <SbBadge :variant="item.confere ? 'green' : 'red'" icon="waterfall_chart">
            {{ item.confere ? 'as duas vias fecham na variação do caixa' : 'as vias não fecham — ver explicações' }}
          </SbBadge>
          <SbBadge variant="sky" icon="savings">
            Caixa {{ formatarMoeda(item.saldo_inicial) }} → {{ formatarMoeda(item.saldo_final) }}
          </SbBadge>
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <div class="sb-eyebrow">Método indireto</div>
            <SbTabela
              exportavel
              :nome-exportacao="'dfc-indireto'"
              :colunas="COLUNAS"
              :linhas="linhasDaViaIndireta(item)"
              chave-linha="chave"
              rotulo="DFC — método indireto"
              :classe-linha="classeDaLinha"
            >
              <template #celula-valor="{ valor }">{{ formatarMoeda(valor) }}</template>
            </SbTabela>
          </div>

          <div class="col-12 col-md-6">
            <div class="sb-eyebrow">Método direto</div>
            <SbTabela
              exportavel
              :nome-exportacao="'dfc-direto'"
              :colunas="COLUNAS"
              :linhas="linhasDaViaDireta(item)"
              chave-linha="chave"
              rotulo="DFC — método direto"
              :classe-linha="classeDaLinha"
            >
              <template #celula-valor="{ valor }">{{ formatarMoeda(valor) }}</template>
            </SbTabela>
          </div>
        </div>

        <div class="text-caption text-grey-7 q-mt-md">
          Variação do caixa: {{ formatarMoeda(item.variacaoDoCaixa) }} ·
          diferença entre os métodos: {{ formatarMoeda(item.diferencaEntreMetodos) }}
        </div>
        <ul v-if="item.explicacoes?.length" class="text-caption text-grey-7 q-mt-sm">
          <li v-for="(obs, i) in item.explicacoes" :key="i">{{ obs }}</li>
        </ul>
      </SbCard>
    </template>
    <SbEmptyState v-else title="Sem DFC para este recorte" message="Escolha outra competência ou verifique se há lançamento no livro." />
  </div>
</template>

<script setup>
// Aba "DFC" do módulo (ticket FIN-14, onda 3).
//
// Lê `GET /api/financeiro/contabil/dfc/` e põe as **duas vias lado a lado**, com a variação do caixa e
// a **diferença explicada** por causa nomeada — é o que o `FIN-9` entrega. A tela não soma nada.
import { computed, onMounted, ref } from 'vue'

import { useEstadoNaUrl } from 'src/composables/useEstadoNaUrl'

import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbTabela from 'src/components/common/SbTabela.vue'
import ContabilService from 'src/services/ContabilService'
import { formatarCnpj } from 'src/utils/seletores'
import { formatarMoeda, linhasDaViaDireta, linhasDaViaIndireta, viasDoDfc } from 'src/utils/contabil'

// Recorte na URL (FINT-11): a empresa e a competência vêm do link e voltam para ele.
const { empresa, periodo } = useEstadoNaUrl()
const lista = ref([])
const loading = ref(false)
const erro = ref('')

const aviso = computed(() =>
  empresa.value
    ? ''
    : 'Sem empresa escolhida, o recorte é o grupo somado (leitura gerencial — a eliminação intercompany não está feita).',
)

// O DFC é uma **demonstração**: a ordem das atividades é a leitura do fluxo. Sem ordenação por coluna.
const COLUNAS = [
  { chave: 'rotulo', rotulo: 'Linha' },
  { chave: 'valor', rotulo: 'Valor (R$)', tipo: 'moeda', alinhamento: 'right' },
]

const classeDaLinha = (linha) => `via--${linha.tipo}`

async function carregar() {
  loading.value = true
  erro.value = ''
  try {
    const params = {}
    if (empresa.value) params.fiscal_account = empresa.value
    else params.todas_juntas = 1
    if (periodo.value?.de) params.de = periodo.value.de
    if (periodo.value?.ate) params.ate = periodo.value.ate
    const resposta = await ContabilService.getDfc(params)
    lista.value = (resposta.data?.dfc || []).map((item) => ({ ...item, ...viasDoDfc(item) }))
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

:deep(.via--total) {
  font-weight: 700;
}

:deep(.via--atividade) {
  font-style: italic;
}
</style>
