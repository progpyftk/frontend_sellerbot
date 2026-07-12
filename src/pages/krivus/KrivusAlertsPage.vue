<template>
  <q-page class="krivus-page">
    <div class="krivus-container">
      <SbPageHeader title="Alertas" :subtitle="`${alerts.total || 0} pendências que precisam de atenção`" icon="notifications">
        <template #actions>
          <q-select
            v-model="typeFilter"
            :options="typeOptions"
            dense outlined emit-value map-options clearable
            label="Filtrar por tipo"
            style="min-width: 220px"
          />
        </template>
      </SbPageHeader>

      <SbEmptyState
        v-if="!loading && filteredAlerts.length === 0"
        title="Tudo em dia!"
        message="Nenhum alerta no momento — cobranças em dia, tarefas cumpridas e todos os clientes com contato recente."
      />

      <div class="alerts-grid" v-else-if="!loading">
        <SbCard v-for="(a, idx) in filteredAlerts" :key="idx" hover class="alert-card" @click="$router.push(`/krivus/${a.client_slug}`)">
          <div class="row items-center q-gutter-sm">
            <div class="alert-icon" :class="`alert-icon--${a.tipo}`">
              <q-icon :name="alertIcon(a.tipo)" size="18px" />
            </div>
            <div style="flex:1">
              <div class="alert-client">{{ a.client_nome }}</div>
              <div class="alert-message">{{ a.mensagem }}</div>
            </div>
            <SbBadge :variant="alertVariant(a.tipo)">{{ alertLabel(a.tipo) }}</SbBadge>
          </div>
        </SbCard>
      </div>

      <div class="alerts-grid" v-else>
        <q-skeleton v-for="i in 6" :key="i" height="80px" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import KrivusService from 'src/services/KrivusService'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'

const alerts = ref({ total: 0, alerts: [] })
const loading = ref(true)
const typeFilter = ref(null)

const typeOptions = [
  { label: 'Cobrança atrasada', value: 'cobranca_atrasada' },
  { label: 'Tarefa vencida', value: 'tarefa_vencida' },
  { label: 'Cliente parado', value: 'cliente_parado' },
]

const filteredAlerts = computed(() => {
  if (!typeFilter.value) return alerts.value.alerts
  return alerts.value.alerts.filter((a) => a.tipo === typeFilter.value)
})

function alertIcon(tipo) {
  return { cobranca_atrasada: 'payments', tarefa_vencida: 'task_alt', cliente_parado: 'schedule' }[tipo] || 'warning'
}
function alertVariant(tipo) {
  return { cobranca_atrasada: 'red', tarefa_vencida: 'amber', cliente_parado: 'slate' }[tipo] || 'slate'
}
function alertLabel(tipo) {
  return { cobranca_atrasada: 'Cobrança', tarefa_vencida: 'Tarefa', cliente_parado: 'Sem contato' }[tipo] || tipo
}

async function loadAlerts() {
  loading.value = true
  try {
    const res = await KrivusService.getAlerts()
    alerts.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(loadAlerts)
</script>

<style lang="scss" scoped>
@import 'src/css/tokens';

.krivus-page { background: #f8fafc; }
.krivus-container { max-width: 900px; margin: 0 auto; padding: $space-6; }

.alerts-grid { display: flex; flex-direction: column; gap: $space-2; }
.alert-card { cursor: pointer; }

.alert-icon {
  width: 36px; height: 36px; border-radius: $radius-md;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.alert-icon--cobranca_atrasada { background: $tint-red-bg; color: $tint-red-text; }
.alert-icon--tarefa_vencida { background: $tint-amber-bg; color: $tint-amber-text; }
.alert-icon--cliente_parado { background: $tint-slate-bg; color: $tint-slate-text; }

.alert-client { font-size: $text-small-size; font-weight: $font-semibold; color: $text-primary; }
.alert-message { font-size: 12px; color: $text-muted; }
</style>
