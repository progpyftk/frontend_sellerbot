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
              @click="toggleSection(si)">
              <span v-if="section.ml" class="nav-ml-badge">ML</span>
              <span v-else-if="section.shopee" class="nav-shopee-badge">SHOPEE</span>
              <span v-else class="nav-section-dot" />
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

        <!-- Wordmark -->
        <div class="header-wordmark">
          <span class="header-wordmark-seller">Seller</span><span class="header-wordmark-bot">Bot</span>
        </div>

        <q-space />

        <!-- User chip -->
        <div class="header-user-chip" v-if="currentUser">
          <q-btn-dropdown flat no-caps dense auto-close class="user-chip-btn">
            <template v-slot:label>
              <div class="user-chip-inner">
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
    items: [
      { label: "Vendas e Pedidos", icon: "receipt_long", route: "orders", color: "#818cf8", bg: "rgba(129,140,248,.15)" },
      { label: "Publicidade · Ads", icon: "mdi-bullhorn", route: "ads", color: "#fb923c", bg: "rgba(251,146,60,.15)" },
      { label: "Meus Anúncios", icon: "mdi-package-variant-closed", route: "items", color: "#2dd4bf", bg: "rgba(45,212,191,.15)" },
      { label: "Promoções Ativas", icon: "local_offer", route: "promotions", color: "#fbbf24", bg: "rgba(251,191,36,.15)" },
      { label: "Detalhe do Anúncio", icon: "mdi-chart-bar", route: "item-details", color: "#818cf8", bg: "rgba(129,140,248,.15)" },
    ],
  },
  {
    title: "Shopee",
    shopee: true,
    items: [
      { label: "Meus Anúncios", icon: "mdi-storefront",    route: "shopee-items",  color: "#EE4D2D", bg: "rgba(238,77,45,.15)" },
      { label: "Vendas e Pedidos", icon: "receipt_long",  route: "shopee-orders", color: "#EE4D2D", bg: "rgba(238,77,45,.15)" },
      { label: "Publicidade",      icon: "campaign",       route: "shopee-ads",    color: "#EE4D2D", bg: "rgba(238,77,45,.15)" },
    ],
  },
  {
    title: "Inteligência",
    ml: false,
    items: [
      { label: "SellerBot AI", icon: "psychology", route: "sellerbot-ai", color: "#a855f7", bg: "rgba(168,85,247,.15)" },
      { label: "Análise de Anúncios", icon: "insights", route: "item-analytics", color: "#0d9488", bg: "rgba(13,148,136,.15)" },
    ],
  },
  {
    title: "Sistema",
    ml: false,
    items: [
      { label: "Custo dos Produtos", icon: "inventory_2", route: "products", color: "#34d399", bg: "rgba(52,211,153,.15)" },
      { label: "Minhas Contas", icon: "mdi-store", route: "accounts", color: "#EE4D2D", bg: "rgba(238,77,45,.15)" },
      { label: "Saúde do Sistema", icon: "monitor_heart", route: "system-health", color: "#38bdf8", bg: "rgba(56,189,248,.15)" },
      { label: "Configurações", icon: "mdi-cog", route: "user-config", color: "#94a3b8", bg: "rgba(148,163,184,.15)" },
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
/* ── Sidebar ──────────────────────────────────────────────────────────────── */
:deep(.sidebar) {
  background: linear-gradient(180deg, #0f172a 0%, #0d1526 100%) !important;
  border-right: 1px solid rgba(255, 255, 255, .06) !important;
}

/* Brand */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 22px 18px 18px;
}

.brand-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(13, 148, 136, .45);
}

.brand-name {
  font-size: 16px;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: -.4px;
  line-height: 1;
}

.brand-sub {
  font-size: 10px;
  color: #475569;
  font-weight: 500;
  letter-spacing: .04em;
  margin-top: 3px;
}

/* Scroll */
.sidebar-scroll {
  height: calc(100% - 142px);
}

/* Nav */
.sidebar-nav {
  padding: 6px 10px 8px;
}

/* Parent row (colapsável) */
.nav-parent {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 10px 8px 6px;
  border-radius: 7px;
  transition: background .14s;
}

.nav-parent:hover {
  background: rgba(255, 255, 255, .04);
}

.nav-parent--open {
  background: transparent;
}

.nav-parent-label {
  flex: 1;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: #e2e8f0;
  text-align: left;
}

.nav-chevron {
  color: #64748b;
  transition: transform .22s ease;
  flex-shrink: 0;
}

.nav-chevron--open {
  transform: rotate(180deg);
}

/* Children — colapsável via max-height */
.nav-children {
  max-height: 0;
  overflow: hidden;
  transition: max-height .25s ease, opacity .2s ease;
  opacity: 0;
  /* Indentação + linha lateral estilo tree */
  margin-left: 14px;
  border-left: 1.5px solid rgba(255, 255, 255, .07);
  padding-left: 6px;
}

.nav-children--open {
  max-height: 600px;
  opacity: 1;
}

/* Remove a span inútil */
.nav-tree-line {
  display: none;
}

.nav-section-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #2dd4bf;
  flex-shrink: 0;
}

