// Cascata GMV → lucro bruto por pedido (ticket CUSTO-14).
//
// O backend materializa a cascata em `ResultadoPedido` e devolve o bloco `resultado` em cada pedido
// (ML e Shopee) e nos KPIs. Aqui só se lê, soma (packs do ML) e rotula — nenhum custo é calculado no
// front. Regras: backend `docs/reference/custo-preparacao-por-pedido.md` §7.

/** Colunas da cascata, na ordem da tela (decisão do dono, 16/11/2026). `sinal` −1 = dedução. */
export const COLUNAS_CASCATA = [
  { chave: 'gmv', rotulo: 'GMV', sinal: 1 },
  { chave: 'imposto', rotulo: 'Imposto', sinal: -1 },
  { chave: 'receita_liquida', rotulo: 'Receita líquida', sinal: 1, subtotal: true },
  { chave: 'taxas', rotulo: 'Taxas', sinal: -1 },
  { chave: 'frete', rotulo: 'Frete', sinal: -1 },
  { chave: 'ads', rotulo: 'Ads', sinal: -1 },
  { chave: 'producao', rotulo: 'Custo de produção', sinal: -1 },
  { chave: 'embalagens', rotulo: 'Embalagens', sinal: -1 },
  { chave: 'produto', rotulo: 'Custo do produto', sinal: -1 },
  { chave: 'lucro_bruto', rotulo: 'Lucro bruto', sinal: 1, subtotal: true },
];

const SOMAVEIS = [
  'gmv', 'imposto', 'receita_liquida', 'taxas', 'frete', 'repasse', 'ads', 'producao', 'embalagens', 'produto',
  'lucro_bruto', 'unidades', 'unidades_sem_custo',
];
const SOMAVEIS_DETALHE = {
  embalagens_detalhe: ['saco', 'etiqueta_identificacao', 'etiqueta_envio', 'stretch'],
};

const n = (v) => Number(v || 0);
const arred = (v) => Math.round(v * 100) / 100;

/**
 * Soma blocos `resultado` (pack do ML = vários pedidos numa linha). Bloco nulo é ignorado; se todos
 * forem nulos, devolve `null`. Flags viram "algum" (`some`); frete_detalhe soma chave a chave.
 */
export function somarResultados(blocos) {
  const validos = (blocos || []).filter(Boolean);
  if (!validos.length) return null;
  if (validos.length === 1 && blocos.length === 1) return validos[0];
  const out = { ...validos[0] };
  for (const k of SOMAVEIS) out[k] = arred(validos.reduce((s, b) => s + n(b[k]), 0));
  for (const [grupo, chaves] of Object.entries(SOMAVEIS_DETALHE)) {
    out[grupo] = Object.fromEntries(chaves.map((c) => [c, arred(validos.reduce((s, b) => s + n(b[grupo]?.[c]), 0))]));
  }
  const fretes = {};
  for (const b of validos) {
    for (const [k, v] of Object.entries(b.frete_detalhe || {})) fretes[k] = arred(n(fretes[k]) + n(v));
  }
  out.frete_detalhe = fretes;
  for (const f of ['repasse_estimado', 'ads_parcial', 'custo_incompleto']) out[f] = validos.some((b) => b[f]);
  out.margem_contribuicao = out.gmv ? out.lucro_bruto / out.gmv : null;
  out.pedidos = validos.length;
  out.parcial = validos.length < blocos.length; // algum pedido do pack sem linha
  return out;
}

/** Bloco da linha da tabela: pack do ML soma os sub-pedidos; o resto usa `row.resultado`. */
export function resultadoDaLinha(row) {
  if (!row) return null;
  if (row._isPack && Array.isArray(row._packOrders)) return somarResultados(row._packOrders.map((o) => o.resultado));
  return row.resultado || null;
}

/** Margem de contribuição em % com 1 casa (`0.2291` → `22.9`); sem GMV, `null`. */
export function margemPct(resultado) {
  if (!resultado || resultado.margem_contribuicao == null) return null;
  return Math.round(Number(resultado.margem_contribuicao) * 1000) / 10;
}

