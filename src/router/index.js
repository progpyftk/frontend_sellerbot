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

  // IDV-13 (revisão A2): o useMeta da landing injeta o título de marketing,
  // mas o plugin Meta do Quasar não restaura o anterior ao desmontar — em
  // navegação client-side (landing → Entrar → /login) o título vazava para o
  // app inteiro. Nenhuma outra página define document.title (verificado),
  // então fora da landing restauramos o padrão do template (index.html).
  const TEMPLATE_TITLE = "SellerBot Frontend";
  Router.afterEach((to) => {
    if (to.name !== "landing") document.title = TEMPLATE_TITLE;
  });

  return Router;
});
