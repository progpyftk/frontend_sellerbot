// Parâmetros editáveis da margem de contribuição (ticket MCS-7).
//
// A tela só lê e grava o que `GET/POST /api/financeiro/parametros-margem/` entrega (MCS-3/4/5/6):
// alíquota efetiva por CNPJ, custo de produção/processamento e de embalagem por pedido. Aqui ficam as
// regras de apresentação — rótulos, conversão % ↔ fração e o passo a passo do login sem configuração —
// para serem testáveis fora do componente. Nenhum custo é calculado no front.
//
// Regra D11 (24/11): todo valor novo vale de hoje em diante; as vendas anteriores não mudam.

export const REGIMES = [
  { value: 'simples', label: 'Simples Nacional' },
  { value: 'presumido', label: 'Lucro Presumido' },
  { value: 'real', label: 'Lucro Real' },
];

export function rotuloRegime(regime) {
  return REGIMES.find((r) => r.value === regime)?.label || 'Regime não declarado';
}

/** Só o Simples tem margem nesta sprint; Presumido e Real chegam com `margem-contribuicao-fora-do-simples`. */
export function regimeTemMargem(regime) {
  return regime === 'simples';
}

export const TEXTO_VIGENCIA =
  'Vale para as vendas a partir de hoje. As vendas anteriores continuam com o valor da época.';

export const TEXTO_FORA_DO_SIMPLES =
  'A margem deste CNPJ chega com a sprint de Lucro Presumido e Real. Por enquanto só o Simples Nacional tem margem calculada.';

export const TEXTO_EMBALAGEM_FULL = 'Não entra em venda Full (a embalagem é do marketplace).';

/** Origem da alíquota em vigor (`aliquota.origem` da API). */
export function rotuloOrigemAliquota(origem) {
  if (origem === 'digitada') return 'Digitada';
  if (origem === 'pgdas') return 'Pelas PGDAS';
  return 'Falta informar';
}

/** Origem de produção/embalagem (`origem` do vigente ou `resultado.origens` do pedido). */
export function rotuloOrigemCusto(origem) {
  if (origem === 'digitada' || origem === 'simples') return 'Valor por pedido';
  if (origem === 'detalhado') return 'Detalhado';
  return 'Não informado';
}

const _limpo = (v) => (v === null || v === undefined ? '' : String(v).trim());

/**
 * Texto digitado (pt-BR ou ponto) → número, ou `null` se vazio/inválido.
 * "1.234,56" → 1234.56; "8,5" → 8.5; "8.5" → 8.5.
 */
export function numeroDigitado(texto) {
  const t = _limpo(texto).replace(/\s|%|R\$/g, '');
  if (!t) return null;
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  if (!/^-?\d+(\.\d+)?$/.test(normal)) return null;
  return Number(normal);
}

/** Fração da API ("0.085000") → % com até 2 casas para o campo ("8,5"). Sem valor → "". */
export function fracaoParaCampoPct(fracao) {
  if (_limpo(fracao) === '') return '';
  const pct = Math.round(Number(fracao) * 10000) / 100;
  return String(pct).replace('.', ',');
}

