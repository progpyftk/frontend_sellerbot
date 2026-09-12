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
import { computed, reactive, ref } from 'vue';

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

  async function ligarDesligar(conta, ligar) {
    await gravar(
      conta.account_id,
      { auto_write: ligar === true },
      ligar === true
        ? `${conta.account_nickname}: o robô vai escrever sozinho no próximo ciclo.`
        : `${conta.account_nickname}: o robô parou de escrever. Nada foi desfeito no Mercado Livre.`,
    );
  }

  async function salvarLeva(conta) {
    const bruto = Number(levas[conta.account_id]);
    if (!Number.isInteger(bruto) || bruto < 1 || bruto > 200) {
      levas[conta.account_id] = conta.wave_size;   // volta ao valor válido do servidor
      erro.value = 'A leva precisa ser um número inteiro entre 1 e 200.';
      return;
    }
    if (bruto === conta.wave_size) return;          // nada mudou: não gasta uma gravação
    await gravar(conta.account_id, { wave_size: bruto },
      `${conta.account_nickname}: leva de ${bruto} anúncios por onda.`);
  }

  async function aprovarLeva(conta) {
    await gravar(conta.account_id, { canary_approved: true },
      `${conta.account_nickname}: primeira leva aprovada — o robô pode escrever no próximo ciclo.`);
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
  };
}
