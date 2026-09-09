/**
 * Leitura de decisão da página do advisor (PROMO-IA-15).
 *
 * Funções puras que traduzem os campos REAIS do `GET /mercadolivre/promo-overview/`
 * (saúde, margem, lucro, piso, inputs ausentes, promo ativa, última ação) em
 * situação, sugestão e resumo de decisão para o dono da operação.
 *
 * Contrato e limites:
 * - NÃO inventa dado: nada aqui usa campo que o backend não devolve. Quando o
 *   backend passar a expor `recommendation`/`execution_status`/fatores de margem
 *   (PROMO-IA-14), `suggestionOf` deve preferir esse campo e cair na régua só
 *   como fallback.
 * - A sugestão é a **régua vigente** aplicada ao retrato do anúncio, exibida com
 *   o rótulo "sugestão da régua — nada é alterado no Mercado Livre". Ela não é
 *   uma ordem de execução nem uma promessa de escrita.
 * - Piso: margem ≥ 30% E lucro ≥ R$ 12 por venda (regra do dono).
 */

export const FLOOR_MARGIN_PCT = 30;
export const FLOOR_PROFIT_BRL = 12;
export const TARGET_MARGIN_PCT = { parado: 30, fraco: 30, medio: 40, alto: null };

export const INPUT_LABELS = {
  cmv: 'CMV',
  fee: 'tarifa',
  shipping: 'frete',
  price: 'preço',
};

export const HEALTH_META = {
  parado: { label: 'Parado', variant: 'red', icon: 'trending_flat' },
  fraco: { label: 'Fraco', variant: 'amber', icon: 'trending_down' },
  medio: { label: 'Médio', variant: 'sky', icon: 'trending_up' },
  alto: { label: 'Alto', variant: 'slate', icon: 'trending_up' },
};

export const SITUATION_META = {
  bloqueado_piso: { label: 'Bloqueado: piso', variant: 'red', icon: 'block' },
  sem_dados: { label: 'Sem dados', variant: 'amber', icon: 'help_outline' },
  baixo_giro: { label: 'Giro baixo', variant: 'amber', icon: 'trending_down' },
  promo_ativa: { label: 'Promo ativa', variant: 'green', icon: 'check_circle' },
  sem_promo: { label: 'Sem promoção', variant: 'slate', icon: 'remove_circle_outline' },
};

export const SUGGESTION_META = {
  bloqueado: { label: 'Sem ação', variant: 'slate', icon: 'block' },
  rebase: { label: 'Rebase → precificador', variant: 'indigo', icon: 'straighten' },
  revisar: { label: 'Revisar anúncio', variant: 'indigo', icon: 'search' },
  reduzir: { label: 'Reduzir desconto', variant: 'indigo', icon: 'north_east' },
  manter: { label: 'Não mexer', variant: 'slate', icon: 'pause' },
  sem_dados: { label: 'Sem base para sugerir', variant: 'slate', icon: 'help_outline' },
  aguardando: { label: 'Aguardando próximo ciclo', variant: 'slate', icon: 'schedule' },
};

