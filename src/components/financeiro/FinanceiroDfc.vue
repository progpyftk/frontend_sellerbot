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
            <div class="via-titulo">Método indireto</div>
            <div v-for="linha in item.linhasIndiretas" :key="linha.rotulo" class="via-linha">
              <span>{{ linha.rotulo }}</span>
              <span>{{ formatarMoeda(linha.valor) }}</span>
            </div>
            <div v-for="atividade in item.atividadesIndiretas" :key="atividade.chave" class="via-linha via-linha--atividade">
              <span>{{ atividade.rotulo }}</span>
              <span>{{ formatarMoeda(atividade.valor) }}</span>
            </div>
            <div class="via-total">
              <span>Total indireto</span>
              <span>{{ formatarMoeda(item.totalIndireto) }}</span>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <div class="via-titulo">Método direto</div>
            <div v-for="atividade in item.atividadesDiretas" :key="atividade.chave" class="via-linha">
              <span>{{ atividade.rotulo }}</span>
              <span>{{ formatarMoeda(atividade.valor) }}</span>
            </div>
            <div class="via-total">
              <span>Total direto</span>
              <span>{{ formatarMoeda(item.totalDireto) }}</span>
            </div>
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

import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import ContabilService from 'src/services/ContabilService'
import { formatarCnpj } from 'src/utils/seletores'
import { formatarMoeda, viasDoDfc } from 'src/utils/contabil'

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
.via-titulo {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0f766e;
  margin-bottom: 6px;
}

.via-linha {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: #475569;
  padding: 2px 0;
}

.via-linha--atividade {
  font-style: italic;
}

.via-total {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  color: #0f172a;
  border-top: 1px solid #e2e8f0;
  margin-top: 6px;
  padding-top: 6px;
}
</style>
