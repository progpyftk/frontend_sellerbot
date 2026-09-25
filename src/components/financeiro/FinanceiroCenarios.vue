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

        <SbTabela
          v-model:ordenacao="ordenacao"
          :colunas="COLUNAS"
          :linhas="linhasDeCenarios(item)"
          chave-linha="chave"
          rotulo="Cenários de regime"
          :classe-linha="classeDaLinha"
          :detalhavel="temDetalhe"
          titulo-detalhe="Linhas e lacunas do cenário"
          subtitulo-detalhe="Como o cenário foi apurado, linha a linha"
          largura-detalhe="580px"
        >
          <template #celula-total="{ linha }">
            <span v-if="cenarioTemNumero(linha)">{{ formatarMoeda(linha.total) }}</span>
            <span v-else class="text-grey-7">parcial</span>
          </template>

          <template #celula-totalPct="{ valor }">{{ valor ? `${valor}%` : '—' }}</template>

          <template #celula-situacao="{ linha }">
            <SbBadge
              :variant="linha.completo ? 'green' : 'amber'"
              :icon="linha.completo ? 'check' : 'help_outline'"
            >
              {{ linha.situacao }}
            </SbBadge>
          </template>

          <template #detalhe="{ linha }">
            <div class="row items-center q-gutter-sm q-mb-sm">
              <SbBadge
                :variant="linha.completo ? 'green' : 'amber'"
                :icon="linha.completo ? 'check' : 'help_outline'"
              >
                {{ linha.situacao }}
              </SbBadge>
              <span class="text-caption text-grey-7">{{ linha.regime }}</span>
            </div>

            <SbTabela
              v-if="linha.linhas.length"
              :colunas="COLUNAS_LINHAS"
              :linhas="linha.linhas"
              :chave-linha="chaveDaLinhaDoCenario"
              rotulo="Linhas do cenário"
              densidade="compacta"
            >
              <template #celula-valor="{ valor }">{{ formatarMoeda(valor) }}</template>
            </SbTabela>
            <p v-else class="text-caption text-grey-7">O cenário não trouxe linhas detalhadas.</p>

            <div v-if="linha.faltantes.length" class="q-mt-sm">
              <div class="text-caption text-grey-7">Lacunas que impedem o total:</div>
              <ul class="text-caption text-grey-7">
                <li v-for="falta in linha.faltantes" :key="falta.chave || falta">
                  {{ falta.rotulo || falta.chave || falta }}
                </li>
              </ul>
            </div>

            <ul v-if="linha.observacoes.length" class="text-caption text-grey-7 q-mt-sm">
              <li v-for="(obs, i) in linha.observacoes" :key="i">{{ obs }}</li>
            </ul>
          </template>
        </SbTabela>
      </SbCard>
    </template>
    <SbEmptyState v-else title="Sem cenários para este recorte" message="Escolha outra competência ou verifique se há PGDASD importada." />
  </div>
</template>

<script setup>
// Aba "Cenários e termômetros" do módulo (ticket FIN-14, onda 3; motor do FIN-13 e do TRIB-12;
// tabela padrão no FINT-8).
//
// Lê `GET /api/financeiro/contabil/cenarios/` — e, com `modelo=2027`, o eixo da reforma (Simples puro ×
// híbrido × fora). A tela mostra o total de cada cenário **como o backend apurou**, as lacunas nomeadas
// e o ranking só quando ele é honesto; cenário incompleto aparece como "parcial", nunca como zero.
//
// O que mudou no FINT-8: os cartões de KPI por cenário e os `q-expansion-item` viraram **uma tabela**
// com a coluna de **situação** (completo × parcial) ordenável; as linhas e as lacunas de cada cenário
// abrem no detalhe do clique.
import { onMounted, ref } from 'vue'

import { useEstadoNaUrl } from 'src/composables/useEstadoNaUrl'

import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbTabela from 'src/components/common/SbTabela.vue'
import ContabilService from 'src/services/ContabilService'
import { cenarioTemNumero, formatarMoeda, linhasDeCenarios, rotuloRegime } from 'src/utils/contabil'
import { formatarCnpj } from 'src/utils/seletores'

// Recorte na URL (FINT-11): a empresa e a competência vêm do link e voltam para ele.
const { empresa, periodo, ordenacao } = useEstadoNaUrl()
const modelo = ref('regimes')
const empresas = ref([])
const loading = ref(false)
const erro = ref('')


const COLUNAS = [
  { chave: 'regime', rotulo: 'Cenário', tipo: 'texto', ordenavel: true },
  { chave: 'total', rotulo: 'Total (R$)', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'totalPct', rotulo: '% da receita', tipo: 'numero', alinhamento: 'right', ordenavel: true, largura: '122px' },
  { chave: 'situacao', rotulo: 'Situação', tipo: 'texto', ordenavel: true, largura: '132px' },
]

const COLUNAS_LINHAS = [
  { chave: 'tributo', rotulo: 'Tributo', tipo: 'texto' },
  { chave: 'base', rotulo: 'Base', tipo: 'texto' },
  { chave: 'valor', rotulo: 'Valor (R$)', tipo: 'moeda', alinhamento: 'right' },
  { chave: 'fonte', rotulo: 'Fonte', tipo: 'texto' },
]

const classeDaLinha = (linha) => (linha.completo ? '' : 'linha--parcial')
const temDetalhe = (linha) =>
  (linha.linhas?.length || 0) > 0 || (linha.faltantes?.length || 0) > 0 || (linha.observacoes?.length || 0) > 0

// O par tributo+base identifica a linha do cenário (o mesmo tributo aparece em bases diferentes).
const chaveDaLinhaDoCenario = (linha) => `${linha.tributo}|${linha.base || ''}`

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

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

:deep(.linha--parcial) {
  background: $tint-amber-bg;
}
</style>
