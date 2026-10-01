import { describe, expect, it, vi } from 'vitest'

import { PUBLIC_LANDING_ROUTE, authGuard } from 'src/router/authGuard'

// IDV-13: a guarda global foi extraída para src/router/authGuard.js. O risco central
// do ticket é a landing pública: ela NÃO pode hidratar sessão (fetchCurrentUser com
// erro faz logout + push("/login"), sequestrando visitante com token expirado).
// As rotas privadas precisam manter exatamente o comportamento histórico.
function makeStore({ isAuthenticated = false, currentUser = null } = {}) {
  return {
    isAuthenticated,
    currentUser,
    fetchCurrentUser: vi.fn(async () => {}),
  }
}

// Captura o destino passado a next (next() = segue; next("/x") = redireciona)
function runGuard(to, store) {
  const calls = []
  const next = (arg) => calls.push(arg)
  return authGuard(to, {}, next, store).then(() => calls)
}

describe('authGuard — landing pública (IDV-13)', () => {
  const landing = { path: '/', name: PUBLIC_LANDING_ROUTE }

  it('visitante anônimo na landing: segue sem hidratar sessão', async () => {
    const store = makeStore()
    const calls = await runGuard(landing, store)
    expect(calls).toEqual([undefined])
    expect(store.fetchCurrentUser).not.toHaveBeenCalled()
  })

  it('token salvo sem usuário na landing: segue SEM fetchCurrentUser (correção central)', async () => {
    const store = makeStore({ isAuthenticated: true, currentUser: null })
    const calls = await runGuard(landing, store)
    expect(calls).toEqual([undefined])
    expect(store.fetchCurrentUser).not.toHaveBeenCalled()
  })

  it('usuário logado com currentUser na landing: segue sem redirecionar para /app', async () => {
    const store = makeStore({ isAuthenticated: true, currentUser: { id: 1 } })
    const calls = await runGuard(landing, store)
    expect(calls).toEqual([undefined])
  })
})

describe('authGuard — rotas privadas preservadas', () => {
  it('token salvo sem usuário em /portal/:token: hidrata currentUser', async () => {
    const store = makeStore({ isAuthenticated: true, currentUser: null })
    const calls = await runGuard({ path: '/portal/abc', name: 'krivus-portal' }, store)
    expect(store.fetchCurrentUser).toHaveBeenCalledOnce()
    expect(calls).toEqual([undefined])
  })

  it('token salvo sem usuário em /krivus: hidrata currentUser', async () => {
    const store = makeStore({ isAuthenticated: true, currentUser: null })
    await runGuard({ path: '/krivus/clientes', name: 'krivus' }, store)
    expect(store.fetchCurrentUser).toHaveBeenCalledOnce()
  })

  it('anônimo em /app: redireciona para /login', async () => {
    const store = makeStore()
    const calls = await runGuard({ path: '/app/dashboard', name: 'dashboard' }, store)
    expect(calls).toEqual(['/login'])
  })

  it('logado em /login: redireciona para /app', async () => {
    const store = makeStore({ isAuthenticated: true, currentUser: { id: 1 } })
    const calls = await runGuard({ path: '/login', name: 'login' }, store)
    expect(calls).toEqual(['/app'])
  })

  it('logado não-staff em /krivus: redireciona para /app', async () => {
    const store = makeStore({ isAuthenticated: true, currentUser: { id: 1, is_staff: false } })
    const calls = await runGuard({ path: '/krivus/clientes', name: 'krivus' }, store)
    expect(calls).toEqual(['/app'])
  })

  it('logado staff em /krivus: segue', async () => {
    const store = makeStore({ isAuthenticated: true, currentUser: { id: 1, is_staff: true } })
    const calls = await runGuard({ path: '/krivus/clientes', name: 'krivus' }, store)
    expect(calls).toEqual([undefined])
  })
})
