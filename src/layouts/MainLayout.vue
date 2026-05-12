<template>
  <q-layout view="hHh lpR fFf" id="inspire">

    <!-- ══════════════════════════════════════════ SIDEBAR -->
    <q-drawer v-model="drawer" side="left" :width="248" :breakpoint="768" class="sidebar" no-swipe-close>

      <!-- Brand -->
      <div class="sidebar-brand">
        <div class="brand-icon">
          <q-icon name="rocket_launch" size="18px" />
        </div>
        <div>
          <div class="brand-name">SellerBot</div>
          <div class="brand-sub">Painel de Controle</div>
        </div>
      </div>

      <!-- Nav scroll -->
      <q-scroll-area class="sidebar-scroll">
        <nav class="sidebar-nav">

          <!-- Dashboard — item fixo fora do aninhamento -->
          <router-link to="/app/dashboard" custom v-slot="{ isActive, navigate }">
            <button :class="['nav-item', 'nav-item--top', isActive && 'nav-item--active']" @click="navigate">
              <span class="nav-icon-wrap"
                :style="isActive ? '' : '--icon-color:#2dd4bf;--icon-bg:rgba(45,212,191,.15)'">
                <q-icon name="mdi-view-dashboard" size="15px" />
              </span>
              <span class="nav-label">Dashboard</span>
            </button>
          </router-link>

          <div class="nav-sep" />

          <template v-for="(section, si) in menuSections" :key="si">

            <!-- Parent row (clicável para expandir/colapsar) -->
            <button :class="['nav-parent', expandedSections.includes(si) && 'nav-parent--open']"
              :style="`--s-accent: ${section.accent}`"
              @click="toggleSection(si)">
              <span v-if="section.ml" class="nav-ml-badge">ML</span>
              <span v-else-if="section.shopee" class="nav-shopee-badge">SHOPEE</span>
              <span v-else class="nav-section-icon">
                <q-icon :name="section.sectionIcon || 'circle'" size="12px" />
              </span>
              <span class="nav-parent-label">{{ section.title }}</span>
              <q-icon name="expand_more" size="14px"
                :class="['nav-chevron', expandedSections.includes(si) && 'nav-chevron--open']" />
            </button>

            <!-- Itens aninhados (v-show p/ CSS transition funcionar) -->
            <div class="nav-children" :class="expandedSections.includes(si) && 'nav-children--open'">
              <router-link v-for="item in section.items" :key="item.route" :to="{ name: item.route }" custom
                v-slot="{ isActive, navigate }">
                <button :class="['nav-item', isActive && 'nav-item--active']" @click="navigate">
                  <span class="nav-tree-line" />
                  <span class="nav-icon-wrap"
                    :style="isActive ? '' : `--icon-color:${item.color};--icon-bg:${item.bg}`">
                    <q-icon :name="item.icon" size="15px" />
                  </span>
                  <span class="nav-label">{{ item.label }}</span>
                  <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
                </button>
              </router-link>
            </div>

            <div v-if="si < menuSections.length - 1" class="nav-sep" />
          </template>
        </nav>
      </q-scroll-area>

      <!-- User -->
      <div class="sidebar-footer" v-if="currentUser">
        <div class="sidebar-user">
          <q-avatar size="32px" class="sidebar-avatar">
            <img :src="currentUser.avatarUrl || defaultAvatar" />
          </q-avatar>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">{{ currentUser.username }}</div>
            <div class="sidebar-user-role">Administrador</div>
          </div>
          <q-btn flat round dense icon="logout" class="sidebar-logout" @click="handleLogout">
            <q-tooltip anchor="top middle" self="bottom middle" :offset="[0, 6]">Sair</q-tooltip>
          </q-btn>
        </div>
      </div>

    </q-drawer>

    <!-- ══════════════════════════════════════════ HEADER -->
    <q-header class="app-header">
      <q-toolbar class="app-toolbar">

        <button class="menu-toggle" @click="drawer = !drawer">
          <q-icon name="menu" size="20px" />
        </button>

        <q-space />

        <!-- User chip -->
        <div class="header-user-chip" v-if="currentUser">
          <q-btn-dropdown flat no-caps dense auto-close class="user-chip-btn">
            <template v-slot:label>
              <div class="user-chip-inner">
                <q-avatar size="22px" class="chip-avatar">
                  <img :src="currentUser.avatarUrl || defaultAvatar" />
                </q-avatar>
                <span class="chip-name">{{ currentUser.username }}</span>
                <q-icon name="expand_more" size="14px" class="chip-chevron" />
              </div>
            </template>

            <q-list class="user-dd">
              <div class="dd-header">
                <q-avatar size="38px" class="dd-avatar">
                  <img :src="currentUser.avatarUrl || defaultAvatar" />
                </q-avatar>
                <div>
                  <div class="dd-name">{{ currentUser.username }}</div>
                  <div class="dd-email">{{ currentUser.email }}</div>
                </div>
              </div>
              <q-separator />
              <q-item clickable v-close-popup @click="navigateTo('user-config')" class="dd-item">
                <q-item-section avatar><q-icon name="manage_accounts" size="16px" color="grey-6" /></q-item-section>
                <q-item-section>Configurações da conta</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="handleLogout" class="dd-item dd-item--danger">
                <q-item-section avatar><q-icon name="logout" size="16px" color="negative" /></q-item-section>
                <q-item-section>Sair</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>

        <button v-else class="header-login-btn" @click="redirectToLogin">Entrar</button>

      </q-toolbar>
    </q-header>

    <!-- ══════════════════════════════════════════ CONTENT -->
    <q-page-container>
      <router-view />
    </q-page-container>

  </q-layout>
