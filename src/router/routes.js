const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        name: "home",
        component: () => import("pages/IndexPage.vue"),
      },
    ],
  },

  {
    path: "/signup",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        name: "signup",
        component: () => import("pages/SignupPage.vue"),
      },
    ],
  },

  {
    path: "/signup-success",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      { path: "", component: () => import("pages/SignupSuccessPage.vue") },
    ],
  },

  {
    path: "/login",
    component: () => import("layouts/MainLayout.vue"),
    children: [{ path: "", component: () => import("pages/LoginPage.vue") }],
  },

  {
    path: "/accounts",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        name: "accounts",
        component: () => import("pages/AccountsPage.vue"),
      },
    ],
  },
];

export default routes;
