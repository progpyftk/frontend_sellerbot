// Guarda global de navegação, extraída de src/router/index.js (IDV-13) para
// permitir teste unitário direto das regras de acesso sem router/Pinia/Quasar.
// A landing pública (rota "landing") NÃO hidrata sessão: visitante anônimo,
// token expirado ou backend indisponível não podem travar nem atrasar a
// página — fetchCurrentUser com erro faria logout + push("/login").

/** Nome da rota pública que não hidrata sessão. */
export const PUBLIC_LANDING_ROUTE = "landing";

/**
 * Aplica as regras de acesso do SellerBot.
 *
 * Contrato: mesmas regras históricas de src/router/index.js —
 * (1) /app* exige autenticação; (2) logado em /login ou /signup vai a /app;
 * (3) token salvo sem usuário hidrata currentUser (exceto na landing);
 * (4) /krivus* exige staff.
 *
 * @param {import('vue-router').RouteLocationNormalized} to
 * @param {import('vue-router').RouteLocationNormalized} from
 * @param {(to?: any) => void} next callback de navegação do vue-router
 * @param {object} store store Pinia (isAuthenticated, currentUser, fetchCurrentUser)
 */
export async function authGuard(to, from, next, store) {
  const requiresAuth = to.path.startsWith("/app"); // Rotas que exigem autenticação
  const isLoggedIn = store.isAuthenticated;

  // Se a rota exige login e ele não tá logado, manda pro /login
  if (requiresAuth && !isLoggedIn) {
    console.log("Usuário não está logado. Redirecionando para o login.");
    return next("/login");
  }

  // Regra de Ouro: Se o usuário já está logado e tenta voltar pra tela de login, joga ele pro /app
  if ((to.path === "/login" || to.path === "/signup") && isLoggedIn) {
    return next("/app");
  }

  // Garante que currentUser.id está carregado (compatibilidade com sessões antigas sem id)
  if (to.name !== PUBLIC_LANDING_ROUTE && isLoggedIn && !store.currentUser?.id) {
    await store.fetchCurrentUser();
  }

  // Krivus CRM: apenas staff
  if (to.path.startsWith("/krivus") && !store.currentUser?.is_staff) {
    return next("/app");
  }

  // Se passou por tudo, deixa a navegação seguir normalmente
  next();
}
