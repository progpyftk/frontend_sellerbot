import { route } from "quasar/wrappers";
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from "vue-router";
import routes from "./routes";
import { useStore } from "src/stores/store"; // Importa o Pinia store

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === "history"
    ? createWebHistory
    : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  // Guarda de navegação global
  Router.beforeEach((to, from, next) => {
    const store = useStore(); // Acessa o store para verificar o status do usuário

    const requiresAuth = to.path.startsWith("/app"); // Verifica se a rota começa com /app (rotas protegidas)
    const isLoggedIn = !!store.currentUser; // Verifica se o usuário está logado

    if (requiresAuth && !isLoggedIn) {
      next("/login"); // Redireciona para login se o usuário não estiver logado
    } else if ((to.path === "/signup" || to.path === "/login") && isLoggedIn) {
      next("/app"); // Impede que usuários logados acessem signup ou login
    } else {
      next(); // Permite continuar a navegação
    }
  });

  return Router;
});
