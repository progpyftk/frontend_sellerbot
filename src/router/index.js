import { route } from "quasar/wrappers";
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from "vue-router";
import routes from "./routes";
import { useStore } from "src/stores/store";

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

  // Guarda de navegação global (Sem async, pois agora é síncrono)
  Router.beforeEach((to, from, next) => {
    const store = useStore(); // Acessa o store Pinia

    const requiresAuth = to.path.startsWith("/app"); // Rotas que exigem autenticação

    // Usando a variável limpa que criamos no store para checar se tem token
    const isLoggedIn = store.isAuthenticated;

    // Se a rota exige login e ele não tá logado, manda pro /login
    if (requiresAuth && !isLoggedIn) {
      console.log("Usuário não está logado. Redirecionando para o login.");
      return next("/login");
    }

    // Regra de Ouro: Se o usuário já está logado e tenta voltar pra tela de login, joga ele pro /app
    if ((to.path === '/login' || to.path === '/signup') && isLoggedIn) {
       return next('/app');
    }

    // Se passou por tudo, deixa a navegação seguir normalmente
    next();
  });

  return Router;
});
