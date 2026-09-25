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
  label="Categoria para as ctx.selecionadas"
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
    label="Classificar ctx.selecionadas"
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

  <SbCard>
    <q-table
      v-model:selected="ctx.selecionadas"
      :rows="ctx.transacoes"
      :columns="ctx.transacaoColumns"
      row-key="id"
      selection="multiple"
      :loading="ctx.loadingTransacoes"
      flat
      :pagination="{ rowsPerPage: 25 }"
      :no-data-label="'Nenhuma transação encontrada com os filtros atuais. Sincronize a conta, importe um arquivo OFX/CSV ou ajuste o filtro de classificação.'"
    >
      <template #body-cell-data="props">
<q-td :props="props">{{ formatDate(props.row.data) }}</q-td>
      </template>

      <template #body-cell-descricao="props">
<q-td :props="props">
  <div class="text-weight-medium text-grey-9">{{ props.row.descricao || '—' }}</div>
  <div class="text-caption text-grey-6">
    <span v-if="props.row.contraparte_cnpj" class="font-mono">
      {{ formatCnpj(props.row.contraparte_cnpj) }}
    </span>
    <span v-if="props.row.documento"> · Doc {{ props.row.documento }}</span>
    <span v-if="props.row.identificador"> · {{ props.row.identificador }}</span>
  </div>
</q-td>
      </template>

      <template #body-cell-valor="props">
<q-td :props="props">
  <span
    class="text-weight-bold"
    :class="Number(props.row.valor) < 0 ? 'text-red-9' : 'text-green-9'"
  >
    {{ formatCurrency(props.row.valor) }}
  </span>
</q-td>
      </template>

      <template #body-cell-classificacao="props">
<q-td :props="props" @click.stop>
  <div class="row items-center no-wrap q-gutter-xs">
    <SbCategoriaSelect
      v-model="props.row.classificacao"
      :grupos="ctx.gruposCategorias"
      dense
      borderless
      hide-bottom-space
      class="col classificacao-select"
      placeholder="Sem classificação"
      :loading="ctx.savingTransacoes.has(props.row.id)"
      :disable="ctx.loadingCategorias"
      @update:model-value="ctx.saveTransacao(props.row)"
    />

    <!-- DE ONDE VEIO A CLASSIFICAÇÃO -->
    <q-badge
      v-if="props.row.classificacao && ctx.origemInfo(props.row.origem_classificacao)"
      :color="ctx.origemInfo(props.row.origem_classificacao).color"
      :text-color="ctx.origemInfo(props.row.origem_classificacao).textColor"
      class="text-bold origem-badge"
    >
      <q-icon
        :name="ctx.origemInfo(props.row.origem_classificacao).icon"
        size="11px"
        class="q-mr-xs"
      />
      {{ ctx.origemInfo(props.row.origem_classificacao).label }}
      <q-tooltip max-width="280px">{{ ctx.origemInfo(props.row.origem_classificacao).ajuda }}</q-tooltip>
    </q-badge>
  </div>

  <div
    v-if="props.row.mc || props.row.fora_do_resultado || ctx.ajudaDaCategoria(props.row.classificacao)"
    class="row items-center q-gutter-xs q-mt-xs"
  >
    <q-badge v-if="props.row.mc" color="teal-1" text-color="teal-9" class="text-bold">
      custo variável
    </q-badge>
    <q-badge
      v-if="props.row.fora_do_resultado"
      color="purple-1"
      text-color="purple-9"
      class="text-bold"
    >
      fora do DRE
    </q-badge>
    <q-icon v-if="ctx.ajudaDaCategoria(props.row.classificacao)" name="info" size="14px" color="grey-6">
      <q-tooltip max-width="280px">{{ ctx.ajudaDaCategoria(props.row.classificacao) }}</q-tooltip>
    </q-icon>
  </div>
</q-td>
      </template>

      <template #body-cell-conciliado="props">
<q-td :props="props" class="text-center" @click.stop>
  <q-toggle
    v-model="props.row.conciliado"
    color="teal-8"
    :disable="ctx.savingTransacoes.has(props.row.id)"
    @update:model-value="ctx.saveTransacao(props.row)"
  />
</q-td>
      </template>
    </q-table>
  </SbCard>

  </div>
</template>

<script setup>
// Aba "Extrato" do módulo de bancos/extratos (ticket FIN-23).
//
// O estado e as ações continuam no `BancosExtratosPage` (que é o dono do fluxo de importação e
// classificação); aqui eles chegam num **objeto reativo** (`ctx`), cujos `ref`s são desembrulhados no
// acesso — por isso `v-model="ctx.extratoFilters.conta"` e `v-model="ctx.selecionadas"` escrevem de
// volta no page. Os formatadores vêm de `utils/formato.js`.
import SbCard from 'src/components/common/SbCard.vue'
import SbCategoriaSelect from 'src/components/common/SbCategoriaSelect.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import { formatCnpj, formatCurrency, formatDate } from 'src/utils/formato'

defineProps({
  ctx: { type: Object, required: true },
})
</script>
