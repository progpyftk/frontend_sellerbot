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

        <SbTabela
          exportavel
          :nome-exportacao="'tributos-apuracao'"
          v-model:ordenacao="ordenacao"
          :colunas="COLUNAS"
          :linhas="resumo(item).linhas"
          chave-linha="competencia"
          rotulo="Apuração por competência"
          :classe-linha="classeDaLinha"
          :detalhavel="temExplicacao"
          titulo-detalhe="Explicação da divergência"
          subtitulo-detalhe="O que o sistema classificou nesta competência"
          largura-detalhe="480px"
        >
          <template #celula-classe="{ linha }">
            <SbBadge :variant="varianteDaClasse(linha.classe)" :icon="iconeDaClasse(linha.classe)">
              {{ linha.classe }}
            </SbBadge>
          </template>

          <template #celula-valor_declarado="{ valor }">{{ formatarMoeda(valor) }}</template>
          <template #celula-valor_calculado="{ valor }">{{ formatarMoeda(valor) }}</template>
          <template #celula-diferenca="{ valor }">{{ formatarMoeda(valor) }}</template>

          <template #detalhe="{ linha }">
            <div class="row items-center q-gutter-sm q-mb-sm">
              <SbBadge :variant="varianteDaClasse(linha.classe)" :icon="iconeDaClasse(linha.classe)">
                {{ linha.classe }}
              </SbBadge>
              <span class="text-caption text-grey-7">{{ linha.competencia }}</span>
            </div>
            <p class="text-body2 detalhe-texto">
              {{ linha.explicacao || 'Sem divergência a explicar: o declarado e a tabela coincidem.' }}
            </p>
          </template>
        </SbTabela>
      </SbCard>
    </template>
    <SbEmptyState v-else title="Sem apuração para este recorte" message="Escolha outra competência ou verifique se há PGDASD importada." />
  </div>
</template>

<script setup>
// Aba "Tributos" do módulo (ticket FIN-14, onda 3; dados do FIN-11; tabela padrão no FINT-8).
//
// Lê `GET /api/financeiro/contabil/tributos/` (com `origem=calculado|gravado`) e mostra o confronto
// declarado × tabela por competência. As duas origens devolvem o mesmo formato — é o que permite à
// tela ter um caminho só.
//
// O que mudou no FINT-8: a **classe** deixou de ser um selo solto e virou coluna **ordenável** (dá para
// agrupar as competências por tipo de divergência) e a **explicação** saiu da lista abaixo da tabela
// para o detalhe do clique na linha — a lista contava a mesma coisa duas vezes.
import { computed, onMounted, ref } from 'vue'

import { useEstadoNaUrl } from 'src/composables/useEstadoNaUrl'

import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import SbTabela from 'src/components/common/SbTabela.vue'
import ContabilService from 'src/services/ContabilService'
import { iconeDaClasse, varianteDaClasse } from 'src/utils/classes'
import { formatarMoeda, resumoDaApuracao, rotuloRegime } from 'src/utils/contabil'
import { formatarCnpj } from 'src/utils/seletores'

// Recorte na URL (FINT-11): a empresa e a competência vêm do link e voltam para ele.
const { empresa, periodo, ordenacao } = useEstadoNaUrl()
const origem = ref('calculado')
const empresas = ref([])
const loading = ref(false)
const erro = ref('')


const COLUNAS = [
  { chave: 'competencia', rotulo: 'Competência', tipo: 'texto', ordenavel: true, largura: '122px' },
  { chave: 'classe', rotulo: 'Classe', tipo: 'texto', ordenavel: true, largura: '160px' },
  { chave: 'valor_declarado', rotulo: 'Declarado (R$)', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'valor_calculado', rotulo: 'Tabela (R$)', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'diferenca', rotulo: 'Diferença (R$)', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
]

const aviso = computed(() =>
  empresa.value ? '' : 'Sem empresa escolhida, o recorte é o grupo (a apuração é por CNPJ).',
)

function resumo(item) {
  return resumoDaApuracao(item)
}

const classeDaLinha = (linha) => (linha.classe === 'nao_explicado' ? 'linha--alerta' : '')
const temExplicacao = (linha) => !!linha.explicacao

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

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

.detalhe-texto {
  margin: 0;
  color: $text-body;
  line-height: 1.5;
}

:deep(.linha--alerta) {
  background: $tint-red-bg;
}
</style>
