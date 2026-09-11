/**
 * Estado da superfície Hoje (PROMO-IA-22).
 *
 * Toda a leitura vive aqui: os componentes só renderizam. O backend já entrega tudo calculado
 * (baldes disjuntos por anúncio, proteção, escritas confirmadas, ciclo) — o composable agrega
 * o que é somável entre contas e formata o que é exibição.
 */
import { computed, ref } from 'vue';

import AdvisorService from 'src/services/AdvisorService';
import { brl, pct } from 'src/utils/advisorDecision';

const STATUS_LABEL = { success: 'concluído', partial: 'parcial (com pendências)', error: 'com erro', skipped: 'pulado' };

export function useAdvisorToday() {
  const data = ref(null);
  const carregando = ref(false);
  const erro = ref('');

  async function carregar() {
    carregando.value = true;
    erro.value = '';
    try {
      data.value = (await AdvisorService.getToday()).data;
    } catch (err) {
      erro.value = err?.response?.data?.detail || 'Não foi possível carregar o trabalho do robô.';
    } finally {
      carregando.value = false;
    }
  }

  const contas = computed(() => Object.entries(data.value?.by_account || {})
    .map(([account_id, estado]) => ({ account_id, ...estado })));

  function somarBaldes(lista) {
    const base = { alterados: 0, ja_no_alvo: 0, nao_confirmados: 0, recusados: 0, bloqueados: 0,
                   no_plano: 0, anuncios_ativos: 0, aguardando_aval: 0, sem_dado_de_custo: 0 };
    for (const conta of lista) {
      const hoje = conta.today || {};
      for (const chave of Object.keys(base)) base[chave] += Number(hoje[chave] || 0);
    }
    return base;
  }

  const total = computed(() => somarBaldes(contas.value));

  const motivos = computed(() => {
    const acc = new Map();
    for (const conta of contas.value) {
      for (const [codigo, info] of Object.entries(conta.today?.motivos || {})) {
        if (codigo === 'WRITE_DISABLED') continue;      // conta desligada = não avaliado
        const atual = acc.get(codigo) || { codigo, anuncios: 0, label: info.label };
        atual.anuncios += Number(info.anuncios || 0);
        acc.set(codigo, atual);
      }
    }
    return [...acc.values()].sort((a, b) => b.anuncios - a.anuncios);
  });

  const naoAvaliados = computed(() => contas.value.reduce(
    (soma, conta) => soma + Number(conta.today?.motivos?.WRITE_DISABLED?.anuncios || 0), 0));

  const naoMexidosQueAvaliou = computed(
    () => total.value.ja_no_alvo + Math.max(total.value.bloqueados - naoAvaliados.value, 0));

  const escritas = computed(() => contas.value
    .flatMap((conta) => conta.last_writes || [])
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 10));

  const protecao = computed(() => {
    const partes = contas.value.map((conta) => conta.protection).filter(Boolean);
    if (!partes.length) {
      return { aplicadas: 0, abaixo_do_piso: 0, menor_margem_pct: null, menor_lucro_brl: null, ultima_escrita_at: null };
    }
    const margens = partes.map((p) => (p.menor_margem_pct === null ? Infinity : p.menor_margem_pct));
    const lucros = partes.map((p) => (p.menor_lucro_brl === null ? Infinity : p.menor_lucro_brl));
    const horas = partes.map((p) => p.ultima_escrita_at).filter(Boolean).sort();
    return {
      aplicadas: partes.reduce((s, p) => s + (p.aplicadas || 0), 0),
      abaixo_do_piso: partes.reduce((s, p) => s + (p.abaixo_do_piso || 0), 0),
      menor_margem_pct: Number.isFinite(Math.min(...margens)) ? Math.min(...margens) : null,
      menor_lucro_brl: Number.isFinite(Math.min(...lucros)) ? Math.min(...lucros) : null,
      ultima_escrita_at: horas.length ? horas[horas.length - 1] : null,
    };
  });

  const escrita = computed(() => ({
    algumaLigada: contas.value.some((conta) => conta.auto_write),
    nomes: contas.value.filter((conta) => conta.auto_write).map((conta) => conta.account_nickname).join(', '),
    leva: contas.value[0]?.wave_size || 10,
  }));

  const ciclo = computed(() => data.value?.last_cycle || null);
  const cicloHoje = computed(() => Boolean(data.value?.cycle_today));

  return {
    data, carregando, erro, carregar,
    contas, total, motivos, naoAvaliados, naoMexidosQueAvaliou, escritas, protecao, escrita, ciclo, cicloHoje,
    brl, pct, STATUS_LABEL,
  };
}
