import { useStore } from "src/stores/store"; // Importa o store para verificar o estado de autenticação

// Definição das rotas
const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("pages/HomePage.vue"),
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
  {
    path: "/app",
    component: () => import("layouts/MainLayout.vue"),
    children: [
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


    ],
  },
  {
    path: "/ml-redirect",
    component: () => import("pages/MLRedirect.vue"),
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
