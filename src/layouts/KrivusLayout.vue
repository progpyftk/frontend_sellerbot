<template>
  <q-layout view="hHh lpR fFf" id="krivus-layout">

    <!-- ══════════════════════════════════════════ SIDEBAR -->
    <q-drawer v-model="drawer" side="left" :width="248" :breakpoint="768" class="sidebar" no-swipe-close>

      <!-- Brand -->
      <div class="sidebar-brand">
        <div class="brand-mark">
          <q-icon name="business_center" size="18px" />
        </div>
        <div>
          <div class="brand-name">Krivus</div>
          <div class="brand-sub">Sales Performance</div>
        </div>
      </div>

      <div class="back-btn-wrap q-px-md q-pt-sm q-pb-xs">
        <q-btn
          flat no-caps label="Voltar ao SellerBot" icon="arrow_back"
          class="full-width back-btn"
          @click="$router.push('/app/dashboard')"
        />
      </div>

      <!-- Busca rápida de clientes -->
      <div class="q-px-md q-pt-sm q-pb-xs">
        <q-select
          v-model="searchSlug"
          :options="filteredClientOptions"
          dense outlined clearable
          use-input hide-selected fill-input
          input-debounce="0"
          placeholder="Buscar cliente..."
          class="client-search"
          @filter="filterClients"
          @update:model-value="onSelectClient"
        >
          <template #prepend><q-icon name="search" size="16px" color="grey-6" /></template>
          <template #no-option>
            <q-item><q-item-section class="text-grey-5 text-caption">Nenhum cliente encontrado.</q-item-section></q-item>
          </template>
        </q-select>
      </div>

      <!-- Nav scroll -->
      <q-scroll-area class="sidebar-scroll">
        <nav class="sidebar-nav">
          <router-link to="/krivus" custom v-slot="{ isExactActive, navigate }">
            <button :class="['nav-item', 'nav-item--top', isExactActive && 'nav-item--active']" @click="navigate">
              <span class="nav-icon-wrap"><q-icon name="dashboard" size="16px" /></span>
              <span class="nav-label">Visão Geral</span>
            </button>
          </router-link>

          <router-link to="/krivus/pipeline" custom v-slot="{ isActive, navigate }">
            <button :class="['nav-item', 'nav-item--top', isActive && 'nav-item--active']" @click="navigate">
              <span class="nav-icon-wrap"><q-icon name="view_kanban" size="16px" /></span>
              <span class="nav-label">Pipeline</span>
            </button>
          </router-link>

          <router-link to="/krivus/cobrancas" custom v-slot="{ isActive, navigate }">
            <button :class="['nav-item', 'nav-item--top', isActive && 'nav-item--active']" @click="navigate">
              <span class="nav-icon-wrap"><q-icon name="payments" size="16px" /></span>
              <span class="nav-label">Cobranças</span>
            </button>
          </router-link>

          <router-link to="/krivus/templates" custom v-slot="{ isActive, navigate }">
            <button :class="['nav-item', 'nav-item--top', isActive && 'nav-item--active']" @click="navigate">
              <span class="nav-icon-wrap"><q-icon name="description" size="16px" /></span>
              <span class="nav-label">Templates</span>
            </button>
          </router-link>

          <router-link to="/krivus/alertas" custom v-slot="{ isActive, navigate }">
            <button :class="['nav-item', 'nav-item--top', isActive && 'nav-item--active']" @click="navigate">
              <span class="nav-icon-wrap"><q-icon name="notifications" size="16px" /></span>
              <span class="nav-label">Alertas</span>
              <span v-if="alertsCount > 0" class="nav-badge">{{ alertsCount }}</span>
            </button>
          </router-link>

          <div class="nav-sep" />
          <div class="nav-clients-label">Clientes recentes</div>

          <router-link
            v-for="c in clients.slice(0, 8)"
            :key="c.slug"
            :to="`/krivus/${c.slug}`"
            custom
            v-slot="{ isActive, navigate }"
          >
            <button :class="['nav-item', isActive && 'nav-item--active']" @click="navigate">
              <span class="nav-icon-wrap nav-icon-wrap--dot"><span class="client-dot" :style="`background:${c.cor_hex}`" /></span>
              <span class="nav-label">{{ c.nome }}</span>
            </button>
          </router-link>
        </nav>
      </q-scroll-area>

      <!-- Footer user -->
      <div class="sidebar-footer" v-if="currentUser">
        <div class="sidebar-user">
          <q-avatar size="32px" class="sidebar-avatar">
            <img :src="currentUser.avatarUrl || defaultAvatar" />
          </q-avatar>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">{{ currentUser.username }}</div>
            <div class="sidebar-user-role">Equipe Krivus</div>
          </div>
        </div>
      </div>

    </q-drawer>

    <!-- ══════════════════════════════════════════ HEADER (mobile toggle only) -->
    <q-header v-if="$q.screen.lt.md" class="krivus-header">
      <q-toolbar>
        <button class="menu-toggle" @click="drawer = !drawer">
          <q-icon name="menu" size="20px" />
        </button>
        <q-space />
      </q-toolbar>
    </q-header>

    <!-- Page content -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <FeedbackFAB />

  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useStore } from 'src/stores/store'
