// Regras de leitura do Módulo Financeiro/Contábil no frontend (ticket FIN-14).
//
// A tela **não recalcula nada**: o backend devolve os subtotais apurados e a conferência de cada
// demonstrativo. O que é regra — a **ordem da cascata do DRE** e quais números a visão geral mostra —
// mora aqui, em função pura, para ser testável no ambiente `node` do vitest.

/**
 * A cascata do DRE na ordem do contador. A ordem é a leitura do plano de contas do backend
 * (`app_financeiro/services/dre.py`), e a margem de contribuição é **linha de destaque**, como o dono
 * pediu: ela não é substituída por nada.
 *
 * **A ordem não é cosmética (correção do `DRE-22`, 25/09):**
 *
 * - o **resultado operacional (EBIT)** fecha o operacional e o **EBITDA** (`EBIT + depreciação e
 *   amortização`) vem logo abaixo, **antes** do resultado financeiro;
 * - as **outras receitas e despesas** entram no operacional, portanto **acima** do EBITDA (decisão do
 *   dono em 25/09);
 * - o **IRPJ/CSLL** só aparece **depois** do EBITDA e do resultado financeiro, e o
 *   **resultado líquido do período** é a **última linha**;
 * - a **depreciação/amortização não é linha da cascata**: ela já está dentro das despesas operacionais
 *   e o EBITDA a soma de volta — mostrá-la como dedução própria fazia a cascata **não fechar** na tela.
 *   O valor somado de volta aparece na observação da própria linha do EBITDA.
 */
