<template>
  <div>

  <SbCard class="q-mb-md">
    <div class="row q-col-gutter-md items-center">
      <div class="col-12 col-md-4">
<q-select
  v-model="ctx.extratoFilters.conta"
  :options="ctx.contaOptions"
  emit-value
  map-options
  dense
  outlined
  label="Conta bancária"
  bg-color="white"
  @update:model-value="ctx.loadTransacoes"
/>
      </div>
      <div class="col-6 col-md-2">
<q-input
  v-model="ctx.extratoFilters.dataInicio"
  type="date"
  dense
  outlined
  label="Data início"
  bg-color="white"
  @change="ctx.loadTransacoes"
/>
      </div>
      <div class="col-6 col-md-2">
<q-input
  v-model="ctx.extratoFilters.dataFim"
  type="date"
  dense
  outlined
  label="Data fim"
  bg-color="white"
  @change="ctx.loadTransacoes"
/>
      </div>
      <div class="col-12 col-md-4">
<q-btn
  unelevated
  no-caps
  color="teal-8"
  text-color="white"
  icon="search"
  label="Buscar transações"
  :loading="ctx.loadingTransacoes"
  :disable="!ctx.extratoFilters.conta"
  @click="ctx.loadTransacoes"
/>
      </div>
    </div>
    <div class="row items-center q-col-gutter-md q-mt-md">
      <div class="col-12 col-md-auto">
<q-btn-toggle
  v-model="ctx.extratoFilters.classificacao"
  :options="ctx.filtroClassificacaoOptions"
  no-caps
  unelevated
  dense
  toggle-color="teal-8"
  color="grey-2"
  text-color="grey-8"
  @update:model-value="ctx.loadTransacoes"
/>
      </div>
      <div class="col-12 col-md">
<div class="row items-center q-gutter-sm">
  <q-btn
    v-if="ctx.resumo.pendentes > 0"
    flat
    dense
    no-caps
    color="amber-9"
    icon="filter_alt"
    :label="`Ver as ${ctx.resumo.pendentes} pendentes`"
    @click="ctx.verPendentes"
  />
  <q-space />
  <q-btn
    v-if="ctx.resumo.pendentes > 0"
    outline
    no-caps
    color="teal-8"
    icon="groups"
    :label="`Resolver por contraparte${ctx.contrapartesPendentes ? ` (${ctx.contrapartesPendentes})` : ''}`"
    :disable="!ctx.extratoFilters.conta"
    @click="ctx.abrirContrapartes"
  />
  <q-btn
    outline
    no-caps
    color="teal-8"
    icon="auto_fix_high"
    label="Reclassificar automaticamente"
    :loading="ctx.reclassificando"
    :disable="!ctx.extratoFilters.conta"
    @click="ctx.confirmarReclassificacao"
  />
</div>
      </div>
    </div>
  </SbCard>

  <!-- TERMÔMETRO: quanto do extrato ainda falta classificar -->
  <div class="row q-col-gutter-md q-mb-md">
    <div class="col-12 col-lg-6">
      <SbKpiCard
label="Quanto falta classificar"
:value="ctx.percentualPendenteTexto"
:variant="ctx.termometroVariante"
:sub="`${ctx.resumo.classificadas} de ${ctx.resumo.total} transações classificadas`"
      >
<q-linear-progress
  :value="ctx.percentualPendente / 100"
  :color="ctx.termometroCor"
  track-color="grey-3"
  rounded
  size="10px"
  class="q-mt-sm termometro-barra"
/>
<div class="text-caption text-grey-7 q-mt-xs">
  {{ ctx.termometroMensagem }}
  <template v-if="ctx.contrapartesPendentes">
    São <strong>{{ ctx.contrapartesPendentes }} contrapartes</strong> — dá para
    resolver uma por uma.
  </template>
</div>
      </SbKpiCard>
    </div>
    <div class="col-6 col-lg-2">
      <SbKpiCard
label="Saídas pendentes"
:value="ctx.resumo.saidas_pendentes"
variant="red"
sub="travam o resultado"
      />
    </div>
    <div class="col-6 col-lg-2">
      <SbKpiCard
label="Entradas pendentes"
:value="ctx.resumo.entradas_pendentes"
variant="green"
sub="a classificar"
      />
    </div>
    <div class="col-12 col-lg-2">
      <SbKpiCard
label="Valor pendente"
:value="formatCurrency(ctx.resumo.valor_pendente)"
variant="amber"
sub="não entra no DRE enquanto pendente"
      />
    </div>
  </div>

  <div class="row q-col-gutter-md q-mb-lg">
    <div class="col-12 col-sm-4">
      <SbKpiCard