/** Parcela sobre o GMV em % com 1 casa, para o "x% do GMV" das células. */
export function pctDoGmv(valor, resultado) {
  const gmv = n(resultado?.gmv);
  if (!gmv) return null;
  return Math.round((n(valor) / gmv) * 1000) / 10;
}

const ROTULOS_FRETE = {
  frete_vendedor: 'Frete pago pelo vendedor',
  credito_flex: 'Crédito Flex (ML)',
  cupom_vendedor: 'Cupom do vendedor',
  logistica: 'Logística (Shopee)',
  rebate_shopee: 'Rebate de frete Shopee',
  entrega_propria: 'Entrega própria (Entrega Direta)',
};

/** Linhas do tooltip do frete: [rótulo, valor] dos componentes que não são zero. */
export function linhasFrete(resultado) {
  return Object.entries(resultado?.frete_detalhe || {})
    .filter(([, v]) => n(v) !== 0)
    .map(([k, v]) => [ROTULOS_FRETE[k] || k, n(v)]);
}

const ROTULOS_EMBALAGEM = {
  saco: 'Saco',
  etiqueta_identificacao: 'Etiqueta de identificação',
  etiqueta_envio: 'Etiqueta de envio',
  stretch: 'Stretch',
};

/** Linhas do tooltip das embalagens: [rótulo, valor] dos insumos usados no pedido. */
export function linhasEmbalagens(resultado) {
  return Object.entries(resultado?.embalagens_detalhe || {})
    .filter(([, v]) => n(v) !== 0)
    .map(([k, v]) => [ROTULOS_EMBALAGEM[k] || k, n(v)]);
}

