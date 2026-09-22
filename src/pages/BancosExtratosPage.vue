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
          </SbCard>

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

          <SbCard>
            <q-table
              :rows="transacoes"
              :columns="transacaoColumns"
              row-key="id"
              :loading="loadingTransacoes"
              flat
              :pagination="{ rowsPerPage: 25 }"
              :no-data-label="'Nenhuma transação no período. Sincronize a conta ou importe um arquivo OFX/CSV.'"
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
                <q-td :props="props">
                  <q-input
                    v-model="props.row.classificacao"
                    dense
                    borderless
                    placeholder="Sem classificação"
                    :loading="savingTransacoes.has(props.row.id)"
                    @blur="saveTransacao(props.row)"
                    @keyup.enter="saveTransacao(props.row)"
                  />
                </q-td>
              </template>

              <template #body-cell-conciliado="props">
                <q-td :props="props" class="text-center">
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
                <q-select
                  v-model="novaConexao.fiscal_account"
                  :options="cnpjOptions"
                  emit-value
                  map-options
                  dense
                  outlined
                  label="CNPJ fiscal *"
                  bg-color="white"
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
});

const transacaoColumns = [
  { name: "data", label: "Data", align: "left", sortable: true },
  { name: "descricao", label: "Descrição", align: "left" },
  { name: "valor", label: "Valor", align: "right", sortable: true },
  { name: "classificacao", label: "Classificação", align: "left" },
  { name: "conciliado", label: "Conciliado", align: "center" },
];

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
    cnpjOptions.value = list.map((c) => ({
      label: `${formatCnpj(c.cnpj)} — ${c.razao_social || "CNPJ Fiscal"}`,
      value: c.id,
    }));
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
async function loadTransacoes() {
  if (!extratoFilters.value.conta) return;
  loadingTransacoes.value = true;
  try {
    const res = await FinanceiroService.getTransacoes({
      conta: extratoFilters.value.conta,
      data_inicio: extratoFilters.value.dataInicio || undefined,
      data_fim: extratoFilters.value.dataFim || undefined,
    });
    transacoes.value = (res.data?.transacoes || []).map((t) => ({ ...t }));
    totais.value = res.data?.totais || { entradas: 0, saidas: 0, liquido: 0 };
  } catch (err) {
    $q.notify({ type: "negative", message: `Erro ao carregar transações: ${apiErrorMessage(err)}` });
  } finally {
    loadingTransacoes.value = false;
  }
}

async function saveTransacao(row) {
  if (!row?.id) return;
  const proximo = new Set(savingTransacoes.value);
  proximo.add(row.id);
  savingTransacoes.value = proximo;
  try {
    await FinanceiroService.atualizarTransacao(row.id, {
      classificacao: row.classificacao || "",
      conciliado: !!row.conciliado,
    });
  } catch (err) {
    $q.notify({ type: "negative", message: `Erro ao salvar transação: ${apiErrorMessage(err)}` });
  } finally {
    const fim = new Set(savingTransacoes.value);
    fim.delete(row.id);
    savingTransacoes.value = fim;
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
  await Promise.all([loadBancos(), loadConexoes(), loadCnpjs()]);
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
</style>
