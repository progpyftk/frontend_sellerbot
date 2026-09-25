<template>
  <q-page class="bancos-page q-pa-lg">
    <div class="bancos-container">

      <!-- ══════════════════════════════════════════ CABEÇALHO -->
      <SbPageHeader
        title="Bancos e Extratos"
        eyebrow="Financeiro & Contábil"
        subtitle="Conecte contas bancárias, teste credenciais, sincronize extratos e classifique lançamentos"
        icon="account_balance_wallet"
      >
        <template #actions>
          <div class="row items-center q-gutter-sm">
            <q-btn
              flat
              dense
              color="grey-8"
              icon="refresh"
              label="Atualizar"
              :loading="loadingConexoes"
              @click="refreshActiveTab"
            />
            <q-btn
              unelevated
              color="teal-8"
              text-color="white"
              icon="add"
              label="Nova conexão"
              @click="openNovaConexao"
            />
          </div>
        </template>
      </SbPageHeader>

      <!-- ══════════════════════════════════════════ NAVEGAÇÃO POR ABAS -->
      <div class="tabs-wrapper q-mb-lg">
        <q-tabs
          v-model="activeTab"
          dense
          no-caps
          align="left"
          active-color="teal-8"
          indicator-color="teal-8"
          class="bancos-tabs"
        >
          <q-tab name="conexoes" icon="account_balance" label="Conexões" />
          <q-tab name="extrato" icon="receipt_long" label="Extrato" />
          <q-tab name="importar" icon="upload_file" label="Importar arquivo" />
        </q-tabs>
      </div>

      <q-tab-panels v-model="activeTab" animated class="bg-transparent">

        <!-- ────────────────────────────────────────── ABA 1: CONEXÕES -->
        <q-tab-panel name="conexoes" class="q-pa-none">

          <SbEmptyState
            v-if="loadingConexoes && conexoes.length === 0"
            variant="loading"
            title="Carregando conexões bancárias"
          />

          <SbEmptyState
            v-else-if="conexoes.length === 0"
            title="Nenhuma conexão bancária cadastrada"
            message="Conecte um banco para importar o extrato automaticamente via API."
          >
            <template #action>
              <q-btn
                unelevated
                color="teal-8"
                text-color="white"
                icon="add"
                label="Nova conexão"
                no-caps
                @click="openNovaConexao"
              />
            </template>
          </SbEmptyState>

          <template v-else>
            <SbCard v-for="conexao in conexoes" :key="conexao.id" class="q-mb-md">
              <template #header>
                <div class="row items-center no-wrap">
                  <q-icon name="account_balance" size="sm" color="teal-8" class="q-mr-sm" />
                  <div>
                    <div class="text-subtitle1 text-weight-bold text-grey-9">
                      {{ conexao.banco_nome || conexao.banco }}
                    </div>
                    <div class="text-caption text-grey-6">
                      {{ conexao.razao_social || 'Razão social não informada' }}
                      <span class="font-mono">· {{ formatCnpj(conexao.cnpj) }}</span>
                    </div>
                  </div>
                  <q-badge
                    class="q-ml-md text-bold"
                    :color="conexao.status === 'ativa' ? 'green-2' : 'grey-3'"
                    :text-color="conexao.status === 'ativa' ? 'green-10' : 'grey-9'"
                  >
                    {{ conexao.status || '—' }}
                  </q-badge>
                  <q-badge class="q-ml-xs text-bold" color="blue-grey-1" text-color="blue-grey-9">
                    {{ conexao.ambiente }}
                  </q-badge>
                </div>
              </template>

              <template #actions>
                <q-btn
                  flat
                  dense
                  no-caps
                  color="teal-8"
                  icon="network_check"
                  label="Testar conexão"
                  :loading="testandoId === conexao.id"
                  @click="testarConexao(conexao)"
                />
                <q-btn
                  flat
                  dense
                  round
                  color="grey-7"
                  icon="delete_outline"
                  @click="confirmarRemocao(conexao)"
                >
                  <q-tooltip>Remover conexão</q-tooltip>
                </q-btn>
              </template>

              <div class="row q-col-gutter-md q-mb-sm">
                <div class="col-12 col-sm-6 col-md-4">
                  <div class="text-caption text-grey-6">Última sincronização</div>
                  <div class="text-weight-medium text-grey-9">
                    {{ formatDateTime(conexao.ultima_sincronizacao) }}
                  </div>
                </div>
                <div class="col-12 col-sm-6 col-md-4">
                  <div class="text-caption text-grey-6">Contas vinculadas</div>
                  <div class="text-weight-medium text-grey-9">
                    {{ (conexao.contas || []).length }}
                  </div>
                </div>
              </div>

              <q-banner
                v-if="conexao.ultimo_erro"
                dense
                rounded
                class="bg-red-1 text-red-10 q-mb-sm"
              >
                <template #avatar><q-icon name="error_outline" /></template>
                {{ conexao.ultimo_erro }}
              </q-banner>

              <q-banner
                v-if="testes[conexao.id]"
                dense
                rounded
                class="q-mb-sm"
                :class="testes[conexao.id].ok ? 'bg-green-1 text-green-10' : 'bg-amber-1 text-amber-10'"
              >
                <template #avatar>
                  <q-icon :name="testes[conexao.id].ok ? 'check_circle' : 'warning'" />
                </template>
                {{ testes[conexao.id].mensagem }}
                <span v-if="testes[conexao.id].saldo !== null && testes[conexao.id].saldo !== undefined">
                  — saldo informado: <strong>{{ formatCurrency(testes[conexao.id].saldo) }}</strong>
                </span>
              </q-banner>

              <q-table
                :rows="conexao.contas || []"
                :columns="contaColumns"
                row-key="id"
                dense
                flat
                bordered
                :pagination="{ rowsPerPage: 10 }"
                :no-data-label="'Nenhuma conta retornada por esta conexão.'"
              >
                <template #body-cell-apelido="props">
                  <q-td :props="props">
                    <div class="text-weight-medium text-grey-9">
                      {{ props.row.apelido || 'Conta' }}
                    </div>
                    <div class="text-caption text-grey-6 font-mono">
                      Ag {{ props.row.agencia || '—' }} / C {{ props.row.numero || '—' }}{{ props.row.digito ? '-' + props.row.digito : '' }}
                    </div>
                  </q-td>
                </template>

                <template #body-cell-saldo="props">
                  <q-td :props="props">
                    <span class="text-weight-bold" :class="Number(props.row.saldo) < 0 ? 'text-red-9' : 'text-teal-9'">
                      {{ formatCurrency(props.row.saldo) }}
                    </span>
                    <div v-if="props.row.saldo_em" class="text-caption text-grey-6">
                      em {{ formatDate(props.row.saldo_em) }}
                    </div>
                  </q-td>
                </template>

                <template #body-cell-actions="props">
                  <q-td :props="props" class="text-center">
                    <q-btn
                      flat
                      dense
                      no-caps
                      color="teal-8"
                      icon="sync"
                      label="Sincronizar"
                      @click="openSincronizar(conexao, props.row)"
                    />
                    <q-btn
                      flat
                      dense
                      no-caps
                      color="grey-7"
                      icon="table_view"
                      label="Ver extrato"
                      @click="verExtrato(conexao, props.row)"
                    />
                  </q-td>
                </template>
              </q-table>
            </SbCard>
          </template>

        </q-tab-panel>

        <!-- ────────────────────────────────────────── ABA 2: EXTRATO -->
        <q-tab-panel name="extrato" class="q-pa-none">

          <SbCard class="q-mb-md">
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-md-4">
                <q-select
                  v-model="extratoFilters.conta"
                  :options="contaOptions"
                  emit-value
                  map-options
                  dense
                  outlined
                  label="Conta bancária"
                  bg-color="white"
                  @update:model-value="loadTransacoes"
                />
              </div>
              <div class="col-6 col-md-2">
                <q-input
                  v-model="extratoFilters.dataInicio"
                  type="date"
                  dense
                  outlined
                  label="Data início"
                  bg-color="white"
                  @change="loadTransacoes"
                />
              </div>
              <div class="col-6 col-md-2">
                <q-input
                  v-model="extratoFilters.dataFim"
                  type="date"
                  dense
                  outlined
                  label="Data fim"
                  bg-color="white"
                  @change="loadTransacoes"
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
                  :loading="loadingTransacoes"
                  :disable="!extratoFilters.conta"
                  @click="loadTransacoes"
                />
              </div>
            </div>
            <div class="row items-center q-col-gutter-md q-mt-md">
              <div class="col-12 col-md-auto">
                <q-btn-toggle
                  v-model="extratoFilters.classificacao"
                  :options="filtroClassificacaoOptions"
                  no-caps
                  unelevated
                  dense
                  toggle-color="teal-8"
                  color="grey-2"
                  text-color="grey-8"
                  @update:model-value="loadTransacoes"
                />
              </div>
              <div class="col-12 col-md">
                <div class="row items-center q-gutter-sm">
                  <q-btn
                    v-if="resumo.pendentes > 0"
                    flat
                    dense
                    no-caps
                    color="amber-9"
                    icon="filter_alt"
                    :label="`Ver as ${resumo.pendentes} pendentes`"
                    @click="verPendentes"
                  />
                  <q-space />
                  <q-btn
                    v-if="resumo.pendentes > 0"
                    outline
                    no-caps
                    color="teal-8"
                    icon="groups"
                    :label="`Resolver por contraparte${contrapartesPendentes ? ` (${contrapartesPendentes})` : ''}`"
                    :disable="!extratoFilters.conta"
                    @click="abrirContrapartes"
                  />
                  <q-btn
                    outline
                    no-caps
                    color="teal-8"
                    icon="auto_fix_high"
                    label="Reclassificar automaticamente"
                    :loading="reclassificando"
                    :disable="!extratoFilters.conta"
                    @click="confirmarReclassificacao"
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
                :value="percentualPendenteTexto"
                :variant="termometroVariante"
                :sub="`${resumo.classificadas} de ${resumo.total} transações classificadas`"
              >
                <q-linear-progress
                  :value="percentualPendente / 100"
                  :color="termometroCor"
                  track-color="grey-3"
                  rounded
                  size="10px"
                  class="q-mt-sm termometro-barra"
                />
                <div class="text-caption text-grey-7 q-mt-xs">
                  {{ termometroMensagem }}
                  <template v-if="contrapartesPendentes">
                    São <strong>{{ contrapartesPendentes }} contrapartes</strong> — dá para
                    resolver uma por uma.
                  </template>
                </div>
              </SbKpiCard>
            </div>
            <div class="col-6 col-lg-2">
              <SbKpiCard
                label="Saídas pendentes"
                :value="resumo.saidas_pendentes"
                variant="red"
                sub="travam o resultado"
              />
            </div>
            <div class="col-6 col-lg-2">
              <SbKpiCard
                label="Entradas pendentes"
                :value="resumo.entradas_pendentes"
                variant="green"
                sub="a classificar"
              />
            </div>
            <div class="col-12 col-lg-2">
              <SbKpiCard
                label="Valor pendente"
                :value="formatCurrency(resumo.valor_pendente)"
                variant="amber"
                sub="não entra no DRE enquanto pendente"
              />
            </div>
          </div>

          <div class="row q-col-gutter-md q-mb-lg">
            <div class="col-12 col-sm-4">
              <SbKpiCard
                label="Entradas"
                :value="formatCurrency(totais.entradas)"
                variant="green"
              />
            </div>
            <div class="col-12 col-sm-4">
              <SbKpiCard
                label="Saídas"
                :value="formatCurrency(totais.saidas)"
                variant="red"
              />
            </div>
            <div class="col-12 col-sm-4">
              <SbKpiCard
                label="Líquido"
                :value="formatCurrency(totais.liquido)"
                :variant="Number(totais.liquido) < 0 ? 'amber' : 'teal'"
              />
            </div>
          </div>

          <!-- BARRA DE CLASSIFICAÇÃO EM LOTE -->
          <q-banner v-if="selecionadas.length" rounded class="bg-teal-1 text-teal-10 q-mb-md">
            <template #avatar><q-icon name="playlist_add_check" size="28px" /></template>
            <div class="row items-center q-col-gutter-md">
              <div class="col-12 col-md-4 text-body2">
                <strong>{{ selecionadas.length }}</strong> transação(ões) selecionada(s). Escolha a
                categoria e aplique em todas de uma vez.
              </div>
              <div class="col-12 col-md-4">
                <SbCategoriaSelect
                  v-model="classificacaoLote"
                  :grupos="gruposCategorias"
                  :loading="loadingCategorias"
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
                    :loading="classificandoLote"
                    :disable="!classificacaoLote"
                    @click="classificarSelecionadas"
                  />
                  <q-btn
                    flat
                    dense
                    no-caps
                    color="grey-8"
                    label="Limpar seleção"
                    @click="selecionadas = []"
                  />
                </div>
              </div>
            </div>
          </q-banner>

          <SbCard>
            <q-table
              v-model:selected="selecionadas"
              :rows="transacoes"
              :columns="transacaoColumns"
              row-key="id"
              selection="multiple"
              :loading="loadingTransacoes"
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
                      :grupos="gruposCategorias"
                      dense
                      borderless
                      hide-bottom-space
                      class="col classificacao-select"
                      placeholder="Sem classificação"
                      :loading="savingTransacoes.has(props.row.id)"
                      :disable="loadingCategorias"
                      @update:model-value="saveTransacao(props.row)"
                    />

                    <!-- DE ONDE VEIO A CLASSIFICAÇÃO -->
                    <q-badge
                      v-if="props.row.classificacao && origemInfo(props.row.origem_classificacao)"
                      :color="origemInfo(props.row.origem_classificacao).color"
                      :text-color="origemInfo(props.row.origem_classificacao).textColor"
                      class="text-bold origem-badge"
                    >
                      <q-icon
                        :name="origemInfo(props.row.origem_classificacao).icon"
                        size="11px"
                        class="q-mr-xs"
                      />
                      {{ origemInfo(props.row.origem_classificacao).label }}
                      <q-tooltip max-width="280px">{{ origemInfo(props.row.origem_classificacao).ajuda }}</q-tooltip>
                    </q-badge>
                  </div>

                  <div
                    v-if="props.row.mc || props.row.fora_do_resultado || ajudaDaCategoria(props.row.classificacao)"
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
                    <q-icon v-if="ajudaDaCategoria(props.row.classificacao)" name="info" size="14px" color="grey-6">
                      <q-tooltip max-width="280px">{{ ajudaDaCategoria(props.row.classificacao) }}</q-tooltip>
                    </q-icon>
                  </div>
                </q-td>
              </template>

              <template #body-cell-conciliado="props">
                <q-td :props="props" class="text-center" @click.stop>
                  <q-toggle
                    v-model="props.row.conciliado"
                    color="teal-8"
                    :disable="savingTransacoes.has(props.row.id)"
                    @update:model-value="saveTransacao(props.row)"
                  />
                </q-td>
              </template>
            </q-table>
          </SbCard>

        </q-tab-panel>

        <!-- ────────────────────────────────────────── ABA 3: IMPORTAR ARQUIVO -->
        <q-tab-panel name="importar" class="q-pa-none">

          <SbCard class="q-mb-md">
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-md-4">
                <q-select
                  v-model="importacao.conta"
                  :options="contaOptions"
                  emit-value
                  map-options
                  dense
                  outlined
                  label="Conta bancária"
                  bg-color="white"
                  @update:model-value="onImportContaChange"
                />
              </div>
              <div class="col-6 col-md-3">
                <q-select
                  v-model="importacao.formato"
                  :options="formatosImportacao"
                  dense
                  outlined
                  label="Formato"
                  bg-color="white"
                  :disable="formatosImportacao.length === 0"
                />
              </div>
              <div class="col-12 col-md-5">
                <q-file
                  v-model="importacao.arquivo"
                  dense
                  outlined
                  clearable
                  bg-color="white"
                  :accept="acceptImportacao"
                  :label="`Arquivo (${formatosImportacao.join(' / ') || 'OFX / CSV'})`"
                >
                  <template #prepend><q-icon name="attach_file" /></template>
                </q-file>
              </div>
            </div>

            <div class="row justify-end q-mt-md">
              <q-btn
                unelevated
                no-caps
                color="teal-8"
                text-color="white"
                icon="cloud_upload"
                label="Importar arquivo"
                :loading="importando"
                :disable="!importacao.conta || !importacao.arquivo || !importacao.formato"
                @click="importarArquivo"
              />
            </div>

            <div v-if="formatosImportacao.length === 0" class="text-caption text-grey-6 q-mt-sm">
              O banco desta conexão não informou formatos de arquivo aceitos pela API.
            </div>
          </SbCard>

          <q-banner
            v-if="resultadoImportacao"
            dense
            rounded
            class="q-mb-md"
            :class="resultadoImportacao.ok ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'"
          >
            <template #avatar>
              <q-icon :name="resultadoImportacao.ok ? 'check_circle' : 'error_outline'" />
            </template>
            {{ resultadoImportacao.mensagem }}
            <span v-if="resultadoImportacao.ok">
              — {{ resultadoImportacao.importadas }} importada(s), {{ resultadoImportacao.duplicadas }} duplicada(s)
              <span v-if="resultadoImportacao.periodo"> · {{ resultadoImportacao.periodo }}</span>
            </span>
          </q-banner>

          <SbCard v-if="resultadoImportacao?.ok">
            <div class="row items-center justify-between">
              <div class="text-subtitle2 text-weight-bold text-grey-9">
                Extrato da conta após a importação
              </div>
              <q-btn
                flat
                dense
                no-caps
                color="teal-8"
                icon="table_view"
                label="Abrir aba Extrato"
                @click="abrirExtratoDaImportacao"
              />
            </div>
          </SbCard>

        </q-tab-panel>

      </q-tab-panels>

      <!-- ══════════════════════════════════════════ DIÁLOGO: NOVA CONEXÃO -->
      <q-dialog v-model="showNovaConexao" persistent>
        <q-card style="width: 640px; max-width: 95vw;" class="rounded-borders">
          <q-card-section class="row items-center justify-between border-bottom bg-grey-1">
            <div class="text-h6 text-weight-bold text-grey-9">Nova conexão bancária</div>
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section class="q-pa-md">
            <q-banner v-if="erroNovaConexao" dense rounded class="bg-red-1 text-red-10 q-mb-md">
              <template #avatar><q-icon name="error_outline" /></template>
              {{ erroNovaConexao }}
            </q-banner>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <SbSeletorEmpresa
                  v-model="novaConexao.fiscal_account"
                  :options="cnpjOptions"
                  label="CNPJ fiscal *"
                  :rules="[(v) => !!v || 'Selecione o CNPJ']"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="novaConexao.banco"
                  :options="bancoOptions"
                  emit-value
                  map-options
                  dense
                  outlined
                  label="Banco *"
                  bg-color="white"
                  :rules="[(v) => !!v || 'Selecione o banco']"
                  @update:model-value="onBancoChange"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="novaConexao.ambiente"
                  :options="ambienteOptions"
                  emit-value
                  map-options
                  dense
                  outlined
                  label="Ambiente"
                  bg-color="white"
                />
              </div>
            </div>

            <!-- Campos de credencial montados dinamicamente a partir da API -->
            <div v-if="bancoSelecionado" class="q-mt-md">
              <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-sm">
                Credenciais
                <q-badge
                  v-if="!bancoSelecionado.aceita_api"
                  color="amber-2"
                  text-color="amber-10"
                  class="q-ml-xs text-bold"
                >
                  Somente arquivo
                </q-badge>
              </div>

              <div v-if="bancoSelecionado.campos_credencial && bancoSelecionado.campos_credencial.length" class="row q-col-gutter-md">
                <div
                  v-for="campo in bancoSelecionado.campos_credencial"
                  :key="campo.nome"
                  class="col-12 col-sm-6"
                >
                  <q-input
                    v-model="novaConexao.credenciais[campo.nome]"
                    dense
                    outlined
                    bg-color="white"
                    autocomplete="new-password"
                    :type="campo.secreto ? 'password' : 'text'"
                    :label="campo.rotulo || campo.nome"
                    :hint="campo.secreto ? 'Armazenado com segurança (write-only)' : ''"
                    :rules="[(v) => !campo.obrigatorio || (v !== null && v !== undefined && String(v).length > 0) || 'Campo obrigatório']"
                  />
                </div>
              </div>
              <div v-else class="text-caption text-grey-6">
                Este banco não exige credenciais de API.
              </div>

              <div v-if="bancoSelecionado.exige_certificado" class="row q-col-gutter-md q-mt-sm">
                <div class="col-12 col-sm-7">
                  <q-file
                    v-model="novaConexao.certificado"
                    dense
                    outlined
                    clearable
                    bg-color="white"
                    accept=".pfx,.p12"
                    label="Certificado digital (.pfx/.p12)"
                  >
                    <template #prepend><q-icon name="badge" /></template>
                  </q-file>
                </div>
                <div class="col-12 col-sm-5">
                  <q-input
                    v-model="novaConexao.senha_certificado"
                    dense
                    outlined
                    type="password"
                    autocomplete="new-password"
                    bg-color="white"
                    label="Senha do certificado"
                  />
                </div>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md border-top">
            <q-btn flat no-caps label="Cancelar" color="grey-8" v-close-popup />
            <q-btn
              unelevated
              no-caps
              color="teal-8"
              text-color="white"
              icon="save"
              label="Criar conexão"
              :loading="salvandoConexao"
              @click="salvarConexao"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- ══════════════════════════════════════════ DIÁLOGO: PENDENTES POR CONTRAPARTE -->
      <q-dialog v-model="showContrapartes">
        <q-card style="width: 860px; max-width: 96vw;" class="rounded-borders">
          <q-card-section class="row items-center justify-between border-bottom bg-grey-1">
            <div>
              <div class="text-h6 text-weight-bold text-grey-9">Resolver pendentes por contraparte</div>
              <div class="text-caption text-grey-7">
                Classificar uma linha ensina o sistema: as iguais do mesmo CNPJ entram
                classificadas sozinhas na próxima importação.
              </div>
            </div>
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section class="q-pa-md contrapartes-corpo">
            <div v-if="carregandoContrapartes" class="column items-center q-pa-lg">
              <q-spinner color="teal-8" size="32px" />
              <div class="text-caption text-grey-7 q-mt-sm">Carregando contrapartes pendentes…</div>
            </div>

            <SbEmptyState
              v-else-if="gruposPendentes.length === 0"
              title="Nenhuma contraparte pendente"
              message="Tudo que chegou neste período já está classificado."
            />

            <div v-else class="column q-gutter-sm">
              <div
                v-for="grupo in gruposPendentes"
                :key="grupo.contraparte_chave"
                class="contraparte-item q-pa-sm rounded-borders"
              >
                <div class="row items-center q-col-gutter-md">
                  <div class="col-12 col-md-5">
                    <div class="text-weight-medium text-grey-9">
                      {{ grupo.contraparte_nome || '(sem contraparte identificada)' }}
                    </div>
                    <div class="text-caption text-grey-6 font-mono">
                      {{ grupo.contraparte_cnpj ? formatCnpj(grupo.contraparte_cnpj) : grupo.contraparte_chave }}
                    </div>
                    <div class="text-caption text-grey-6">
                      {{ grupo.linhas }} lançamento(s) · {{ descreverTipos(grupo.tipos) }} ·
                      {{ formatDate(grupo.primeira_data) }} a {{ formatDate(grupo.ultima_data) }}
                    </div>
                  </div>
                  <div class="col-6 col-md-2 text-right">
                    <div
                      class="text-weight-bold"
                      :class="(grupo.tipos || []).includes('D') ? 'text-red-9' : 'text-green-9'"
                    >
                      {{ formatCurrency(grupo.valor) }}
                    </div>
                  </div>
                  <div class="col-12 col-md-5">
                    <div class="row items-center q-gutter-sm no-wrap">
                      <SbCategoriaSelect
                        v-model="categoriasContraparte[grupo.contraparte_chave]"
                        :grupos="gruposCategorias"
                        :loading="loadingCategorias"
                        dense
                        outlined
                        bg-color="white"
                        label="Classificar como"
                        class="col"
                      />
                      <q-btn
                        unelevated
                        no-caps
                        color="teal-8"
                        text-color="white"
                        icon="done_all"
                        label="Aplicar"
                        :disable="!categoriasContraparte[grupo.contraparte_chave]"
                        :loading="classificandoGrupo === grupo.contraparte_chave"
                        @click="classificarGrupo(grupo)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md border-top">
            <q-btn flat no-caps label="Fechar" color="grey-8" v-close-popup />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- ══════════════════════════════════════════ DIÁLOGO: SINCRONIZAR -->
      <q-dialog v-model="showSincronizar">
        <q-card style="width: 460px; max-width: 95vw;" class="rounded-borders">
          <q-card-section class="row items-center justify-between border-bottom bg-grey-1">
            <div class="text-h6 text-weight-bold text-grey-9">Sincronizar extrato</div>
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section class="q-pa-md">
            <div class="text-body2 text-grey-8 q-mb-md">
              {{ sincronizarAlvo?.conexao?.banco_nome }} —
              {{ sincronizarAlvo?.conta?.apelido || sincronizarAlvo?.conta?.numero }}
            </div>
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input v-model="sincronizarPeriodo.data_inicio" type="date" dense outlined label="Data início" bg-color="white" />
              </div>
              <div class="col-6">
                <q-input v-model="sincronizarPeriodo.data_fim" type="date" dense outlined label="Data fim" bg-color="white" />
              </div>
            </div>
            <q-banner v-if="resultadoSincronizacao" dense rounded class="q-mt-md"
              :class="resultadoSincronizacao.ok ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'">
              <template #avatar>
                <q-icon :name="resultadoSincronizacao.ok ? 'check_circle' : 'error_outline'" />
              </template>
              {{ resultadoSincronizacao.mensagem }}
            </q-banner>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md border-top">
            <q-btn flat no-caps label="Fechar" color="grey-8" v-close-popup />
            <q-btn
              unelevated
              no-caps
              color="teal-8"
              text-color="white"
              icon="sync"
              label="Sincronizar"
              :loading="sincronizando"
              :disable="!sincronizarPeriodo.data_inicio || !sincronizarPeriodo.data_fim"
              @click="sincronizar"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useQuasar } from "quasar";
