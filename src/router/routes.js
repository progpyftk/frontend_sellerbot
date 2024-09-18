// src/router/routes.js

// Todas as páginas que exigem autenticação devem começar com /app. O /app representa o aplicativo de produção em si.
// A rota "/" agora aponta diretamente para a HomePage.vue, que será a landing page sem o uso de um layout global.

const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("pages/HomePage.vue"), // Ponto de entrada direto para a HomePage
  },
  {
    path: "/signup",
    name: "signup",
    component: () => import("pages/SignupPage.vue"),
  },
  {
    path: "/signup-success",
    name: "signup-success",
    component: () => import("pages/SignupSuccessPage.vue"),
  },
  {
    path: "/login",
    name: "login",
    component: () => import("pages/LoginPage.vue"),
  },
  {
    path: "/app", // Nova rota para o app principal
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        name: "dashboard", // Exemplo de página dentro do app
        component: () => import("pages/DashboardPage.vue"),
      },
      // Outras rotas do seu app
    ],
  },
];

export default routes;
