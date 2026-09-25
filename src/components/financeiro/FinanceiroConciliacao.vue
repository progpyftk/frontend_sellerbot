<template>
  <div>
    <FinanceiroRecorte
      v-model:empresa="empresa"
      v-model:periodo="periodo"
      :carregando="loading"
      :aviso="aviso"
      @carregar="carregar"
    />

    <SbEmptyState v-if="loading" variant="loading" title="Carregando a conciliação…" />
    <SbEmptyState v-else-if="erro" variant="error" title="Não foi possível carregar a conciliação" :message="erro" />
    <template v-else-if="lista.length">
      <SbCard
        v-for="item in lista"
        :key="item.cnpj"
        class="q-mb-md"
        :title="item.razao_social || item.cnpj"
        :eyebrow="`${formatarCnpj(item.cnpj)} · ${item.competencia || item.de || ''}`"
      >
        <SbEmptyState
          v-if="item.tem_snapshot === false"
          title="Ainda não há demonstrativo do contador"
          :message="item.motivo || 'Sem demonstrativo para esta competência: nada a confrontar.'"
        />
        <template v-else>
          <div
            v-for="bloco in item.demonstrativos"
            :key="bloco.demonstrativo"
            class="q-mb-md"
          >
            <div class="bloco-titulo">{{ bloco.demonstrativo }}</div>
            <div class="row items-center q-gutter-sm q-mb-sm">
              <SbBadge
                v-for="linha in resumoDaConciliacao(bloco)"
                :key="linha.classe"
                :variant="varianteDaClasse(linha.classe)"
                :icon="iconeDaClasse(linha.classe)"
              >
                {{ linha.quantidade }} {{ linha.classe }}
              </SbBadge>
            </div>
            <q-markup-table flat dense>
              <thead>
                <tr>
                  <th class="text-left">Chave</th>
                  <th class="text-right">Sistema (R$)</th>
                  <th class="text-right">Contador (R$)</th>
                  <th class="text-right">Diferença (R$)</th>
                  <th class="text-left">Classe</th>
                  <th class="text-left">Explicação</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="linha in linhasDaConciliacao(bloco)" :key="linha.chave">
                  <td class="font-mono">{{ linha.chave }}</td>
                  <td class="text-right">{{ formatarMoeda(linha.sistema) }}</td>
                  <td class="text-right">{{ formatarMoeda(linha.contador) }}</td>
                  <td class="text-right">{{ formatarMoeda(linha.diferenca) }}</td>
                  <td>
                    <SbBadge :variant="varianteDaClasse(linha.classe)" :icon="iconeDaClasse(linha.classe)">
                      {{ linha.classe }}
                    </SbBadge>
                  </td>
                  <td class="text-caption">{{ linha.explicacao }}</td>
                </tr>
              </tbody>
            </q-markup-table>
          </div>
        </template>
      </SbCard>
    </template>
    <SbEmptyState v-else title="Sem conciliação para este recorte" message="Escolha outra competência ou confira o vínculo da conta com o CNPJ." />
  </div>
</template>

<script setup>
// Aba "Conciliação" do módulo (ticket FIN-14, onda 4; serviço do FIN-15).
//
// Lê `GET /api/financeiro/contabil/conciliacao/` e mostra o confronto **linha a linha** com o
// demonstrativo do contador, com a diferença **classificada** (`de_base` = explicar, `de_dado` =
// corrigir, `nao_explicado`) e a causa que o próprio sistema gravou. Quando não há snapshot, a tela diz
// **o que falta** em vez de comparar com zero.
import { computed, onMounted, ref } from 'vue'

import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import ContabilService from 'src/services/ContabilService'
import { formatarCnpj } from 'src/utils/seletores'
import { formatarMoeda, linhasDaConciliacao, resumoDaConciliacao } from 'src/utils/contabil'

const empresa = ref(null)
const periodo = ref({ de: '', ate: '' })
const lista = ref([])
const loading = ref(false)
const erro = ref('')

const aviso = computed(() =>
  empresa.value ? '' : 'Sem empresa escolhida, o recorte é o grupo (a conciliação é por CNPJ).',
)

function varianteDaClasse(classe) {
  if (classe === 'confere') return 'green'
  if (classe === 'de_dado') return 'amber'
  if (classe === 'de_base') return 'sky'
  if (classe === 'nao_explicado') return 'red'
  return 'slate'
}

function iconeDaClasse(classe) {
  if (classe === 'confere') return 'check'
  if (classe === 'de_dado') return 'build'
  if (classe === 'de_base') return 'info'
  return 'warning'
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
    const resposta = await ContabilService.getConciliacao(params)
    lista.value = resposta.data?.conciliacao || []
  } catch (e) {
    lista.value = []
    erro.value = e?.response?.data?.detail || 'Verifique a competência escolhida.'
  } finally {
    loading.value = false
  }
}

onMounted(carregar)
</script>

<style lang="scss" scoped>
.bloco-titulo {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0f766e;
  margin-bottom: 6px;
}
</style>
