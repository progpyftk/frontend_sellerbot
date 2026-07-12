<template>
  <div class="portal-page">
    <div class="portal-container" v-if="data">
      <div class="portal-header">
        <div class="color-dot" :style="`background: ${data.cor_hex}`" />
        <h1 class="portal-title">{{ data.nome }}</h1>
      </div>
      <div class="portal-subtitle">Acompanhamento da parceria com a Krivus</div>

      <q-chip class="q-mt-md" color="teal-1" text-color="teal-9" :label="data.current_stage_display" icon="flag" />

      <div class="kpi-grid q-mt-lg">
        <div class="kpi-card">
          <div class="kpi-label">GMV</div>
          <div class="kpi-value">{{ formatCurrency(data.gmv_30d) }}</div>
          <div class="kpi-sub">últimos 30 dias</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Pedidos</div>
          <div class="kpi-value">{{ data.orders_30d?.toLocaleString('pt-BR') }}</div>
          <div class="kpi-sub">últimos 30 dias</div>
        </div>
      </div>

      <h2 class="section-title q-mt-xl q-mb-md">Lifetime da Conta</h2>
      <div class="lifetime-track">
        <div v-for="b in lifetimeBadges" :key="b.key" class="lifetime-badge">
          <div class="lifetime-icon" :class="{ 'lifetime-icon--done': data.lifetime_da_conta[b.field] }">
            <q-icon :name="b.icon" size="20px" />
          </div>
          <div class="lifetime-label">{{ b.label }}</div>
          <div class="lifetime-date">{{ data.lifetime_da_conta[b.field] ? formatDate(data.lifetime_da_conta[b.field]) : '—' }}</div>
        </div>
      </div>

      <h2 class="section-title q-mt-xl q-mb-md">Marcos da Jornada</h2>
      <div class="milestone-list" v-if="data.milestones.length">
        <div v-for="(m, idx) in data.milestones" :key="idx" class="milestone-item">
          <div class="milestone-date">{{ formatDate(m.data) }}</div>
          <div class="milestone-title">{{ m.titulo }}</div>
        </div>
      </div>
      <div class="text-grey-5 text-caption" v-else>Nenhum marco registrado ainda.</div>

      <div class="portal-footer">Krivus Sales Performance</div>
    </div>

    <div class="portal-container" v-else-if="loading">
      <q-skeleton height="40px" class="q-mb-md" />
      <q-skeleton height="120px" />
    </div>

    <div class="portal-container" v-else>
      <div class="text-h6 text-grey-6">Link inválido ou expirado.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import KrivusService from 'src/services/KrivusService'

const route = useRoute()
const data = ref(null)
const loading = ref(true)

const lifetimeBadges = [
  { key: 'ativacao', field: 'ativacao_em', label: 'Ativação', icon: 'my_location' },
  { key: 'flex', field: 'flex_em', label: 'Flex', icon: 'local_shipping' },
  { key: 'coletas', field: 'coletas_em', label: 'Coletas', icon: 'inventory_2' },
  { key: 'full', field: 'full_em', label: 'Full', icon: 'rocket_launch' },
  { key: 'gold', field: 'gold_em', label: 'Gold', icon: 'emoji_events' },
]

function formatCurrency(v) {
  if (!v && v !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

onMounted(async () => {
  try {
    const res = await KrivusService.getPortalData(route.params.token)
    data.value = res.data
  } catch (e) {
    data.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.portal-page { background: #f8fafc; min-height: 100vh; }
.portal-container { max-width: 720px; margin: 0 auto; padding: 48px 24px; }

.portal-header { display: flex; align-items: center; gap: 10px; }
.color-dot { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; }
.portal-title { font-size: 26px; font-weight: 700; color: #1e293b; margin: 0; }
.portal-subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }

.section-title { font-size: 16px; font-weight: 600; color: #1e293b; margin: 0; }

.kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.kpi-card { background: #fff; border-radius: 10px; padding: 20px; border: 1px solid #e2e8f0; }
.kpi-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.kpi-value { font-size: 26px; font-weight: 700; color: #1e293b; margin: 4px 0; }
.kpi-sub { font-size: 11px; color: #94a3b8; }

.lifetime-track { display: flex; gap: 16px; flex-wrap: wrap; }
.lifetime-badge {
  display: flex; flex-direction: column; align-items: center;
  min-width: 90px; padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
}
.lifetime-icon {
  width: 40px; height: 40px; border-radius: 50%; background: #f1f5f9; color: #94a3b8;
  display: flex; align-items: center; justify-content: center; margin-bottom: 6px;
}
.lifetime-icon--done { background: #ccfbf1; color: #0d9488; }
.lifetime-label { font-size: 12px; font-weight: 600; color: #1e293b; }
.lifetime-date { font-size: 11px; color: #94a3b8; }

.milestone-list { display: flex; flex-direction: column; gap: 8px; }
.milestone-item {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;
  display: flex; align-items: center; gap: 12px;
}
.milestone-date { font-size: 11px; color: #94a3b8; min-width: 70px; }
.milestone-title { font-size: 13px; color: #1e293b; font-weight: 500; }

.portal-footer { text-align: center; color: #cbd5e1; font-size: 11px; margin-top: 48px; }
</style>
