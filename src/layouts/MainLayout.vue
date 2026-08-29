<template>
  <q-layout view="hHh lpR fFf" id="sb-layout">

    <!-- ══════════════════════════════════════════ SIDEBAR (LIGHT) -->
    <q-drawer v-model="drawer" side="left" :width="248" :breakpoint="768" class="sidebar" :no-swipe-close="$q.screen.gt.sm">

      <!-- Brand -->
      <div class="sidebar-brand">
        <div class="brand-mark">
          <q-icon name="rocket_launch" size="18px" />
        </div>
        <div>
          <div class="brand-name">SellerBot</div>
          <div class="brand-sub">Painel de Controle</div>
        </div>
      </div>

      <!-- Krivus CRM link (staff only) -->
      <div class="krivus-sidebar-btn q-px-md q-pt-sm q-pb-xs" v-if="currentUser?.is_staff">
        <q-btn
          unelevated no-caps label="Krivus CRM" icon="business_center"
          color="primary" class="full-width krivus-btn"
          @click="$router.push('/krivus')"
        />
      </div>

      <!-- Nav scroll -->
      <q-scroll-area class="sidebar-scroll">
        <nav class="sidebar-nav">

          <!-- Dashboard — item fixo fora do aninhamento -->
          <router-link to="/app/dashboard" custom v-slot="{ isActive, navigate }">
            <button :class="['nav-item', 'nav-item--top', isActive && 'nav-item--active']" @click="navigate">
              <span class="nav-icon-wrap">
                <q-icon name="mdi-view-dashboard" size="16px" />
              </span>
              <span class="nav-label">Dashboard</span>
            </button>
          </router-link>

          <div class="nav-sep" />

          <template v-for="(section, si) in menuSections" :key="si">

            <!-- Section header -->
            <button :class="['nav-section', expandedSections.includes(si) && 'nav-section--open']"
              @click="toggleSection(si)">
              <span v-if="section.ml" class="mkt-badge mkt-badge--ml">ML</span>
              <span v-else-if="section.shopee" class="mkt-badge mkt-badge--shopee">SHOPEE</span>
              <span v-else-if="section.tiktokshop" class="mkt-badge mkt-badge--tiktokshop">TIKTOK</span>
              <span v-else class="nav-section-icon">
                <q-icon :name="section.sectionIcon || 'circle'" size="11px" />
              </span>
              <span class="nav-section-label">{{ section.title }}</span>
              <q-icon name="expand_more" size="14px"
                :class="['nav-chevron', expandedSections.includes(si) && 'nav-chevron--open']" />
            </button>

            <!-- Itens aninhados -->
            <div class="nav-children" :class="expandedSections.includes(si) && 'nav-children--open'">
              <router-link v-for="item in section.items" :key="item.route" :to="{ name: item.route }" custom
                v-slot="{ isActive, navigate }">
                <button :class="['nav-item', isActive && 'nav-item--active']" @click="navigate">
                  <span class="nav-icon-wrap">
                    <q-icon :name="item.icon" size="15px" />
                  </span>
                  <span class="nav-label">{{ item.label }}</span>
                  <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
                </button>
              </router-link>
            </div>
          </template>
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

    <FeedbackFAB />

  </q-layout>
</template>

<script setup>
import { ref, computed } from "vue"
import { useStore } from "src/stores/store"
import { useRoute, useRouter } from "vue-router"
import { useQuasar } from "quasar"
import FeedbackFAB from "src/components/common/FeedbackFAB.vue"

const store = useStore()
const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const drawer = ref($q.screen.gt.sm)
const currentUser = computed(() => store.currentUser)
const defaultAvatar = "https://cdn.quasar.dev/img/boy-avatar.png"