</template>

<script setup>
import { ref, computed } from "vue"
import { useStore } from "src/stores/store"
import { useRouter } from "vue-router"

const store = useStore()
const router = useRouter()
const drawer = ref(true)
const currentUser = computed(() => store.currentUser)
const defaultAvatar = "https://cdn.quasar.dev/img/boy-avatar.png"

const menuSections = [
  {
    title: "Mercado Livre",
    ml: true,
    sectionIcon: null,
    accent: "#FFE600",
    items: [
      { label: "Vendas e Pedidos",   icon: "receipt_long",            route: "orders",             color: "#818cf8", bg: "rgba(129,140,248,.18)" },
      { label: "Publicidade · Ads",  icon: "mdi-bullhorn",            route: "ads",                color: "#fb923c", bg: "rgba(251,146,60,.18)"  },
      { label: "Meus Anúncios",      icon: "mdi-package-variant-closed", route: "items",           color: "#2dd4bf", bg: "rgba(45,212,191,.18)"  },
      { label: "Promoções Ativas",   icon: "local_offer",             route: "promotions",         color: "#fbbf24", bg: "rgba(251,191,36,.18)"  },
      { label: "Detalhe do Anúncio", icon: "mdi-chart-bar",           route: "item-details",       color: "#818cf8", bg: "rgba(129,140,248,.18)" },
    ],
  },
  {
    title: "Shopee",
    shopee: true,
    sectionIcon: null,
    accent: "#EE4D2D",
    items: [
      { label: "Meus Anúncios",      icon: "mdi-storefront", route: "shopee-items",  color: "#ff7043", bg: "rgba(255,112,67,.18)" },
      { label: "Vendas e Pedidos",   icon: "receipt_long",   route: "shopee-orders", color: "#ff7043", bg: "rgba(255,112,67,.18)" },
      { label: "Publicidade",        icon: "campaign",       route: "shopee-ads",    color: "#ff7043", bg: "rgba(255,112,67,.18)" },
    ],
  },
  {
    title: "Inteligência",
    sectionIcon: "auto_awesome",
    accent: "#a855f7",
    items: [
      { label: "SellerBot AI",              icon: "psychology",    route: "sellerbot-ai",        color: "#c084fc", bg: "rgba(192,132,252,.18)" },
      { label: "Análise de Anúncios",       icon: "insights",      route: "item-analytics",      color: "#2dd4bf", bg: "rgba(45,212,191,.18)"  },
      { label: "Inteligência de Mercado",   icon: "manage_search", route: "market-intelligence", color: "#818cf8", bg: "rgba(129,140,248,.18)" },
    ],
  },
  {
    title: "Sistema",
    sectionIcon: "settings",
    accent: "#64748b",
    items: [
      { label: "Custo dos Produtos", icon: "inventory_2",    route: "products",     color: "#34d399", bg: "rgba(52,211,153,.18)"  },
      { label: "Minhas Contas",      icon: "mdi-store",      route: "accounts",     color: "#f97316", bg: "rgba(249,115,22,.18)"  },
      { label: "Saúde do Sistema",   icon: "monitor_heart",  route: "system-health",color: "#38bdf8", bg: "rgba(56,189,248,.18)"  },
      { label: "Configurações",      icon: "mdi-cog",        route: "user-config",  color: "#94a3b8", bg: "rgba(148,163,184,.18)" },
    ],
  },
]