import SbPageHeader from "src/components/common/SbPageHeader.vue";
import SbCard from "src/components/common/SbCard.vue";
import SbKpiCard from "src/components/common/SbKpiCard.vue";
import SbEmptyState from "src/components/common/SbEmptyState.vue";
import SbCategoriaSelect from "src/components/common/SbCategoriaSelect.vue";
import SbSeletorEmpresa from "src/components/common/SbSeletorEmpresa.vue";
import { opcoesDeEmpresa } from "src/utils/seletores";
import FinanceiroService from "src/services/FinanceiroService";
import FiscalService from "src/services/FiscalService";

const $q = useQuasar();

const activeTab = ref("conexoes");

// ────────────────────────────────────────── ESTADO: CONEXÕES
const loadingConexoes = ref(false);
const conexoes = ref([]);
const bancos = ref([]);
const testes = ref({});
const testandoId = ref(null);

const contaColumns = [
  { name: "apelido", label: "Conta", align: "left" },
  { name: "saldo", label: "Saldo", align: "right" },
  { name: "actions", label: "Ações", align: "center" },
];

// ────────────────────────────────────────── ESTADO: NOVA CONEXÃO
const showNovaConexao = ref(false);
const salvandoConexao = ref(false);
const erroNovaConexao = ref("");
const cnpjOptions = ref([]);
// Os valores casam com BankConnection.AMBIENTE_CHOICES no backend.
const ambienteOptions = [
  { label: "Produção", value: "producao" },
  { label: "Sandbox (testes do banco)", value: "sandbox" },
];

