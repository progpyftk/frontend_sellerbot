<template>
  <q-page class="health-page">

    <!-- ═══ HEADER ═══════════════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon"><q-icon name="monitor_heart" size="20px" /></div>
        <div>
          <div class="header-eyebrow">SellerBot</div>
          <div class="header-title">Saúde do Sistema</div>
        </div>
      </div>
      <div class="header-right">
        <span v-if="checkedAt" class="checked-at">Atualizado: {{ fmtTime(checkedAt) }}</span>
        <button class="refresh-btn" :class="{ spinning: loading }" @click="load">
          <q-icon name="refresh" size="16px" />
        </button>
      </div>
    </div>

    <div v-if="loading && !data" class="center-loading">
      <q-spinner-dots color="teal" size="40px" />
    </div>

    <div v-else-if="error" class="center-error">{{ error }}</div>

    <template v-else-if="data">

      <!-- ═══ SISTEMA ═══════════════════════════════════════════════════════ -->
      <div class="section-title">Infraestrutura</div>
      <div class="infra-grid">

        <!-- DB -->
        <div class="infra-card" :class="data.system.db.ok ? 'card--ok' : 'card--error'">
          <div class="infra-icon">
            <q-icon :name="data.system.db.ok ? 'storage' : 'error_outline'" size="22px" />
          </div>
          <div class="infra-body">
            <div class="infra-label">Banco de Dados</div>
            <div class="infra-value" :class="data.system.db.ok ? 'val--ok' : 'val--error'">
              {{ data.system.db.ok ? 'Online' : 'Offline' }}
            </div>
            <div class="infra-meta" v-if="data.system.db.ok">
              Latência: <strong>{{ data.system.db.ping_ms }} ms</strong>
              &nbsp;·&nbsp;
              Conexões ativas: <strong>{{ data.system.db.active_connections ?? '—' }}</strong>
            </div>
            <div class="infra-meta val--error" v-else>{{ data.system.db.error }}</div>
          </div>
        </div>

        <!-- Memória -->
        <div class="infra-card card--ok">
          <div class="infra-icon"><q-icon name="memory" size="22px" /></div>
          <div class="infra-body">
            <div class="infra-label">Memória (processo)</div>
            <div class="infra-value val--ok">{{ data.system.memory_mb ?? '—' }} MB</div>
            <div class="infra-meta">RSS do processo Django/uvicorn</div>
          </div>
        </div>

      </div>

      <!-- ═══ ROTINAS ════════════════════════════════════════════════════════ -->
      <div class="section-title" style="margin-top: 24px;">Rotinas Agendadas</div>

      <div class="routines-table">
        <div class="rt-header">
          <span class="col-name">Rotina</span>
          <span class="col-status">Status</span>
          <span class="col-time">Última execução</span>
          <span class="col-dur">Duração</span>
          <span class="col-items">Itens proc.</span>
          <span class="col-errs">Erros</span>
          <span class="col-hist">7 dias</span>
        </div>

        <div
          v-for="r in data.routines" :key="r.routine_name"
          class="rt-row"
          :class="{ 'rt-row--expanded': expanded === r.routine_name }"
          @click="toggleExpand(r.routine_name)"
        >
          <!-- Main row -->
          <div class="rt-main">
            <span class="col-name">
              <q-icon
                :name="expanded === r.routine_name ? 'expand_less' : 'expand_more'"
                size="14px" class="expand-icon"
              />
              {{ r.label }}
            </span>
            <span class="col-status">
              <span v-if="!r.last_run" class="badge badge--none">Sem dados</span>
              <span v-else :class="['badge', `badge--${r.last_run.status}`]">
                {{ statusLabel(r.last_run.status) }}
              </span>
            </span>
            <span class="col-time">{{ r.last_run ? fmtDatetime(r.last_run.finished_at) : '—' }}</span>
            <span class="col-dur">{{ r.last_run ? fmtDuration(r.last_run.duration_seconds) : '—' }}</span>
            <span class="col-items">{{ r.last_run?.items_processed ?? '—' }}</span>
            <span class="col-errs" :class="(r.last_run?.errors_count || 0) > 0 ? 'val--error' : ''">
              {{ r.last_run?.errors_count ?? '—' }}
            </span>
            <span class="col-hist">
              <span v-if="r.history_7d.total_runs === 0" class="hist-none">—</span>
              <span v-else class="hist-pills">
                <span v-if="r.history_7d.success"  class="hist-pill pill--success">{{ r.history_7d.success }} ✓</span>
                <span v-if="r.history_7d.partial"  class="hist-pill pill--partial">{{ r.history_7d.partial }} ~</span>
                <span v-if="r.history_7d.error"    class="hist-pill pill--error">{{ r.history_7d.error }} ✗</span>
                <span v-if="r.history_7d.skipped"  class="hist-pill pill--skipped">{{ r.history_7d.skipped }} skip</span>
              </span>
            </span>
          </div>

          <!-- Expanded history -->
          <div v-if="expanded === r.routine_name" class="rt-detail">
            <div class="detail-title">Histórico recente (últimos 7 dias)</div>
            <div v-if="r.recent_logs.length === 0" class="detail-empty">Nenhum registro ainda.</div>
            <table v-else class="detail-table">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Status</th>
                  <th>Concluído em</th>
                  <th>Duração</th>
                  <th>Itens</th>
                  <th>Erros</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in r.recent_logs" :key="log.id">
                  <td>{{ log.account_ref || '—' }}</td>
                  <td>
                    <span :class="['badge', `badge--${log.status}`]">{{ statusLabel(log.status) }}</span>
                  </td>
                  <td>{{ fmtDatetime(log.finished_at) }}</td>
                  <td>{{ fmtDuration(log.duration_seconds) }}</td>
                  <td>{{ log.items_processed }}</td>
                  <td :class="log.errors_count > 0 ? 'val--error' : ''">{{ log.errors_count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </template>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import CoreService from 'src/services/CoreService'

const data      = ref(null)
const loading   = ref(false)
const error     = ref(null)
const checkedAt = ref(null)
const expanded  = ref(null)

async function load() {
  loading.value = true
  error.value   = null
  try {
    const res = await CoreService.getSystemHealth()
    data.value      = res.data
    checkedAt.value = res.data.checked_at
  } catch (e) {
    error.value = 'Erro ao carregar dados de saúde.'
    console.error(e)
  } finally {
    loading.value = false
  }
}

function toggleExpand(name) {
  expanded.value = expanded.value === name ? null : name
}

function statusLabel(s) {
  return { success: 'OK', partial: 'Parcial', error: 'Erro', skipped: 'Pulado' }[s] || s
}

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDatetime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(s) {
  if (s == null) return '—'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

onMounted(load)
</script>

<style scoped>
.health-page { padding: 0 0 40px; background: #0f1117; min-height: 100vh; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.header-left { display: flex; align-items: center; gap: 12px; }
.header-icon {
  width: 36px; height: 36px; border-radius: 8px;
  background: rgba(20,184,166,0.15); display: flex; align-items: center;
  justify-content: center; color: #14b8a6;
}
.header-eyebrow { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: .08em; }
.header-title { font-size: 17px; font-weight: 700; color: #e2e8f0; }
.header-right { display: flex; align-items: center; gap: 10px; }
.checked-at { font-size: 11px; color: #64748b; }
.refresh-btn {
  width: 30px; height: 30px; border-radius: 6px; background: rgba(255,255,255,0.06);
  border: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center;
  justify-content: center; transition: background .15s;
}
.refresh-btn:hover { background: rgba(255,255,255,0.1); }
.refresh-btn.spinning { animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.center-loading, .center-error {
  display: flex; align-items: center; justify-content: center;
  height: 200px; color: #64748b;
}

/* ── Infra ── */
.section-title {
  padding: 20px 24px 10px;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .08em; color: #64748b;
}
.infra-grid { display: flex; gap: 14px; padding: 0 24px; flex-wrap: wrap; }
.infra-card {
  flex: 1; min-width: 220px;
  background: #1a1f2e; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px; padding: 16px; display: flex; gap: 14px; align-items: flex-start;
}
.card--ok    { border-left: 3px solid #22c55e; }
.card--error { border-left: 3px solid #ef4444; }
.infra-icon { color: #94a3b8; padding-top: 2px; }
.infra-label { font-size: 11px; color: #64748b; margin-bottom: 3px; }
.infra-value { font-size: 18px; font-weight: 700; margin-bottom: 4px; color: #e2e8f0; }
.infra-meta { font-size: 11px; color: #64748b; }
.val--ok    { color: #22c55e; }
.val--error { color: #ef4444; }

/* ── Routines table ── */
.routines-table { padding: 0 24px; }

.rt-header, .rt-main {
  display: grid;
  grid-template-columns: 1fr 90px 130px 80px 80px 60px 120px;
  gap: 8px; align-items: center;
}
.rt-header {
  padding: 8px 14px; font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .06em; color: #475569;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.rt-row {
  background: #1a1f2e; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px; margin-bottom: 6px; cursor: pointer;
  transition: border-color .15s;
}
.rt-row:hover { border-color: rgba(255,255,255,0.12); }
.rt-row--expanded { border-color: rgba(20,184,166,0.3); }

.rt-main { padding: 12px 14px; font-size: 13px; color: #cbd5e1; }

.col-name { display: flex; align-items: center; gap: 6px; font-weight: 500; }
.expand-icon { color: #475569; flex-shrink: 0; }

/* Badges */
.badge {
  display: inline-block; padding: 2px 8px; border-radius: 4px;
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em;
}
.badge--success { background: rgba(34,197,94,.15);  color: #22c55e; }
.badge--partial { background: rgba(245,158,11,.15); color: #f59e0b; }
.badge--error   { background: rgba(239,68,68,.15);  color: #ef4444; }
.badge--skipped { background: rgba(100,116,139,.15);color: #94a3b8; }
.badge--none    { background: rgba(100,116,139,.1); color: #475569; }

/* History pills */
.hist-pills { display: flex; gap: 4px; flex-wrap: wrap; }
.hist-pill {
  padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;
}
.pill--success { background: rgba(34,197,94,.12);  color: #22c55e; }
.pill--partial { background: rgba(245,158,11,.12); color: #f59e0b; }
.pill--error   { background: rgba(239,68,68,.12);  color: #ef4444; }
.pill--skipped { background: rgba(100,116,139,.1); color: #94a3b8; }
.hist-none { color: #475569; font-size: 12px; }

/* ── Detail ── */
.rt-detail {
  padding: 0 14px 14px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.detail-title { font-size: 11px; color: #64748b; padding: 10px 0 8px; text-transform: uppercase; letter-spacing: .06em; }
.detail-empty { font-size: 12px; color: #475569; }
.detail-table { width: 100%; border-collapse: collapse; font-size: 12px; color: #94a3b8; }
.detail-table th { padding: 5px 8px; text-align: left; color: #475569; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.05); }
.detail-table td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.03); }
.detail-table tr:last-child td { border-bottom: none; }

@media (max-width: 600px) {
  .page-header { padding: 10px 12px; }
  .content-body { padding: 12px; }
}
</style>
