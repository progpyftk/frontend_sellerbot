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
 * - Piso: margem ≥ 30% E lucro ≥ R$ 20 por venda (regra do dono; subiu de R$ 12 em 12/09).
 */

export const FLOOR_MARGIN_PCT = 30;
// Piso de lucro por venda do dono. PROMO-IA-23 (12/09/2026) subiu de R$ 12 para R$ 20 —
// a fonte de verdade é `app_mercado_livre/services/promotions_ads/floors.py`. Este valor é
// apenas fallback: o ideal é o backend mandar os pisos no payload (ver briefing §F3).
export const FLOOR_PROFIT_BRL = 20;
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

/**
 * Legendarário: a REGRA por trás de cada rótulo da tabela.
 *
 * Os rótulos vêm do mesmo `META` que a tabela usa (nome e cor nunca divergem); o texto explica
 * o critério e o que fazer. Isto existe porque "Bloqueado: piso" e "Baixo giro" não dizem nada
 * para quem não escreveu a régua.
 */
export const REGRA_SITUACOES = {
  bloqueado_piso: 'O preço com a promoção deixa a margem abaixo de 30% ou o lucro abaixo de R$ 20 por venda. É o piso do dono: nenhuma escrita pode furar — inclusive a do robô.',
  sem_dados: 'Não dá para calcular a margem: falta custo (CMV), frete ou tarifa confiável, ou o SKU não resolve no Tiny. Sem margem calculável, o robô não escreve.',
  baixo_giro: 'Vende até 1 unidade por semana. Giro baixo quase nunca é só preço — a regra do dono manda revisar o anúncio (SEO, completude e fotos) antes de aprofundar desconto.',
  promo_ativa: 'Tem promoção ativa e a margem está acima do piso. O robô não precisa agir: se vende, está bom.',
  sem_promo: 'Não há promoção ativa agora. Se a régua pedir desconto, não existe oferta disponível para ativar no momento.',
};

export const REGRA_ACOES = {
  bloqueado: 'Sem ação até o preço-base mudar: qualquer escrita aqui furaria o piso. O caminho é corrigir custo ou refazer o preço-base, não dar desconto.',
  rebase: 'Margem abaixo de 30% sem promoção ativa: o problema é o preço-base, então o caso vai para o precificador — o robô de promoção não escreve.',
  revisar: 'Regra do dono: anúncio parado ou fraco SEMPRE passa por revisão de anúncio, mesmo sem retrato financeiro — a revisão não depende de margem.',
  reduzir: 'Giro médio com margem abaixo do alvo de 40%: reduzir o desconto para capturar margem sem perder a venda.',
  manter: 'Giro alto (ou margem já no alvo): a régua manda não mexer. Se vende, está bom.',
  sem_dados: 'Falta dado para calcular a margem (CMV, frete ou tarifa). Nada é escrito até o dado existir.',
  aguardando: 'Sem regra aplicável com os dados atuais deste anúncio.',
};

export const REGRA_SAUDE = {
  parado: 'Zero venda em 14 dias sob promoção. Prioridade máxima: destravar a venda.',
  fraco: 'Menos de 1 unidade por semana. Candidato a aprofundar desconto e a revisar o anúncio.',
  medio: 'De 1 a 3 unidades por semana. Alvo de margem de 40% — abaixo disso o robô reduz o desconto.',
  alto: '3 ou mais unidades por semana. Não mexer enquanto a margem estiver acima do piso.',
};

/** Lista pronta para a tela: rótulo (com a mesma cor da tabela) + a regra. */
export const LEGENDARIO_SITUACOES = Object.entries(SITUATION_META)
  .map(([key, meta]) => ({ key, ...meta, regra: REGRA_SITUACOES[key] || '' }));
export const LEGENDARIO_ACOES = Object.entries(SUGGESTION_META)
  .map(([key, meta]) => ({ key, ...meta, regra: REGRA_ACOES[key] || '' }));
export const LEGENDARIO_SAUDE = Object.entries(HEALTH_META)
  .map(([key, meta]) => ({ key, ...meta, regra: REGRA_SAUDE[key] || '' }));

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
