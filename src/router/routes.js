import { useStore } from "src/stores/store"; // Importa o store para verificar o estado de autenticação

// Definição das rotas
const routes = [
  {
    path: "/",
    name: "home",
    redirect: { name: "login" },
  },
  {
    path: "/signup",
    name: "signup",
    component: () => import("pages/SignupPage.vue"),
  },
  {
    path: "/login",
    name: "login",
    component: () => import("pages/LoginPage.vue"),
  },
  // Portal do cliente Krivus — leitura pública via token, sem login (KRV-14)
  {
    path: "/portal/:token",
    name: "krivus-portal",
    component: () => import("pages/krivus/KrivusPortalPage.vue"),
  },
  {
    path: "/app",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        redirect: { name: "dashboard" },
      },
      {
        path: "accounts",
        name: "accounts",
        component: () => import("pages/AccountsPage.vue"),
      },
      {
        path: "items",
        name: "items",
        component: () => import("pages/ItemsPage.vue"),
      },
      { path: 'promotions',
        name: "promotions",
        component: () => import('pages/PromotionsManagerPage.vue')
      },
      {
        path: 'orders',
        name: "orders",
        component: () => import('pages/OrdersList.vue')
      },
      {
        path: 'products',
        name: 'products',
        component: () => import('pages/ProductsPage.vue')
      },
      {
        path: 'shopee/items',
        name: 'shopee-items',
        component: () => import('pages/ShopeeItemsPage.vue')
      },
      {
        path: 'shopee/orders',
        name: 'shopee-orders',
        component: () => import('pages/ShopeeOrdersPage.vue')
      },
      {
        path: 'ads',
        name: 'ads',
        component: () => import('pages/AdsPage.vue')
      },
      {
        path: 'shopee/ads',
        name: 'shopee-ads',
        component: () => import('pages/ShopeeAdsPage.vue')
      },
      {
        path: 'shopee/discounts',
        name: 'shopee-discounts',
        component: () => import('pages/ShopeeDiscountsPage.vue')
      },
      {
        path: 'shopee/vouchers',
        name: 'shopee-vouchers',
        component: () => import('pages/ShopeeVouchersPage.vue')
      },
      {
        path: 'tiktokshop/orders',
        name: 'tiktokshop-orders',
        component: () => import('pages/TikTokShopOrdersPage.vue')
      },
      {
        path: 'tiktokshop/items',
        name: 'tiktokshop-items',
        component: () => import('pages/TikTokShopItemsPage.vue')
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('pages/DashboardPage.vue')
      },
      {
        path: 'item-details',
        name: 'item-details',
        component: () => import('pages/ItemDetailsPage.vue')
      },
      {
        path: 'fulfillment',
        name: 'fulfillment-management',
        component: () => import('pages/FulfillmentManagementPage.vue')
      },
      {
        path: 'sellerbot-ai',
        name: 'sellerbot-ai',
        component: () => import('pages/SellerBotAIPage.vue')
      },
      {
        path: 'item-analytics',
        name: 'item-analytics',
        component: () => import('pages/ItemAnalyticsPage.vue')
      },
      {
        path: 'settings',
        name: 'user-config',
        component: () => import('pages/UserConfigPage.vue')
      },
      {
        path: 'health',
        name: 'system-health',
        component: () => import('pages/SystemHealthPage.vue')
      },
      {
        path: 'market',
        name: 'market-intelligence',
        component: () => import('pages/MarketIntelligencePage.vue')
      },
      {
        path: 'fiscal',
        name: 'fiscal',
        component: () => import('pages/FiscalPage.vue')
      },
    ],
  },
  // Krivus CRM — acesso exclusivo para is_staff
  {
    path: "/krivus",
    component: () => import("layouts/KrivusLayout.vue"),
    children: [
      {
        path: "",
        name: "krivus-overview",
        component: () => import("pages/krivus/KrivusOverviewPage.vue"),
      },
      {
        path: "pipeline",
        name: "krivus-pipeline",
        component: () => import("pages/krivus/KrivusPipelinePage.vue"),
      },
      {
        path: "templates",
        name: "krivus-templates",
        component: () => import("pages/krivus/KrivusTemplatesPage.vue"),
      },
      {
        path: "cobrancas",
        name: "krivus-billing",
        component: () => import("pages/krivus/KrivusBillingPage.vue"),
      },
      {
        path: "alertas",
        name: "krivus-alerts",
        component: () => import("pages/krivus/KrivusAlertsPage.vue"),
      },
      {
        path: ":slug",
        name: "krivus-client",
        component: () => import("pages/krivus/KrivusJourneyPage.vue"),
      },
    ],
  },

  {
    path: "/ml-redirect",
    component: () => import("pages/MLRedirect.vue"),
  },
  {
    path: "/shopee-redirect",
    component: () => import("pages/ShopeeRedirect.vue"),
  },
  {
    path: "/tiktokshop-redirect",
    component: () => import("pages/TikTokShopRedirect.vue"),
  },
  {
    path: "/tiny/callback",
    component: () => import("pages/TinyRedirect.vue"),
  },
  // Sempre deixe esta rota no final
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
  },


];

export default routes;
