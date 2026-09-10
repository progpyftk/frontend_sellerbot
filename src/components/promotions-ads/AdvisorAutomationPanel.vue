<template>
  <section class="av-auto" aria-label="Automação do assistente">
    <!-- Resumo: uma linha que responde "o robô está ligado? tem algo pedindo decisão?" -->
    <header class="av-auto__head">
      <div class="av-auto__title">
        <SbBadge :variant="robotVariant" :icon="robotIcon">{{ robotLabel }}</SbBadge>
        <span class="av-auto__pending" v-if="pendingApproval.length">
          {{ pendingApproval.length === 1 ? '1 conta aguardando seu aval' : `${pendingApproval.length} contas aguardando seu aval` }}
        </span>
        <span class="av-auto__alerts" v-if="totalAlerts">
          {{ totalAlerts === 1 ? '1 alerta de margem' : `${totalAlerts} alertas de margem` }}
        </span>
      </div>
      <q-btn
        flat dense no-caps
        :icon="open ? 'expand_less' : 'expand_more'"
        :label="open ? 'Ocultar automação' : 'Ver automação'"
        :aria-expanded="open ? 'true' : 'false'"
        @click="open = !open"
      />
    </header>

    <!-- F1: a automação pode ser consultada, mas não altera o Mercado Livre. -->
    <p v-if="globalOff" class="av-auto__note av-auto__note--warn">
      <strong>Modo Somente Sugestão ativo.</strong> O assistente recomenda, mas não aplica alterações no Mercado Livre.
    </p>
    <p v-if="killSwitch" class="av-auto__note av-auto__note--stop">
      <strong>Kill switch ligado:</strong> nenhuma escrita acontece em nenhuma conta, agora.
    </p>

    <template v-if="open">
      <p v-if="!accounts.length" class="av-auto__empty">Nenhuma conta conectada neste usuário.</p>

      <article v-for="acc in accounts" :key="acc.account_id" class="av-auto__card">
        <div class="av-auto__cardHead">
          <strong class="av-auto__acc">{{ acc.label }}</strong>
          <SbBadge :variant="acc.auto_write ? 'green' : 'slate'">
            {{ acc.auto_write ? 'escrita ligada' : 'escrita desligada' }}
          </SbBadge>
          <SbBadge v-if="acc.paused" variant="amber" icon="pause">pausada</SbBadge>
          <SbBadge variant="slate">ondas de {{ acc.wave_size }}</SbBadge>
          <SbBadge variant="slate">{{ acc.writes_today }} escrita(s) hoje</SbBadge>
        </div>

        <!-- Portão da primeira onda: sem este aval o ciclo para na primeira onda -->
        <div v-if="acc.canary_pending" class="av-auto__canary">
          <span>
            <strong>Primeira onda aguardando seu aval.</strong>
            O assistente escreve no máximo uma onda ({{ acc.wave_size }} anúncios) por ciclo até você aprovar.
          </span>
          <q-btn
            unelevated no-caps dense color="primary" icon="check"
            label="Aprovar primeira onda" :loading="busy === acc.account_id"
            @click="approveCanary(acc)"
          />
        </div>
        <p v-else class="av-auto__canaryOk">
          Primeira onda aprovada
          <template v-if="acc.canary_approved_by"> por {{ acc.canary_approved_by }}</template>
          <template v-if="acc.canary_approved_at"> em {{ stamp(acc.canary_approved_at) }}</template>.
        </p>

        <p v-if="acc.paused && acc.pause_reason" class="av-auto__pauseReason">Motivo da pausa: {{ acc.pause_reason }}</p>

        <!-- Alertas de margem: SMART abaixo de 25% e margem realizada abaixo do piso -->
        <ul v-if="acc.margin_alerts.length" class="av-auto__alertsList">
          <li v-for="(alert, i) in acc.margin_alerts" :key="`${alert.item_id}-${alert.kind}-${i}`" class="av-auto__alert">
            <SbBadge :variant="alert.kind === 'smart_low_margin' ? 'amber' : 'red'">
              {{ alertLabel(alert.kind) }}
            </SbBadge>
            <span class="av-auto__alertItem">{{ alert.item_id }}</span>
            <span v-if="alert.margin_pct !== undefined && alert.margin_pct !== null">margem {{ pct(alert.margin_pct) }}</span>
            <span v-if="alert.profit_unit !== undefined && alert.profit_unit !== null">lucro R$ {{ money(alert.profit_unit) }}/un</span>
            <span v-if="alert.profit_per_unit !== undefined && alert.profit_per_unit !== null">lucro R$ {{ money(alert.profit_per_unit) }}/un</span>
            <span v-if="alert.price">preço R$ {{ money(alert.price) }}</span>
            <span v-if="alert.checkpoint_days">D+{{ alert.checkpoint_days }}</span>
          </li>
        </ul>
        <p v-else class="av-auto__quiet">Nenhum alerta de margem nesta conta.</p>

        <!-- Controles: cada ação é explícita e reversível -->
        <div class="av-auto__controls">
          <template v-if="confirming === `${acc.account_id}:auto_write`">
            <span class="av-auto__confirm">
              Ligar a escrita automática faz o robô aplicar sozinho as promoções aprovadas pelo piso
              <strong>quando o modo de escrita do servidor estiver ligado</strong>. Confirmar?
            </span>
            <q-btn unelevated no-caps dense color="primary" label="Confirmar ligar" :loading="busy === acc.account_id" @click="patch(acc.account_id, { auto_write: true })" />
            <q-btn flat no-caps dense label="Cancelar" @click="confirming = ''" />
          </template>
          <template v-else>
            <q-btn
              :outline="acc.auto_write" :unelevated="!acc.auto_write" no-caps dense
              :color="acc.auto_write ? 'grey-9' : 'primary'"
              :icon="acc.auto_write ? 'power_settings_new' : 'bolt'"
              :label="acc.auto_write ? 'Desligar escrita automática' : 'Ligar escrita automática'"
              :loading="busy === acc.account_id"
              @click="acc.auto_write ? patch(acc.account_id, { auto_write: false }) : (confirming = `${acc.account_id}:auto_write`)"
            />
            <q-input
              v-model.number="waveDraft[acc.account_id]" dense outlined type="number" class="av-auto__wave"
              :aria-label="`Tamanho da onda de ${acc.label}`"
            />
            <q-btn
              flat no-caps dense icon="save" label="Salvar onda"
              :disable="!waveChanged(acc)" :loading="busy === acc.account_id"
              @click="patch(acc.account_id, { wave_size: Number(waveDraft[acc.account_id]) })"
            />
            <template v-if="pausing === acc.account_id">
              <q-input
                v-model="pauseDraft[acc.account_id]" dense outlined class="av-auto__wave"
                :aria-label="`Motivo da pausa de ${acc.label}`" placeholder="motivo da pausa"
              />
              <q-btn
                unelevated no-caps dense color="primary" label="Confirmar pausa"
                :loading="busy === acc.account_id"
                @click="patch(acc.account_id, { paused: true, pause_reason: pauseDraft[acc.account_id] || 'pausa manual no painel' })"
              />
              <q-btn flat no-caps dense label="Cancelar" @click="pausing = ''" />
            </template>
            <q-btn
              v-else flat no-caps dense :icon="acc.paused ? 'play_arrow' : 'pause'"
              :label="acc.paused ? 'Retomar conta' : 'Pausar conta'"
              :loading="busy === acc.account_id"
              @click="acc.paused ? patch(acc.account_id, { paused: false, pause_reason: '' }) : (pausing = acc.account_id)"
            />
          </template>
        </div>
      </article>
    </template>

    <p v-if="error" class="av-auto__error" role="alert">{{ error }}</p>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';