const novaConexao = ref({
  fiscal_account: null,
  banco: null,
  ambiente: "producao",
  credenciais: {},
  certificado: null,
  senha_certificado: "",
});

// Todo banco do registro pode ser escolhido. Os que nao tem API (ex.: "arquivo") tambem
// precisam ser criaveis: sem a conexao nao existe conta, e sem conta nao ha onde importar
// o extrato OFX/CSV. O que muda e o formulario, que se adapta aos campos_credencial.
const bancoOptions = computed(() =>
  bancos.value.map((b) => ({
    label: b.aceita_api ? b.nome : `${b.nome} — sem API, so arquivo`,
    value: b.codigo,
    disable: false,
  })),
);

const bancoSelecionado = computed(
  () => bancos.value.find((b) => b.codigo === novaConexao.value.banco) || null,
);

// ────────────────────────────────────────── ESTADO: EXTRATO
const loadingTransacoes = ref(false);
const transacoes = ref([]);
const totais = ref({ entradas: 0, saidas: 0, liquido: 0 });
const savingTransacoes = ref(new Set());

const hoje = new Date();
const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

const extratoFilters = ref({
  conta: null,
  dataInicio: toIsoDate(primeiroDiaMes),
  dataFim: toIsoDate(hoje),
  // "" = todas | "nao_classificadas" | "classificadas"
  classificacao: "",
});

