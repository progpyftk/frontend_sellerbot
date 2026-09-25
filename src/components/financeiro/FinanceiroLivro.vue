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
          v-model="visao"
          dense
          no-caps
          toggle-color="teal-8"
          :options="[
            { label: 'Lançamentos', value: 'lancamentos' },
            { label: 'Plano de contas', value: 'plano' },
          ]"
        />
        <q-input
          v-model="busca"
          dense
          outlined
          clearable
          debounce="200"
          bg-color="white"
          :placeholder="visao === 'lancamentos' ? 'Buscar histórico, origem ou lastro' : 'Buscar código, conta ou grupo'"
          class="campo-busca"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-space />
        <span class="text-caption text-grey-7">{{ resumoDoRecorte }}</span>
      </div>
    </FinanceiroRecorte>

    <SbEmptyState v-if="loading" variant="loading" title="Carregando o livro…" />
    <SbEmptyState v-else-if="erro" variant="error" title="Não foi possível carregar o livro" :message="erro" />
    <template v-else>
      <!-- LANÇAMENTOS: a partida, com os débitos e créditos que geraram cada número do DRE. -->
      <SbTabela
        v-if="visao === 'lancamentos'"
        v-model:ordenacao="ordenacaoLancamentos"
        :colunas="COLUNAS_LANCAMENTOS"
        :linhas="lancamentosFiltrados"
        chave-linha="id"
        rotulo="Lançamentos do livro"
        :classe-linha="classeDoLancamento"
        :vazio="{
          titulo: 'Nenhum lançamento neste recorte',
          mensagem: 'O livro recebe as notas, o CMV, o DAS e as despesas pelas regras de lançamento.',
        }"
        titulo-detalhe="Partidas do lançamento"
        subtitulo-detalhe="O débito e o crédito de cada conta"
        largura-detalhe="620px"
      >
        <template #celula-data="{ valor }">{{ formatDate(valor) }}</template>

        <template #celula-origem="{ linha }">
          <SbOrigemSelo :origem="linha.origem" />
        </template>

        <template #celula-origem_ref="{ linha }">
          <span class="font-mono lastro">{{ linha.origem_ref || '—' }}</span>
        </template>

        <template #celula-total_debito="{ valor }">{{ formatarMoeda(valor) }}</template>

        <template #celula-is_estorno="{ linha }">
          <SbBadge v-if="linha.is_estorno" variant="amber" icon="undo">estorno</SbBadge>
          <span v-else class="text-grey-5">—</span>
        </template>

        <template #detalhe="{ linha }">
          <div class="row items-center q-gutter-sm q-mb-sm">
            <SbOrigemSelo :origem="linha.origem" />
            <span class="text-caption text-grey-7">{{ linha.competencia }}</span>
            <SbBadge :variant="linha.equilibra ? 'green' : 'red'" icon="balance">
              {{ linha.equilibra ? 'débito = crédito' : 'não equilibra' }}
            </SbBadge>
          </div>
          <p class="text-body2 detalhe-texto">{{ linha.historico }}</p>
          <p v-if="linha.origem_ref" class="text-caption text-grey-7 lastro">
            Lastro: <span class="font-mono">{{ linha.origem_ref }}</span>
          </p>

          <SbTabela
            class="q-mt-sm"
            :colunas="COLUNAS_PARTIDAS"
            :linhas="partidasNormalizadas(linha)"
            chave-linha="chave"
            rotulo="Partidas"
            densidade="compacta"
          >
            <template #celula-codigo="{ valor }"><span class="font-mono">{{ valor }}</span></template>
            <template #celula-debito="{ valor }">{{ formatarMoeda(valor) }}</template>
            <template #celula-credito="{ valor }">{{ formatarMoeda(valor) }}</template>
          </SbTabela>

          <div class="detalhe-totais">
            <span>Débito {{ formatarMoeda(linha.total_debito) }}</span>
            <span>Crédito {{ formatarMoeda(linha.total_credito) }}</span>
          </div>

          <!-- ESTORNO: o livro é imutável e a correção é estornar — mas a API ainda não expõe a ação. -->
          <div class="row items-center q-gutter-sm q-mt-md">
            <q-btn
              outline
              no-caps
              disable
              color="amber-9"
              icon="undo"
              label="Estornar lançamento"
            >
              <q-tooltip max-width="320px">
                O livro é imutável: a correção é estornar (lançamento novo com os lados invertidos). O
                serviço existe no backend, mas a ação ainda não está exposta por endpoint — ticket
                <strong>FINT-17</strong>.
              </q-tooltip>
            </q-btn>
          </div>
        </template>
      </SbTabela>

      <!-- PLANO DE CONTAS: a árvore que dá sentido à partida (natureza, grupo e o mapeamento). -->
      <SbTabela
        v-else
        v-model:ordenacao="ordenacaoPlano"
        :colunas="COLUNAS_PLANO"
        :linhas="planoFiltrado"
        chave-linha="codigo"
        rotulo="Plano de contas"
        :classe-linha="classeDaConta"
        :vazio="{ titulo: 'Nenhuma conta encontrada', mensagem: 'Limpe a busca ou confira o plano do dono.' }"
        titulo-detalhe="Mapeamento da conta"
        subtitulo-detalhe="Como esta conta é lida pelo DRE, pelo Balanço e pelo DFC"
        largura-detalhe="480px"
      >
        <template #celula-codigo="{ valor }"><span class="font-mono">{{ valor }}</span></template>

        <template #celula-aceita_lancamento="{ linha }">
          <SbBadge :variant="linha.aceita_lancamento ? 'teal' : 'slate'" :icon="linha.aceita_lancamento ? 'check' : 'lock'">
            {{ linha.aceita_lancamento ? 'aceita' : 'sintética' }}
          </SbBadge>
        </template>

        <template #celula-entra_na_mc="{ linha }">
          <SbBadge :variant="linha.entra_na_mc ? 'green' : 'slate'">
            {{ linha.entra_na_mc ? 'entra' : 'não' }}
          </SbBadge>
        </template>

        <template #detalhe="{ linha }">
          <p class="text-body2 detalhe-texto">
            <span class="font-mono">{{ linha.codigo }}</span> — {{ linha.nome }}
          </p>
          <dl class="mapeamento">
            <template v-for="item in mapeamentoDaLinha(linha)" :key="item.rotulo">
              <dt>{{ item.rotulo }}</dt>
              <dd>{{ item.valor }}</dd>
            </template>
          </dl>
        </template>
      </SbTabela>
    </template>
  </div>
