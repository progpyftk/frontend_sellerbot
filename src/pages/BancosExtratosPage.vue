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
          <ExtratosConexoesTab
            :loading-conexoes="loadingConexoes"
            :conexoes="conexoes"
            :testes="testes"
            :testando-id="testandoId"
            :conta-columns="contaColumns"
            @nova="openNovaConexao"
            @testar="testarConexao"
            @remover="confirmarRemocao"
            @sincronizar="openSincronizar"
            @ver-extrato="verExtrato"
          />
        </q-tab-panel>

        <!-- ────────────────────────────────────────── ABA 2: EXTRATO -->
        <q-tab-panel name="extrato" class="q-pa-none">
          <ExtratosExtratoTab :ctx="ctxExtrato" />
        </q-tab-panel>

        <!-- ────────────────────────────────────────── ABA 3: IMPORTAR ARQUIVO -->
        <q-tab-panel name="importar" class="q-pa-none">
          <ExtratosImportarTab
            :importacao="importacao"
            :conta-options="contaOptions"
            :formatos-importacao="formatosImportacao"
            :accept-importacao="acceptImportacao"
            :importando="importando"
            :resultado-importacao="resultadoImportacao"
            @conta-change="onImportContaChange"
            @importar="importarArquivo"
            @abrir-extrato="abrirExtratoDaImportacao"
          />
        </q-tab-panel>

      </q-tab-panels>
      <ExtratosDialogos :ctx="ctxDialogos" />

    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from "vue";
import { useQuasar } from "quasar";
import SbPageHeader from "src/components/common/SbPageHeader.vue";
import SbCard from "src/components/common/SbCard.vue";
import SbKpiCard from "src/components/common/SbKpiCard.vue";
import SbEmptyState from "src/components/common/SbEmptyState.vue";
import SbCategoriaSelect from "src/components/common/SbCategoriaSelect.vue";
import SbSeletorEmpresa from "src/components/common/SbSeletorEmpresa.vue";
import ExtratosImportarTab from "src/components/financeiro/extratos/ExtratosImportarTab.vue";
import { opcoesDeEmpresa } from "src/utils/seletores";
import { formatCnpj, formatCurrency, formatDate, formatDateTime } from "src/utils/formato";
import ExtratosConexoesTab from "src/components/financeiro/extratos/ExtratosConexoesTab.vue";
import ExtratosExtratoTab from "src/components/financeiro/extratos/ExtratosExtratoTab.vue";
import ExtratosDialogos from "src/components/financeiro/extratos/ExtratosDialogos.vue";
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
  { chave: "apelido", rotulo: "Conta", alinhamento: "left" },
  { chave: "saldo", rotulo: "Saldo", alinhamento: "right", tipo: "moeda" },
  { chave: "actions", rotulo: "Ações", alinhamento: "center", largura: "230px" },
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

// Colunas da tabela minimalista (FINT-6). A `q-table` usava `name`/`label`/`align`/`sortable`;
// aqui o `tipo` decide a **ordenação** (data, moeda ou texto) — ordenar "10" antes de "9" era o
// comportamento antigo da coluna Valor, e é o que o `tipo: 'moeda'` corrige.
const transacaoColumns = [
  { chave: "data", rotulo: "Data", alinhamento: "left", tipo: "data", ordenavel: true, largura: "108px" },
  { chave: "descricao", rotulo: "Descrição", alinhamento: "left", tipo: "texto", ordenavel: true },
  { chave: "valor", rotulo: "Valor", alinhamento: "right", tipo: "moeda", ordenavel: true, largura: "140px" },
  { chave: "classificacao", rotulo: "Classificação", alinhamento: "left" },
  { chave: "conciliado", rotulo: "Conciliado", alinhamento: "center", tipo: "selo", largura: "112px" },
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

// Objeto que a aba `extrato` recebe (FIN-23): refs desembrulham no acesso, então o filho lê e escreve
// no estado do page sem repasse de 29 props.
const ctxExtrato = reactive({
  abrirContrapartes,
  ajudaDaCategoria,
  classificacaoLote,
  classificandoLote,
  classificarSelecionadas,
  confirmarReclassificacao,
  contaOptions,
  contrapartesPendentes,
  extratoFilters,
  filtroClassificacaoOptions,
  gruposCategorias,
  loadTransacoes,
  loadingCategorias,
  loadingTransacoes,
  origemInfo,
  percentualPendente,
  percentualPendenteTexto,
  reclassificando,
  resumo,
  saveTransacao,
  savingTransacoes,
  selecionadas,
  termometroCor,
  termometroMensagem,
  termometroVariante,
  totais,
  transacaoColumns,
  transacoes,
  verPendentes,
})

// Diálogos (FIN-23): mesmo desenho do `ctxExtrato` — o page segue dono do fluxo.
const ctxDialogos = reactive({
  ambienteOptions,
  bancoOptions,
  bancoSelecionado,
  carregandoContrapartes,
  categoriasContraparte,
  classificandoGrupo,
  classificarGrupo,
  cnpjOptions,
  descreverTipos,
  erroNovaConexao,
  gruposCategorias,
  gruposPendentes,
  loadingCategorias,
  novaConexao,
  onBancoChange,
  resultadoSincronizacao,
  salvandoConexao,
  salvarConexao,
  showContrapartes,
  showNovaConexao,
  showSincronizar,
  sincronizando,
  sincronizar,
  sincronizarAlvo,
  sincronizarPeriodo,
})

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