/** Fração da API → texto "8,50%". Sem valor → "—". */
export function formatPct(fracao) {
  if (_limpo(fracao) === '') return '—';
  return `${(Number(fracao) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/** Valor em reais da API ("1.10") → campo ("1,1"). */
export function reaisParaCampo(valor) {
  if (_limpo(valor) === '') return '';
  return String(Number(valor)).replace('.', ',');
}

export function formatReais(valor) {
  if (_limpo(valor) === '') return '—';
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Alíquota efetiva aceitável: entre 0 e 100% (o backend valida de novo). */
export function validarPercentual(texto) {
  const n = numeroDigitado(texto);
  if (n === null) return 'Digite a alíquota em %, por exemplo 8,5.';
  if (n < 0 || n >= 100) return 'A alíquota precisa ficar entre 0% e 100%.';
  return null;
}

export function validarReais(texto) {
  const n = numeroDigitado(texto);
  if (n === null) return 'Digite o valor em reais por pedido, por exemplo 1,50.';
  if (n < 0) return 'O valor não pode ser negativo.';
  return null;
}

/** Corpo do POST da alíquota: `percentual` em % (o backend divide por 100). */
export function payloadAliquota(cnpjId, texto) {
  return { tipo: 'aliquota', cnpj_id: cnpjId, percentual: numeroDigitado(texto) };
}

/**
 * Corpo do POST de produção/embalagem. `cnpjId` nulo = "o mesmo para todos os CNPJs" (bloco `geral`).
 * Modo `detalhado` volta ao cálculo pelas notas e equipe (só para quem tem cálculo detalhado).
 */
export function payloadCusto(tipo, cnpjId, modo, texto) {
  const corpo = { tipo, modo };
  if (cnpjId) corpo.cnpj_id = cnpjId;
  if (modo === 'simples') corpo.valor = numeroDigitado(texto);
  return corpo;
}

/** Valor vigente de produção/embalagem vem do próprio CNPJ? (senão, é o geral ou nenhum). */
export function custoDoCnpj(vigente) {
  return !!(vigente && vigente.registro && vigente.registro.cnpj_id);
}

/** Mensagem de erro da API: financeiro devolve `{error}`, fiscal devolve `{detail}`. */
export function mensagemErro(e, padrao = 'Não foi possível salvar.') {
  const d = e?.response?.data;
  return d?.error || d?.detail || padrao;
}

/** `AAAA-MM-DD` → `DD/MM/AAAA`. */
export function formatData(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 10).split('-').reverse().join('/');
}

/**
 * Passo a passo do login sem configuração. Devolve a lista de passos com `feito` e o primeiro pendente
 * em `atual`. Produção e embalagem são opcionais: sem eles o custo entra como zero.
 */
export function passosConfiguracao(dados) {
  const cnpjs = dados?.cnpjs || [];
  const simples = cnpjs.filter((c) => regimeTemMargem(c.regime));
  const custoInformado = (tipo) =>
    (dados?.geral?.[tipo]?.origem && dados.geral[tipo].origem !== 'sem_valor') ||
    simples.some((c) => c[tipo]?.origem && c[tipo].origem !== 'sem_valor');
  const passos = [
    { id: 'cnpj', titulo: 'Cadastre o CNPJ', feito: cnpjs.length > 0, obrigatorio: true },
    {
      id: 'regime',
      titulo: 'Escolha o regime de cada CNPJ',
      feito: cnpjs.length > 0 && cnpjs.every((c) => !!c.regime),
      obrigatorio: true,
    },
    {
      id: 'aliquota',
      titulo: 'Informe a alíquota efetiva',
      feito: simples.length > 0 && simples.every((c) => !!c.aliquota?.origem),
      obrigatorio: true,
    },
    { id: 'producao', titulo: 'Custo de produção/processamento (opcional)', feito: custoInformado('producao'), obrigatorio: false },
    { id: 'embalagem', titulo: 'Custo de embalagem (opcional)', feito: custoInformado('embalagem'), obrigatorio: false },
  ];
  const atual = passos.find((p) => !p.feito)?.id || null;
  const pronto = passos.filter((p) => p.obrigatorio).every((p) => p.feito);
  return { passos, atual, pronto };
}

const ROTULOS_TIPO = { aliquota: 'Alíquota efetiva', producao: 'Produção/processamento', embalagem: 'Embalagem' };

/** Linhas da tabela de histórico, com o CNPJ resolvido e o valor formatado pelo tipo. */
export function linhasHistorico(historico, cnpjs) {
  const porId = Object.fromEntries((cnpjs || []).map((c) => [c.id, c]));
  return (historico || []).map((h) => {
    const c = porId[h.cnpj_id];
    let valor;
    if (h.modo === 'detalhado') valor = 'Detalhado';
    else if (h.tipo === 'aliquota') valor = formatPct(h.valor);
    else valor = `${formatReais(h.valor)} por pedido`;
    return {
      id: h.id,
      tipo: ROTULOS_TIPO[h.tipo] || h.tipo,
      cnpj: c ? c.razao_social || c.cnpj : h.cnpj_id ? `CNPJ ${h.cnpj_id}` : 'Todos os CNPJs',
      valor,
      de: formatData(h.vigencia_de),
      ate: h.vigencia_ate ? formatData(h.vigencia_ate) : 'em vigor',
      quem: h.declarado_por || '—',
      observacao: h.observacao || '',
    };
  });
}

/** CNPJ só com dígitos → "12.345.678/0001-90" (outros formatos voltam como vieram). */
export function formatCnpj(cnpj) {
  const d = String(cnpj || '').replace(/\D/g, '');
  if (d.length !== 14) return cnpj || '';
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