import SbBadge from 'src/components/common/SbBadge.vue';
import MercadoLivreService from 'src/services/MercadoLivreService';

const props = defineProps({
  // Bloco `automation` do GET /mercadolivre/promo-overview/
  automation: { type: Object, default: null },
});
const emit = defineEmits(['updated']);

const open = ref(false);
const busy = ref('');
const error = ref('');
const confirming = ref('');
const pausing = ref('');
const waveDraft = reactive({});
const pauseDraft = reactive({});

const ALERT_LABELS = {
  smart_low_margin: 'SMART com margem baixa',
  realized_below_floor: 'Margem realizada abaixo do piso',
};

const globalOff = computed(() => props.automation?.write_mode_global === false);
const killSwitch = computed(() => Boolean(props.automation?.kill_switch));

const accounts = computed(() => {
  const byAccount = props.automation?.by_account || {};
  return Object.entries(byAccount).map(([accountId, state]) => {
    if (waveDraft[accountId] === undefined) waveDraft[accountId] = state.wave_size ?? 50;
    if (pauseDraft[accountId] === undefined) pauseDraft[accountId] = '';
    return {
      account_id: accountId,
      label: state.account_nickname || accountId,
      auto_write: Boolean(state.auto_write),
      wave_size: state.wave_size ?? 50,
      paused: Boolean(state.paused),
      pause_reason: state.pause_reason || '',
      canary_pending: Boolean(state.canary_pending),
      canary_approved_at: state.canary_approved_at || null,
      canary_approved_by: state.canary_approved_by || '',
      writes_today: state.writes_today ?? 0,
      margin_alerts: Array.isArray(state.margin_alerts) ? state.margin_alerts : [],
    };
  });
});