const menuSections = [
  {
    title: "Mercado Livre",
    ml: true,
    sectionIcon: null,
    items: [
      { label: "Vendas e Pedidos",   icon: "receipt_long",                  route: "orders" },
      { label: "Publicidade · Ads",  icon: "mdi-bullhorn",                  route: "ads" },
      { label: "Meus Anúncios",      icon: "mdi-package-variant-closed",   route: "items" },
      { label: "Promoções Ativas",   icon: "local_offer",                   route: "promotions" },
       { label: "Detalhe do Anúncio", icon: "mdi-chart-bar",                 route: "item-details" },
       { label: "Gestão Full",        icon: "warehouse",                    route: "fulfillment-management" },
    ],
  },
  {
    title: "Shopee",
    shopee: true,
    sectionIcon: null,
    items: [
      { label: "Meus Anúncios",    icon: "mdi-storefront",        route: "shopee-items" },
      { label: "Vendas e Pedidos", icon: "receipt_long",          route: "shopee-orders" },
      { label: "Publicidade",      icon: "campaign",              route: "shopee-ads" },
      { label: "Desconto",         icon: "local_offer",           route: "shopee-discounts" },
      { label: "Cupons",           icon: "confirmation_number",  route: "shopee-vouchers" },
    ],
  },
  {
    title: "TikTok Shop",
    tiktokshop: true,
    sectionIcon: null,
    items: [
      { label: "Meus Anúncios",    icon: "mdi-storefront",        route: "tiktokshop-items" },
      { label: "Vendas e Pedidos", icon: "receipt_long",          route: "tiktokshop-orders" },
    ],
  },
  {
    title: "Inteligência",
    sectionIcon: "auto_awesome",
    items: [
      { label: "SellerBot AI",            icon: "psychology",    route: "sellerbot-ai" },
      { label: "Análise de Anúncios",     icon: "insights",      route: "item-analytics" },
      { label: "Inteligência de Mercado", icon: "manage_search", route: "market-intelligence" },
    ],
  },
  {
    title: "Fiscal",
    sectionIcon: "account_balance",
    items: [
      { label: "Balanço de NCMs & NF-e", icon: "table_chart", route: "fiscal" },
    ],
  },
  {
    title: "Logística",
    sectionIcon: "mdi-truck-fast",
    items: [
      { label: "Transportadoras", icon: "mdi-truck-fast", route: "delivery-carriers" },
      { label: "Auditoria de Entregas", icon: "mdi-clipboard-check-outline", route: "delivery-audit" },
    ],
  },
  {
    title: "Sistema",
    sectionIcon: "settings",
    items: [
      { label: "Custo dos Produtos", icon: "inventory_2",    route: "products" },
      { label: "Minhas Contas",      icon: "mdi-store",      route: "accounts" },
      { label: "Saúde do Sistema",   icon: "monitor_heart",  route: "system-health" },
      { label: "Configurações",      icon: "mdi-cog",        route: "user-config" },
    ],
  },
]

// A seção da rota ativa já abre expandida, para a função em uso não ficar escondida.
const activeSectionIndex = menuSections.findIndex((section) =>
  section.items.some((item) => item.route === route.name),
)
const expandedSections = ref([...new Set([0, 1, activeSectionIndex].filter((index) => index >= 0))])
const toggleSection = (i) => {
  const idx = expandedSections.value.indexOf(i)
  if (idx >= 0) expandedSections.value.splice(idx, 1)
  else expandedSections.value.push(i)
}

const handleLogout = () => { store.logoutUser(); router.replace("/login") }
const navigateTo = (r) => currentUser.value ? router.push({ name: r }) : router.push("/login")
const redirectToLogin = () => router.push("/login")
</script>

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

/* ══════════════════════════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════════════════════════ */
:deep(.sidebar) {
  background: #ffffff !important;
  border-right: 1px solid #e2e8f0 !important;
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
  background: #f1f5f9;
}

.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.30);
}

.brand-name {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.4px;
  line-height: 1;
}

.brand-sub {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-top: 4px;
}

/* ── Krivus CRM btn ── */
.krivus-btn {
  font-size: 12px !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
}

/* ── Scroll ── */
.sidebar-scroll {
  height: calc(100% - 138px);
}

/* ── Nav ── */
.sidebar-nav {
  padding: 12px 10px;
}

/* Section header */
.nav-section {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  cursor: pointer;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 150ms ease;
  background: transparent;
  margin-top: 6px;
}
.nav-section:hover { background: #f8fafc; }

.nav-section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #94a3b8;
  flex-shrink: 0;
}

.nav-section-label {
  flex: 1;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  text-align: left;
}

.nav-chevron {
  color: #cbd5e1;
  transition: transform 220ms ease;
  flex-shrink: 0;
}
.nav-chevron--open {
  transform: rotate(180deg);
  color: #94a3b8;
}

