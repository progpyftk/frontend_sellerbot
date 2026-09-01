# PROMO-14 — Reestruturação de layout da tela `/app/promotions/ads`

**Status:** `done` · **Data:** 2026-09-01 · **Branch:** `melhoria/PROMO-14-redesign-promocoes-ads`
**Escopo:** arquitetura de informação e estrutura visual. **Não** altera regras de negócio,
endpoints, payloads nem `src/utils/promotionsAdsView.js`.

---

## 0. Por que este ticket existe

O PROMO-13 consertou a fundação visual (tokens, paleta, contraste, escala tipográfica) e a tela
ficou *correta* — mas continuou *embolada*. O diagnóstico após o deploy foi que o problema nunca
foi o valor dos tokens: era a **estrutura**. A tela era uma pilha de caixas e uma tabela repetida
dentro de cada caixa.

Este ticket troca a estrutura. Ele é complementar ao PROMO-13, não substituto: tudo o que a
especificação anterior documenta sobre tokens continua valendo.

---

## 1. Problemas estruturais encontrados

| # | Defeito | Onde | Impacto |
|---|---------|------|---------|
| E1 | **Cabeçalho de 10 colunas repetido por anúncio** | `PromotionsAdsGroup.vue` renderizava um `<thead>` completo dentro de cada card | 40 anúncios = 40 cabeçalhos idênticos. Ruído visual brutal e desperdício de ~40px por anúncio |
| E2 | **Sete blocos de cromo antes da primeira linha útil** | cabeçalho + legenda + 4 KPI cards + nota de rodapé + card de filtros + banner + toolbar | ~400px de rolagem antes de ver qualquer promoção |
| E3 | **Legenda de cores redundante** | `.promo-ads__legend` | Repetição exata do que as faixas "Ativas agora / Disponíveis / Processando" já dizem logo abaixo |
| E4 | **KPIs com escopos diferentes** | card 1 = total do catálogo; cards 2–4 = linhas carregadas | Exigia um parágrafo de rodapé explicando a divergência — sinal clássico de métrica mal definida |
| E5 | **Três níveis de aninhamento** | conta → card de anúncio → faixa → linha | Três fundos cinza competindo; `overflow:hidden` + `border-radius` + `box-shadow` em cada card |
| E6 | **Barra de resumo com 8 itens numa linha só** | `.promo-ads__summary` | Tudo em `display:flex` horizontal, colapsando de 1 para 8 colunas conforme a largura |
| E7 | **Colunas desalinhadas abaixo de 1100px** | `.pa-hide-md` escondia `td`/`th` mas o `<colgroup>` de larguras fixas continuava com 10 entradas | As larguras restantes eram aplicadas nas colunas erradas |
| E8 | **Barra sticky sangrando fora da coluna** | `margin: 0 -$space-6` | Ficava 48px mais larga que todo o resto da página |

---

## 2. O que mudou

### 2.1 Uma tabela única para a página inteira (E1, E5)

`PromotionsAdsPage.vue` passa a renderizar **uma** `<table>`. O `<thead>` é único e fica fixo no
scroll. `PromotionsAdsGroup.vue` deixou de ser um card e virou **fragment root** de `<tbody>`:

```
<table class="pa-table">
  <thead class="pa-thead">        ← único, position: sticky
  <PromotionsAdsGroup v-for=...>  ← devolve:
      <tbody class="pa-acct">     ← 1 linha: a conta (sticky)
      <tbody class="pa-ad">       ← 1 por anúncio: linha do anúncio + faixas + linhas de promoção
```

Múltiplos `<tbody>` na mesma `<table>` são válidos e dão agrupamento visual de graça — é o que
permite o hover destacar o anúncio inteiro (`.pa-ad:hover .pa-prow td`).

**Ganho:** 40 cabeçalhos → 1. Três níveis de aninhamento → um.

### 2.2 Três blocos no topo em vez de sete (E2, E3, E4)

| Antes | Depois |
|---|---|
| `SbPageHeader` | `SbPageHeader` (subtitle encurtado) |
| `.promo-ads__legend` (caixa de legenda) | **removido** — as faixas já são autocontidas; chip de margem ganhou `title` |
| `SbKpiGrid` com 4 `SbKpiCard` | `.pa-stats`: faixa de uma linha, 4 números inline |
| parágrafo `.promo-ads__note` | **removido** — todos os contadores agora medem as linhas carregadas; o total do catálogo aparece uma vez, no canto direito da faixa ("desta página · 128 no catálogo") |
| `SbCard` de filtros | `.pf`: painel recolhido por padrão, acionado por botão na barra |
| `q-banner` | `.pa-note`: uma linha, sem caixa colorida |
| `.promo-ads__viewbar` | `.pa-bar`: mesma função + botão Filtros |

**Sobre abrir mão de `SbKpiCard`/`SbKpiGrid`:** foi decisão deliberada, não esquecimento. Os
componentes são corretos em telas de dashboard; aqui quatro cards com borda própria somados a
legenda, nota e card de filtros produziam a pilha de caixas do E2. A faixa é desenhada com os
mesmos tokens (`$surface`, `$border`, `$radius-md`, `$text-h2-size`, `$text-xs-size`), então o
vocabulário visual permanece — só a densidade muda.

