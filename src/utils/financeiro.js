// As abas do Módulo Financeiro/Contábil (ticket FIN-14).
//
// A lista mora aqui — e não dentro do template — para que a aba seja **dado testável**: o
// id que aparece na URL, o rótulo, a onda do plano que a preenche e o endpoint do backend
// que vai alimentá-la. Nesta primeira onda só a aba de extratos tem tela; as outras dizem
// qual onda as preenche, em vez de mostrar número inventado.
//
// A ordem é a da leitura do negócio: primeiro o resultado (visão geral e marketplace),
// depois os demonstrativos, depois os tributos e a conciliação, e os extratos por último.

export const ABAS_FINANCEIRO = [
  {
    id: 'visao-geral',
    label: 'Visão geral',
    icone: 'insights',
    onda: 'FIN-14b',
    endpoint: '/api/financeiro/contabil/resumo/',
    descricao: 'Margem de contribuição e o resumo dos três demonstrativos.',
    disponivel: true,
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icone: 'storefront',
    onda: 'FIN-14b',
    endpoint: '/api/financeiro/contabil/resumo/',
    descricao: 'A DRE-Aproximada por canal, corrigida (absorve a aba antiga do dashboard).',
    disponivel: true,
  },
  {
    id: 'dre',
    label: 'DRE',
    icone: 'stacked_line_chart',
    onda: 'FIN-14c',
    endpoint: '/api/financeiro/contabil/dre/',
    descricao: 'Cascata contábil do período, com a margem de contribuição explícita.',
    disponivel: true,
  },
  {
    id: 'balanco',
    label: 'Balanço',
    icone: 'account_balance',
    onda: 'FIN-14c',
    endpoint: '/api/financeiro/contabil/balanco/',
    descricao: 'Ativo = Passivo + PL com o resíduo explícito.',
    disponivel: true,
  },
  {
    id: 'dfc',
    label: 'DFC',
    icone: 'waterfall_chart',
    onda: 'FIN-14d',
    endpoint: '/api/financeiro/contabil/dfc/',
    descricao: 'Fluxo de caixa indireto e direto lado a lado.',
    disponivel: true,
  },
  {
    id: 'tributos',
    label: 'Tributos',
    icone: 'receipt_long',
    onda: 'FIN-14d',
    endpoint: '/api/financeiro/contabil/tributos/',
    descricao: 'Apuração × contador, com a diferença classificada.',
    disponivel: true,
  },
  {
    id: 'cenarios',
    label: 'Cenários e termômetros',
    icone: 'thermostat',
    onda: 'FIN-14d',
    endpoint: '/api/financeiro/contabil/cenarios/',
    descricao: 'Simples × Presumido × Real, alíquota efetiva e cenários de 2027.',
    disponivel: true,
  },
  {
    id: 'conciliacao',
    label: 'Conciliação',
    icone: 'compare_arrows',
    onda: 'FIN-14e',
    endpoint: '/api/financeiro/contabil/conciliacao/',
    descricao: 'O que o sistema apura × o demonstrativo do contador.',
    disponivel: true,
  },
  {
    id: 'extratos',
    label: 'Bancos e extratos',
    icone: 'account_balance_wallet',
    onda: 'FIN-14a',
    endpoint: '/api/financeiro/bancos/',
    descricao: 'Contas, sincronização e classificação das linhas.',
    disponivel: true,
  },
];

export const ABA_PADRAO = 'visao-geral';

/** A aba existe? Devolve o id normalizado ou `null` — a tela decide o que fazer com o inválido. */
export function abaValida(id) {
  const alvo = String(id ?? '').trim().toLowerCase();
  return ABAS_FINANCEIRO.some((aba) => aba.id === alvo) ? alvo : null;
}

/** As abas que já têm tela nesta onda (as demais mostram o que as preenche). */
export function abasDisponiveis() {
  return ABAS_FINANCEIRO.filter((aba) => aba.disponivel).map((aba) => aba.id);
}

export function abaPorId(id) {
  const alvo = abaValida(id);
  return alvo ? ABAS_FINANCEIRO.find((aba) => aba.id === alvo) : null;
}
