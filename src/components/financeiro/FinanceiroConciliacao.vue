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
          <div v-for="bloco in item.demonstrativos" :key="bloco.demonstrativo" class="q-mb-md">
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

            <SbTabela
              exportavel
              :nome-exportacao="`conciliacao-${bloco.demonstrativo}`"
              v-model:ordenacao="ordenacao"
              :colunas="COLUNAS"
              :linhas="linhasDaConciliacao(bloco)"
              chave-linha="chave"
              :rotulo="`Conciliação — ${bloco.demonstrativo}`"
              :classe-linha="classeDaLinha"
              :detalhavel="temExplicacao"
              titulo-detalhe="Explicação da diferença"
              subtitulo-detalhe="A causa que o próprio sistema classificou"
              largura-detalhe="480px"
            >
              <template #celula-chave="{ valor }">
                <span class="font-mono">{{ valor }}</span>
              </template>
              <template #celula-sistema="{ valor }">{{ formatarMoeda(valor) }}</template>
              <template #celula-contador="{ valor }">{{ formatarMoeda(valor) }}</template>
              <template #celula-diferenca="{ valor }">{{ formatarMoeda(valor) }}</template>

              <template #celula-classe="{ linha }">
                <SbBadge :variant="varianteDaClasse(linha.classe)" :icon="iconeDaClasse(linha.classe)">
                  {{ linha.classe }}
                </SbBadge>
              </template>

              <template #detalhe="{ linha }">
                <div class="row items-center q-gutter-sm q-mb-sm">
                  <SbBadge :variant="varianteDaClasse(linha.classe)" :icon="iconeDaClasse(linha.classe)">
                    {{ linha.classe }}
                  </SbBadge>
                  <span class="text-caption text-grey-7 font-mono">{{ linha.chave }}</span>
                </div>
                <p class="text-body2 detalhe-texto">
                  {{ linha.explicacao || 'Diferença sem explicação registrada.' }}
                </p>
              </template>
            </SbTabela>
          </div>
        </template>
      </SbCard>
    </template>
    <SbEmptyState v-else title="Sem conciliação para este recorte" message="Escolha outra competência ou confira o vínculo da conta com o CNPJ." />
  </div>
</template>

<script setup>
// Aba "Conciliação" do módulo (ticket FIN-14, onda 4; serviço do FIN-15; tabela padrão no FINT-8).
//
// Lê `GET /api/financeiro/contabil/conciliacao/` e mostra o confronto **linha a linha** com o
// demonstrativo do contador, com a diferença **classificada** (`de_base` = explicar, `de_dado` =
// corrigir, `nao_explicado`) e a causa que o próprio sistema gravou. Quando não há snapshot, a tela diz
// **o que falta** em vez de comparar com zero.
//
// O que mudou no FINT-8: a **classe** virou coluna ordenável (dá para juntar as linhas por tipo de
// causa) e a **explicação** saiu da coluna — que a deixava espremida em `text-caption` — para o
// detalhe do clique na linha.
import { computed, onMounted, ref } from 'vue'

import { useEstadoNaUrl } from 'src/composables/useEstadoNaUrl'

import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbTabela from 'src/components/common/SbTabela.vue'
import ContabilService from 'src/services/ContabilService'
import { iconeDaClasse, varianteDaClasse } from 'src/utils/classes'
import { formatarMoeda, linhasDaConciliacao, resumoDaConciliacao } from 'src/utils/contabil'
import { formatarCnpj } from 'src/utils/seletores'

// Recorte na URL (FINT-11): a empresa e a competência vêm do link e voltam para ele.
const { empresa, periodo, ordenacao } = useEstadoNaUrl()
const lista = ref([])
const loading = ref(false)
const erro = ref('')


const COLUNAS = [
  { chave: 'chave', rotulo: 'Chave', tipo: 'texto', ordenavel: true, largura: '160px' },
  { chave: 'sistema', rotulo: 'Sistema (R$)', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'contador', rotulo: 'Contador (R$)', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'diferenca', rotulo: 'Diferença (R$)', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'classe', rotulo: 'Classe', tipo: 'texto', ordenavel: true, largura: '150px' },
]

const aviso = computed(() =>
  empresa.value ? '' : 'Sem empresa escolhida, o recorte é o grupo (a conciliação é por CNPJ).',
)

const classeDaLinha = (linha) => (linha.classe === 'nao_explicado' ? 'linha--alerta' : '')
const temExplicacao = (linha) => !!linha.explicacao

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
@import 'src/css/tokens.scss';

.bloco-titulo {
  font-size: $text-xs-size;
  font-weight: $font-semibold;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: $tint-teal-text;
  margin-bottom: $space-2;
}

.detalhe-texto {
  margin: 0;
  color: $text-body;
  line-height: 1.5;
}

:deep(.linha--alerta) {
  background: $tint-red-bg;
}
</style>