</template>

<script setup>
// Aba "Livro" do módulo (ticket FINT-10).
//
// Duas leituras no mesmo lugar, porque uma explica a outra: os **lançamentos** (a partida, com o
// débito e o crédito de cada conta) e o **plano de contas** (a árvore que dá sentido à partida —
// natureza, grupo e o mapeamento para DRE/Balanço/DFC).
//
// O livro é **imutável**: a tela lê, filtra e ordena; não escreve. A correção de um lançamento é
// **estorno** (lançamento novo com os lados invertidos), nunca edição — a decisão do `FINC-1`. Essa
// ação **ainda não tem endpoint**: o botão aparece desabilitado dizendo qual ticket falta (`FINT-17`),
// em vez de a tela simplesmente não oferecer o que o dono procura.
//
// O endpoint do livro não tem `busca` (tem `limite`), então o filtro é no cliente, sobre o que já foi
// carregado — é o que faz a busca responder na hora, sem ida ao servidor a cada tecla.
import { computed, onMounted, ref } from 'vue'

import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbOrigemSelo from 'src/components/common/SbOrigemSelo.vue'
import SbTabela from 'src/components/common/SbTabela.vue'
import ContabilService from 'src/services/ContabilService'
import { formatDate } from 'src/utils/formato'
import { formatarMoeda } from 'src/utils/contabil'
import { filtrarLivro, linhasDoLivro, partidasNormalizadas } from 'src/utils/livro'

const empresa = ref(null)
const periodo = ref({ de: '', ate: '' })
const visao = ref('lancamentos')
const busca = ref('')

const lancamentos = ref([])
const plano = ref([])
const loading = ref(false)
const erro = ref('')

const ordenacaoLancamentos = ref({ chave: '', direcao: '' })
const ordenacaoPlano = ref({ chave: '', direcao: '' })

const COLUNAS_LANCAMENTOS = [
  { chave: 'data', rotulo: 'Data', tipo: 'data', ordenavel: true, largura: '112px' },
  { chave: 'historico', rotulo: 'Histórico', tipo: 'texto', ordenavel: true },
  { chave: 'origem', rotulo: 'Origem', tipo: 'texto', ordenavel: true, largura: '122px' },
  { chave: 'origem_ref', rotulo: 'Lastro', tipo: 'texto', ordenavel: true, largura: '180px' },
  { chave: 'quantidade_partidas', rotulo: 'Partidas', tipo: 'numero', alinhamento: 'right', ordenavel: true, largura: '94px' },
  { chave: 'total_debito', rotulo: 'Débito (R$)', tipo: 'moeda', alinhamento: 'right', ordenavel: true, largura: '152px' },
  { chave: 'is_estorno', rotulo: 'Estorno', tipo: 'texto', alinhamento: 'center', ordenavel: true, largura: '104px' },
]

const COLUNAS_PARTIDAS = [
  { chave: 'codigo', rotulo: 'Conta', largura: '104px' },
  { chave: 'conta', rotulo: 'Nome' },
  { chave: 'debito', rotulo: 'Débito (R$)', tipo: 'moeda', alinhamento: 'right' },
  { chave: 'credito', rotulo: 'Crédito (R$)', tipo: 'moeda', alinhamento: 'right' },
]