// Termômetro: quanto do escopo (conta/período) ainda está sem classificação.
const resumoVazio = {
  total: 0,
  classificadas: 0,
  pendentes: 0,
  percentual_pendente: 0,
  percentual_classificado: 0,
  saidas_pendentes: 0,
  entradas_pendentes: 0,
  completo: false,
  valor_pendente: "0.00",
};
const resumo = ref({ ...resumoVazio });

// Classificação em lote: as linhas marcadas na tabela.
const selecionadas = ref([]);
const classificacaoLote = ref(null);
const classificandoLote = ref(false);
const reclassificando = ref(false);

// Catálogo do plano de contas (vem do backend).
const categorias = ref([]);
const gruposCategorias = ref([]);
const loadingCategorias = ref(false);

// Pendentes agrupados por contraparte: resolver o grupo inteiro de uma escolha só.
const showContrapartes = ref(false);
const carregandoContrapartes = ref(false);
const gruposPendentes = ref([]);
const contrapartesPendentes = ref(0);
const categoriasContraparte = ref({});
const classificandoGrupo = ref(null);

// Origem da classificação: diz ao dono em que confiar.
const ORIGENS_CLASSIFICACAO = {
  banco: {
    label: "banco",
    color: "blue-grey-1",
    textColor: "blue-grey-9",
    icon: "account_balance",
    ajuda: "O próprio banco já informou a classificação no título da transação.",
  },
  historico: {
    label: "histórico",
    color: "teal-1",
    textColor: "teal-9",
    icon: "history",
    ajuda: "Copiada de uma despesa igual, deste mesmo CNPJ, que já estava classificada.",
  },
  regra: {
    label: "regra",
    color: "indigo-1",
    textColor: "indigo-9",
    icon: "rule",
    ajuda: "Contraparte reconhecida automaticamente (concessionária, fornecedor ou transferência entre contas).",
  },
  usuario: {
    label: "usuário",
    color: "amber-2",
    textColor: "amber-10",
    icon: "person",
    ajuda: "Classificação feita por você. A reclassificação automática não sobrescreve esta escolha.",
  },
};