label="Entradas"
:value="formatCurrency(ctx.totais.entradas)"
variant="green"
      />
    </div>
    <div class="col-12 col-sm-4">
      <SbKpiCard
label="Saídas"
:value="formatCurrency(ctx.totais.saidas)"
variant="red"
      />
    </div>
    <div class="col-12 col-sm-4">
      <SbKpiCard
label="Líquido"
:value="formatCurrency(ctx.totais.liquido)"
:variant="Number(ctx.totais.liquido) < 0 ? 'amber' : 'teal'"
      />
    </div>
  </div>

  <!-- BARRA DE CLASSIFICAÇÃO EM LOTE -->
  <q-banner v-if="ctx.selecionadas.length" rounded class="bg-teal-1 text-teal-10 q-mb-md">
    <template #avatar><q-icon name="playlist_add_check" size="28px" /></template>
    <div class="row items-center q-col-gutter-md">
      <div class="col-12 col-md-4 text-body2">
<strong>{{ ctx.selecionadas.length }}</strong> transação(ões) selecionada(s). Escolha a
categoria e aplique em todas de uma vez.
      </div>
      <div class="col-12 col-md-4">
<SbCategoriaSelect
  v-model="ctx.classificacaoLote"
  :grupos="ctx.gruposCategorias"
  :loading="ctx.loadingCategorias"
  dense
  outlined
  bg-color="white"
  label="Categoria para as selecionadas"
/>
      </div>
      <div class="col-12 col-md-4">
<div class="row items-center q-gutter-sm">
  <q-btn
    unelevated
    no-caps
    color="teal-8"
    text-color="white"
    icon="done_all"
    label="Classificar selecionadas"
    :loading="ctx.classificandoLote"
    :disable="!ctx.classificacaoLote"
    @click="ctx.classificarSelecionadas"
  />
  <q-btn
    flat
    dense
    no-caps
    color="grey-8"
    label="Limpar seleção"
    @click="ctx.selecionadas = []"
  />
</div>
      </div>
    </div>
  </q-banner>

  <SbCard :title="tituloTabela" eyebrow="Extrato do período">
    <SbTabela
      exportavel
      :nome-exportacao="'extratos-transacoes'"
      v-model:ordenacao="ordenacao"
      :colunas="colunas"
      :linhas="ctx.transacoes"
      chave-linha="id"
      rotulo="Transações do extrato bancário"
      :carregando="ctx.loadingTransacoes"
      :vazio="{
        titulo: 'Nenhuma transação encontrada',
        mensagem:
          'Sincronize a conta, importe um arquivo OFX/CSV ou ajuste o filtro de classificação.',
      }"
      altura-maxima="620px"
    >
      <template #cabecalho-selecao>
        <q-checkbox
          :model-value="todasSelecionadas"
          :indeterminate="algumaSelecionada && !todasSelecionadas"
          dense
          color="teal-8"
          aria-label="Selecionar todas as transações"
          @update:model-value="alternarTodas"
        />
      </template>

      <template #celula-selecao="{ linha }">
        <q-checkbox
          :model-value="estaSelecionada(linha)"
          dense
          color="teal-8"
          :aria-label="`Selecionar a transação ${linha.id}`"
          @update:model-value="(marcado) => alternarLinha(linha, marcado)"
        />
      </template>

      <template #celula-data="{ valor }">{{ formatDate(valor) }}</template>

      <template #celula-descricao="{ linha }">
        <div class="text-weight-medium text-grey-9">{{ linha.descricao || '—' }}</div>
        <div class="text-caption text-grey-6">
          <span v-if="linha.contraparte_cnpj" class="font-mono">
            {{ formatCnpj(linha.contraparte_cnpj) }}
          </span>
          <span v-if="linha.documento"> · Doc {{ linha.documento }}</span>
          <span v-if="linha.identificador"> · {{ linha.identificador }}</span>
        </div>
      </template>

      <template #celula-valor="{ valor }">
        <span class="text-weight-bold" :class="Number(valor) < 0 ? 'text-red-9' : 'text-green-9'">
          {{ formatCurrency(valor) }}
        </span>
      </template>

      <template #celula-classificacao="{ linha }">
        <div data-sem-clique>
          <div class="row items-center no-wrap q-gutter-xs">
            <SbCategoriaSelect
              v-model="linha.classificacao"
              :grupos="ctx.gruposCategorias"
              dense
              borderless
              hide-bottom-space
              class="col classificacao-select"
              placeholder="Sem classificação"
              :loading="ctx.savingTransacoes.has(linha.id)"
              :disable="ctx.loadingCategorias"
              @update:model-value="ctx.saveTransacao(linha)"
            />

            <!-- DE ONDE VEIO A CLASSIFICAÇÃO -->
            <q-badge
              v-if="linha.classificacao && ctx.origemInfo(linha.origem_classificacao)"
              :color="ctx.origemInfo(linha.origem_classificacao).color"
              :text-color="ctx.origemInfo(linha.origem_classificacao).textColor"
              class="text-bold origem-badge"
            >
              <q-icon
                :name="ctx.origemInfo(linha.origem_classificacao).icon"
                size="11px"
                class="q-mr-xs"
              />
              {{ ctx.origemInfo(linha.origem_classificacao).label }}
              <q-tooltip max-width="280px">{{ ctx.origemInfo(linha.origem_classificacao).ajuda }}</q-tooltip>
            </q-badge>
          </div>

          <div
            v-if="linha.mc || linha.fora_do_resultado || ctx.ajudaDaCategoria(linha.classificacao)"
            class="row items-center q-gutter-xs q-mt-xs"
          >
            <q-badge v-if="linha.mc" color="teal-1" text-color="teal-9" class="text-bold">
              custo variável
            </q-badge>
            <q-badge
              v-if="linha.fora_do_resultado"
              color="purple-1"
              text-color="purple-9"
              class="text-bold"
            >
              fora do DRE
            </q-badge>
            <q-icon v-if="ctx.ajudaDaCategoria(linha.classificacao)" name="info" size="14px" color="grey-6">
              <q-tooltip max-width="280px">{{ ctx.ajudaDaCategoria(linha.classificacao) }}</q-tooltip>
            </q-icon>
          </div>
        </div>
      </template>

      <template #celula-conciliado="{ linha }">
        <div class="text-center" data-sem-clique>
          <q-toggle
            v-model="linha.conciliado"
            color="teal-8"
            :disable="ctx.savingTransacoes.has(linha.id)"
            @update:model-value="ctx.saveTransacao(linha)"
          />
        </div>
      </template>
    </SbTabela>
  </SbCard>

  </div>
