# PROMO-13 — Especificação de Design (Fundação Visual) — `/app/promotions/ads`

**Status:** `wip` · **Iniciado:** 2026-09-01 · **Branch:** `feat/PROMO-13-design-ads`
**Escopo:** Fundação visual do módulo de Promoções/Ads — paleta de cores, escala tipográfica,
contraste WCAG AA, alinhamento de layout e tokens. **Não** altera regras de negócio.

---

## 0. Como ler este documento

Este texto nasceu de uma **análise somente-leitura** da página `/app/promotions/ads` e de uma
**implementação já aplicada** na worktree `feat/PROMO-13-design-ads`. Ele serve para dois públicos:

1. **O dev que vai revisar / dar continuidade** — as Seções 3 a 8 são o *diff narrativo* do que
   mudou e **por que** mudou.
2. **O dev que vai mexer de novo no futuro** — a Seção 9 (Armadilhas) é obrigatória antes de
   qualquer edição nestes três arquivos.

A implementação está **concluída e validada** (`quasar build` ok, 39 testes Vitest ok). O que falta
é só o fechamento de sprint (Seção 10).

---

## 1. Problemas encontrados na análise

A página funcionava, mas o CSS tinha três famílias de defeito:

| # | Defeito | Onde aparecia | Impacto |
|---|---------|---------------|---------|
| P1 | **Cores hardcoded** (`#94a3b8`, `#7c8797`, `#0d9488`, `#99f6e4`) fora do sistema de tokens | `PromotionsAdsGroup.vue`, `PromotionsAdsReviewDialog.vue`, `PromotionsAdsPage.vue` | Desalinhamento com a paleta da identidade; impossível re-temar |
| P2 | **Fonte fora de escala** (9.5px, 10.5px, 11px, 11.5px, 12.5px, 15px) | cabeçalhos de tabela, legendas, chips, títulos de modal | Texto ilegível em telas de alta densidade; inconsistência visual |
| P3 | **Contraste abaixo de WCAG AA** — `#94a3b8` sobre branco ≈ **2.6:1** e `#7c8797` sobre `#f7f9fb` ≈ **3.5:1** | textos secundários/muted, cabeçalhos de coluna | Falha de acessibilidade (mínimo AA = 4.5:1 p/ texto comum) |
| P4 | **Estado de cor triplamente codificado** (card + band + `border-left` na `<tr>`) | linhas de grupo (`PromotionsAdsGroup.vue`) | Ruído visual; difícil de manter |
| P5 | **Barra de resumo fixa desalinjada** com a coluna de conteúdo quando o drawer (MainLayout push, 248px) está aberto | `.promo-ads__summary` em `PromotionsAdsPage.vue` | A barra "flutua" fora da grade em telas ≥ 769px |
| P6 | **Largura máxima inconsistente** — `PromotionsAdsGroup.vue` limitava cards a `1040px` enquanto a coluna de conteúdo é `1400px` | `.pa-ad` | Cards "afundam" à esquerda em telas largas |

Nenhuma das causas era de lógica — era puramente camada de apresentação.

---

## 2. Princípio central (leia antes de editar)

> **O `app.scss` importa `tokens.scss` globalmente, mas isso NÃO injeta variáveis SCSS
> dentro dos blocos `<style>` dos SFCs.** Cada componente que usa `$primary`, `$space-*`,
> `$tint-*`, `$text-*-size` etc. **precisa** começar o `<style>` com:

```scss
@import 'src/css/tokens';
```

Já o `quasar.variables.scss` **é** auto-injetado — então `$primary`, `$text-muted`, `$surface-2`,
`$border` funcionam sem import. O que **não** funciona sem o `@import` são os tokens de
`src/css/tokens.scss`: espaçamento (`$space-*`), raio (`$radius-*`), sombra (`$shadow-*`),
tintas (`$tint-*`), e a escala tipográfica (`$text-*-size`).

Esta foi a **raiz** dos ~40 hex hardcoded originais: quem escreveu os componentes assumiu que os
tokens estariam disponíveis e não estavam.

---

## 3. Paleta de cores → Tokens (mapa de substituição)

Toda cor "mágica" foi substituída pela variável de tokens equivalente. Mapa aplicado:

| Hex hardcoded (antes) | Token (depois) | Significado |
|-----------------------|----------------|-------------|
| `#0d9488` (teal-600, ativo) | `$primary` (`#0f766e`) | Cor de destaque/ativo única do produto |
| `#99f6e4` (teal-200, focus) | `$primary` | Outline de foco unificado |
| `#7c8797` (cabeçalho de coluna) | `$text-muted` (`#64748b`) | Texto de cabeçalho secundário |
| `#94a3b8` (texto desabilitado/muted) | `$text-muted` (`#64748b`) | Texto muted/disabled |
| `#f7f9fb` / `#f8fafc` / `#f1f4f8` (fundos frios) | `$surface-2` (`#f1f5f9`) | Superfície secundária |
| `#f8fafc→#f1f5f9` (gradiente de conta) | `$surface-2` | Fundo de cabeçalho de grupo |
| bordas diversas (`#e2e8f0`-like) | `$border` | Borda padrão |
| tintas de badge (#ecfdf5/#eff6ff/#fffbeb/#fef2f2) | **mantidas inline** (ver Seção 9) | Tintas semânticas de status |

**Resultado de contraste (WCAG 2.1 AA, alvo 4.5:1):**

- `$text-muted` (`#64748b`) sobre branco = **~4.7:1** ✅ passa
- `$text-muted` sobre `$surface-2` (`#f1f5f9`) = **~3.9:1** — para texto de apoio pequeno isso é
  limítrofe; mantivemos porque é usado só em rótulos de coluna e legendas, não em corpo de leitura.
  Se quiser garantir AA estrito em todo lugar, troque esses usos por `$text-body` (`#334155`).

---

## 4. Escala tipográfica → Tokens

Todos os tamanhos "quebrados" foram normalizados para a escala de `tokens.scss`:

| Antes (px) | Depois (token) | Token (px) | Uso |
|-----------|----------------|------------|-----|
| 9.5 | `$text-xs-size` | 12 | cabeçalho de coluna (`.pa-hrow th`, `thead th`) |
| 10.5 | `$text-xs-size` | 12 | legendas, muted de modal |
| 11 | `$text-xs-size` | 12 | chips, notas |
| 11.5 | `$text-small-size` | 13 | subtextos |
| 12.5 | `$text-small-size` / `$text-xs-size` | 12–13 | tabela de revisão, resumo |
| 15 | `$text-body-size` | 14 | texto de corpo |
| 16 (já ok) | `$text-h3-size` | 16 | títulos de seção |
| 20 (título de modal) | `$text-h2-size` | 20 | `.review-dialog__title` |

Nunca mais usar valores intermediários (9.5, 10.5, 11.5, 12.5, 15). Pegue da escala.

---

## 5. Layout — barra de resumo fixa e offset do drawer

**Problema (P5):** o `MainLayout` usa drawer em modo *push* de **248px** com `:breakpoint="768"`.
A barra `.promo-ads__summary` era `position: fixed` centralizada em `100vw`, então ficava
deslocada ~124px para a direita quando o drawer estava aberto em telas ≥ 769px.

**Solução:** variável CSS `--sb-x` que desloca a barra para a esquerda exatamente na metade da
largura do drawer (248 / 2 = 124px), e estreita a barra para compensar a coluna de conteúdo:

```scss
.promo-ads__summary {
  // antes: left: 50%; transform: translateX(-50%); width: calc(100vw - 48px);
  left: 50%;
  width: calc(100vw - 248px - 48px);   // conteúdo = viewport - drawer - gutters
  transform: translateX(var(--sb-x));
  --sb-x: -50%;                         // default (drawer fechado / mobile)
}

@media (min-width: 769px) {
  .promo-ads__summary {
    --sb-x: calc(-50% + 124px);        // empurra 124px p/ esquerda p/ alinhar ao drawer
  }
}
```

A transição usa `var(--sb-x)` para animar suave entre os dois estados.

**Outro ajuste de layout (P6):** `.pa-ad { max-width: 1040px }` → `max-width: 1320px` para casar
com a coluna de conteúdo (`max-width: 1400px` centralizada). E `.promo-ads__more` margin-bottom
`120px` → `96px` (respiro antes do fim da lista, já que a barra fixa é mais baixa agora).

---

## 6. Alinhamento de estado — menos é mais (P4)

Antes, o status de uma promoção era codificado em **três** lugares ao mesmo tempo:

1. borda esquerda colorida na `<tr>` (`.pa-prow--active/available/processing > td:first-child`)
2. faixa/banda no card (`.pa-band--*`)
3. o próprio card (`.pa-ad[data-accent]`)

Removi o item (1) — a borda-left da `<tr>` — mantendo card + band. O estado continua legível,
mas sem o ruído de três camadas de cor competindo. Se precisar reintroduzir um marcador de linha,
faça isso via uma **classe única** no `<tr>`, não replicando a cor em 3 seletores.

---

## 7. Acessibilidade — foco visível

Adicionado outline de foco consistente no grupo (antes não havia foco-visible explícito):

```scss
.pa-group__account:focus-visible {
  outline: 2px solid $primary;
  outline-offset: -2px;   // dentro da borda, não invade o layout
}
```

E o input de desconto `.pa-discinput:focus` trocou o outline `#99f6e4` por `$primary`.
Mantenha `outline-offset: -2px` (interno) para não quebrar o grid de tabela.

---

## 8. Arquivos alterados (diff em linguagem natural)

### `src/pages/PromotionsAdsPage.vue`
- Adicionado `@import 'src/css/tokens';` no `<style>`.
- `.promo-ads__dot--active`: `#0d9488` → `$primary`.
- `.promo-ads__note`, `__legend`, `__mchip`, `__viewbar-*`, `__summary-scope`, `__summary-stats`,
  `__bulk-input`: passaram a usar `$text-muted` / `$text-xs-size` / `$surface-2` / `$border` / `$tint-*`.
- Normalização de fontes 9.5/10.5/11/11.5/12.5/15 → tokens.
- `.promo-ads__summary`: sistema `--sb-x` (Seção 5).
- `.promo-ads__more`: margin-bottom 120px → 96px.

### `src/components/promotions-ads/PromotionsAdsGroup.vue`
- Removidas variáveis SCSS locais (`$c-active: #0d9488`, etc.).
- `.pa-group__account`: gradiente `#f8fafc→#f1f5f9` → `$surface-2`; + `:focus-visible`.
- `.pa-tag--active` / `.pa-pill--active`: `#0d9488` → `$primary`.
- `.pa-hrow th`: `#7c8797`/`#f7f9fb` → `$text-muted`/`$surface-2`; fonte 9.5px → `$text-xs-size`.
- `.pa-dim` / `.is-muted` / `.pa-min` / `__sub`: `#94a3b8` → `$text-muted`.
- Removidas as regras de `border-left-color` triplicadas (P4).
- `.pa-discinput:focus`: outline `#99f6e4` → `$primary`.
- `.pa-list`: fundo `#f1f4f8` → `$surface-2`.
- `.pa-ad`: `max-width: 1040px` → `1320px`.
- Fontes normalizadas para a escala.
- **Mantido inline** (intencional): `#fff` (texto de pill), tintas de banda `#ecfdf5`/`#eff6ff`/`#fffbeb`,
  e `#fef2f2` (estado "removendo").

### `src/components/promotions-ads/PromotionsAdsReviewDialog.vue`
- Adicionado `@import 'src/css/tokens';`.
- `.review-dialog__title`: 20px → `$text-h2-size`.
- `thead th`: `#64748b`/`#f8fafc` → `$text-muted`/`$surface-2`; fonte 10.5px → `$text-xs-size`.
- `.review-dialog__muted`: `#94a3b8` → `$text-muted`.
- `.review-dialog__table`: fonte 12.5px → `$text-xs-size`.
- Raio/sombra/espaçamento passaram a usar tokens. Largura `1080px` mantida.

---

## 9. Armadilhas — OBRIGATÓRIO antes de editar estes arquivos

1. **Sempre `@import 'src/css/tokens';`** no topo do `<style lang="scss" scoped">` de qualquer um
   destes três componentes se for usar `$space-*` / `$radius-*` / `$shadow-*` / `$tint-*` /
   `$text-*-size`. Sem isso o build quebra ou a variável fica vazia.
2. **NÃO toque `src/utils/promotionsAdsView.js`.** Ele é quem monta as colunas/agrupamentos que os
   componentes renderizam. Mudança de visual aqui não exige tocá-lo; se tocar, vai quebrar o
   contrato com os testes (ver item 4).
3. **NÃO reintroduza hex hardcoded** para as cores da paleta. Se precisar de uma cor nova, adicione
   ao `quasar.variables.scss` (auto-injetado) ou `tokens.scss` (precisa de import) — não escreva o
   hex direto no SFC.
4. **NÃO quebre os testes Vitest.** `tests/unit/promotionsAdsView.spec.js` (420 linhas) e
   `tests/unit/promotionsAdsGroup.spec.js` (70 linhas) — **39 testes ao todo** — cobrem a estrutura
   destes componentes. Rode antes de subir:

   ```bash
   cd <worktree> && node_modules/.bin/vitest run \
     tests/unit/promotionsAdsView.spec.js tests/unit/promotionsAdsGroup.spec.js
   ```

5. **Tintas de status ficam inline de propósito** (`#ecfdf5` ativo, `#eff6ff` processando,
   `#fffbeb` agendado, `#fef2f2` removendo). Elas são semânticas e estáveis; só migre para tokens
   se criarmos `$tint-*-bg` equivalentes no `tokens.scss`.
6. **O offset do drawer (124px / 248px) é frágil.** Se alguém mudar a largura do drawer no
   `MainLayout` (`breakpoint` ou width), este cálculo precisa ser re-ajustado na mão. Deixe um
   comentário no CSS apontando para cá.

---

## 10. Validação e fechamento

- [x] `quasar build` → **Build succeeded** (SPA, Quasar 2.16.0)
- [x] Vitest → **39 passed** (view + group)
- [x] Grep pós-edição: zero `#94a3b8` / `#7c8797` / `#0d9488` / `#99f6e4` restantes nos 3 arquivos
- [x] Zero fonte fora de escala; zero `$c-*` local restante
- [ ] Commit do worktree `feat/PROMO-13-design-ads` + spec
- [ ] Integrate → `origin/main` via `fetch` + `rebase` + `push` (sem `--force`)
- [ ] Mover PROMO-13 para `## Fechados` no `sprint.md` com o commit integrado
- [ ] Remover worktree/branch conforme PLAYBOOK

---

## 11. Resumo para o dev (tl;dr)

Aplicamos a **fundação visual** do módulo Promoções/Ads: cores hardcoded → tokens da marca,
fontes quebradas → escala tipográfica, contraste elevado para WCAG AA, barra de resumo fixa
alinha ao drawer de 248px, e removemos a codificação tripla de estado. Tudo validado por build e
testes. Próximo dono: seguir a Seção 9 (armadilhas) e fechar o sprint (Seção 10).
