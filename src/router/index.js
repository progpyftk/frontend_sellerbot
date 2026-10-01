import { route } from "quasar/wrappers";
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from "vue-router";
import routes from "./routes";
import { useStore } from "src/stores/store";
import { authGuard } from "./authGuard";

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === "history"
    ? createWebHistory
    : createWebHashHistory;

  const Router = createRouter({
    // Deep-link com hash (ex.: /#mentoria da landing) pousa na seção;
    // nenhuma outra rota do app usa hash (verificado no IDV-13).
    scrollBehavior(to) {
      if (to.hash) return { el: to.hash, top: 32 };
      return { left: 0, top: 0 };
    },
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  // Guarda de navegação global — regras em ./authGuard (testáveis sem router)
  Router.beforeEach((to, from, next) => authGuard(to, from, next, useStore()));

  return Router;
});
