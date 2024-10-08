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
        path: "free-shipping",
        name: "free-shipping",
        component: () => import("pages/FreeShippingPage.vue"),
      },
      {
        path: "order-details",
        name: "order-details",
        component: () => import("pages/OrderDetailsPage.vue"),
      },
      {
        path: "item-details",
        name: "item-details",
        component: () => import("pages/ItemDetailsPage.vue"),
      },
      {
        path: "sales",
        name: "sales",
        component: () => import("src/pages/SalesPage.vue"),
      },
      {
        path: "user/config",
        name: "user-config",
        component: () => import("pages/UserConfigPage.vue"),
      },
    ],
  },
  {
    path: "/ml-redirect",
    component: () => import("pages/MLRedirect.vue"),
  },
  // Sempre deixe esta rota no final
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
  },
];

export default routes;