// Seções expandidas por padrão (todas abertas no início)
const expandedSections = ref([0, 1])
const toggleSection = (i) => {
  const idx = expandedSections.value.indexOf(i)
  if (idx >= 0) expandedSections.value.splice(idx, 1)
  else expandedSections.value.push(i)
}

const handleLogout = () => { store.logoutUser(); router.replace("/login") }
const navigateTo = (r) => currentUser.value ? router.push({ name: r }) : router.push("/login")
const redirectToLogin = () => router.push("/login")
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════════════════
   SIDEBAR — Clean slate dark (sem roxo, accent teal puro)
══════════════════════════════════════════════════════════════════════════ */
:deep(.sidebar) {
  background: #0c1117 !important;
  border-right: 1px solid rgba(255, 255, 255, .06) !important;
}

/* ── Brand ── */
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
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 1px;
  background: linear-gradient(90deg, rgba(13,148,136,.35), rgba(45,212,191,.15), transparent);
}

.brand-icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(45,212,191,.15), 0 8px 20px rgba(13,148,136,.45);
}

.brand-name {
  font-size: 17px;
  font-weight: 800;
  background: linear-gradient(90deg, #fff 30%, #7dd3fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -.4px;
  line-height: 1;
}

.brand-sub {
  font-size: 9.5px;
  color: rgba(255, 255, 255, .32);
  font-weight: 600;
  letter-spacing: .1em;
  text-transform: uppercase;
  margin-top: 4px;
}

/* ── Scroll ── */
.sidebar-scroll {
  height: calc(100% - 148px);
}

/* ── Nav ── */
.sidebar-nav {
  padding: 8px 10px 10px;
}

/* Dashboard top item */
.nav-item--top {
  margin-bottom: 4px;
  border-radius: 10px;
}

/* Parent row (colapsável) */
.nav-parent {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  cursor: pointer;
  padding: 7px 10px 7px 8px;
  border-radius: 9px;
  transition: background .15s;
  background: transparent;
  margin-bottom: 2px;
}

.nav-parent:hover {
  background: rgba(255, 255, 255, .05);
}

.nav-parent--open {
  background: rgba(255, 255, 255, .03);
}

.nav-parent-label {
  flex: 1;
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--s-accent, #a5b4fc);
  text-align: left;
}

.nav-chevron {
  color: rgba(255,255,255,.2);
  transition: transform .22s ease;
  flex-shrink: 0;
}
.nav-chevron--open {
  transform: rotate(180deg);
  color: rgba(255,255,255,.4);
}

/* Section icon (Inteligência / Sistema) */
.nav-section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(255,255,255,.06);
  color: var(--s-accent, #a5b4fc);
  flex-shrink: 0;
}

/* ML / Shopee badges */
.nav-ml-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #FFE600;
  color: #1a1a2e;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .05em;
  border-radius: 5px;
  padding: 2px 6px;
  flex-shrink: 0;
  line-height: 1.4;
  box-shadow: 0 2px 8px rgba(255,230,0,.4);
}

.nav-shopee-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #EE4D2D, #ff7043);
  color: #fff;
  font-size: 7.5px;
  font-weight: 900;
  letter-spacing: .05em;
  border-radius: 5px;
  padding: 2px 5px;
  flex-shrink: 0;
  line-height: 1.4;
  box-shadow: 0 2px 8px rgba(238,77,45,.4);
}

/* Children */
.nav-children {
  max-height: 0;
  overflow: hidden;
  transition: max-height .28s ease, opacity .22s ease;
  opacity: 0;
  margin-left: 6px;
  padding-left: 10px;
  border-left: 1.5px solid rgba(20, 184, 166, .15);
}

.nav-children--open {
  max-height: 600px;
  opacity: 1;
}

.nav-tree-line { display: none; }

/* Nav item */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 9px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background .15s;
  text-align: left;
  margin-bottom: 1px;
  position: relative;
}

