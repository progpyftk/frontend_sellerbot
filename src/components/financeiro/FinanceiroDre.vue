<template>
  <div>
    <FinanceiroRecorte
      v-model:empresa="empresa"
      v-model:periodo="periodo"
      :carregando="loading"
      :aviso="aviso"
      @carregar="carregar"
    />

    <SbEmptyState v-if="loading" variant="loading" title="Carregando o DRE…" />
    <SbEmptyState v-else-if="erro" variant="error" title="Não foi possível carregar o DRE" :message="erro" />
    <template v-else-if="lista.length">
      <SbCard
        v-for="item in lista"
        :key="item.cnpj"
        class="q-mb-md"
        :title="item.razao_social || item.cnpj"
        :eyebrow="`${formatarCnpj(item.cnpj)} · ${item.de} a ${item.ate}`"
      >
        <div class="row items-center q-gutter-sm q-mb-sm">
          <SbBadge :variant="item.confere ? 'green' : 'red'" icon="fact_check">
            {{ item.confere ? 'confere com o livro' : `não confere: resultado do livro R$ ${item.resultado_do_livro}` }}
          </SbBadge>
          <SbBadge v-if="item.fora_do_resultado && item.fora_do_resultado !== '0.00'" variant="indigo" icon="block">
            R$ {{ item.fora_do_resultado }} fora do resultado (decisão #12)
          </SbBadge>
        </div>

        <q-markup-table flat dense>
          <thead>
            <tr>
              <th class="text-left">Linha</th>
              <th class="text-right">Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="linha in linhasDaCascata(item.subtotais)"
              :key="linha.chave"
              :class="`cascata-linha--${linha.tipo}`"
            >
              <td>
                {{ linha.rotulo }}
                <span
                  v-if="linha.chave === 'margem_contribuicao' && item.margem_contribuicao_pct"
                  class="text-grey-7"
                >
                  ({{ item.margem_contribuicao_pct }}% da receita líquida)
                </span>
                <span v-if="linha.chave === 'ebitda' && item.ebitda_pct" class="text-grey-7">
                  ({{ item.ebitda_pct }}% da receita líquida)
                </span>
              </td>
              <td class="text-right">{{ formatarMoeda(linha.valor) }}</td>
            </tr>
          </tbody>
        </q-markup-table>

        <q-expansion-item
          v-if="contasDaLinha(item).length"
          icon="receipt_long"
          :label="`Origem do número — ${contasDaLinha(item).length} conta(s)`"
          caption="a conta e o valor que compõem cada linha"
          class="q-mt-sm"
        >
          <q-markup-table flat dense>
            <thead>
              <tr>
                <th class="text-left">Conta</th>
                <th class="text-left">Nome</th>
                <th class="text-right">Contribuição (R$)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="conta in contasDaLinha(item)" :key="conta.codigo">
                <td class="font-mono">{{ conta.codigo }}</td>
                <td>{{ conta.conta }}</td>
                <td class="text-right">{{ formatarMoeda(conta.valor) }}</td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-expansion-item>

        <ul v-if="item.observacoes?.length" class="text-caption text-grey-7 q-mt-sm">
          <li v-for="(obs, i) in item.observacoes" :key="i">{{ obs }}</li>
        </ul>
      </SbCard>
    </template>
    <SbEmptyState v-else title="Sem DRE para este recorte" message="Escolha outra competência ou verifique se há lançamento no livro." />
  </div>
</template>

<script setup>
// Aba "DRE" do módulo (ticket FIN-14, onda 2).
//
// Lê `GET /api/financeiro/contabil/dre/` e mostra a cascata **como o livro apurou**, com a
// conferência contra o resultado do livro (`resultado_do_livro`) e, opcionalmente, a origem de
// cada número (as contas da linha). A tela não recalcula imposto nem margem.
import { computed, onMounted, ref } from 'vue'

import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import ContabilService from 'src/services/ContabilService'
import { formatarCnpj } from 'src/utils/seletores'
import { contasDaLinha, formatarMoeda, linhasDaCascata } from 'src/utils/contabil'

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
    const resposta = await ContabilService.getDre(params)
    lista.value = resposta.data?.dre || []
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
.cascata-linha--destaque td {
  font-weight: 700;
  color: #0f766e;
}

.cascata-linha--subtotal td {
  font-weight: 600;
}
</style>
