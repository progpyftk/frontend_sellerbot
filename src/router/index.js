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
  Router.beforeEach(async (to, from, next) => {
    const store = useStore(); // Acessa o store Pinia

    const requiresAuth = to.path.startsWith("/app"); // Rotas que exigem autenticação
    const isLoggedIn = !!store.authToken; // Verifica se o usuário tem um token armazenado

    if (requiresAuth) {
      if (!isLoggedIn) {
        console.log("Usuário não está logado. Redirecionando para o login.");
        return next("/login"); // Redireciona para o login
      }

      // Verifica se o token é válido antes de permitir a navegação
      const isValid = await store.ensureValidToken();
      if (!isValid) {
        console.log("Token inválido ou expirado. Redirecionando para o login.");
        return next("/login");
      }
    }

    // Se a rota não exigir autenticação ou o token for válido, prossiga
    next();
  });

  return Router;
});