</template>

<script setup>
// Aba "Extrato" do módulo de bancos/extratos (tickets FIN-23 e FINT-6).
//
// O estado e as ações continuam no `BancosExtratosPage` (que é o dono do fluxo de importação e
// classificação); aqui eles chegam num **objeto reativo** (`ctx`), cujos `ref`s são desembrulhados no
// acesso — por isso `v-model="ctx.extratoFilters.conta"` escreve de volta no page.
//
// A grade é a `SbTabela` (FINT-6). Duas coisas que a `q-table` fazia e aqui ficam explícitas: a
// **seleção múltipla** vira a primeira coluna com checkbox (o estado continua sendo o
// `ctx.selecionadas`, que é quem alimenta a classificação em lote) e a **paginação** virou altura
// limitada com cabeçalho fixo — a lista de um período é para ler inteira, rolando.
import { computed, ref } from 'vue'

import { useEstadoNaUrl } from 'src/composables/useEstadoNaUrl'

import SbCard from 'src/components/common/SbCard.vue'
import SbCategoriaSelect from 'src/components/common/SbCategoriaSelect.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import SbTabela from 'src/components/common/SbTabela.vue'
import { formatCnpj, formatCurrency, formatDate } from 'src/utils/formato'

const props = defineProps({
  ctx: { type: Object, required: true },
})

const ctx = props.ctx

// A coluna de seleção é **comportamento**, não campo da transação — por isso nasce aqui, e não na
// definição de colunas do page (que é dona dos campos que vêm do backend).
const COLUNA_SELECAO = { chave: 'selecao', rotulo: 'Seleção', largura: '52px', alinhamento: 'center' }

// Ordem na URL (FINT-11).
const { ordenacao } = useEstadoNaUrl()

const colunas = computed(() => [COLUNA_SELECAO, ...(ctx.transacaoColumns || [])])

const tituloTabela = computed(() =>
  ctx.transacoes?.length ? `Transações (${ctx.transacoes.length})` : 'Transações',
)

const selecionadas = computed(() => ctx.selecionadas || [])
const algumaSelecionada = computed(() => selecionadas.value.length > 0)
const todasSelecionadas = computed(
  () => (ctx.transacoes?.length || 0) > 0 && selecionadas.value.length === ctx.transacoes.length,
)

const estaSelecionada = (linha) => selecionadas.value.some((item) => item.id === linha.id)

function alternarLinha(linha, marcado) {
  const atual = selecionadas.value
  ctx.selecionadas = marcado ? [...atual, linha] : atual.filter((item) => item.id !== linha.id)
}

function alternarTodas(marcado) {
  ctx.selecionadas = marcado ? [...(ctx.transacoes || [])] : []
}
</script>