const pendingApproval = computed(() => accounts.value.filter((a) => a.canary_pending));
const totalAlerts = computed(() => accounts.value.reduce((sum, a) => sum + a.margin_alerts.length, 0));

const anyWrite = computed(() => accounts.value.some((a) => a.auto_write) && !globalOff.value && !killSwitch.value);
const robotLabel = computed(() => {
  if (killSwitch.value) return 'Robô parado pelo kill switch';
  if (globalOff.value) return 'Modo Somente Sugestão';
  return anyWrite.value ? 'Robô ligado' : 'Robô desligado nas contas';
});
const robotVariant = computed(() => {
  if (killSwitch.value) return 'red';
  if (globalOff.value) return 'slate';
  return anyWrite.value ? 'green' : 'amber';
});
const robotIcon = computed(() => {
  if (killSwitch.value) return 'block';
  if (globalOff.value) return 'visibility';
  return anyWrite.value ? 'smart_toy' : 'pause';
});

function alertLabel(kind) {
  return ALERT_LABELS[kind] || 'Alerta de margem';
}

function pct(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n}%` : '—';
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '—';
}

function stamp(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR');
}

function waveChanged(acc) {
  return Number(waveDraft[acc.account_id]) !== Number(acc.wave_size);
}

function approveCanary(acc) {
  patch(acc.account_id, { canary_approved: true, approved_by: 'dono' });
}

async function patch(accountId, payload) {
  busy.value = accountId;
  error.value = '';
  confirming.value = '';
  pausing.value = '';
  try {
    const { data } = await MercadoLivreService.patchAdvisorPolicy({ account_id: accountId, ...payload });
    // O PATCH devolve o estado atualizado da conta: atualiza só o card, sem recarregar a lista.
    emit('updated', { account_id: accountId, state: data });
  } catch (err) {
    error.value = err?.response?.data?.error || 'Não foi possível salvar agora. Nada mudou no Mercado Livre.';
  } finally {
    busy.value = '';
  }
}
</script>

<style lang="scss" scoped>
.av-auto {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 14px;
}
.av-auto__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.av-auto__title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.av-auto__pending { font-size: 12px; font-weight: 600; color: #92400e; }
.av-auto__alerts { font-size: 12px; font-weight: 600; color: #991b1b; }
.av-auto__note { font-size: 12px; margin: 8px 0 0; color: #475569; }
.av-auto__note--warn { color: #92400e; }
.av-auto__note--stop { color: #991b1b; }
.av-auto__empty { font-size: 12px; color: #64748b; margin: 8px 0 0; }
.av-auto__card { border-top: 1px solid #f1f5f9; margin-top: 12px; padding-top: 10px; }
.av-auto__cardHead { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.av-auto__acc { font-size: 13px; }
.av-auto__canary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  font-size: 12px;
  color: #78350f;
}
.av-auto__canaryOk { font-size: 12px; color: #166534; margin: 8px 0 0; }
.av-auto__pauseReason { font-size: 12px; color: #92400e; margin: 6px 0 0; }
.av-auto__alertsList { list-style: none; margin: 8px 0 0; padding: 0; }
.av-auto__alert {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #334155;
  padding: 4px 0;
  border-top: 1px dashed #f1f5f9;
}
.av-auto__alertItem { font-weight: 600; }
.av-auto__quiet { font-size: 12px; color: #64748b; margin: 6px 0 0; }
.av-auto__controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.av-auto__confirm { font-size: 12px; color: #78350f; max-width: 46ch; }
.av-auto__wave { max-width: 130px; }
.av-auto__error { font-size: 12px; color: #991b1b; margin: 8px 0 0; }
</style>
