/**
 * Estado da superfície "Automação" (PROMO-IA-22 · F3).
 *
 * É a única superfície que ESCREVE (só política: `auto_write`, leva, pausa e aval da primeira
 * onda). Nada aqui toca o Mercado Livre — o robô lê a política antes de cada escrita, então
 * desligar vale imediatamente, inclusive no meio de um ciclo.
 *
 * Regras:
 * - depois de cada gravação, o estado é RELIDO do servidor (nada de "achei que salvou");
 * - a leva fica num mapa local por conta para o dono poder digitar sem disparar um PATCH por tecla;
 * - a pausa de emergência age em TODAS as contas do usuário e é a única ação irreversível de imediato.
 */
import { computed, reactive, ref, watch } from 'vue';

import AdvisorService from 'src/services/AdvisorService';

export function useAdvisorAutomation() {
  const data = ref(null);
  const carregando = ref(false);
  const erro = ref('');
  const salvando = ref(null);      // account_id em gravação (ou 'todas')
  const aviso = ref('');           // confirmação curta do que acabou de ser gravado

  async function carregar() {
    carregando.value = true;
    erro.value = '';
    try {
      data.value = (await AdvisorService.getAutomation()).data;
    } catch (err) {
      erro.value = err?.response?.data?.detail
        || 'Não foi possível carregar o estado da automação.';
    } finally {
      carregando.value = false;
    }
  }

  const contas = computed(() => Object.entries(data.value?.by_account || {})
    .map(([account_id, estado]) => ({ account_id, ...estado })));

  const modoGlobal = computed(() => data.value?.write_mode_global !== false);
  const killSwitch = computed(() => Boolean(data.value?.kill_switch));

  /** Executa a gravação, relê o estado e traduz o resultado em uma frase curta para o dono. */
  async function gravar(accountId, payload, mensagem) {
    salvando.value = accountId;
    aviso.value = '';
    try {
      await AdvisorService.patchAutomation({ account_id: accountId, ...payload });
      await carregar();
      aviso.value = mensagem;
    } catch (err) {
      erro.value = err?.response?.data?.error || 'Não foi possível salvar a mudança.';
    } finally {
      salvando.value = null;
    }
  }

  const levas = reactive({});
  function sincronizarLevas() {
    for (const conta of contas.value) levas[conta.account_id] = conta.wave_size;
  }

  /**
   * Régua por conta (PROMO-CFG-3). `reguas[account_id]` guarda o RASCUNHO local (nomes de
   * campo do payload de `update_policy`, não os nomes curtos que `regua` devolve) — assim o
   * dono digita sem disparar um PATCH por tecla, igual à leva.
   */
  const reguas = reactive({});
  function sincronizarReguas() {
    for (const conta of contas.value) {
      reguas[conta.account_id] = {
        floor_margin_pct: conta.regua?.margin_pct ?? null,
        floor_profit_brl: conta.regua?.profit_brl ?? null,
        target_margin_parado_pct: conta.regua?.target_parado_pct ?? null,
        target_margin_medio_pct: conta.regua?.target_medio_pct ?? null,
        high_turnover_margin_pct: conta.regua?.high_turnover_pct ?? null,
        smart_signal_margin_pct: conta.regua?.smart_signal_pct ?? null,
        lightning_margin_pct: conta.regua?.lightning_margin_pct ?? null,
        lightning_profit_brl: conta.regua?.lightning_profit_brl ?? null,
      };
    }
  }
  // Rede de segurança: o template acessa `reguas[conta.account_id].campo` (propriedade
  // aninhada, ao contrário de `levas[conta.account_id]`) — sem isto, a 1ª renderização depois
  // de `data` mudar podia rodar antes do `sincronizarReguas()` manual do chamador e quebrar
  // com "Cannot read properties of undefined". `flush: 'pre'` garante que roda antes do render.
  watch(contas, () => sincronizarReguas(), { immediate: true, flush: 'pre' });

  const REGUA_ROTULOS = {
    floor_margin_pct: 'margem mínima',
    floor_profit_brl: 'lucro mínimo',
    target_margin_parado_pct: 'alvo de margem (parado/fraco)',
    target_margin_medio_pct: 'alvo de margem (vendas médias)',
    high_turnover_margin_pct: 'teto de margem (vendas altas)',
    smart_signal_margin_pct: 'margem mínima de sinalização SMART',
    lightning_margin_pct: 'margem mínima do relâmpago',
    lightning_profit_brl: 'lucro mínimo do relâmpago',
  };

  // Campos cujo valor é em reais — o resto é percentual (o toast do "voltou ao padrão"
  // precisa da unidade certa, e o relâmpago tem os dois).
  const CAMPOS_EM_REAIS = new Set(['floor_profit_brl', 'lightning_profit_brl']);

  const _CAMPO_PARA_CHAVE_CURTA = {
    floor_margin_pct: 'margin_pct',
    floor_profit_brl: 'profit_brl',
    target_margin_parado_pct: 'target_parado_pct',
    target_margin_medio_pct: 'target_medio_pct',
    high_turnover_margin_pct: 'high_turnover_pct',
    smart_signal_margin_pct: 'smart_signal_pct',
    lightning_margin_pct: 'lightning_margin_pct',
    lightning_profit_brl: 'lightning_profit_brl',
  };

  /** Grava 1 campo da régua se o rascunho difere do valor já resolvido da conta. `conta.regua`
   * é sempre o valor RESOLVIDO (nunca diferencia default de override explícito igual ao
   * default) — então limpar um campo que já está no default é inofensivo: no máximo confirma
   * que não há override. Volta ao valor do servidor em caso de erro (via `sincronizarReguas`
   * depois do `gravar`, que sempre relê o estado). */
  async function salvarReguaCampo(conta, campo) {
    const bruto = reguas[conta.account_id]?.[campo];
    const atual = conta.regua?.[_CAMPO_PARA_CHAVE_CURTA[campo]] ?? null;
    const novo = bruto === '' || bruto === null || bruto === undefined ? null : Number(bruto);
    if (novo === null ? atual === null : Number(atual) === novo) return;
    await gravar(conta.account_id, { [campo]: novo },
      novo === null
        ? `${conta.account_nickname}: ${REGUA_ROTULOS[campo]} voltou ao padrão da plataforma.`
        : `${conta.account_nickname}: ${REGUA_ROTULOS[campo]} agora é ${novo}${CAMPOS_EM_REAIS.has(campo) ? ' (R$)' : '%'}.`);
    sincronizarReguas();
  }

  const PRESETS_REGUA = {
    conservador: {
      label: 'Conservador', floor_margin_pct: 35, floor_profit_brl: 25,
      target_margin_parado_pct: 35, target_margin_medio_pct: 45,
    },
    equilibrado: {
      label: 'Equilibrado (recomendado — padrão da plataforma)', floor_margin_pct: 30, floor_profit_brl: 13,
      target_margin_parado_pct: 30, target_margin_medio_pct: 40,
    },
    agressivo: {
      label: 'Agressivo', floor_margin_pct: 20, floor_profit_brl: 12,
      target_margin_parado_pct: 20, target_margin_medio_pct: 30,
    },
  };

  /** Aplica um preset: só preenche os 4 campos principais no PAYLOAD de uma vez (1 gravação,
   * não 4) — os campos avançados (giro alto, sinal SMART e os dois do relâmpago) não fazem
   * parte de preset. */
  async function aplicarPreset(conta, chave) {
    const preset = PRESETS_REGUA[chave];
    if (!preset) return;
    const payload = {
      floor_margin_pct: preset.floor_margin_pct,
      floor_profit_brl: preset.floor_profit_brl,
      target_margin_parado_pct: preset.target_margin_parado_pct,
      target_margin_medio_pct: preset.target_margin_medio_pct,
    };
    await gravar(conta.account_id, payload,
      `${conta.account_nickname}: limites "${preset.label}" aplicados.`);
    sincronizarReguas();
  }

  async function ligarDesligar(conta, ligar) {
    await gravar(
      conta.account_id,
      { auto_write: ligar === true },
      ligar === true
        ? `${conta.account_nickname}: o robô vai escrever sozinho na próxima execução.`
        : `${conta.account_nickname}: o robô parou de escrever. Nada foi desfeito no Mercado Livre.`,
    );
  }

  async function salvarLeva(conta) {
    const bruto = Number(levas[conta.account_id]);
    if (!Number.isInteger(bruto) || bruto < 1 || bruto > 200) {
      levas[conta.account_id] = conta.wave_size;   // volta ao valor válido do servidor
      erro.value = 'A rodada precisa ser um número inteiro entre 1 e 200.';
      return;
    }
    if (bruto === conta.wave_size) return;          // nada mudou: não gasta uma gravação
    await gravar(conta.account_id, { wave_size: bruto },
      `${conta.account_nickname}: rodada de ${bruto} anúncios.`);
  }

  async function aprovarLeva(conta) {
    await gravar(conta.account_id, { canary_approved: true },
      `${conta.account_nickname}: primeira rodada aprovada — o robô pode escrever na próxima execução.`);
  }

  async function retomar(conta) {
    await gravar(conta.account_id, { paused: false, pause_reason: '' },
      `${conta.account_nickname}: pausa removida.`);
  }

  async function pausarTudo() {
    salvando.value = 'todas';
    aviso.value = '';
    try {
      await AdvisorService.patchAutomation({ pause_all: true });
      await carregar();
      aviso.value = 'Escrita desligada em todas as contas. As promoções já aplicadas continuam no ar.';
    } catch (err) {
      erro.value = err?.response?.data?.error || 'Não foi possível pausar a escrita.';
    } finally {
      salvando.value = null;
    }
  }

  /**
   * Contas que VÃO escrever no próximo ciclo: conta ligada + sem pausa + modo global + sem kill
   * switch + **com o aval da primeira leva já dado**. Conta parada no portão do canário é
   * "autorizada", não "escrevendo" — anunciá-la como ativa seria mentira sobre o que vai acontecer.
   */
  const escrevendo = computed(() => contas.value.filter((conta) => (
    conta.auto_write && !conta.paused && !conta.canary_pending && modoGlobal.value && !killSwitch.value
  )));

  /** Contas que só esperam o aval do dono para começar a escrever. */
  const esperandoAval = computed(() => contas.value.filter((conta) => (
    conta.auto_write && !conta.paused && conta.canary_pending && modoGlobal.value && !killSwitch.value
  )));

  const travada = computed(() => killSwitch.value || !modoGlobal.value);

  /** Alertas de margem (SMART abaixo do limite) — sinalização, nunca pausa automática. */
  const alertas = computed(() => contas.value.flatMap((conta) => (conta.margin_alerts || [])
    .map((alerta) => ({ ...alerta, conta: conta.account_nickname, account_id: conta.account_id }))));

  return {
    data, carregando, erro, salvando, aviso, contas, levas, alertas,
    modoGlobal, killSwitch, travada, escrevendo, esperandoAval,
    carregar, sincronizarLevas, ligarDesligar, salvarLeva, aprovarLeva, retomar, pausarTudo,
    reguas, sincronizarReguas, salvarReguaCampo, aplicarPreset, PRESETS_REGUA,
  };
}
