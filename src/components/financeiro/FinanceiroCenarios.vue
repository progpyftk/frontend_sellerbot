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
          v-model="modelo"
          dense
          no-caps
          toggle-color="teal-8"
          :options="[
            { label: 'Regimes (Simples × Presumido × Real)', value: 'regimes' },
            { label: '2027 (puro × híbrido × fora)', value: '2027' },
          ]"
          @update:model-value="carregar"
        />
        <span class="text-caption text-grey-7">
          O modelo 2027 usa a base projetada (não há PGDASD de 2027 em 2026) e só ranqueia quando os três
          cenários estão completos.
        </span>
      </div>
    </FinanceiroRecorte>

    <SbEmptyState v-if="loading" variant="loading" title="Carregando os cenários…" />
    <SbEmptyState v-else-if="erro" variant="error" title="Não foi possível carregar os cenários" :message="erro" />
    <template v-else-if="empresas.length">
      <SbCard
        v-for="item in empresas"
        :key="item.cnpj"
        class="q-mb-md"
        :title="item.razao_social || item.cnpj"
        :eyebrow="`${formatarCnpj(item.cnpj)} · ${item.competencia} · base ${item.base?.lastro || '—'}`"
      >
        <div class="row q-col-gutter-md q-mb-md">
          <div v-for="cenario in cenariosDaEmpresa(item)" :key="cenario.regime" class="col-12 col-sm-6 col-md-4">
            <SbKpiCard
              :label="cenario.rotulo"
              :value="cenarioTemNumero(cenario) ? formatarMoeda(cenario.total) : 'parcial'"
              :sub="cenario.completo ? `${cenario.totalPct || '—'}% da receita` : `${cenario.faltantes.length} lacuna(s)`"
              :variant="cenario.completo ? 'teal' : 'amber'"
            />
          </div>
        </div>

        <div v-if="item.ranking" class="row items-center q-gutter-sm q-mb-sm">
          <SbBadge variant="green" icon="emoji_events">
            Menor total: {{ rotuloRegime(item.ranking.primeiro) }} — diferença de R$ {{ item.ranking.diferenca_para_o_segundo }} para o 2º
          </SbBadge>
        </div>
        <div v-else class="row items-center q-gutter-sm q-mb-sm">
          <SbBadge variant="amber" icon="block">
            Ranking bloqueado por {{ item.ranking_bloqueado_por }} campo(s): {{ (item.faltantes || []).join(', ') || '—' }}
          </SbBadge>
        </div>
        <div class="text-caption text-grey-7 q-mb-sm">{{ item.aviso || 'Todos os cenários estão completos.' }}</div>

        <q-expansion-item
          v-for="cenario in cenariosDaEmpresa(item)"
          :key="`detalhe-${cenario.regime}`"
          dense
          :label="`${cenario.rotulo} — linhas e lacunas`"
        >
          <q-markup-table flat dense>
            <thead>
              <tr>
                <th class="text-left">Tributo</th>
                <th class="text-left">Base</th>
                <th class="text-right">Valor (R$)</th>
                <th class="text-left">Fonte</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="linha in cenario.linhas" :key="linha.tributo + (linha.base || '')">
                <td>{{ linha.tributo }}</td>
                <td>{{ linha.base }}</td>
                <td class="text-right">{{ formatarMoeda(linha.valor) }}</td>
                <td class="text-caption">{{ linha.fonte }}</td>
              </tr>
            </tbody>
          </q-markup-table>
          <ul v-if="cenario.observacoes.length" class="text-caption text-grey-7 q-mt-sm">
            <li v-for="(obs, i) in cenario.observacoes" :key="i">{{ obs }}</li>
          </ul>
        </q-expansion-item>
      </SbCard>
    </template>
    <SbEmptyState v-else title="Sem cenários para este recorte" message="Escolha outra competência ou verifique se há PGDASD importada." />
  </div>
</template>

<script setup>
// Aba "Cenários e termômetros" do módulo (ticket FIN-14, onda 3; motor do FIN-13 e do TRIB-12).
//
// Lê `GET /api/financeiro/contabil/cenarios/` — e, com `modelo=2027`, o eixo da reforma (Simples puro ×
// híbrido × fora). A tela mostra o total de cada cenário **como o backend apurou**, as lacunas nomeadas
// e o ranking só quando ele é honesto; cenário incompleto aparece como "parcial", nunca como zero.
import { computed, onMounted, ref } from 'vue'

import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import ContabilService from 'src/services/ContabilService'
import { formatarCnpj } from 'src/utils/seletores'
import { cenarioTemNumero, cenariosDaEmpresa, formatarMoeda, rotuloRegime } from 'src/utils/contabil'

const empresa = ref(null)
const periodo = ref({ de: '', ate: '' })
const modelo = ref('regimes')
const empresas = ref([])
const loading = ref(false)
const erro = ref('')

const aviso = computed(() =>
  empresa.value ? '' : 'Sem empresa escolhida, o grupo soma as empresas (o Simples é apurado por CNPJ).',
)

async function carregar() {
  loading.value = true
  erro.value = ''
  try {
    const params = {}
    if (modelo.value === '2027') params.modelo = '2027'
    if (empresa.value) params.fiscal_account = empresa.value
    else params.todas_juntas = 1
    if (periodo.value?.de) params.de = periodo.value.de
    if (periodo.value?.ate) params.ate = periodo.value.ate
    const resposta = await ContabilService.getCenarios(params)
    empresas.value = resposta.data?.empresas || []
  } catch (e) {
    empresas.value = []
    erro.value = e?.response?.data?.modelo || e?.response?.data?.detail || 'Verifique a competência escolhida.'
  } finally {
    loading.value = false
  }
}

onMounted(carregar)
</script>