/** `0.0945` → `9,45%`. */
export function formatAliquota(aliquota) {
  if (aliquota == null) return '—';
  return `${(Number(aliquota) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/** `AAAA-MM-DD` → `DD/MM`. */
export function formatDiaMes(iso) {
  if (!iso) return '—';
  const [, m, d] = String(iso).split('-');
  return `${d}/${m}`;
}

const MOTIVOS = {
  fora_do_estudo:
    'Conta fora do estudo de custo: só Dose Verde e Casa dos Suportes têm custo de produto, preparação e alíquota cadastrados.',
  nao_e_venda: 'Pedido cancelado ou não pago: não entra na cascata.',
  antes_da_base: 'Venda anterior a 01/01/2026, início da base de custo.',
  pendente:
    'Venda ainda não calculada: o resultado é recalculado a cada 2 horas (com o Ads do dia) e no sync diário de pedidos.',
};

/** Texto do "—" quando o pedido não tem cascata (`resultado_motivo` da API). */
export function textoMotivo(motivo) {
  return MOTIVOS[motivo] || MOTIVOS.pendente;
}

/** Motivo da linha: pack do ML usa o primeiro sub-pedido sem resultado. */
export function motivoDaLinha(row) {
  if (!row) return null;
  if (row._isPack && Array.isArray(row._packOrders)) {
    return row._packOrders.find((o) => !o.resultado)?.resultado_motivo || null;
  }
  return row.resultado_motivo || null;
}

const COLS_RESUMO = ['gmv', 'imposto', 'receita_liquida', 'taxas', 'frete', 'ads', 'custo_mao_de_obra', 'custo_embalagens', 'custo_produto', 'lucro_bruto']

/**
 * Soma as linhas de `/api/financeiro/resultado-pedidos/resumo/` das contas selecionadas.
 * `contas` vazio = todas; `canais` limita a 'ml' / 'shopee'. Devolve o formato dos KPIs da cascata
 * (mesmas chaves de `CascataKpis`) e a série diária (para sparkline), ou `null` sem linhas.
 */
export function agregarCascata(linhas, { contas = [], canais = ['ml', 'shopee'] } = {}) {
  const sel = new Set(contas)
  const filtradas = (linhas || []).filter((l) => canais.includes(l.canal) && (!sel.size || sel.has(l.conta)))
  if (!filtradas.length) return null
  const t = { pedidos: 0, pedidos_custo_incompleto: 0 }
  for (const c of COLS_RESUMO) t[c] = 0
  const dias = {}
  for (const l of filtradas) {
    t.pedidos += l.pedidos || 0
    t.pedidos_custo_incompleto += l.pedidos_custo_incompleto || 0
    for (const c of COLS_RESUMO) t[c] += Number(l[c] || 0)
    if (l.data) {
      const d = (dias[l.data] ||= { data: l.data, gmv: 0, imposto: 0, lucro_bruto: 0, ads: 0, pedidos: 0 })
      d.gmv += Number(l.gmv || 0); d.imposto += Number(l.imposto || 0); d.lucro_bruto += Number(l.lucro_bruto || 0)
      d.ads += Number(l.ads || 0); d.pedidos += l.pedidos || 0
    }
  }
  for (const c of COLS_RESUMO) t[c] = arred(t[c])
  // nomes da faixa de KPIs (CascataKpis): produção/embalagens/produto
  t.producao = t.custo_mao_de_obra
  t.embalagens = t.custo_embalagens
  t.produto = t.custo_produto
  t.preparacao = arred(t.custo_mao_de_obra + t.custo_embalagens)
  t.margem_contribuicao = t.gmv ? t.lucro_bruto / t.gmv : null
  t.lucro_bruto_medio = t.pedidos ? arred(t.lucro_bruto / t.pedidos) : null
  t.diario = Object.values(dias)
    .map((d) => ({ ...d, gmv: arred(d.gmv), imposto: arred(d.imposto), lucro_bruto: arred(d.lucro_bruto), ads: arred(d.ads) }))
    .sort((a, b) => a.data.localeCompare(b.data))
  return t
}

/** Variação % entre dois valores (para o delta dos cards); sem base, `null`. */
export function variacaoPct(atual, anterior) {
  if (anterior == null || !Number(anterior) || atual == null) return null
  return ((Number(atual) - Number(anterior)) / Math.abs(Number(anterior))) * 100
}

/** `{ 'AAAA-MM-DD|conta': linha }` das linhas do resumo, para o detalhe por conta de cada dia. */
export function indicePorDiaConta(linhas) {
  return Object.fromEntries((linhas || []).filter((l) => l.data).map((l) => [`${l.data}|${l.conta}`, l]))
}

/** Margem (lucro bruto ÷ GMV) em texto `12,3%`; sem GMV, `—`. */
export function margemTexto(lucro, gmv) {
  return Number(gmv) ? `${((Number(lucro) / Number(gmv)) * 100).toFixed(1).replace('.', ',')}%` : '—'
}

// ── Filtro por margem de contribuição (CUSTO-15) ───────────────────────────
// A API guarda a margem como fração do GMV; a tela trabalha em %.
export const FAIXAS_MARGEM = [
  { label: 'Negativa', min: null, max: 0 },
  { label: '0 a 10%', min: 0, max: 10 },
  { label: '10 a 20%', min: 10, max: 20 },
  { label: '20 a 30%', min: 20, max: 30 },
  { label: '30% ou mais', min: 30, max: null },
]

const _num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

/** Parâmetros `margem_contribuicao__gte/lte` (fração) a partir de mínimo/máximo em %. */
export function paramsMargem(minPct, maxPct) {
  const p = {}
  const min = _num(minPct)
  const max = _num(maxPct)
  if (min !== null) p.margem_contribuicao__gte = +(min / 100).toFixed(6)
  if (max !== null) p.margem_contribuicao__lte = +(max / 100).toFixed(6)
  return p
}

/** Texto da faixa para o índice de filtros: "10% → 20%", "… → 0%". */
export function textoFaixaMargem(minPct, maxPct) {
  const fmt = (v) => `${String(v).replace('.', ',')}%`
  const min = _num(minPct)
  const max = _num(maxPct)
  if (min === null && max === null) return ''
  return `${min === null ? '…' : fmt(min)} → ${max === null ? '∞' : fmt(max)}`
}

/** A faixa pré-definida que corresponde ao mínimo/máximo atuais (para destacar o chip). */
export function faixaAtiva(minPct, maxPct) {
  const min = _num(minPct)
  const max = _num(maxPct)
  return FAIXAS_MARGEM.find((f) => f.min === min && f.max === max) || null
}