.nav-ml-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #FFE600;
  color: #1a1f36;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .04em;
  border-radius: 4px;
  padding: 1px 4px;
  flex-shrink: 0;
  line-height: 1.4;
}

.nav-shopee-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #EE4D2D;
  color: #fff;
  font-size: 7px;
  font-weight: 900;
  letter-spacing: .04em;
  border-radius: 4px;
  padding: 1px 4px;
  flex-shrink: 0;
  line-height: 1.4;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 9px;
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
  background: rgba(255, 255, 255, .05);
}

.nav-item--active {
  background: linear-gradient(90deg, rgba(13, 148, 136, .22) 0%, rgba(13, 148, 136, .08) 100%);
}

.nav-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #2dd4bf;
}

/* Icon wrap */
.nav-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--icon-bg, rgba(255, 255, 255, .06));
  color: var(--icon-color, #64748b);
  transition: background .15s, color .15s;
}

.nav-item--active .nav-icon-wrap {
  background: rgba(13, 148, 136, .30);
  color: #2dd4bf;
}

.nav-item:hover:not(.nav-item--active) .nav-icon-wrap {
  background: rgba(255, 255, 255, .08);
}

/* Label */
.nav-label {
  font-size: 12.5px;
  font-weight: 500;
  color: #94a3b8;
  flex: 1;
  transition: color .15s;
  white-space: nowrap;
}

.nav-item:hover:not(.nav-item--active) .nav-label {
  color: #cbd5e1;
}

.nav-item--active .nav-label {
  color: #f1f5f9;
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

.nav-item--top {
  margin-bottom: 0;
}

.nav-sep {
  height: 1px;
  background: rgba(255, 255, 255, .05);
  margin: 8px 8px;
}

/* Footer user card */
.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-top: 1px solid rgba(255, 255, 255, .06);
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}

.sidebar-avatar {
  border: 1.5px solid rgba(45, 212, 191, .4);
  flex-shrink: 0;
}

.sidebar-user-info {
  flex: 1;
  min-width: 0;
}

.sidebar-user-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-role {
  font-size: 10px;
  color: #334155;
  margin-top: 1px;
}

.sidebar-logout {
  color: #334155 !important;
  transition: color .15s !important;
}

.sidebar-logout:hover {
  color: #ef4444 !important;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.app-header {
  background: linear-gradient(90deg, #0f172a 0%, #0d1a2e 100%) !important;
  box-shadow: 0 1px 0 rgba(255, 255, 255, .06), 0 2px 12px rgba(0, 0, 0, .25) !important;
}

.app-toolbar {
  min-height: 54px !important;
  padding: 0 16px;
}

.menu-toggle {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background .14s, color .14s;
}

.menu-toggle:hover {
  background: rgba(255, 255, 255, .08);
  color: #2dd4bf;
}

/* Wordmark */
.header-wordmark {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -.5px;
  user-select: none;
}

.header-wordmark-seller {
  color: #f1f5f9;
}

.header-wordmark-bot {
  color: #2dd4bf;
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
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1.5px solid rgba(255, 255, 255, .1);
  background: rgba(255, 255, 255, .06);
  transition: border-color .14s, background .14s;
  cursor: pointer;
}

.user-chip-inner:hover {
  border-color: rgba(45, 212, 191, .5);
  background: rgba(45, 212, 191, .08);
}

.chip-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #e2e8f0;
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-chevron {
  color: #475569;
}

/* Dropdown */
.user-dd {
  min-width: 220px;
  border-radius: 12px;
  overflow: hidden;
}

.dd-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f0fdf9, #f8fafc);
  border-bottom: 1px solid #e2e8f0;
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
  padding: 6px 18px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #0d9488, #0f766e);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(13, 148, 136, .3);
  transition: opacity .14s;
}

.header-login-btn:hover {
  opacity: .88;
}

:deep(.q-btn) {
  text-transform: none;
}
</style>
