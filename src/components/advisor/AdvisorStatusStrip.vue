<template>
  <!--
    PROMO-IA-45: barra de estado persistente (visível nas 3 abas) — kill switch,
    política de escrita, previsão de agenda e a parada de emergência. Antes isso aparecia
    duplicado nas superfícies Hoje e Automação.
  -->
  <div class="adv-strip" :class="{ 'adv-strip--alerta': killSwitch }" role="status">
    <span class="adv-strip__item">
      <q-icon :name="indisponivel ? 'cloud_off' : (killSwitch ? 'report' : 'smart_toy')" size="14px" aria-hidden="true" />
      {{ quemEscreve }}
    </span>
    <span v-if="!indisponivel" class="adv-strip__item">
      <q-icon name="schedule" size="14px" aria-hidden="true" />
      próxima previsão {{ proximo }}
    </span>
    <span v-if="!indisponivel && data?.last_cycle?.finished_at" class="adv-strip__item">
      Última execução registrada {{ formatarData(data.last_cycle.finished_at) }}
    </span>
    <q-btn v-if="indisponivel" flat dense no-caps icon="refresh" label="Tentar novamente" :loading="carregando" @click="carregar" />
    <q-btn
      v-if="contas.length && !confirmar"
      outline dense no-caps size="sm" color="red-10" icon="pause_circle"
      label="Pausar toda a escrita" :loading="pausando" @click="confirmar = true"
    />
    <template v-if="confirmar">
      <span class="adv-strip__item">Desliga a escrita em <strong>todas as contas</strong> agora — as promoções aplicadas continuam no ar.</span>
      <q-btn unelevated dense no-caps size="sm" color="red-10" label="Confirmar pausa" :loading="pausando" @click="pausar" />
      <q-btn flat dense no-caps size="sm" label="Cancelar" @click="confirmar = false" />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

import AdvisorService from 'src/services/AdvisorService';

const data = ref(null);
const indisponivel = ref(false);
const carregando = ref(false);
const pausando = ref(false);
const confirmar = ref(false);

async function carregar() {
  carregando.value = true;
  try {
    data.value = (await AdvisorService.getAutomation()).data;
    indisponivel.value = false;
  } catch {
    data.value = null;
    indisponivel.value = true;
  } finally {
    carregando.value = false;
  }
}

const contas = computed(() => Object.entries(data.value?.by_account || {})
  .map(([account_id, estado]) => ({ account_id, ...estado })));
const killSwitch = computed(() => Boolean(data.value?.kill_switch));
const modoGlobal = computed(() => data.value?.write_mode_global !== false);

const escrevendo = computed(() => contas.value.filter((c) => (
  c.auto_write && !c.paused && modoGlobal.value && !killSwitch.value
)));
const esperandoAval = computed(() => contas.value.filter((c) => (
  c.auto_write && !c.paused && c.canary_pending && Number(c.today?.aguardando_aval || 0) > 0 && modoGlobal.value && !killSwitch.value
)));

const quemEscreve = computed(() => {
  if (indisponivel.value) return 'Estado da automação indisponível';
  if (!data.value) return carregando.value ? 'Consultando estado da automação…' : 'Estado da automação desconhecido';
  if (killSwitch.value) return 'Escrita parada pelo interruptor de emergência';
  if (!modoGlobal.value) return 'Escrita automática desligada no ambiente';
  if (esperandoAval.value.length) return `${escrevendo.value.length} conta(s) habilitadas; novas rodadas aguardam aval`;
  if (escrevendo.value.some((c) => c.canary_pending)) return `${escrevendo.value.length} conta(s) habilitadas; primeira rodada limitada`;
  return escrevendo.value.length ? `${escrevendo.value.length} conta(s) com escrita automática habilitada` : 'Escrita automática desabilitada nas contas';
});

const proximo = computed(() => {
  const iso = data.value?.next_cycle_at;
  if (!iso) return 'sem horário previsto';
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
  return `${fmt.format(new Date(iso))} (Brasília)`;
});

function formatarData(iso) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}

async function pausar() {
  pausando.value = true;
  try {
    await AdvisorService.patchAutomation({ pause_all: true });
    confirmar.value = false;
    await carregar();
  } finally {
    pausando.value = false;
  }
}

onMounted(carregar);
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.adv-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-3;
  margin: $space-3 0 0;
  padding: $space-2 $space-3;
  border: 1px solid $border;
  border-radius: $radius-md;
  background: $surface-2;
  font-size: $text-xs-size;
  color: $tint-slate-text;

  &--alerta {
    background: $tint-red-bg;
    color: $tint-red-text;
    border-color: transparent;
  }

  &__item {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
  }
}
</style>
