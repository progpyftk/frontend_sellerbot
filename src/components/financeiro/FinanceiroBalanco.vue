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

        <div class="row q-col-gutter-md">
          <div v-for="grupo in gruposDoBalanco(item)" :key="grupo.chave" class="col-12 col-md-4">
            <div class="grupo-titulo">{{ grupo.rotulo }}</div>
            <div class="grupo-total">{{ formatarMoeda(grupo.total) }}</div>
            <div v-for="sub in grupo.subtotais" :key="sub.chave" class="grupo-sub">
              <span>{{ sub.rotulo }}</span>
              <span>{{ formatarMoeda(sub.valor) }}</span>
            </div>
            <q-expansion-item
              v-if="grupo.contas.length"
              dense
              :label="`${grupo.contas.length} conta(s)`"
              class="q-mt-xs"
            >
              <div v-for="conta in grupo.contas" :key="conta.codigo" class="conta-linha">
                <span class="font-mono">{{ conta.codigo }}</span>
                <span class="conta-nome">{{ conta.nome }}</span>
                <span>{{ formatarMoeda(conta.saldo) }}</span>
              </div>
            </q-expansion-item>
          </div>
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
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import ContabilService from 'src/services/ContabilService'
import { formatarCnpj } from 'src/utils/seletores'
import { formatarMoeda, gruposDoBalanco } from 'src/utils/contabil'

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
.grupo-titulo {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0f766e;
}

.grupo-total {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 6px;
}

.grupo-sub {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #475569;
}

.conta-linha {
  display: grid;
  grid-template-columns: 90px 1fr auto;
  gap: 8px;
  font-size: 12px;
  color: #475569;
}

.conta-nome {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
