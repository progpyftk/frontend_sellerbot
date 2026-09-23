/**
 * Regras de negócio da Margem de Contribuição (FIN-20) que não dependem de Vue.
 *
 * Ficam aqui para serem testáveis e para a tela não espalhar interpretação do contrato
 * do backend. A conta da MC é do backend; estas funções só rotulam, resumem e sinalizam
 * quando o número está superestimado.
 */

/** Níveis de agregação aceitos por `GET /api/financeiro/margens/`. */
export const NIVEIS_DE_MARGEM = [
  { label: "Por CNPJ (empresa)", value: "cnpj" },
  { label: "Por marketplace (canal)", value: "marketplace" },
  { label: "Por SKU (produto)", value: "sku" },
];

/** Marketplaces aceitos pelo filtro `marketplace`. */
export const MARKETPLACES_DE_MARGEM = [
  { label: "Mercado Livre", value: "ml" },
  { label: "Shopee", value: "shopee" },
  { label: "TikTok Shop", value: "tiktok" },
];

const ROTULOS_MARKETPLACE = {
  ml: "Mercado Livre",
  shopee: "Shopee",
  tiktok: "TikTok Shop",
};

const ROTULOS_NIVEL = {
  cnpj: "CNPJ",
  marketplace: "Marketplace",
  sku: "SKU",
};

/** Converte os valores decimais em texto ("183379.49") que a API devolve. */
export function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export function rotuloMarketplace(marketplace) {
  return ROTULOS_MARKETPLACE[marketplace] || marketplace || "—";
}

export function rotuloNivel(nivel) {
  return ROTULOS_NIVEL[nivel] || nivel || "—";
}

/**
 * Monta os `params` do endpoint descartando vazio — filtro vazio não pode virar
 * `?marketplace=` (o backend recusaria com 400) nem `?sku=`.
 */
export function parametrosDaMargem(filtros = {}) {
  const params = {};
  const texto = (valor) => (typeof valor === "string" ? valor.trim() : valor);

  const cnpj = texto(filtros.cnpj);
  if (cnpj) params.cnpj = cnpj;
  if (filtros.fiscal_account) params.fiscal_account = filtros.fiscal_account;
  if (filtros.marketplace) params.marketplace = filtros.marketplace;

  const sku = texto(filtros.sku);
  if (sku) params.sku = sku;

  const de = texto(filtros.de);
  if (de) params.de = de;
  const ate = texto(filtros.ate);
  if (ate) params.ate = ate;

  if (filtros.nivel) params.nivel = filtros.nivel;
  return params;
}

/**
 * A base de pedidos cobre a receita declarada? Esta é a régua do FIN-20-base-incompleta.
 *
 * O GMV, as taxas, o frete e o CPV saem do **nosso** banco de pedidos, que não cobre o
 * histórico: 07/2025 do Mercado Livre tinha R$ 3.402,04 de GMV contra R$ 68.945,32
 * declarados ao Simples (4,9% de cobertura). Nesse mês, 95% dos custos variáveis e do CPV
 * ficaram fora da conta — a margem não é pequena, é **superestimada**.
 *
 * A régua é a receita DECLARADA (a RPA da PGDASD). Os limites são os do backend
 * (`app_financeiro/services/cobertura.py`): abaixo de 90% falta pedido (`base_completa=false`);
 * acima de 110% o banco passa a receita declarada — é **divergência de base** (ticket
 * FIN-21b), informativa, **não** MC superestimada.
 */
export const LIMITE_DE_COBERTURA_PCT = 90;
export const LIMITE_DE_EXCESSO_PCT = 110;

const TEXTO_DE_DIVERGENCIA = /divergencia de base/i;

/**
 * Interpreta os campos de base de uma linha. `base_completa` ausente é tratado como
 * completa (contrato antigo não tinha o campo); só `false` explícito é ressalva.
 *
 * @returns {{base_completa: boolean, cobertura: number|null, incompleta: boolean,
 *            sem_regua: boolean, divergencia: boolean}}
 */