/* Marketplace badges (ML / Shopee) */
.mkt-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.05em;
  border-radius: 5px;
  padding: 2px 6px;
  flex-shrink: 0;
  line-height: 1.4;
  min-width: 32px;
}
.mkt-badge--ml     { background: #FFE600; color: #1a1a2e; }
.mkt-badge--shopee { background: #EE4D2D; color: #fff; }
.mkt-badge--tiktokshop { background: #010101; color: #fff; }

/* Children */
.nav-children {
  max-height: 0;
  overflow: hidden;
  transition: max-height 280ms ease, opacity 220ms ease;
  opacity: 0;
  margin-left: 6px;
  padding-left: 10px;
  border-left: 1px solid #f1f5f9;
}
.nav-children--open {
  max-height: 600px;
  opacity: 1;
}

/* Nav item */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
  text-align: left;
  margin: 1px 0;
  position: relative;
}

.nav-item:hover:not(.nav-item--active) {
  background: #f8fafc;
}

.nav-item--active {
  background: #f0fdf9; /* teal-50 */
  color: #0f766e;
}

.nav-item--active::before {
  content: '';
  position: absolute;
  left: -11px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  border-radius: 0 3px 3px 0;
  background: #0d9488;
}

.nav-item--top {
  margin-bottom: 4px;
}

/* Icon wrap — UNIFORMIZADO: teal-tint por padrão */
.nav-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #f1f5f9;
  color: #475569;
  transition: background 150ms ease, color 150ms ease;
}

.nav-item--active .nav-icon-wrap {
  background: #ccfbf1;
  color: #0d9488;
}

.nav-item:hover:not(.nav-item--active) .nav-icon-wrap {
  background: #e2e8f0;
  color: #0f172a;
}

/* Label */
.nav-label {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  flex: 1;
  transition: color 150ms ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item:hover:not(.nav-item--active) .nav-label {
  color: #0f172a;
}

.nav-item--active .nav-label {
  color: #0f766e;
  font-weight: 600;
}

.nav-badge {
  font-size: 9px;
  font-weight: 700;
  background: #dc2626;
  color: #fff;
  border-radius: 10px;
  padding: 1px 6px;
}

.nav-sep {
  height: 1px;
  background: #f1f5f9;
  margin: 4px 4px;
}

/* ── Footer user card ── */
.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}

.sidebar-avatar {
  border: 2px solid #ccfbf1;
  flex-shrink: 0;
}

.sidebar-user-info {
  flex: 1;
  min-width: 0;
}

.sidebar-user-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-role {
  font-size: 9.5px;
  color: #94a3b8;
  margin-top: 2px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.sidebar-logout {
  color: #94a3b8 !important;
  transition: color 150ms ease !important;
}
.sidebar-logout:hover { color: #dc2626 !important; }

/* ══════════════════════════════════════════════════════════════════════════
   HEADER
══════════════════════════════════════════════════════════════════════════ */
.app-header {
  background: #ffffff !important;
  box-shadow: 0 1px 0 #e2e8f0 !important;
  border-bottom: 1px solid #f1f5f9;
}

.app-toolbar {
  min-height: 56px !important;
  padding: 0 16px;
}

.menu-toggle {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
}
.menu-toggle:hover {
  background: #f0fdf9;
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
  gap: 6px;
  padding: 5px 12px 5px 8px;
  border-radius: 20px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
  cursor: pointer;
}
.user-chip-inner:hover {
  border-color: #0d9488;
  background: #f0fdf9;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.10);
}

.chip-avatar {
  border: 1.5px solid #ccfbf1;
  flex-shrink: 0;
}

.chip-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
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
  min-width: 220px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.10) !important;
  border: 1px solid #e2e8f0;
}

.dd-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
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
.dd-item--danger { color: #dc2626; }

/* Login btn */
.header-login-btn {
  padding: 6px 18px;
  border-radius: 8px;
  border: none;
  background: #0d9488;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.25);
  transition: background 150ms ease;
}
.header-login-btn:hover { background: #0f766e; }

/* ══════════════════════════════════════════════════════════════════════════
   MOBILE
══════════════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .app-toolbar { padding: 0 12px; }
  .chip-name { display: none; }
  .user-chip-inner { padding: 5px 8px; }
  .chip-chevron { display: none; }
}
</style>