.nav-item:hover:not(.nav-item--active) {
  background: rgba(255,255,255,.05);
}

.nav-item--active {
  background: linear-gradient(90deg, rgba(13,148,136,.3) 0%, rgba(13,148,136,.08) 100%);
}

.nav-item--active::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #2dd4bf, #0f766e);
  box-shadow: 0 0 10px rgba(45,212,191,.7);
}

/* Icon wrap — sempre colorido */
.nav-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--icon-bg, rgba(255,255,255,.06));
  color: var(--icon-color, #6b7280);
  transition: background .15s, box-shadow .15s;
}

.nav-item--active .nav-icon-wrap {
  background: rgba(13,148,136,.3);
  color: #2dd4bf;
  box-shadow: 0 0 14px rgba(45,212,191,.25);
}

.nav-item:hover:not(.nav-item--active) .nav-icon-wrap {
  filter: brightness(1.2);
}

/* Label */
.nav-label {
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, .45);
  flex: 1;
  transition: color .15s;
  white-space: nowrap;
}

.nav-item:hover:not(.nav-item--active) .nav-label {
  color: rgba(255, 255, 255, .82);
}

.nav-item--active .nav-label {
  color: #f0fdfa;
  font-weight: 600;
}

.nav-badge {
  font-size: 9px;
  font-weight: 700;
  background: #ef4444;
  color: #fff;
  border-radius: 10px;
  padding: 1px 6px;
}

.nav-sep {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.07), transparent);
  margin: 6px 4px;
}

/* ── Footer user card ── */
.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(8, 10, 14, .92);
  border-top: 1px solid rgba(255, 255, 255, .07);
  backdrop-filter: blur(8px);
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
}

.sidebar-avatar {
  border: 2px solid rgba(45,212,191,.45);
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(45,212,191,.08);
}

.sidebar-user-info {
  flex: 1;
  min-width: 0;
}

.sidebar-user-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #e0e7ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-role {
  font-size: 9.5px;
  color: rgba(255, 255, 255, .28);
  margin-top: 2px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .07em;
}

.sidebar-logout {
  color: rgba(255, 255, 255, .25) !important;
  transition: color .15s !important;
}

.sidebar-logout:hover {
  color: #f87171 !important;
}

/* ══════════════════════════════════════════════════════════════════════════
   HEADER — Minimal clean (sem wordmark, sem ruído)
══════════════════════════════════════════════════════════════════════════ */
.app-header {
  background: #ffffff !important;
  box-shadow: 0 1px 0 #e8edf3 !important;
}

.app-toolbar {
  min-height: 52px !important;
  padding: 0 16px;
}

.menu-toggle {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background .14s, color .14s;
}

.menu-toggle:hover {
  background: #f0fdfa;
  color: #0d9488;
}

/* User chip */
.header-user-chip {
  display: flex;
  align-items: center;
}

.user-chip-btn {
  border-radius: 20px !important;
  padding: 0 !important;
}

.user-chip-inner {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px 4px 6px;
  border-radius: 20px;
  border: 1px solid #e8edf3;
  background: #f8fafc;
  transition: border-color .14s, background .14s, box-shadow .14s;
  cursor: pointer;
}

.user-chip-inner:hover {
  border-color: #0d9488;
  background: #f0fdfa;
  box-shadow: 0 2px 8px rgba(13, 148, 136, .1);
}

.chip-avatar {
  border: 1.5px solid rgba(13, 148, 136, .35);
  flex-shrink: 0;
}

.chip-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-chevron {
  color: #94a3b8;
}

/* Dropdown */
.user-dd {
  min-width: 224px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(15, 23, 42, .1), 0 0 0 1px rgba(0,0,0,.06);
}

.dd-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e8edf3;
}

.dd-avatar {
  border: 2px solid #0d9488;
}

.dd-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.dd-email {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 1px;
}

.dd-item {
  font-size: 13px;
  color: #334155;
  min-height: 40px;
}

.dd-item--danger {
  color: #ef4444;
}

/* Login btn */
.header-login-btn {
  padding: 6px 16px;
  border-radius: 7px;
  border: none;
  background: #0d9488;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .14s;
}

.header-login-btn:hover {
  background: #0f766e;
}

:deep(.q-btn) {
  text-transform: none;
}
</style>