import KrivusService from 'src/services/KrivusService'
import FeedbackFAB from 'src/components/common/FeedbackFAB.vue'

const router = useRouter()
const $q = useQuasar()
const store = useStore()
const currentUser = computed(() => store.currentUser)
const defaultAvatar = 'https://cdn.quasar.dev/img/boy-avatar.png'

const drawer = ref($q.screen.gt.sm)
const clients = ref([])
const filteredClientOptions = ref([])
const searchSlug = ref(null)
const alertsCount = ref(0)

async function loadClients() {
  try {
    const res = await KrivusService.getClients()
    clients.value = res.data
  } catch {
    // silently fail — layout still renders
  }
}

async function loadAlertsCount() {
  try {
    const res = await KrivusService.getAlerts()
    alertsCount.value = res.data.total
  } catch {
    // silently fail
  }
}

function filterClients(val, update) {
  update(() => {
    const needle = (val || '').toLowerCase()
    filteredClientOptions.value = clients.value
      .filter((c) => c.nome.toLowerCase().includes(needle))
      .map((c) => ({ label: c.nome, value: c.slug }))
  })
}

function onSelectClient(slug) {
  if (!slug) return
  router.push(`/krivus/${slug}`)
  searchSlug.value = null
}

onMounted(() => {
  loadClients()
  loadAlertsCount()
})
</script>

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

#krivus-layout {
  background: #f8fafc;
}

/* ── Sidebar (mesmo padrão visual do MainLayout) ── */
:deep(.sidebar) {
  background: #ffffff !important;
  border-right: 1px solid #e2e8f0 !important;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 16px 14px;
  position: relative;
}
.sidebar-brand::after {
  content: '';
  position: absolute;
  bottom: 0; left: 16px; right: 16px;
  height: 1px;
  background: #f1f5f9;
}

.brand-mark {
  width: 38px; height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.30);
}

.brand-name { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px; line-height: 1; }
.brand-sub { font-size: 10px; color: #94a3b8; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 4px; }

.back-btn { font-size: 12px !important; font-weight: 600 !important; color: #64748b !important; justify-content: flex-start !important; }
.back-btn:hover { color: #0f766e !important; }

.client-search {
  :deep(.q-field__control) { border-radius: 8px; }
}

.sidebar-scroll { height: calc(100% - 220px); }
.sidebar-nav { padding: 8px 10px; }

.nav-sep { height: 1px; background: #f1f5f9; margin: 10px 4px; }
.nav-clients-label {
  font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  color: #94a3b8; padding: 6px 10px 4px;
}

.nav-item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 8px 10px; border-radius: 8px; border: none;
  background: transparent; cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
  text-align: left; margin: 1px 0; position: relative;
}
.nav-item:hover:not(.nav-item--active) { background: #f8fafc; }
.nav-item--active { background: #f0fdf9; color: #0f766e; }
.nav-item--active::before {
  content: ''; position: absolute; left: -11px; top: 50%; transform: translateY(-50%);
  width: 3px; height: 60%; border-radius: 0 3px 3px 0; background: #0d9488;
}
.nav-item--top { margin-bottom: 2px; }

.nav-icon-wrap {
  width: 28px; height: 28px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  background: #f1f5f9; color: #475569;
  transition: background 150ms ease, color 150ms ease;
}
.nav-icon-wrap--dot { background: transparent; }
.client-dot { width: 10px; height: 10px; border-radius: 50%; display: block; }

.nav-item--active .nav-icon-wrap { background: #ccfbf1; color: #0d9488; }
.nav-item:hover:not(.nav-item--active) .nav-icon-wrap { background: #e2e8f0; color: #0f172a; }

.nav-label {
  font-size: 13px; font-weight: 500; color: #334155; flex: 1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.nav-item--active .nav-label { color: #0f766e; font-weight: 600; }

.nav-badge {
  background: #dc2626; color: #fff; font-size: 10px; font-weight: 700;
  border-radius: 999px; padding: 1px 6px; min-width: 18px; text-align: center;
}

.sidebar-footer {
  position: absolute; bottom: 0; left: 0; right: 0;
  border-top: 1px solid #f1f5f9; padding: 12px 16px; background: #fff;
}
.sidebar-user { display: flex; align-items: center; gap: 10px; }
.sidebar-user-name { font-size: 13px; font-weight: 600; color: #0f172a; }
.sidebar-user-role { font-size: 11px; color: #94a3b8; }

/* ── Header (mobile) ── */
.krivus-header {
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: none;
}
.menu-toggle {
  border: none; background: transparent; color: #475569; cursor: pointer;
  padding: 8px; border-radius: 8px; display: flex;
}
</style>
