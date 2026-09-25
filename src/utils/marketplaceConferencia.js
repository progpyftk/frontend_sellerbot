// Conferência de marketplace (ticket FIN-24): a DRE-Aproximada por canal, corrigida pelo FIN-20.
//
// **O que esta tela é, e o que ela não é.** Ela lê os endpoints do dashboard (`operation` do ML e
// `dashboard_stats` da Shopee/TikTok), que trazem o número **de marketplace**: GMV, taxas, líquida,
// CMV, Ads e a margem. Ela **não é o DRE oficial** — impostos (DAS/IRPJ/CSLL), despesas e a cascata
// contábil ficam nas abas `DRE`, `Balanço`/`Visão geral`, que leem o livro.
//
// **A correção do FIN-20 que vale aqui:** a margem percentual é `margem ÷ receita líquida`, e não
// `÷ GMV` — o GMV inclui o que o marketplace retém. As funções são puras para o teste no `node`.

/** `2026-08` → primeiro e último dia do mês, em `AAAA-MM-DD` (formato do dashboard). */
export function periodoParaDatas(periodo = {}) {
  const de = String(periodo?.de ?? '').trim();
  const ate = String(periodo?.ate ?? '').trim();
  const inicio = mesDe(de) || mesDe(ate);
  const fim = mesDe(ate) || mesDe(de);
  if (!inicio || !fim) return { date_from: '', date_to: '' };
  const [ano, mes] = inicio.split('-').map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return {
    date_from: `${inicio}-01`,
    date_to: `${fim}-${String(ultimoDia).padStart(2, '0')}`,
  };
}

function mesDe(valor) {
  const m = String(valor ?? '').match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!m) return null;
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  return `${m[1]}-${m[2]}`;
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isNaN(n) ? null : n;
}

/** Margem ÷ receita líquida, em % com 2 casas; `null` quando a base é zero (ausência ≠ 0 %). */
export function margemSobreLiquida(margem, liquida) {
  const m = numero(margem);
  const l = numero(liquida);
  if (m === null || !l) return null;
  return Number(((m / l) * 100).toFixed(2));
}

function linha({ marketplace, conta, gmv, taxas, liquida, cmv, mcAntes, ads, mcDepois }) {
  return {
    marketplace,
    conta,
    gmv: numero(gmv),
    taxas: numero(taxas),
    liquida: numero(liquida),
    cmv: numero(cmv),
    mcAntes: numero(mcAntes),
    ads: numero(ads),
    mcDepois: numero(mcDepois),
    mcPct: margemSobreLiquida(mcDepois, liquida),
  };
}

/** As linhas do Mercado Livre: uma por conta em `accounts` (a soma vem no topo do payload). */
export function linhasDoMl(payload) {
  const contas = Array.isArray(payload?.accounts) ? payload.accounts : [];
  return contas.map((a) =>
    linha({
      marketplace: 'ml',
      conta: a.account_nickname || a.account_id,
      gmv: a.gmv,
      taxas: a.total_fees,
      liquida: a.net_revenue,
      cmv: a.cmv_total,
      mcAntes: a.gross_profit,
      ads: a.ads_cost,
      mcDepois: a.lucro_liquido,
    }),
  );
}

/**
 * As linhas da Shopee. No payload dela, `gross_profit` é a **margem antes do Ads** e o CMV sai da
 * diferença `líquida − gross_profit` (é como o dashboard já apresenta); o `lucro_liquido` já vem
 * líquido de Ads.
 */
export function linhasDaShopee(payload) {
  const contas = Array.isArray(payload?.by_account) ? payload.by_account : [];
  return contas.map((a) => {
    const liquida = numero(a.net_revenue);
    const mcAntes = numero(a.gross_profit);
    const gmv = numero(a.gmv);
    return linha({
      marketplace: 'shopee',
      conta: a.shop_name || a.account_id,
      gmv,
      taxas: gmv !== null && liquida !== null ? gmv - liquida : null,
      liquida,
      cmv: liquida !== null && mcAntes !== null ? liquida - mcAntes : null,
      mcAntes,
      ads: a.ads_cost,
      mcDepois: a.lucro_liquido,
    });
  });
}

/** As linhas do TikTok: `by_account` quando existir; senão, o total do payload como uma linha. */
export function linhasDoTiktok(payload) {
  const contas = Array.isArray(payload?.by_account) ? payload.by_account : [];
  const origem = contas.length ? contas : payload ? [payload] : [];
  return origem.map((a) =>
    linha({
      marketplace: 'tiktokshop',
      conta: a.shop_name || a.account_nickname || a.account_id || 'TikTok Shop',
      gmv: a.gmv,
      taxas: a.gmv != null && a.net_revenue != null ? numero(a.gmv) - numero(a.net_revenue) : null,
      liquida: a.net_revenue,
      cmv: null,
      mcAntes: a.gross_profit,
      ads: a.ads_cost,
      mcDepois: a.lucro_liquido ?? a.gross_profit,
    }),
  );
}

/** Todas as linhas da conferência, na ordem ML → Shopee → TikTok. */
export function linhasDaConferencia({ ml = null, shopee = null, tiktok = null } = {}) {
  return [...linhasDoMl(ml), ...linhasDaShopee(shopee), ...linhasDoTiktok(tiktok)];
}

const SOMA_VEIS = ['gmv', 'taxas', 'liquida', 'cmv', 'mcAntes', 'ads', 'mcDepois'];

/** Os totais do recorte — soma só o que existe; campo ausente continua `null`, nunca zero. */
export function totaisDaConferencia(linhas = []) {
  const total = {};
  for (const veiculo of SOMA_VEIS) {
    const valores = linhas.map((l) => l[veiculo]).filter((v) => v !== null && v !== undefined);
    total[veiculo] = valores.length ? Number(valores.reduce((a, b) => a + b, 0).toFixed(2)) : null;
  }
  total.mcPct = margemSobreLiquida(total.mcDepois, total.liquida);
  return total;
}

/** Os totais por marketplace, para os cartões de canal. */
export function totaisPorMarketplace(linhas = []) {
  const porCanal = {};
  for (const l of linhas) {
    (porCanal[l.marketplace] ||= []).push(l);
  }
  return Object.entries(porCanal).map(([marketplace, doCanal]) => ({
    marketplace,
    ...totaisDaConferencia(doCanal),
  }));
}

export const ROTULOS_MARKETPLACE = {
  ml: 'Mercado Livre',
  shopee: 'Shopee',
  tiktokshop: 'TikTok Shop',
};
