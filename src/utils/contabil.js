// Regras de leitura do Módulo Financeiro/Contábil no frontend (ticket FIN-14).
//
// A tela **não recalcula nada**: o backend devolve os subtotais apurados e a conferência de cada
// demonstrativo. O que é regra — a **ordem da cascata do DRE** e quais números a visão geral mostra —
// mora aqui, em função pura, para ser testável no ambiente `node` do vitest.

/**
 * A cascata do DRE na ordem do contador. A ordem é a leitura do plano de contas do backend
 * (`app_financeiro/services/dre.py`), e a margem de contribuição é **linha de destaque**, como o dono
 * pediu: ela não é substituída por nada.
 */
export const CASCATA_DRE = [
  { chave: 'receita_bruta', rotulo: 'Receita bruta', tipo: 'entrada' },
  { chave: 'deducoes', rotulo: '(−) Deduções da receita', tipo: 'saida' },
  {
    chave: 'impostos_sobre_a_receita',
    rotulo: '(−) Impostos sobre a receita (DAS)',
    tipo: 'saida',
    detalhe: true,
  },
  { chave: 'receita_liquida', rotulo: '= Receita líquida', tipo: 'subtotal' },
  { chave: 'cmv', rotulo: '(−) CMV', tipo: 'saida' },
  { chave: 'resultado_bruto', rotulo: '= Resultado bruto', tipo: 'subtotal' },
  {
    chave: 'custos_variaveis',
    rotulo: '(−) Custos variáveis (taxas, frete, embalagem, Ads…)',
    tipo: 'saida',
  },
  { chave: 'margem_contribuicao', rotulo: '= Margem de contribuição', tipo: 'destaque' },
  { chave: 'despesas_operacionais', rotulo: '(−) Despesas operacionais', tipo: 'saida' },
  { chave: 'despesas_financeiras', rotulo: '(−) Despesas financeiras', tipo: 'saida' },
  { chave: 'receitas_financeiras', rotulo: '(+) Receitas financeiras', tipo: 'entrada' },
  { chave: 'outras_receitas_e_despesas', rotulo: '(+/-) Outras receitas e despesas', tipo: 'entrada' },
  { chave: 'depreciacao_e_amortizacao', rotulo: '(−) Depreciação e amortização', tipo: 'saida' },
  { chave: 'resultado_antes_do_imposto', rotulo: '= Resultado antes do imposto', tipo: 'subtotal' },
  { chave: 'imposto_sobre_o_lucro', rotulo: '(−) IRPJ/CSLL', tipo: 'saida' },
  { chave: 'resultado_liquido', rotulo: '= Resultado líquido', tipo: 'destaque' },
  { chave: 'ebitda', rotulo: 'EBITDA', tipo: 'subtotal' },
];

/** A cascata com o valor de cada linha (ou `null` quando o backend não devolveu a chave). */
export function linhasDaCascata(subtotais = {}) {
  return CASCATA_DRE.map((linha) => ({
    ...linha,
    valor: subtotais?.[linha.chave] ?? null,
  }));
}

/**
 * Os números da visão geral — cada um vem do seu demonstrativo, e a **conferência viaja junto**:
 * DRE (`confere`), Balanço (`equilibra`) e DFC (`confere`). A tela mostra o selo, não presume.
 */
export function numerosDaVisaoGeral(empresa = {}) {
  const subtotais = empresa?.dre?.subtotais || {};
  return {
    receita_bruta: subtotais.receita_bruta ?? null,
    impostos_sobre_a_receita: subtotais.impostos_sobre_a_receita ?? null,
    receita_liquida: subtotais.receita_liquida ?? null,
    margem_contribuicao: subtotais.margem_contribuicao ?? null,
    margem_contribuicao_pct: empresa?.dre?.margem_contribuicao_pct ?? null,
    resultado_liquido: subtotais.resultado_liquido ?? null,
    ebitda: subtotais.ebitda ?? null,
    ebitda_pct: empresa?.dre?.ebitda_pct ?? null,
    ativo: empresa?.balanco?.ativo?.total ?? null,
    variacao_do_caixa: empresa?.dfc?.variacao_do_caixa ?? null,
    dre_confere: empresa?.dre?.confere ?? null,
    balanco_equilibra: empresa?.balanco?.equilibra ?? null,
    dfc_confere: empresa?.dfc?.confere ?? null,
  };
}

/** `true` quando algum dos demonstrativos não fecha — a tela acende o aviso uma vez só. */
export function temInconsistencia(empresa = {}) {
  const numeros = numerosDaVisaoGeral(empresa);
  return (
    numeros.dre_confere === false ||
    numeros.balanco_equilibra === false ||
    numeros.dfc_confere === false
  );
}
