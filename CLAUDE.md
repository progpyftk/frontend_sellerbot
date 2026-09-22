# frontend_sellerbot — as regras moram no backend (Claude Code)

Frontend Vue 3 + Quasar do SellerBot. Repositorio git independente, com `main` e `.worktrees/`
proprios, mas **a governanca e unica e vive no backend**:

- Regras de ambiente, sprints, tickets, worktrees e git:
  [`../backend_sellerbot/AGENTS.md`](../backend_sellerbot/AGENTS.md)
- Ciclo de vida de sprint: [`../backend_sellerbot/sprints/PLAYBOOK.md`](../backend_sellerbot/sprints/PLAYBOOK.md)
- Skills dos agentes: [`../backend_sellerbot/SKILLS.md`](../backend_sellerbot/SKILLS.md)
  (fonte unica em `backend_sellerbot/.agents/skills/` — nao duplicar aqui)

Pontos especificos deste repositorio:

- Um ticket que atravessa backend e frontend tem **um worktree em cada repo**, com o mesmo ID de
  ticket no branch (ex.: `feat/PROMO-IA-22-redesign` nos dois).
- Gerenciador de pacotes: **npm**. `package-lock.json` e o unico lock versionado e o `Dockerfile` do
  deploy roda `npm install --legacy-peer-deps`. Pode existir um `pnpm-lock.yaml` local na sua maquina
  (nao versionado, nao ignorado): e experimento de quem mexeu, nao a fonte. Nao commite lock de outro
  gerenciador nem troque de gerenciador sem decidir com o dono e alinhar o `Dockerfile`.
- Testes: Vitest (`pnpm test`) e Playwright (`playwright.config.js`).
- Nunca abra a sessao na pasta container que agrupa os repositorios. Abra na raiz deste repo ou
  no worktree: `cd .worktrees/frontend_sellerbot-<ticket>-<slug> && opencode`