const filtroClassificacaoOptions = [
  { label: "Todas", value: "" },
  { label: "Só pendentes", value: "nao_classificadas" },
  { label: "Só classificadas", value: "classificadas" },
];

const transacaoColumns = [
  { name: "data", label: "Data", align: "left", sortable: true },
  { name: "descricao", label: "Descrição", align: "left" },
  { name: "valor", label: "Valor", align: "right", sortable: true },
  { name: "classificacao", label: "Classificação", align: "left" },
  { name: "conciliado", label: "Conciliado", align: "center" },
];

// ────────────────────────────────────────── TERMÔMETRO DA CLASSIFICAÇÃO
const percentualPendente = computed(() => Number(resumo.value.percentual_pendente) || 0);
const percentualPendenteTexto = computed(() =>
  `${percentualPendente.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
);

const termometroCor = computed(() => {
  if (!resumo.value.total) return "grey-5";
  if (resumo.value.completo || resumo.value.pendentes === 0) return "green";
  if (percentualPendente.value < 30) return "amber";
  if (percentualPendente.value < 70) return "orange";
  return "red";
});

// SbKpiCard só tem variantes teal/green/amber/red/sky/indigo/slate — o laranja fica na barra.
const termometroVariante = computed(() => {
  const cor = termometroCor.value;
  if (cor === "orange") return "amber";
  if (cor === "grey-5") return "slate";
  return cor;
});

const termometroMensagem = computed(() => {
  if (!resumo.value.total) return "Nenhuma transação no período para classificar.";
  if (resumo.value.completo) return "Tudo classificado neste período. O DRE já consegue ler o extrato.";
  return `${resumo.value.pendentes} transação(ões) ainda sem classificação contábil.`;
});

function aplicarResumo(novo) {
  if (!novo) return;
  resumo.value = { ...resumo.value, ...novo };
}

// ────────────────────────────────────────── CATEGORIAS DO PLANO DE CONTAS
const categoriasPorCodigo = computed(() => {
  const mapa = {};
  categorias.value.forEach((c) => {
    mapa[c.codigo] = c;
  });
  return mapa;
});

function ajudaDaCategoria(codigo) {
  return categoriasPorCodigo.value[codigo]?.ajuda || "";
}

function origemInfo(origem) {
  return ORIGENS_CLASSIFICACAO[origem] || null;
}

/** "Saídas", "Entradas" ou "Entradas e saídas" — o tipo das linhas de um grupo. */
function descreverTipos(tipos) {
  const lista = tipos || [];
  if (lista.length > 1) return "Entradas e saídas";
  if (lista[0] === "D") return "Saídas";
  if (lista[0] === "C") return "Entradas";
  return "—";
}

function agruparCategoriasLocalmente(lista) {
  const ordem = [];
  const porGrupo = new Map();
  lista.forEach((cat) => {
    const nome = cat.grupo || "Outras";
    if (!porGrupo.has(nome)) {
      porGrupo.set(nome, []);
      ordem.push(nome);
    }
    porGrupo.get(nome).push(cat);
  });
  return ordem.map((nome) => ({ nome, categorias: porGrupo.get(nome) }));
}

async function loadCategorias() {
  loadingCategorias.value = true;
  try {
    const res = await FinanceiroService.getCategorias();
    const data = res.data || {};
    categorias.value = data.categorias || [];
    const grupos = (data.grupos || []).filter((g) => (g.categorias || []).length > 0);
    gruposCategorias.value = grupos.length ? grupos : agruparCategoriasLocalmente(categorias.value);
  } catch (err) {
    $q.notify({
      type: "negative",
      message: `Erro ao carregar o plano de contas: ${apiErrorMessage(err)}`,
    });
  } finally {
    loadingCategorias.value = false;
  }
}

// ────────────────────────────────────────── ESTADO: SINCRONIZAÇÃO
const showSincronizar = ref(false);
const sincronizando = ref(false);
const sincronizarAlvo = ref(null);
const resultadoSincronizacao = ref(null);
const sincronizarPeriodo = ref({
  data_inicio: toIsoDate(primeiroDiaMes),
  data_fim: toIsoDate(hoje),
});

// ────────────────────────────────────────── ESTADO: IMPORTAÇÃO DE ARQUIVO
const importacao = ref({ conta: null, formato: null, arquivo: null });
const importando = ref(false);
const resultadoImportacao = ref(null);

const contaOptions = computed(() =>
  conexoes.value.flatMap((conexao) =>
    (conexao.contas || []).map((conta) => ({
      label: `${conexao.banco_nome || conexao.banco} · ${conta.apelido || `Conta ${conta.numero}`} (Ag ${conta.agencia || "—"})`,
      value: conta.id,
      conexao,
      conta,
      banco: conexao.banco,
    })),
  ),
);

function bancoPorCodigo(codigo) {
  return bancos.value.find((b) => b.codigo === codigo) || null;
}

const formatosImportacao = computed(() => {
  const opt = contaOptions.value.find((o) => o.value === importacao.value.conta);
  if (!opt) return [];
  const banco = bancoPorCodigo(opt.banco);
  return banco?.formatos_arquivo || [];
});

const acceptImportacao = computed(() =>
  formatosImportacao.value.map((f) => `.${f}`).join(",") || ".ofx,.csv",
);

// ────────────────────────────────────────── CARREGAMENTO
async function loadBancos() {
  try {
    const res = await FinanceiroService.getBancos();
    bancos.value = res.data?.bancos || [];
  } catch (err) {
    $q.notify({ type: "negative", message: `Erro ao carregar bancos: ${apiErrorMessage(err)}` });
  }
}

async function loadConexoes() {
  loadingConexoes.value = true;
  try {
    const res = await FinanceiroService.getConexoes();
    conexoes.value = res.data?.conexoes || [];
    if (!extratoFilters.value.conta && contaOptions.value.length > 0) {
      extratoFilters.value.conta = contaOptions.value[0].value;
    }
  } catch (err) {
    $q.notify({ type: "negative", message: `Erro ao carregar conexões: ${apiErrorMessage(err)}` });
  } finally {
    loadingConexoes.value = false;
  }
}

async function loadCnpjs() {
  try {
    const res = await FiscalService.getCnpjs();
    const list = res.data?.results || res.data || [];
    cnpjOptions.value = opcoesDeEmpresa(list, { valor: "id" });
  } catch (err) {
    $q.notify({ type: "negative", message: `Erro ao carregar CNPJs: ${apiErrorMessage(err)}` });
  }
}

// ────────────────────────────────────────── AÇÕES: CONEXÕES
function openNovaConexao() {
  erroNovaConexao.value = "";
  novaConexao.value = {
    fiscal_account: cnpjOptions.value[0]?.value ?? null,
    banco: null,
    ambiente: "producao",
    credenciais: {},
    certificado: null,
    senha_certificado: "",
  };
  showNovaConexao.value = true;
}

function onBancoChange() {
  // Reinicia credenciais: os campos são específicos de cada banco.
  novaConexao.value.credenciais = {};
  novaConexao.value.certificado = null;
  novaConexao.value.senha_certificado = "";
}

async function salvarConexao() {
  erroNovaConexao.value = "";
  if (!novaConexao.value.fiscal_account) {
    erroNovaConexao.value = "Selecione o CNPJ fiscal.";
    return;
  }
  if (!novaConexao.value.banco) {
    erroNovaConexao.value = "Selecione o banco.";
    return;
  }
  const faltando = (bancoSelecionado.value?.campos_credencial || [])
    .filter((campo) => campo.obrigatorio && !String(novaConexao.value.credenciais[campo.nome] ?? "").length)
    .map((campo) => campo.rotulo || campo.nome);
  if (faltando.length) {
    erroNovaConexao.value = `Preencha: ${faltando.join(", ")}.`;
    return;
  }
  if (bancoSelecionado.value?.exige_certificado && !novaConexao.value.certificado) {
    erroNovaConexao.value = "Este banco exige certificado digital (.pfx/.p12).";
    return;
  }

  salvandoConexao.value = true;
  try {
    await FinanceiroService.criarConexao(novaConexao.value);
    $q.notify({ type: "positive", message: "Conexão criada com sucesso." });
    showNovaConexao.value = false;
    await loadConexoes();
  } catch (err) {
    erroNovaConexao.value = apiErrorMessage(err);
  } finally {
    salvandoConexao.value = false;
  }
}

async function testarConexao(conexao) {
  testandoId.value = conexao.id;
  try {
    const res = await FinanceiroService.testarConexao(conexao.id);
    const data = res.data || {};
    testes.value = {
      ...testes.value,
      [conexao.id]: {
        ok: !!data.ok,
        mensagem: data.mensagem || (data.ok ? "Conexão autenticada." : "Falha na autenticação."),
        saldo: data.saldo,
      },
    };
    if (!data.ok) {
      $q.notify({ type: "warning", message: data.mensagem || "Falha ao testar a conexão." });
    }
  } catch (err) {
    const mensagem = apiErrorMessage(err);
    testes.value = {
      ...testes.value,
      [conexao.id]: { ok: false, mensagem, saldo: null },
    };
    $q.notify({ type: "negative", message: `Erro ao testar conexão: ${mensagem}` });
  } finally {
    testandoId.value = null;
  }
}

function confirmarRemocao(conexao) {
  $q.dialog({
    title: "Remover conexão",
    message: `Remover a conexão com ${conexao.banco_nome || conexao.banco}? As contas e transações já importadas não são apagadas.`,
    cancel: { label: "Cancelar", flat: true, noCaps: true },
    ok: { label: "Remover", color: "negative", unelevated: true, noCaps: true },
    persistent: true,
  }).onOk(async () => {
    try {
      await FinanceiroService.removerConexao(conexao.id);
      $q.notify({ type: "positive", message: "Conexão removida." });
      await loadConexoes();
    } catch (err) {
      $q.notify({ type: "negative", message: `Erro ao remover conexão: ${apiErrorMessage(err)}` });
    }
  });
}

// ────────────────────────────────────────── AÇÕES: SINCRONIZAÇÃO
function openSincronizar(conexao, conta) {
  sincronizarAlvo.value = { conexao, conta };
  resultadoSincronizacao.value = null;
  sincronizarPeriodo.value = {
    data_inicio: toIsoDate(primeiroDiaMes),
    data_fim: toIsoDate(hoje),
  };
  showSincronizar.value = true;
}

async function sincronizar() {
  if (!sincronizarAlvo.value) return;
  sincronizando.value = true;
  resultadoSincronizacao.value = null;
  try {
    const res = await FinanceiroService.sincronizarConta(
      sincronizarAlvo.value.conta.id,
      sincronizarPeriodo.value,
    );
    const data = res.data || {};
    resultadoSincronizacao.value = {
      ok: !!data.ok,
      mensagem: data.ok
        ? `${data.importadas ?? 0} transação(ões) importada(s), ${data.duplicadas ?? 0} duplicada(s).`
        : data.mensagem || "A sincronização não foi concluída.",
    };
    if (data.ok) {
      $q.notify({ type: "positive", message: resultadoSincronizacao.value.mensagem });
      await loadConexoes();
    } else {
      $q.notify({ type: "warning", message: resultadoSincronizacao.value.mensagem });
    }
  } catch (err) {
    const mensagem = apiErrorMessage(err);
    resultadoSincronizacao.value = { ok: false, mensagem };
    $q.notify({ type: "negative", message: `Erro ao sincronizar: ${mensagem}` });
  } finally {
    sincronizando.value = false;
  }
}

function verExtrato(conexao, conta) {
  extratoFilters.value.conta = conta.id;
  activeTab.value = "extrato";
  loadTransacoes();
}

// ────────────────────────────────────────── AÇÕES: EXTRATO
/** Filtros do escopo (conta/período). O termômetro ignora o recorte de classificação. */
function paramsEscopo() {
  return {
    conta: extratoFilters.value.conta,
    data_inicio: extratoFilters.value.dataInicio || undefined,
    data_fim: extratoFilters.value.dataFim || undefined,
  };
}

/** Filtros da lista, incluindo o recorte de classificação. */
function paramsLista() {
  return {
    ...paramsEscopo(),
    classificacao: extratoFilters.value.classificacao || undefined,
  };
}

async function loadTransacoes() {
  if (!extratoFilters.value.conta) return;
  loadingTransacoes.value = true;
  selecionadas.value = [];
  try {
    const res = await FinanceiroService.getTransacoes(paramsLista());
    transacoes.value = (res.data?.transacoes || []).map((t) => ({
      ...t,
      // Guarda o valor vindo da API: só mandamos `classificacao` no PATCH quando ela muda,
      // senão marcar "conciliado" sozinho reescreveria a origem como "usuário".
      _classificacaoOriginal: t.classificacao || "",
    }));
    totais.value = res.data?.totais || { entradas: 0, saidas: 0, liquido: 0 };
    aplicarResumo(res.data?.resumo);
    await carregarGruposPendentes();
  } catch (err) {
    $q.notify({ type: "negative", message: `Erro ao carregar transações: ${apiErrorMessage(err)}` });
  } finally {
    loadingTransacoes.value = false;
  }
}

/** Busca só os grupos de pendentes por contraparte (a lista do diálogo e a contagem do card). */
async function carregarGruposPendentes() {
  if (!extratoFilters.value.conta) return;
  carregandoContrapartes.value = true;
  try {
    const res = await FinanceiroService.getPendentesPorContraparte(paramsEscopo());
    const data = res.data || {};
    gruposPendentes.value = data.grupos || [];
    contrapartesPendentes.value = data.contrapartes ?? gruposPendentes.value.length;
    aplicarResumo(data.resumo);
  } catch {
    // Informativo: sem ele a classificação continua funcionando.
  } finally {
    carregandoContrapartes.value = false;
  }
}

/** Recalcula só o termômetro, sem recarregar as linhas. */
async function carregarResumo() {
  if (!extratoFilters.value.conta) return;
  try {
    const res = await FinanceiroService.getResumoTransacoes(paramsEscopo());
    aplicarResumo(res.data);
    await carregarGruposPendentes();
  } catch {
    // O termômetro é informativo; uma falha aqui não deve interromper a classificação.
  }
}

/** Some com a linha quando ela deixa de casar com o filtro "só pendentes"/"só classificadas". */
function removerSeSaiuDoFiltro(row) {
  const filtro = extratoFilters.value.classificacao;
  const classificado = !!row.classificacao;
  if (
    (filtro === "nao_classificadas" && classificado) ||
    (filtro === "classificadas" && !classificado)
  ) {
    transacoes.value = transacoes.value.filter((t) => t.id !== row.id);
  }
}

async function saveTransacao(row) {
  if (!row?.id) return;
  const proximo = new Set(savingTransacoes.value);
  proximo.add(row.id);
  savingTransacoes.value = proximo;
  try {
    const classificacao = row.classificacao || "";
    const payload = { conciliado: !!row.conciliado };
    if (classificacao !== (row._classificacaoOriginal || "")) {
      payload.classificacao = classificacao;
    }
    const res = await FinanceiroService.atualizarTransacao(row.id, payload);
    const atual = res.data || {};
    Object.assign(row, {
      classificacao: atual.classificacao ?? classificacao,
      classificacao_rotulo: atual.classificacao_rotulo || "",
      classificacao_grupo: atual.classificacao_grupo || "",
      origem_classificacao: atual.origem_classificacao || "",
      mc: atual.mc,
      fora_do_resultado: atual.fora_do_resultado,
      conciliado: atual.conciliado ?? row.conciliado,
      _classificacaoOriginal: atual.classificacao ?? classificacao,
    });
    removerSeSaiuDoFiltro(row);
    await carregarResumo();
  } catch (err) {
    $q.notify({ type: "negative", message: `Erro ao salvar transação: ${apiErrorMessage(err)}` });
  } finally {
    const fim = new Set(savingTransacoes.value);
    fim.delete(row.id);
    savingTransacoes.value = fim;
  }
}

/** Atalho do termômetro: abre a lista só com o que falta classificar. */
function verPendentes() {
  extratoFilters.value.classificacao = "nao_classificadas";
  loadTransacoes();
}

// ────────────────────────────────────────── AÇÕES: PENDENTES POR CONTRAPARTE
function abrirContrapartes() {
  categoriasContraparte.value = {};
  showContrapartes.value = true;
  carregarGruposPendentes();
}

/** Classifica TODAS as linhas pendentes de uma contraparte com uma escolha só. */
async function classificarGrupo(grupo) {
  const codigo = categoriasContraparte.value[grupo.contraparte_chave];
  if (!codigo) return;
  classificandoGrupo.value = grupo.contraparte_chave;
  try {
    const res = await FinanceiroService.classificarLote(grupo.ids, codigo);
    const data = res.data || {};
    aplicarResumo(data.resumo);
    $q.notify({
      type: "positive",
      message:
        `${data.atualizadas ?? 0} lançamento(s) de ` +
        `${grupo.contraparte_nome || grupo.contraparte_chave} classificados.`,
    });
    categoriasContraparte.value = {
      ...categoriasContraparte.value,
      [grupo.contraparte_chave]: null,
    };
    await loadTransacoes();
  } catch (err) {
    $q.notify({
      type: "negative",
      message: `Erro ao classificar a contraparte: ${apiErrorMessage(err)}`,
    });
  } finally {
    classificandoGrupo.value = null;
  }
}

/** Aplica uma categoria a todas as linhas marcadas na tabela. */
async function classificarSelecionadas() {
  if (!selecionadas.value.length || !classificacaoLote.value) return;
  classificandoLote.value = true;
  try {
    const res = await FinanceiroService.classificarLote(
      selecionadas.value.map((row) => row.id),
      classificacaoLote.value,
    );
    const data = res.data || {};
    aplicarResumo(data.resumo);
    $q.notify({
      type: "positive",
      message: `${data.atualizadas ?? 0} transação(ões) classificada(s) de uma vez.`,
    });
    selecionadas.value = [];
    classificacaoLote.value = null;
    await loadTransacoes();
  } catch (err) {
    $q.notify({
      type: "negative",
      message: `Erro ao classificar selecionadas: ${apiErrorMessage(err)}`,
    });
  } finally {
    classificandoLote.value = false;
  }
}

/** Pergunta ao dono se a reclassificação pode mexer no que ele classificou à mão. */
function confirmarReclassificacao() {
  $q.dialog({
    title: "Reclassificar automaticamente",
    message:
      "O sistema vai tentar classificar o que ainda está pendente usando o título do banco, " +
      "despesas iguais do mesmo CNPJ já classificadas e contrapartes reconhecidas. " +
      "O que você classificou à mão pode ser preservado ou refeito:",
    options: {
      type: "radio",
      model: "preservar",
      items: [
        {
          label: "Preservar o que eu classifiquei à mão (recomendado)",
          value: "preservar",
          color: "teal-8",
        },
        {
          label: "Refazer tudo, inclusive o que eu classifiquei à mão",
          value: "refazer",
          color: "amber-9",
        },
      ],
    },
    cancel: { label: "Cancelar", flat: true, noCaps: true },
    ok: { label: "Reclassificar", color: "teal-8", unelevated: true, noCaps: true },
    persistent: true,
  }).onOk((escolha) => reclassificarAutomaticamente(escolha === "refazer"));
}

async function reclassificarAutomaticamente(incluirUsuario) {
  reclassificando.value = true;
  try {
    const res = await FinanceiroService.reclassificar(incluirUsuario);
    const data = res.data || {};
    aplicarResumo(data.resumo);
    $q.notify({
      type: "positive",
      message:
        `Reclassificação concluída: ${data.classificadas ?? 0} de ${data.avaliadas ?? 0} ` +
        `transação(ões) classificada(s). ${data.pendentes ?? 0} continuam pendentes.`,
      timeout: 6000,
    });
    await loadTransacoes();
  } catch (err) {
    $q.notify({
      type: "negative",
      message: `Erro ao reclassificar: ${apiErrorMessage(err)}`,
    });
  } finally {
    reclassificando.value = false;
  }
}

// ────────────────────────────────────────── AÇÕES: IMPORTAÇÃO DE ARQUIVO
function onImportContaChange() {
  importacao.value.arquivo = null;
  const formatos = formatosImportacao.value;
  importacao.value.formato = formatos.length ? formatos[0] : null;
}

async function importarArquivo() {
  if (!importacao.value.conta || !importacao.value.arquivo || !importacao.value.formato) return;
  importando.value = true;
  resultadoImportacao.value = null;
  try {
    const res = await FinanceiroService.importarArquivo(
      importacao.value.conta,
      importacao.value.arquivo,
      importacao.value.formato,
    );
    const data = res.data || {};
    resultadoImportacao.value = {
      ok: !!data.ok,
      importadas: data.importadas ?? 0,
      duplicadas: data.duplicadas ?? 0,
      periodo: data.periodo || "",
      mensagem: data.ok ? "Arquivo importado com sucesso." : data.mensagem || "Falha na importação.",
    };
    if (data.ok) {
      $q.notify({
        type: "positive",
        message: `${data.importadas ?? 0} transação(ões) importada(s).`,
      });
      importacao.value.arquivo = null;
    } else {
      $q.notify({ type: "warning", message: resultadoImportacao.value.mensagem });
    }
  } catch (err) {
    const mensagem = apiErrorMessage(err);
    resultadoImportacao.value = { ok: false, importadas: 0, duplicadas: 0, periodo: "", mensagem };
    $q.notify({ type: "negative", message: `Erro ao importar arquivo: ${mensagem}` });
  } finally {
    importando.value = false;
  }
}

function abrirExtratoDaImportacao() {
  extratoFilters.value.conta = importacao.value.conta;
  activeTab.value = "extrato";
  loadTransacoes();
}

// ────────────────────────────────────────── GERAL
function refreshActiveTab() {
  if (activeTab.value === "conexoes") loadConexoes();
  else if (activeTab.value === "extrato") loadTransacoes();
  else if (activeTab.value === "importar") loadConexoes();
}

function apiErrorMessage(err) {
  const data = err?.response?.data;
  if (typeof data === "string" && data) return data;
  return (
    data?.mensagem ||
    data?.detail ||
    data?.error ||
    err?.message ||
    "Erro inesperado."
  );
}

function toIsoDate(date) {
  const d = new Date(date);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function formatCurrency(val) {
  const num = parseFloat(val) || 0;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "Nunca sincronizada";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCnpj(cnpj) {
  const digits = String(cnpj || "").replace(/\D/g, "");
  if (digits.length !== 14) return cnpj || "—";
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

onMounted(async () => {
  await Promise.all([loadBancos(), loadConexoes(), loadCnpjs(), loadCategorias()]);
});
</script>

<style lang="scss" scoped>
.bancos-page {
  background: #f8fafc;
  min-height: 100%;
}

.bancos-container {
  max-width: 1280px;
  margin: 0 auto;
}

.tabs-wrapper {
  border-bottom: 1px solid #e2e8f0;
}

.bancos-tabs {
  :deep(.q-tab) {
    min-height: 44px;
  }
}

.border-bottom {
  border-bottom: 1px solid #f1f5f9;
}

.border-top {
  border-top: 1px solid #f1f5f9;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.termometro-barra {
  width: 100%;
}

.classificacao-select {
  min-width: 220px;
}

.origem-badge {
  flex-shrink: 0;
}

.contrapartes-corpo {
  max-height: 62vh;
  overflow-y: auto;
}

.contraparte-item {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}
</style>