export function brl(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function pct(value) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(1).replace('.', ',')}%`;
}

export function missingLabels(row) {
  return (row?.missing_inputs || []).map((item) => INPUT_LABELS[item] || item);
}

/**
 * Estado honesto do anúncio agora: por que ele está (ou não) sob atenção.
 * Ordem de prioridade: piso → dado ausente → giro baixo → promo → neutro.
 */
export function situationOf(row) {
  if (!row) return null;
  if (row.below_floor) {
    const partes = [];
    if (row.margin_pct !== null && row.margin_pct !== undefined) partes.push(`margem ${pct(row.margin_pct)}`);
    if (row.profit_unit !== null && row.profit_unit !== undefined) partes.push(`lucro ${brl(row.profit_unit)}`);
    return {
      key: 'bloqueado_piso',
      ...SITUATION_META.bloqueado_piso,
      reason: `Abaixo do piso (margem ≥ ${FLOOR_MARGIN_PCT}% e lucro ≥ ${brl(FLOOR_PROFIT_BRL)}): ${partes.join(' · ') || 'sem valor calculável'}.`,
    };
  }
  if (!row.estimable) {
    const faltando = missingLabels(row);
    return {
      key: 'sem_dados',
      ...SITUATION_META.sem_dados,
      reason: faltando.length
        ? `Margem não calculável — falta ${faltando.join(', ')}.`
        : 'Margem não calculável: sem retrato financeiro deste anúncio.',
    };
  }
  if (row.health === 'parado' || row.health === 'fraco') {
    const giro = row.health_info?.units_per_week;
    return {
      key: 'baixo_giro',
      ...SITUATION_META.baixo_giro,
      reason: `${HEALTH_META[row.health].label}${giro != null ? ` (${giro} un./semana)` : ''} — baixo rendimento exige revisão do anúncio, não só desconto.`,
    };
  }
  if (row.has_active_promo) {
    return {
      key: 'promo_ativa',
      ...SITUATION_META.promo_ativa,
      reason: 'Promoção ativa e margem acima do piso.',
    };
  }
  return { key: 'sem_promo', ...SITUATION_META.sem_promo, reason: 'Sem promoção ativa no momento.' };
}

/**
 * Próxima ação segundo a régua vigente. Nunca executa nada: é rótulo de leitura.
 */
export function suggestionOf(row) {
  if (!row) return null;
  // Futuro (PROMO-IA-14): preferir `row.recommendation` quando existir.
  const recomendacao = row.recommendation;
  if (recomendacao && recomendacao.acao) {
    return {
      key: recomendacao.acao,
      label: recomendacao.label || recomendacao.acao,
      variant: recomendacao.variant || 'indigo',
      icon: recomendacao.icon || 'auto_fix_high',
      detail: recomendacao.detail || 'Recomendação corrente do assistente.',
      source: 'backend',
    };
  }

  if (!row.estimable) {
    const faltando = missingLabels(row);
    // Regra do dono: parado/fraco SEMPRE passa por revisão de anúncio, mesmo sem
    // retrato financeiro — a revisão não depende de margem.
    if (row.health === 'parado' || row.health === 'fraco') {
      return {
        key: 'revisar',
        ...SUGGESTION_META.revisar,
        detail: 'Regra do dono: parado/fraco sempre passa por revisão de anúncio (SEO, completude e fotos).',
        source: 'regua',
      };
    }
    return {
      key: 'sem_dados',
      ...SUGGESTION_META.sem_dados,
      detail: faltando.length ? `Falta ${faltando.join(', ')} para calcular margem.` : 'Sem retrato financeiro para calcular.',
      source: 'regua',
    };
  }
  if (row.below_floor) {
    return {
      key: 'bloqueado',
      ...SUGGESTION_META.bloqueado,
      detail: `Qualquer escrita aqui furaria o piso (margem ≥ ${FLOOR_MARGIN_PCT}% e lucro ≥ ${brl(FLOOR_PROFIT_BRL)}).`,
      source: 'regua',
    };
  }
  if (row.margin_pct !== null && row.margin_pct !== undefined
      && row.margin_pct < FLOOR_MARGIN_PCT && !row.has_active_promo) {
    return {
      key: 'rebase',
      ...SUGGESTION_META.rebase,
      detail: `Margem ${pct(row.margin_pct)} abaixo de ${FLOOR_MARGIN_PCT}% sem promoção ativa — o preço-base é do precificador.`,
      source: 'regua',
    };
  }
  if (row.health === 'parado' || row.health === 'fraco') {
    return {
      key: 'revisar',
      ...SUGGESTION_META.revisar,
      detail: 'Regra do dono: parado/fraco sempre passa por revisão de anúncio (SEO, completude e fotos).',
      source: 'regua',
    };
  }
  if (row.health === 'medio') {
    if (row.margin_pct !== null && row.margin_pct !== undefined && row.margin_pct < TARGET_MARGIN_PCT.medio) {
      return {
        key: 'reduzir',
        ...SUGGESTION_META.reduzir,
        detail: `Margem ${pct(row.margin_pct)} abaixo do alvo de ${TARGET_MARGIN_PCT.medio}% para giro médio.`,
        source: 'regua',
      };
    }
    return { key: 'manter', ...SUGGESTION_META.manter, detail: 'Giro médio com margem no alvo.', source: 'regua' };
  }
  if (row.health === 'alto') {
    return {
      key: 'manter',
      ...SUGGESTION_META.manter,
      detail: 'Giro alto: a régua manda não mexer enquanto a margem estiver acima do piso.',
      source: 'regua',
    };
  }
  return {
    key: 'aguardando',
    ...SUGGESTION_META.aguardando,
    detail: 'Sem regra aplicável com os dados atuais deste anúncio.',
    source: 'regua',
  };
}

/**
 * Resumo da página atual: o que exige atenção, o que o assistente faria e o que
 * está protegido. Contagens por `key` para virar chip clicável na faixa.
 */
export function decisionSummary(rows = []) {
  const situacoes = {};
  const sugestoes = {};
  let blockedFloor = 0;
  let missingData = 0;
  let lowTraction = 0;

  for (const row of rows) {
    const situacao = situationOf(row);
    const sugestao = suggestionOf(row);
    if (situacao) situacoes[situacao.key] = (situacoes[situacao.key] || 0) + 1;
    if (sugestao) sugestoes[sugestao.key] = (sugestoes[sugestao.key] || 0) + 1;
    if (row?.below_floor) blockedFloor += 1;
    if (row && !row.estimable) missingData += 1;
    if (row?.health === 'parado' || row?.health === 'fraco') lowTraction += 1;
  }

  return {
    total: rows.length,
    situacoes,
    sugestoes,
    blockedFloor,
    missingData,
    lowTraction,
    attention: blockedFloor + missingData + lowTraction,
  };
}

/** Ordem de exibição dos chips de sugestão (mais acionável primeiro). */
export const SUGGESTION_ORDER = ['bloqueado', 'rebase', 'revisar', 'reduzir', 'sem_dados', 'manter', 'aguardando'];