export function diagnosticoDaBase(linha = {}) {
  const baseCompleta = linha?.base_completa !== false;
  const bruto = linha?.cobertura_da_base_pct;
  const temCobertura = bruto !== null && bruto !== undefined && bruto !== "";
  const cobertura = temCobertura ? numero(bruto) : null;

  return {
    base_completa: baseCompleta,
    cobertura,
    incompleta: !baseCompleta,
    sem_regua: !baseCompleta && !temCobertura,
    divergencia: baseCompleta && temCobertura && cobertura > LIMITE_DE_EXCESSO_PCT,
  };
}

/** Texto do selo de base, em linguagem de negócio. Vazio quando a base está completa. */
export function rotuloDaBase(diagnostico) {
  if (!diagnostico?.incompleta) return "";
  if (diagnostico.sem_regua) return "Sem PGDASD para medir";
  return `Base incompleta (${diagnostico.cobertura.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}% da receita declarada)`;
}

const temRessalva = (linha) =>
  linha.embalagem_informada === false ||
  linha.impostos_informados === false ||
  linha.base_completa === false;

/**
 * Ressalvas que **superestimam a MC** nas linhas exibidas.
 *
 * - `embalagem_informada=false`: custo por SKU (decisão D3) não cadastrado, não descontado;
 * - `impostos_informados=false`: falta a conta fiscal inteira (ticket FIN-26);
 * - `base_completa=false`: a base de pedidos não cobre a receita declarada da competência
 *   (ou não há PGDASD para medir) — a MC está superestimada por falta de pedido.
 *
 * `divergencias_base` guarda os textos de divergência acima de 110% (FIN-21b): eles vêm de
 * linha com `base_completa=true` e **não** entram como erro nem no callout de ressalva.
 *
 * @returns {{superestimada: boolean, sem_embalagem: number, sem_impostos: number,
 *            sem_base: number, base_incompleta: boolean, observacoes: string[],
 *            divergencias_base: string[]}}
 */
export function ressalvasDaMargem(linhas = []) {
  const lista = Array.isArray(linhas) ? linhas.filter(Boolean) : [];
  const comRessalva = lista.filter(temRessalva);
  const semEmbalagem = lista.filter((l) => l.embalagem_informada === false).length;
  const semImpostos = lista.filter((l) => l.impostos_informados === false).length;
  const semBase = lista.filter((l) => l.base_completa === false).length;

  // Só as observações que explicam a superestimação entram no aviso; a nota de divergência
  // de base (FIN-21b) é informativa e vai para `divergencias_base`.
  const observacoes = [
    ...new Set(
      comRessalva
        .flatMap((l) => (Array.isArray(l.observacoes) ? l.observacoes : []))
        .filter(Boolean)
        .filter((texto) => !TEXTO_DE_DIVERGENCIA.test(String(texto))),
    ),
  ];
  const divergenciasBase = [
    ...new Set(
      lista
        .flatMap((l) => (Array.isArray(l.observacoes) ? l.observacoes : []))
        .filter((texto) => texto && TEXTO_DE_DIVERGENCIA.test(String(texto))),
    ),
  ];

  return {
    superestimada: semEmbalagem > 0 || semImpostos > 0 || semBase > 0,
    sem_embalagem: semEmbalagem,
    sem_impostos: semImpostos,
    sem_base: semBase,
    base_incompleta: semBase > 0,
    observacoes,
    divergencias_base: divergenciasBase,
  };
}

/**
 * Soma a embalagem das linhas exibidas. Só é usada com o filtro `nivel` aplicado —
 * com níveis misturados a soma duplicaria o valor (nunca some os três níveis).
 * Devolve também quantas linhas vieram sem o custo cadastrado.
 */
export function somaEmbalagem(linhas = []) {
  let total = 0;
  let semValor = 0;

  for (const linha of Array.isArray(linhas) ? linhas : []) {
    if (!linha) continue;
    if (linha.embalagem === null || linha.embalagem === undefined || linha.embalagem === "") {
      semValor += 1;
    } else {
      total += numero(linha.embalagem);
    }
  }

  return { total, semValor };
}

/** Rótulo curto e legível da competência (`2026-08-01` → `ago/2026`). */
export function rotuloCompetencia(valor) {
  if (!valor) return "—";
  const texto = String(valor);
  const ano = texto.slice(0, 4);
  const mes = texto.slice(5, 7);
  if (!ano || !mes) return texto;
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const nome = meses[Number(mes) - 1];
  return nome ? `${nome}/${ano}` : texto;
}