const COLUNAS_PLANO = [
  { chave: 'codigo', rotulo: 'Código', tipo: 'texto', ordenavel: true, largura: '116px' },
  { chave: 'nome', rotulo: 'Conta', tipo: 'texto', ordenavel: true },
  { chave: 'natureza', rotulo: 'Natureza', tipo: 'texto', ordenavel: true, largura: '112px' },
  { chave: 'grupo', rotulo: 'Grupo', tipo: 'texto', ordenavel: true, largura: '128px' },
  { chave: 'dre_linha', rotulo: 'Linha do DRE', tipo: 'texto', ordenavel: true, largura: '160px' },
  { chave: 'aceita_lancamento', rotulo: 'Aceita lançamento', tipo: 'texto', alinhamento: 'center', ordenavel: true, largura: '152px' },
  { chave: 'entra_na_mc', rotulo: 'Entra na MC', tipo: 'texto', alinhamento: 'center', ordenavel: true, largura: '118px' },
]

const aviso = computed(() =>
  empresa.value ? '' : 'Sem empresa escolhida, o recorte soma as duas empresas (leitura gerencial).',
)

const entradas = computed(() => linhasDoLivro(lancamentos.value))

const lancamentosFiltrados = computed(() =>
  filtrarLivro(entradas.value, busca.value, ['historico', 'origem', 'origem_ref', 'cnpj', 'competencia']),
)

const planoFiltrado = computed(() =>
  filtrarLivro(plano.value, busca.value, ['codigo', 'nome', 'grupo', 'dre_linha', 'natureza']),
)

const resumoDoRecorte = computed(() => {
  if (visao.value === 'plano') {
    return `${planoFiltrado.value.length} de ${plano.value.length} conta(s)`
  }
  const estornos = lancamentosFiltrados.value.filter((linha) => linha.is_estorno).length
  const total = lancamentosFiltrados.value.reduce((soma, linha) => soma + linha.total_debito, 0)
  return `${lancamentosFiltrados.value.length} lançamento(s) · débito ${formatarMoeda(total)} · ${estornos} estorno(s)`
})

const classeDoLancamento = (linha) => (linha.is_estorno ? 'linha--estorno' : '')
const classeDaConta = (linha) => (linha.aceita_lancamento ? '' : 'linha--sintetica')

const parametros = computed(() => {
  const params = { limite: 500 }
  if (empresa.value) params.fiscal_account = empresa.value
  if (periodo.value?.de) params.de = periodo.value.de
  if (periodo.value?.ate) params.ate = periodo.value.ate
  return params
})

function mapeamentoDaLinha(conta) {
  return [
    { rotulo: 'Natureza', valor: conta.natureza || '—' },
    { rotulo: 'Grupo', valor: conta.grupo || '—' },
    { rotulo: 'Linha do DRE', valor: conta.dre_linha || '—' },
    { rotulo: 'Grupo no Balanço', valor: conta.bp_grupo || '—' },
    { rotulo: 'Atividade no DFC', valor: conta.dfc_atividade || '—' },
    { rotulo: 'Entra na margem de contribuição', valor: conta.entra_na_mc ? 'sim' : 'não' },
    { rotulo: 'Fora do resultado', valor: conta.fora_do_resultado ? 'sim (decisão #12)' : 'não' },
    { rotulo: 'Aceita lançamento', valor: conta.aceita_lancamento ? 'sim (analítica)' : 'não (sintética)' },
  ]
}

function mensagemDeErro(e) {
  return (
    e?.response?.data?.detail ||
    e?.response?.data?.competencia ||
    'Verifique a competência escolhida e o vínculo da conta com o CNPJ.'
  )
}

async function carregar() {
  loading.value = true
  erro.value = ''
  try {
    const [respostaLancamentos, respostaPlano] = await Promise.all([
      ContabilService.getLancamentos(parametros.value),
      ContabilService.getPlanoDeContas(),
    ])
    lancamentos.value = respostaLancamentos.data?.lancamentos || []
    plano.value = respostaPlano.data?.plano || []
  } catch (e) {
    lancamentos.value = []
    plano.value = []
    erro.value = mensagemDeErro(e)
  } finally {
    loading.value = false
  }
}

onMounted(carregar)
</script>

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

.campo-busca {
  min-width: 260px;
}

.lastro {
  font-size: $text-xs-size;
}

.detalhe-texto {
  margin: 0;
  color: $text-body;
  line-height: 1.5;
}

.detalhe-totais {
  display: flex;
  gap: $space-4;
  margin-top: $space-2;
  font-size: $text-small-size;
  font-weight: $font-semibold;
  color: $text-primary;
}

.mapeamento {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2px $space-3;
  margin: 0;
  font-size: $text-small-size;

  dt {
    color: $text-muted;
  }

  dd {
    margin: 0;
    text-align: right;
    color: $text-body;
  }
}

:deep(.linha--estorno) {
  background: $tint-amber-bg;
}

:deep(.linha--sintetica) {
  color: $text-muted;
}
</style>