export const CASCATA_DRE = [
  { chave: 'receita_bruta', rotulo: 'Receita bruta', tipo: 'entrada' },
  { chave: 'deducoes', rotulo: '(−) Deduções da receita', tipo: 'saida' },
  {
    chave: 'impostos_sobre_a_receita',
    rotulo: '(−) Impostos sobre vendas (DAS, ICMS, PIS, COFINS…)',
    tipo: 'saida',
    detalhe: true,
  },
  { chave: 'receita_liquida', rotulo: '= Receita líquida', tipo: 'subtotal' },
  { chave: 'cmv', rotulo: '(−) CMV', tipo: 'saida' },
  { chave: 'resultado_bruto', rotulo: '= Lucro bruto', tipo: 'subtotal' },
  {
    chave: 'custos_variaveis',
    rotulo: '(−) Custos variáveis (taxas, frete, embalagem, Ads…)',
    tipo: 'saida',
  },
  { chave: 'margem_contribuicao', rotulo: '= Margem de contribuição', tipo: 'destaque' },
  {
    chave: 'despesas_operacionais',
    rotulo: '(−) Despesas operacionais (inclui depreciação e amortização)',
    tipo: 'saida',
  },
  { chave: 'outras_receitas_e_despesas', rotulo: '(+/-) Outras receitas e despesas', tipo: 'entrada' },
  { chave: 'resultado_operacional', rotulo: '= Resultado operacional (EBIT)', tipo: 'subtotal' },
  {
    chave: 'ebitda',
    rotulo: 'EBITDA (EBIT + depreciação e amortização)',
    tipo: 'subtotal',
    com_depreciacao: true,
  },
  { chave: 'despesas_financeiras', rotulo: '(−) Despesas financeiras', tipo: 'saida' },
  { chave: 'receitas_financeiras', rotulo: '(+) Receitas financeiras', tipo: 'entrada' },
  {
    chave: 'resultado_antes_do_imposto',
    rotulo: '= Resultado antes do IRPJ/CSLL',
    tipo: 'subtotal',
  },
  { chave: 'imposto_sobre_o_lucro', rotulo: '(−) IRPJ e CSLL', tipo: 'saida' },
  { chave: 'resultado_liquido', rotulo: '= Resultado líquido do período', tipo: 'destaque' },
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

/** Os grupos do Balanço na ordem de leitura, com os subtotais de cada um. */
export const GRUPOS_BALANCO = [
  {
    chave: 'ativo',
    rotulo: 'Ativo',
    subtotais: [
      ['circulante', 'Circulante'],
      ['nao_circulante', 'Não circulante'],
    ],
  },
  {
    chave: 'passivo',
    rotulo: 'Passivo',
    subtotais: [
      ['circulante', 'Circulante'],
      ['nao_circulante', 'Não circulante'],
    ],
  },
  { chave: 'patrimonio_liquido', rotulo: 'Patrimônio líquido', subtotais: [] },
];

/** As atividades do DFC, com o rótulo de negócio de cada uma. */
export const ROTULOS_ATIVIDADE = {
  operacional: 'Operacional',
  investimento: 'Investimento',
  financiamento: 'Financiamento',
};

export function rotuloAtividade(chave) {
  return ROTULOS_ATIVIDADE[chave] || chave || '(sem atividade)';
}

/** O Balanço pronto para a tela: cada grupo com total, subtotais e contas. */
export function gruposDoBalanco(balanco = {}) {
  return GRUPOS_BALANCO.map((grupo) => {
    const bloco = balanco?.[grupo.chave] || {};
    return {
      chave: grupo.chave,
      rotulo: grupo.rotulo,
      total: bloco.total ?? null,
      subtotais: grupo.subtotais.map(([chave, rotulo]) => ({
        chave,
        rotulo,
        valor: bloco[chave] ?? null,
      })),
      contas: Array.isArray(bloco.contas) ? bloco.contas : [],
    };
  });
}

/**
 * O DFC pronto para a tela: as duas vias lado a lado e a diferença **explicada**.
 *
 * A via indireta tem as linhas na ordem do contador (`linhas`) e as atividades; a direta tem as
 * atividades classificadas pela contrapartida. `null` em qualquer número é "o backend não devolveu" —
 * a tela mostra `—` em vez de zero.
 */
export function viasDoDfc(dfc = {}) {
  const indireto = dfc?.indireto || {};
  const direto = dfc?.direto || {};
  const atividades = (bloco) =>
    Object.entries(bloco?.atividades || {}).map(([chave, valor]) => ({
      chave,
      rotulo: rotuloAtividade(chave),
      valor,
    }));
  return {
    linhasIndiretas: Array.isArray(indireto.linhas)
      ? indireto.linhas.map((linha) => ({ rotulo: linha.linha, valor: linha.valor }))
      : [],
    atividadesIndiretas: atividades(indireto),
    atividadesDiretas: atividades(direto),
    totalIndireto: indireto.total ?? null,
    totalDireto: direto.total ?? null,
    saldoInicial: dfc?.saldo_inicial ?? null,
    saldoFinal: dfc?.saldo_final ?? null,
    variacaoDoCaixa: dfc?.variacao_do_caixa ?? null,
    diferencaEntreMetodos: dfc?.diferenca_entre_metodos ?? null,
    foraDoResultado: indireto?.fora_do_resultado_e_controle ?? null,
    confere: dfc?.confere ?? null,
    explicacoes: Array.isArray(dfc?.explicacoes) ? dfc.explicacoes : [],
  };
}

/** As contas de uma linha do DRE (a origem do número), como o backend devolveu. */
export function contasDaLinha(dre = {}) {
  return Array.isArray(dre?.linhas) ? dre.linhas : [];
}

/**
 * As linhas da via **indireta** do DFC para a tabela: os ajustes, as atividades e o total.
 *
 * O payload não traz origem por linha aqui (só o método direto tem os lançamentos), então estas
 * linhas são **somente leitura e sem detalhe** — a tela não inventa composição.
 */
export function linhasDaViaIndireta(dfc = {}) {
  const linhas = (dfc.linhasIndiretas || []).map((linha) => ({
    chave: `i:${linha.rotulo}`,
    rotulo: linha.rotulo,
    valor: linha.valor ?? null,
    tipo: 'ajuste',
  }));
  (dfc.atividadesIndiretas || []).forEach((atividade) => {
    linhas.push({
      chave: `i:atividade:${atividade.chave}`,
      rotulo: `Atividade ${atividade.rotulo}`,
      valor: atividade.valor ?? null,
      tipo: 'atividade',
    });
  });
  linhas.push({
    chave: 'i:total',
    rotulo: 'Total indireto',
    valor: dfc.totalIndireto ?? null,
    tipo: 'total',
  });
  return linhas;
}

/** As linhas da via **direta** do DFC para a tabela: as atividades e o total. */
export function linhasDaViaDireta(dfc = {}) {
  const linhas = (dfc.atividadesDiretas || []).map((atividade) => ({
    chave: `d:atividade:${atividade.chave}`,
    rotulo: atividade.rotulo,
    valor: atividade.valor ?? null,
    tipo: 'atividade',
  }));
  linhas.push({
    chave: 'd:total',
    rotulo: 'Total direto',
    valor: dfc.totalDireto ?? null,
    tipo: 'total',
  });
  return linhas;
}

/**
 * As contas de **uma** linha da cascata — a origem daquele número.
 *
 * O backend marca cada conta com a linha do DRE a que ela pertence (`linha_do_dre`), então a origem
 * **por linha** existe no payload; a tela só precisa agrupar, não adivinhar.
 */
export function contasDaLinhaDoDre(dre = {}, chave = '') {
  if (!chave) return [];
  return contasDaLinha(dre).filter((conta) => conta.linha_do_dre === chave);
}

/**
 * O Balanço achatado para a tabela: um subtotal por linha e o **total do grupo** por último, já com
 * as contas que compõem o grupo (a origem do total).
 *
 * Os subtotais **não** têm recorte de contas no payload — por isso `contas` vem vazio neles, e a tela
 * não abre painel vazio. Ausência de recorte não vira recorte inventado.
 */
export function linhasDoBalanco(balanco = {}) {
  const linhas = [];
  gruposDoBalanco(balanco).forEach((grupo) => {
    grupo.subtotais.forEach((sub) => {
      linhas.push({
        chave: `${grupo.chave}:${sub.chave}`,
        grupo: grupo.rotulo,
        rotulo: sub.rotulo,
        valor: sub.valor,
        tipo: 'subtotal',
        contas: [],
      });
    });
    linhas.push({
      chave: `${grupo.chave}:total`,
      grupo: grupo.rotulo,
      rotulo: `Total ${grupo.rotulo}`,
      valor: grupo.total,
      tipo: 'total',
      contas: grupo.contas,
    });
  });
  return linhas;
}

/** `1234.5` → `R$ 1.234,50`; valor ausente vira `—` (nunca `R$ 0,00` por engano). */
export function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  const numero = Number(valor);
  if (Number.isNaN(numero)) return '—';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Rótulo de negócio de cada regime do comparador. */
export const ROTULOS_REGIME = {
  simples: 'Simples Nacional',
  simples_puro: 'Simples puro (2027)',
  hibrido: 'Simples híbrido (2027)',
  fora_simples: 'Fora do Simples (2027)',
  presumido: 'Lucro Presumido',
  real: 'Lucro Real',
};

export function rotuloRegime(chave) {
  return ROTULOS_REGIME[chave] || chave || '—';
}

/** Os cenários de uma empresa do comparador, cada um com o total, a completude e as lacunas. */
export function cenariosDaEmpresa(empresa = {}) {
  return (Array.isArray(empresa?.cenarios) ? empresa.cenarios : []).map((cenario) => ({
    regime: cenario.regime,
    rotulo: rotuloRegime(cenario.regime),
    total: cenario.total ?? null,
    totalPct: cenario.total_pct_receita ?? null,
    completo: cenario.completo === true,
    faltantes: Array.isArray(cenario.faltantes) ? cenario.faltantes : [],
    observacoes: Array.isArray(cenario.observacoes) ? cenario.observacoes : [],
    linhas: Array.isArray(cenario.linhas) ? cenario.linhas : [],
  }));
}

/** `true` quando o comparador trouxe total para o cenário (mesmo parcial). */
export function cenarioTemNumero(cenario = {}) {
  return cenario.total !== null && cenario.total !== undefined && cenario.total !== '';
}

/**
 * Os cenários de uma empresa prontos para a tabela (ticket FINT-8): um por regime, com a **situação**
 * explícita. Cenário incompleto sai como `parcial (N lacunas)` — nunca como zero nem como completo.
 */
export function linhasDeCenarios(empresa = {}) {
  return cenariosDaEmpresa(empresa).map((cenario) => ({
    chave: cenario.regime,
    regime: cenario.rotulo,
    total: cenario.total,
    totalPct: cenario.totalPct,
    completo: cenario.completo,
    faltantes: cenario.faltantes,
    observacoes: cenario.observacoes,
    linhas: cenario.linhas,
    situacao: cenario.completo
      ? 'completo'
      : `parcial${cenario.faltantes.length ? ` (${cenario.faltantes.length})` : ''}`,
  }));
}

/** Linhas de um bloco da conciliação (sistema × contador), como o backend classificou. */
export function linhasDaConciliacao(bloco = {}) {
  return Array.isArray(bloco?.linhas) ? bloco.linhas : [];
}

/** Resumo por classe da conciliação (`de_base`, `de_dado`, `nao_explicado`, `confere`…). */
export function resumoDaConciliacao(bloco = {}) {
  const resumo = bloco?.resumo || {};
  return Object.entries(resumo).map(([classe, quantidade]) => ({ classe, quantidade }));
}

/** O painel de apuração pronto para a tela: totais e as competências que divergem. */
export function resumoDaApuracao(empresa = {}) {
  const linhas = Array.isArray(empresa?.linhas) ? empresa.linhas : [];
  return {
    competencias: empresa?.competencias ?? linhas.length,
    comDeclaracao: empresa?.com_declaracao ?? 0,
    divergentes: empresa?.divergentes ?? 0,
    totalDeclarado: empresa?.total_declarado ?? null,
    totalCalculado: empresa?.total_calculado ?? null,
    diferencaTotal: empresa?.diferenca_total ?? null,
    linhas,
  };
}
