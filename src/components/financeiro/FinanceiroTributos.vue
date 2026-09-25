<template>
  <div>
    <FinanceiroRecorte
      v-model:empresa="empresa"
      v-model:periodo="periodo"
      :carregando="loading"
      :aviso="aviso"
      @carregar="carregar"
    >
      <div class="row items-center q-gutter-sm q-mt-sm">
        <q-btn-toggle
          v-model="origem"
          dense
          no-caps
          toggle-color="teal-8"
          :options="[
            { label: 'Calculado agora', value: 'calculado' },
            { label: 'Trilha gravada', value: 'gravado' },
          ]"
          @update:model-value="carregar"
        />
        <span class="text-caption text-grey-7">
          “Calculado agora” confronta a PGDASD com a tabela versionada; “trilha gravada” lê o que já foi
          conferido (`TaxAssessment`).
        </span>
      </div>
    </FinanceiroRecorte>

    <SbEmptyState v-if="loading" variant="loading" title="Carregando a apuração…" />
    <SbEmptyState v-else-if="erro" variant="error" title="Não foi possível carregar a apuração" :message="erro" />
    <template v-else-if="empresas.length">
      <SbCard
        v-for="item in empresas"
        :key="item.cnpj"
        class="q-mb-md"
        :title="item.razao_social || item.cnpj"
        :eyebrow="`${formatarCnpj(item.cnpj)} · ${item.de} a ${item.ate} · ${rotuloRegime(item.regime)}`"
      >
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-sm-6 col-md-3">
            <SbKpiCard label="Competências" :value="String(resumo(item).competencias)" :sub="`${resumo(item).comDeclaracao} com PGDASD`" variant="slate" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <SbKpiCard label="Total declarado (contador)" :value="formatarMoeda(resumo(item).totalDeclarado)" variant="teal" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <SbKpiCard label="Total pela tabela" :value="formatarMoeda(resumo(item).totalCalculado)" variant="sky" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <SbKpiCard
              label="Diferença"
              :value="formatarMoeda(resumo(item).diferencaTotal)"
              :sub="`${resumo(item).divergentes} competência(s) divergente(s)`"
              :variant="resumo(item).divergentes ? 'amber' : 'green'"
            />
          </div>
        </div>

        <q-markup-table flat dense>
          <thead>
            <tr>
              <th class="text-left">Competência</th>
              <th class="text-left">Classe</th>
              <th class="text-right">Declarado (R$)</th>
              <th class="text-right">Tabela (R$)</th>
              <th class="text-right">Diferença (R$)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="linha in resumo(item).linhas" :key="linha.competencia">
              <td>{{ linha.competencia }}</td>
              <td>
                <SbBadge :variant="varianteDaClasse(linha.classe)" :icon="iconeDaClasse(linha.classe)">
                  {{ linha.classe }}
                </SbBadge>
              </td>
              <td class="text-right">{{ formatarMoeda(linha.valor_declarado) }}</td>
              <td class="text-right">{{ formatarMoeda(linha.valor_calculado) }}</td>
              <td class="text-right">{{ formatarMoeda(linha.diferenca) }}</td>
            </tr>
          </tbody>
        </q-markup-table>

        <ul class="text-caption text-grey-7 q-mt-sm">
          <li v-for="linha in divergentes(item)" :key="linha.competencia">
            <strong>{{ linha.competencia }}:</strong> {{ linha.explicacao }}
          </li>
        </ul>
      </SbCard>
    </template>
    <SbEmptyState v-else title="Sem apuração para este recorte" message="Escolha outra competência ou verifique se há PGDASD importada." />
  </div>
</template>

<script setup>
// Aba "Tributos" do módulo (ticket FIN-14, onda 3; dados do FIN-11).
//
// Lê `GET /api/financeiro/contabil/tributos/` (com `origem=calculado|gravado`) e mostra o confronto
// declarado × tabela por competência, com a **classe** de cada divergência e a explicação. As duas
// origens devolvem o mesmo formato — é o que permite à tela ter um caminho só.
import { computed, onMounted, ref } from 'vue'

import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import ContabilService from 'src/services/ContabilService'
import { formatarCnpj } from 'src/utils/seletores'
import { formatarMoeda, resumoDaApuracao, rotuloRegime } from 'src/utils/contabil'

const empresa = ref(null)
const periodo = ref({ de: '', ate: '' })
const origem = ref('calculado')
const empresas = ref([])
const loading = ref(false)
const erro = ref('')

const aviso = computed(() =>
  empresa.value ? '' : 'Sem empresa escolhida, o recorte é o grupo (a apuração é por CNPJ).',
)

function resumo(item) {
  return resumoDaApuracao(item)
}

function divergentes(item) {
  return resumo(item).linhas.filter((l) => ['nao_explicado', 'redistribuicao'].includes(l.classe))
}

function varianteDaClasse(classe) {
  if (classe === 'confere') return 'green'
  if (classe === 'redistribuicao') return 'amber'
  if (classe === 'nao_explicado') return 'red'
  return 'slate'
}

function iconeDaClasse(classe) {
  if (classe === 'confere') return 'check'
  if (classe === 'sem_declaracao') return 'help_outline'
  if (classe === 'sem_tabela') return 'rule'
  return 'warning'
}

async function carregar() {
  loading.value = true
  erro.value = ''
  try {
    const params = { origem: origem.value }
    if (empresa.value) params.fiscal_account = empresa.value
    else params.todas_juntas = 1
    if (periodo.value?.de) params.de = periodo.value.de
    if (periodo.value?.ate) params.ate = periodo.value.ate
    const resposta = await ContabilService.getTributos(params)
    empresas.value = resposta.data?.empresas || []
  } catch (e) {
    empresas.value = []
    erro.value = e?.response?.data?.origem || e?.response?.data?.detail || 'Verifique a competência e o regime.'
  } finally {
    loading.value = false
  }
}

onMounted(carregar)
</script>
