<template>
  <!--
    PROMO-IA-45: barra de estado persistente (visível nas 3 abas) — kill switch,
    quem escreve, próxima execução e a parada de emergência. Antes isso aparecia
    duplicado nas superfícies Hoje e Automação.
  -->
  <div class="adv-strip" :class="{ 'adv-strip--alerta': killSwitch }" role="status">
    <span class="adv-strip__item">
      <q-icon :name="killSwitch ? 'report' : 'smart_toy'" size="14px" aria-hidden="true" />
      {{ quemEscreve }}
    </span>
    <span class="adv-strip__item">
      <q-icon name="schedule" size="14px" aria-hidden="true" />
      próxima execução {{ proximo }}
    </span>
    <q-btn
      v-if="contas.length && !confirmar"
      outline dense no-caps size="sm" color="negative" icon="pause_circle"
      label="Pausar toda a escrita" :loading="pausando" @click="confirmar = true"
    />
    <template v-if="confirmar">
      <span class="adv-strip__item">Desliga a escrita em <strong>todas as contas</strong> agora — as promoções aplicadas continuam no ar.</span>
      <q-btn unelevated dense no-caps size="sm" color="negative" label="Confirmar pausa" :loading="pausando" @click="pausar" />
      <q-btn flat dense no-caps size="sm" label="Cancelar" @click="confirmar = false" />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

import AdvisorService from 'src/services/AdvisorService';

const data = ref(null);
const carregando = ref(false);
const pausando = ref(false);
const confirmar = ref(false);

async function carregar() {
  carregando.value = true;
  try {
    data.value = (await AdvisorService.getAutomation()).data;
  } catch {
    data.value = null;   // estado indisponível: a barra some em silêncio, nunca mente
  } finally {
    carregando.value = false;
  }
}

const contas = computed(() => Object.entries(data.value?.by_account || {})
  .map(([account_id, estado]) => ({ account_id, ...estado })));
const killSwitch = computed(() => Boolean(data.value?.kill_switch));
const modoGlobal = computed(() => data.value?.write_mode_global !== false);

const escrevendo = computed(() => contas.value.filter((c) => (
  c.auto_write && !c.paused && !c.canary_pending && modoGlobal.value && !killSwitch.value
)));
const esperandoAval = computed(() => contas.value.filter((c) => (
  c.auto_write && !c.paused && c.canary_pending && modoGlobal.value && !killSwitch.value
)));

const quemEscreve = computed(() => {
  if (killSwitch.value) return 'Escrita parada pelo interruptor de emergência';
  if (!modoGlobal.value) return 'Escrita automática desligada no ambiente';
  if (escrevendo.value.length) {
    const nomes = escrevendo.value.map((c) => c.account_nickname).join(', ');
    return `Escrevendo agora: ${nomes}`;
  }
  if (esperandoAval.value.length) return `${esperandoAval.value.length} conta(s) esperando seu aval`;
  return 'Nenhuma conta escrevendo agora';
});

const proximo = computed(() => {
  const iso = data.value?.next_cycle_at;
  if (!iso) return 'amanhã 09:00 (Brasília)';
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
  return `${fmt.format(new Date(iso))} (Brasília)`;
});

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
  color: $text-muted;

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