### 2.3 Dock de resumo em duas linhas (E6)

```
linha 1:  [N] promoções selecionadas · 2 anúncios · 2 SKUs · 1 contas   [1 aptas][1 bloqueadas] Margem alvo 20%
linha 2:  Preço médio R$ …  Desconto médio …  Lucro médio …  Margem média …   [Aplicar __% a 2]  [Limpar] [Revisar 1]
```

Fatos à esquerda, ações à direita. Antes os oito elementos disputavam a mesma linha.

### 2.4 Colunas em porcentagem (E7)

As larguras saíram do `<colgroup>` (px fixos) e foram para as classes de coluna, em `%`, somando
exatamente 100. Abaixo de 1100px as três colunas de custo saem e um bloco de `@media`
**recalcula as sete restantes**, também somando 100. Antes as larguras das colunas escondidas
vazavam para as vizinhas.

### 2.5 Alinhamento (E8)

A barra sticky perdeu a sangria negativa. Todo o conteúdo da página já vive dentro do padding do
`q-page`, então a barra na largura exata da coluna cobre tudo o que rola por baixo dela — e fica
alinhada com a tabela.

---

## 3. Sticky: como funciona

Três níveis empilhados, com alturas fixas declaradas em CSS vars no `.promo-ads`:

```scss
.promo-ads { --pa-bar-h: 52px; --pa-head-h: 34px; }
.pa-bar          { position: sticky; top: 0;                                      z-index: 30; }
.pa-thead th     { position: sticky; top: var(--pa-bar-h);                        z-index: 3;  }
.pa-acctrow td   { position: sticky; top: calc(var(--pa-bar-h) + var(--pa-head-h)); z-index: 2; }
```

As alturas precisam ser **fixas** (`height`, não `padding`) — é o que torna a conta exata. Abaixo
de 900px o sticky é desligado (`.pa-bar`, `th`, `.pa-acctrow td` → `position: static`) e a tabela
passa a rolar na horizontal.

---

## 4. Armadilhas para quem for mexer de novo

1. **`table-layout: fixed` usa só a primeira linha** para definir as larguras. A primeira linha é o
   `<thead>`, na página. Se alguém mover o `<thead>` para dentro do componente ou criar uma tabela
   separada, o alinhamento quebra.
2. **`:deep()` é obrigatório nas regras de coluna.** As células do corpo vivem no escopo de
   `PromotionsAdsGroup.vue`; o `<thead>` vive no escopo da página. Sem `.pa-table :deep(.c-*)`
   as larguras não alcançam as `<tbody>`.
3. **As larguras têm que somar 100%.** Com `table-layout: fixed`, a sobra é redistribuída e as
   colunas desalinham entre cabeçalho e corpo.
4. **`border-collapse: separate` é intencional** — `sticky` em `<th>` não renderiza bordas
   corretamente com `collapse`.
5. **Nada de `overflow: hidden` no ancestral da tabela.** Cria um container de scroll e mata o
   sticky. Por isso `.pa-tablewrap` só recebe `overflow-x: auto` abaixo de 900px, onde o sticky já
   está desligado.
6. **O fragment root de `PromotionsAdsGroup.vue` é deliberado** (uma `<tbody>` para a conta + uma
   por anúncio). Voltar para um elemento único envolve reaplicar o `<thead>` por anúncio.
7. **Hover vs. seleção.** `.pa-ad:hover .pa-prow:not(.is-chosen):not(.is-removing) td` — sem o
   `:not()`, a especificidade do hover (0,3,1) ganha de `.is-chosen` (0,2,1) e a linha selecionada
   perde o tint verde ao passar o mouse.
8. **`COLSPAN = 10`** está declarado em `PromotionsAdsGroup.vue` e precisa acompanhar o número de
   colunas do `<thead>`.
9. **Estilos inline em JS não veem SCSS.** Os `$q.dialog` de remoção/edição usam
   `style="font-size:12px;color:#64748b"` em template string. Os valores batem com a escala
   (`12px` = `$text-xs-size`), mas não há como usar o token ali.

---

## 5. Validação

- `quasar build` → **Build succeeded**
- `vitest run` → **16 arquivos, 121 testes, todos verdes**
  (inclui `promotionsAdsGroup` — 5 testes de regressão de checkbox/botão — e `promotionsAdsView` — 34)
- Contraste: nenhum texto novo fora da escala tipográfica; todo texto de corpo ≥ 4.5:1

## 6. O que **não** mudou

- `src/utils/promotionsAdsView.js` — intocado
- Props, emits e contratos de `PromotionsAdsGroup.vue` — idênticos
- `PromotionsAdsReviewDialog.vue` — intocado
- Endpoints, payloads, regras de trava de margem — intocados
- O comportamento de seleção, ativação e remoção — idêntico, só a apresentação mudou
