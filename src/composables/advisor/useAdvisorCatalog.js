/**
 * Estado da superfície "Anúncios" (PROMO-IA-22 · F2).
 *
 * O backend pagina, filtra e ordena (`overview`): aqui só vive o estado da tela + a tradução dos
 * nomes do dono para os parâmetros da API. Nenhum cálculo de negócio é feito aqui.
 *
 * Regras que a tela precisa respeitar:
 * - a busca não dispara a cada tecla (debounce) — a lista é grande (753 anúncios em produção);
 * - respostas fora de ordem são descartadas (`requestSeq`), senão a tabela mostra o filtro anterior;
 * - a paginação preserva filtros e ordem ao trocar de página.
 */
import { computed, reactive, ref, watch } from 'vue';

import AdvisorService from 'src/services/AdvisorService';
import { decisionSummary, situationOf, suggestionOf } from 'src/utils/advisorDecision';

const PRESETS = {
  assistente: 'Assistente',
  financeiro: 'Financeiro',
  completo: 'Completo',
};

export function useAdvisorCatalog() {
  const linhas = ref([]);
  const total = ref(0);
  const resumo = ref({});
  const contas = ref([]);
  const retrato = ref({});
  const carregando = ref(false);
  const erro = ref('');
  const sequencia = ref(0);

  const filtros = reactive({
    q: '',
    conta: null,
    status: null,
    saude: null,
    soAbaixoDoPiso: false,
    soComPromocao: false,
  });

  const ordenacao = ref('-sales');
  const pagina = ref(1);
  const porPagina = ref(40);
  const preset = ref('assistente');
  const expandido = ref(null);

  const presets = computed(() => Object.entries(PRESETS).map(([value, label]) => ({ value, label })));

  function params() {
    const p = {
      page: pagina.value,
      page_size: porPagina.value,
      sort: ordenacao.value,
      preset: preset.value,
    };
    if (filtros.q) p.q = filtros.q;
    if (filtros.conta) p.account_id = filtros.conta;
    if (filtros.status) p.status = filtros.status;
    if (filtros.saude) p.health = filtros.saude;
    if (filtros.soAbaixoDoPiso) p.below_floor = 'true';
    if (filtros.soComPromocao) p.has_promo = 'true';
    return p;
  }

  async function carregar() {
    const meu = sequencia.value + 1;
    sequencia.value = meu;
    carregando.value = true;
    erro.value = '';
    try {
      const { data } = await AdvisorService.getCatalog(params());
      if (meu !== sequencia.value) return;      // resposta antiga: o filtro já mudou
      linhas.value = data.results || [];
      total.value = Number(data.total || 0);
      resumo.value = data.summary || {};
      contas.value = data.accounts || [];
      retrato.value = data.snapshot || {};
    } catch (err) {
      if (meu !== sequencia.value) return;
      erro.value = err?.response?.data?.detail || 'Não foi possível carregar os anúncios.';
    } finally {
      if (meu === sequencia.value) carregando.value = false;
    }
  }

  /**
   * Agenda UMA busca (o dono digita rápido: uma chamada por tecla sobrecarregaria a lista).
   *
   * `debounce` também funciona como trava de reentrada: mudar um filtro zera a página, e sem isso
   * o `watch(pagina)` disparava uma segunda busca idêntica além da agendada.
   */
  let debounce = null;
  function agendar(atraso = 300) {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => { debounce = null; carregar(); }, atraso);
  }

  // Cada mudança de filtro volta para a página 1 (senão a página 3 pode não existir).
  watch(() => ({ ...filtros }), () => {
    pagina.value = 1;
    agendar();
  }, { deep: true });

  watch([ordenacao, porPagina], () => {
    pagina.value = 1;
    agendar(0);
  });

  watch(pagina, () => { if (!debounce) carregar(); });

  const contasOpcoes = computed(() => contas.value.map((c) => ({
    label: c.account_nickname || c.account_id,
    value: c.account_id,
  })));

  const saudeOpcoes = [
    { label: 'Parado', value: 'parado' },
    { label: 'Fraco', value: 'fraco' },
    { label: 'Médio', value: 'medio' },
    { label: 'Alto', value: 'alto' },
  ];

  const statusOpcoes = [
    { label: 'Ativos', value: 'active' },
    { label: 'Pausados', value: 'paused' },
    { label: 'Fechados', value: 'closed' },
  ];

  /** Quantos filtros estão fora do padrão — a tela avisa para o dono não achar que sumiu anúncio. */
  const filtrosAtivos = computed(() => {
    let n = 0;
    for (const valor of Object.values(filtros)) if (valor && valor !== '') n += 1;
    return n;
  });

  const temFiltroDeEscopo = computed(() => Boolean(
    filtros.conta || filtros.status || filtros.saude || filtros.soAbaixoDoPiso || filtros.soComPromocao,
  ));

  const decisao = computed(() => decisionSummary(linhas.value));
  const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / porPagina.value)));
  const primeira = computed(() => (total.value ? (pagina.value - 1) * porPagina.value + 1 : 0));
  const ultima = computed(() => Math.min(pagina.value * porPagina.value, total.value));

  function limparFiltros() {
    filtros.q = '';
    filtros.conta = null;
    filtros.status = null;
    filtros.saude = null;
    filtros.soAbaixoDoPiso = false;
    filtros.soComPromocao = false;
  }

  function ordenarPor(coluna) {
    if (!coluna?.sortable) return;
    const chave = coluna.sortKey || coluna.key;
    ordenacao.value = ordenacao.value === chave ? `-${chave}` : chave;
  }

  function alternarDetalhe(linha) {
    expandido.value = expandido.value === linha.item_id ? null : linha.item_id;
  }

  return {
    linhas, total, resumo, contas, retrato, carregando, erro,
    filtros, ordenacao, pagina, porPagina, preset, presets, expandido,
    contasOpcoes, saudeOpcoes, statusOpcoes,
    filtrosAtivos, temFiltroDeEscopo, decisao, totalPaginas, primeira, ultima,
    carregar, limparFiltros, ordenarPor, alternarDetalhe,
    situationOf, suggestionOf,
  };
}
