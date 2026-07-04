# SellerBot — Auditoria de Identidade Visual e Plano de Redesenho

> Documento de referência para a redesignação visual completa do app SellerBot.
> Análise realizada após navegação página-a-página (15 telas capturadas) com login `admin`.

---

## 1. Diagnóstico — O que está acontecendo hoje

### 1.1 Conceito documentado vs. conceito aplicado

Existe um `design.md` bem estruturado na raiz do frontend, mas **nenhuma das telas o segue na prática**. O documento propõe:

- Sidebar **`slate-900`** (`#0f172a`) com toques de teal
- Cor primária **`teal-600`** (`#0d9488`) com `teal-400` (`#2dd4bf`) em fundos escuros
- Amber (`#f59e0b`) **apenas como sotaque** — nunca dominante
- Acento roxo (`indigo`) **apenas** para pedidos/vendas
- Fundo claro: `slate-50` / `teal-50` / branco

O que o app renderiza de verdade:

| Camada | Documentado | Aplicado |
|---|---|---|
| Sidebar | `slate-900` (preto-azulado) | Roxo/azul **`#1a1740 → #0b0e24`** (gradiente "festa") |
| Logo da marca | Teal `#0d9488 → #2dd4bf` | Teal (`ok` — único ponto positivo) |
| Header | — | Branco/claro (`ok` — funciona) |
| Marketplace badges | Sem regra | ML amarelo `#FFE600` + Shopee laranja `#EE4D2D` (mantidos — esses são das marcas, **ok**) |
| Cores de ícones no menu | Teal uniforme | **9+ cores diferentes**: roxo, laranja, teal, âmbar, verde, azul-céu, cinza, índigo, fúcsia |
| Cores de gráficos | — | Cores aleatórias por conta: roxo, ciano, laranja, rosa, verde, etc. |
| Página de erro (404) | — | Azul brilhante `#3b82f6` (não é a cor da marca) |
| Botão Krivus CRM | — | Indigo-6 (`#4f46e5`) — não é a cor da marca |
| Cards KPI | Teal/Verde | Teal, verde, ciano, laranja, rosa, **5+ cores sem semântica** |

**Resumo**: cada página foi estilizada isoladamente, sem um sistema. Resultado: o app parece "feito de remendos".

### 1.2 Problemas de UX além das cores

1. **Hierarquia visual quebrada**: o sidebar escuro compete com o conteúdo claro, gerando alto contraste desnecessário. O olho não sabe onde pousar.
2. **Sobrepeso cromático**: as 9+ cores dos ícones do menu transformam navegação em "árvore de natal".
3. **Header Wordmark "SellerBot" duplicado**: aparece no header e na sidebar — repetição gratuita.
4. **Status de loading inconsistente**: algumas páginas mostram spinner central, outras skeleton, outras só o aviso "Carregando…".
5. **Estados vazios mal cuidados**: ex.: `08-promotions.png` está em **branco total** (bug funcional, não é tela vazia estilizada).
6. **404 em azul brilhante** (`11-market-intel.png`, `13-system-health.png`, `14-user-config.png`): três rotas dão 404 e o fallback do Quasar (azul puro) é a cara do app.
7. **Métricas de cor sem semântica**: verde para "lucro" e vermelho para "prejuízo" é OK; rosa para "pedidos pagos" e laranja para "ROAS" é aleatório.

### 1.3 O que está bom (preservar)

- ✅ Identidade de teal no logo e nos botões primários
- ✅ Sidebar com agrupamento por marketplace (ML / Shopee / Inteligência / Sistema) — boa arquitetura de informação
- ✅ Header branco limpo e bem hierarquizado
- ✅ Cards de KPI com sparklines (Dashboard)
- ✅ Waterfall DRE (muito bem feita, não mexer)
- ✅ Uso de `q-btn` nativo e tipografia consistente
- ✅ Responsividade já implementada em mobile

---

## 2. Nova Identidade Visual — "Light & Pro"

**Conceito**: "Pro, leve, inteligente, confiável". Plataforma financeira séria para e-commerce — não app de jogo.

**Pilares**:
- **Clareza**: fundo claro, alto contraste para dados
- **Foco**: 1 cor dominante (teal) + semântica (verde/vermelho/âmbar) + 1 cor de marca externa (Shopee/ML) só quando relevante
- **Calma**: nada de gradientes saturados ou efeitos "neon"
- **Profundidade**: sombras sutis, não brilho

### 2.1 Paleta de cores oficial

```scss
// ============================================================
// SELLERBOT — DESIGN TOKENS
// Substituir src/css/quasar.variables.scss e design.md
// ============================================================

// ── MARCA ──
$primary   : #0d9488;   // teal-600 — cor SellerBot
$secondary : #0f766e;   // teal-700 — hover/secondary
$accent    : #f59e0b;   // amber-500 — destaque, "novo", ★

// ── SUPERFÍCIE (LIGHT-ONLY) ──
$background : #f8fafc;  // slate-50 — fundo da página
$surface    : #ffffff;  // cards, modais, header
$surface-2  : #f1f5f9;  // slate-100 — hovers, áreas alternadas
$border     : #e2e8f0;  // slate-200 — bordas
$border-strong : #cbd5e1; // slate-300

// ── TEXTO ──
$text-primary   : #0f172a;  // slate-900 — títulos
$text-body      : #334155;  // slate-700 — corpo
$text-muted     : #64748b;  // slate-500 — labels, descrições
$text-disabled  : #94a3b8;  // slate-400

// ── SEMÂNTICA ──
$positive : #16a34a;  // green-600 — lucro, sucesso
$negative : #dc2626;  // red-600 — prejuízo, erro
$info     : #0284c7;  // sky-600 — info neutro
$warning  : #d97706;  // amber-600 — atenção

// ── SUPERFÍCIE TINTA (badges, chips) ──
$tint-teal-bg    : #ccfbf1;  $tint-teal-text    : #0f766e;
$tint-green-bg   : #dcfce7;  $tint-green-text   : #166534;
$tint-red-bg     : #fee2e2;  $tint-red-text     : #991b1b;
$tint-amber-bg   : #fef3c7;  $tint-amber-text   : #92400e;
$tint-sky-bg     : #e0f2fe;  $tint-sky-text     : #075985;
$tint-indigo-bg  : #e0e7ff;  $tint-indigo-text  : #3730a3;
$tint-slate-bg   : #f1f5f9;  $tint-slate-text   : #475569;

// ── MARKETPLACES (cores externas — usar só quando o marketplace é o tema) ──
$ml-amber    : #FFE600;    // Mercado Livre amarelo (logo)
$ml-amber-bg : rgba(255, 230, 0, 0.12);
$shopee-orange : #EE4D2D;  // Shopee laranja (logo)
$shopee-orange-bg : rgba(238, 77, 45, 0.10);
```

### 2.2 Tipografia

**Fonte única**: **Inter** (mais legível que Roboto para dashboards densos, ótima em PT-BR com acentos, varia entre pesos sem descarregar múltiplas famílias).

```html
<!-- Em index.html, substituir Roboto por Inter -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

```scss
// Quasar variables
$typography-font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

// Escala tipográfica
$h1: 2.25rem;  // 36px — títulos de página
$h2: 1.5rem;   // 24px — seções
$h3: 1.125rem; // 18px — card title
$h4: 1rem;     // 16px — sub-seção
$body: 0.9375rem; // 15px
$small: 0.8125rem; // 13px — labels
$caption: 0.6875rem; // 11px — eyebrow, badges
```

| Uso | Size | Weight | Color | Letter-spacing |
|---|---|---|---|---|
| Page title (H1) | 24px | 700 | `#0f172a` | -0.4px |
| Section title (H2) | 18px | 700 | `#0f172a` | -0.2px |
| Card title (H3) | 15px | 600 | `#0f172a` | 0 |
| Eyebrow (acima do título) | 11px | 700 UPPERCASE | `#0d9488` | +0.8px |
| Body | 14px | 400 | `#334155` | 0 |
| Label / muted | 12px | 500 | `#64748b` | 0 |
| KPI value (números) | 28px | 700 | `#0f172a` | -0.5px |
| Tabela de cabeçalho | 11px | 600 UPPERCASE | `#64748b` | +0.5px |

### 2.3 Forma — raios e sombras

```scss
$radius-sm: 6px;   // inputs, chips pequenos
$radius-md: 10px;  // botões, cards internos
$radius-lg: 14px;  // cards principais
$radius-xl: 20px;  // hero cards, modais

// Sombras (sutis, nada de glow)
$shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
$shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
$shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
$shadow-lg: 0 12px 32px rgba(15, 23, 42, 0.10);
$shadow-xl: 0 24px 60px rgba(15, 23, 42, 0.12);
```

### 2.4 Espaçamento

```scss
$space-1: 4px;
$space-2: 8px;
$space-3: 12px;
$space-4: 16px;
$space-5: 20px;
$space-6: 24px;
$space-8: 32px;
$space-10: 40px;
$space-12: 48px;
$space-16: 64px;
```

### 2.5 Componentes padrão

| Componente | Spec |
|---|---|
| **Botão primário** | `bg #0d9488`, texto branco, `radius 8px`, `padding 8px 16px`, hover `0f766e` |
| **Botão secundário** | `bg #ffffff`, borda `1.5px #e2e8f0`, texto `#0f172a` |
| **Botão ghost** | sem fundo, texto `#0d9488`, hover `tint-teal-bg` |
| **Card** | `bg #ffffff`, `border 1px #e2e8f0`, `radius 14px`, `shadow-xs` |
| **Input** | `bg #ffffff`, `border 1.5px #e2e8f0`, focus `border #0d9488 + 3px tint-teal-bg ring` |
| **Badge** | `radius 6px`, `padding 2px 8px`, `font 11px 600`, usar `tint-X-bg/text` |
| **Tabela** | Header `bg #f8fafc`, `font 11px 600 uppercase #64748b`, row `border-bottom 1px #f1f5f9`, hover row `bg #f8fafc` |
| **Tab bar** | Underline teal de 2px no ativo, inativo `#64748b` |

### 2.6 Sidebar (única decisão de "cor grande" do app)

**Decisão: sidebar CLARO (slate-50) com cabeçalho de marca em teal**. Razões:
1. Remove o contraste extremo entre sidebar e conteúdo
2. Reforça a leitura das cores de marketplaces (ML/Shopee se destacam)
3. Aumenta a área visual do conteúdo (que é o produto)
4. Atende ao pedido de "não gosto de tema escuro"

```scss
.sidebar {
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  
  .nav-section-title {
    color: #94a3b8;  // slate-400
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  
  .nav-item {
    color: #334155;
    border-radius: 8px;
    
    &:hover { background: #f1f5f9; }
    
    &--active {
      background: #f0fdf9;  // teal-50
      color: #0f766e;
      font-weight: 600;
      // marcador lateral teal
      &::before {
        background: #0d9488;
        width: 3px;
        height: 60%;
      }
    }
  }
  
  // Ícones do menu: 1 cor de fundo (tint-teal) por padrão.
  // Cores de marketplaces só nos badges ML/Shopee.
  .nav-icon-wrap {
    background: #f1f5f9;
    color: #475569;
  }
}
```

### 2.7 Regra de ouro para cores em qualquer tela

| Caso | Cor |
|---|---|
| Ação primária / marca | `#0d9488` (teal) |
| Lucro / sucesso | `#16a34a` (verde) |
| Prejuízo / erro | `#dc2626` (vermelho) |
| Atenção / aviso | `#d97706` (âmbar) |
| Informação neutra | `#0284c7` (sky) |
| Marketplace = ML | `#FFE600` (logo) — **só** em logos/badges ML |
| Marketplace = Shopee | `#EE4D2D` (logo) — **só** em logos/badges Shopee |
| Qualquer outro destaque | Não usar. Usar uma das acima. |

---

## 3. Plano de Implementação — Página por Página

> Ordem de prioridade: layout/global primeiro, depois páginas em ordem de uso.

### 3.1 Sprint 0 — Fundações (1-2 dias)

| # | Tarefa | Arquivo | Estimativa |
|---|---|---|---|
| 0.1 | Atualizar `quasar.variables.scss` com a paleta nova | `src/css/quasar.variables.scss` | 1h |
| 0.2 | Criar `src/css/tokens.scss` com variáveis SCSS (radius, shadow, space) | novo | 1h |
| 0.3 | Adicionar Inter no `index.html` e remover Roboto | `index.html` | 30min |
| 0.4 | Criar `src/css/components.scss` com classes utilitárias (`.sb-card`, `.sb-btn-primary`, `.sb-kpi`) | novo | 3h |
| 0.5 | Criar `src/components/common/SbCard.vue` | novo | 1h |
| 0.6 | Criar `src/components/common/SbPageHeader.vue` (cabeçalho padronizado de página) | novo | 1h |
| 0.7 | Criar `src/components/common/SbKpiCard.vue` | novo | 1.5h |
| 0.8 | Criar `src/components/common/SbTable.vue` (wrapper de tabela estilizada) | novo | 2h |
| 0.9 | Criar `src/components/common/SbBadge.vue` com variants (teal/green/red/amber/sky/indigo/ml/shopee) | novo | 1.5h |
| 0.10 | Criar `src/components/common/SbEmptyState.vue` (loading/empty/error padronizados) | novo | 1.5h |

### 3.2 Sprint 1 — Layout e global (1 dia)

| # | Tarefa | Arquivo | Estimativa |
|---|---|---|---|
| 1.1 | Reescrever `MainLayout.vue` — sidebar claro, header wordmark removido (só avatar) | `src/layouts/MainLayout.vue` | 4h |
| 1.2 | Unificar cores dos ícones do menu para tint-teal | `src/layouts/MainLayout.vue` (lines 186-225) | 1h |
| 1.3 | Padronizar avatar/usuário dropdown | `src/layouts/MainLayout.vue` | 1h |
| 1.4 | Reescrever `HomeToolbar.vue` para teal-50 light | `src/layouts/HomeToolbar.vue` | 2h |
| 1.5 | Atualizar `KrivusLayout.vue` para usar mesmo padrão visual | `src/layouts/KrivusLayout.vue` | 2h |
| 1.6 | Corrigir bug 404 — `MarketIntelligencePage`, `SystemHealthPage`, `UserConfigPage` | verificar backend e views | 4h |
| 1.7 | Corrigir `PromotionsManagerPage.vue` (tela em branco) | `src/pages/PromotionsManagerPage.vue` | 2h |
| 1.8 | Corrigir bug `axios.js` (hardcoded `localhost:8000`) | `src/boot/axios.js` | 30min |
| 1.9 | Remover tela 404 azul — usar `ErrorNotFound.vue` com a marca | `src/pages/ErrorNotFound.vue` | 1h |

### 3.3 Sprint 2 — Autenticação (0.5 dia)

| Página | Estado Atual | Mudanças | Arquivo |
|---|---|---|---|
| **HomePage** | Landing teal escuro, bonita mas desconectada do app | Substituir fundo slate-900 por teal-50 claro. Manter hierarquia de seções. | `src/pages/HomePage.vue` + subcomponentes |
| **LoginPage** | Card branco simples, sem personalidade | Fundo teal-50, card com shadow-md, ilustração SVG no lado direito (desktop). Inputs com focus teal. | `src/pages/LoginPage.vue` |
| **SignupPage** | Mesmo padrão do login | Aplicar mesmo tratamento | `src/pages/SignupPage.vue` |
| **MLRedirect / ShopeeRedirect / TinyRedirect** | Páginas de callback | Padronizar tela de "Conectando…" com loading teal e mensagem clara | os 3 .vue |

### 3.4 Sprint 3 — Dashboard (1.5 dias)

**Página**: `DashboardPage.vue` — **a mais usada do app, prioridade máxima**.

| Bloco | Mudanças | Detalhe |
|---|---|---|
| Page header | Usar `SbPageHeader` | Eyebrow "SellerBot", título "Dashboard da Operação" |
| Sidebar de filtros | Redesenhar — usar `SbCard` com shadow-xs, header teal-50 | Menos "box de opções", mais "painel lateral" |
| KPI Cards (10 cards) | Usar `SbKpiCard` com 4 variantes semânticas (azul-teal/verde/âmbar/vermelho). **Remover rosa/laranja aleatórios** | Cada card com 1 cor baseada no que representa: receita (teal), lucro (verde), ads (âmbar), prejuízo (vermelho) |
| Gráfico | Manter Plotly, mas forçar `colorway: ['#0d9488','#16a34a','#f59e0b','#dc2626','#0284c7','#6366f1']` (6 cores suficientes) | Atualizar `accountColor()` para usar escala teal quando marketplace = ML, escala laranja quando Shopee |
| Sparklines | Padronizar — 1 cor por métrica (não 5 cores diferentes) | Criar helper `sparkColor(metric)` |
| Tabela "Detalhamento Diário" | Usar `SbTable` com cabeçalho slate-50, hover f8fafc | Quebras visuais nas linhas negativas (vermelho claro de fundo) |
| Abas (Evolução/Ranking/DRE) | Substituir por `q-tabs` Quasar estilizado OU underline custom teal | Manter conteúdo |
| DRE Waterfall | **NÃO MEXER** | Já está bom |
| Banner "CMV sem custo" | Manter, mas usar `--warning` em vez de teal | Texto amarelo-âmbar com ícone |
| Banner "Hoje em destaque" | Manter, ajustar para teal-50 background | |

### 3.5 Sprint 4 — Páginas transacionais (1.5 dias)

| Página | Mudanças principais |
|---|---|
| **OrdersList (Vendas ML)** | Page header padronizado. KPI cards no topo (3, não 4 — remover redundância). Tabela com `SbTable`. Tags de logística padronizadas (Full, Coleta → usar `tint-sky`/`tint-teal`). Imagem do produto 40×40 com `radius 8px`. |
| **ShopeeOrdersPage** | Mesma estrutura do ML Orders. Trocar paleta de tags para Shopee (laranja no badge de marketplace). |
| **ItemsPage (Meus Anúncios)** | Page header + contador. Filtros reagrupados em painel lateral recolhível (estilo Dashboard). Tabela densa mantida. **Status pills**: ativo=`tint-green`, pausado=`tint-amber`, inativo=`tint-slate`. |
| **ShopeeItemsPage** | Igual ItemsPage, com badge Shopee. |
| **ItemDetailsPage / ItemAnalyticsPage** | Usar `SbPageHeader`. Adicionar breadcrumb (Mercado Livre › Anúncios › Detalhe). Layout em 2 colunas (info à esquerda, gráficos à direita). |
| **AdsPage / ShopeeAdsPage** | KPI cards com semântica (investimento=teal, ACoS=âmbar, ROAS=verde). Tabela com `SbTable`. |
| **PromotionsManagerPage** | **Prioridade alta — está em branco (bug)**. Reconstruir com layout baseado em abas (Ativas / Agendadas / Encerradas), cada aba com `SbTable`. |
| **ShopeeDiscountsPage / ShopeeVouchersPage** | Aplicar mesmo padrão de Promotions. |

### 3.6 Sprint 5 — Inteligência e Sistema (1 dia)

| Página | Mudanças principais |
|---|---|
| **SellerBotAIPage** | Layout 2 colunas: sidebar de conversas (200px) + chat. Bolhas de mensagem com cor: user=`tint-teal`, bot=`#ffffff` com borda. Header com seletor de modelo em `q-select` outline. Sugestões iniciais em cards com `tint-teal-bg` (não múltiplas cores). |
| **ItemAnalyticsPage** | **Já analisada** (screenshot 12). Padronizar lista lateral de itens com `SbCard` ou lista simples. |
| **MarketIntelligencePage** | **Prioridade alta — está em 404**. Reconstruir ou esconder rota se feature não existe no backend. |
| **SystemHealthPage** | **404 também**. Cards de saúde por serviço (DB, ML API, Shopee API, Tiny, IA). Cada serviço com `SbBadge` verde/âmbar/vermelho. |
| **UserConfigPage** | **404 também**. Tabs (Conta / Notificações / API Tokens / Tema). Form fields com `SbInput`. |
| **AccountsPage** | Tabela de contas com `SbTable`. Status "Conectado" = `tint-green`, "Token expirado" = `tint-amber`, "Erro" = `tint-red`. Botão "Adicionar Conta ML" primário teal. |
| **ProductsPage (CMV)** | Tabela densa com edição inline. Contador no header. Loading state com skeleton rows. |

### 3.7 Sprint 6 — Krivus CRM (0.5 dia)

| Página | Mudanças |
|---|---|
| **KrivusLayout** | Mesmo padrão do `MainLayout` (sidebar claro). Botão "Voltar ao SellerBot" no header. |
| **KrivusOverviewPage** | KPIs de receita Krivus. Cards de clientes. |
| **KrivusClientPage** | Abas (Visão Geral / Milestones / Documentos). |
| **KrivusTemplatesPage** | Lista de templates. |

### 3.8 Sprint 7 — Polimento (1 dia)

| # | Tarefa |
|---|---|
| 7.1 | Loading states — todos os `v-if="loading"` devem usar `SbEmptyState variant="loading"` |
| 7.2 | Empty states — todas as listas vazias com ilustração SVG + mensagem + CTA |
| 7.3 | Error states — toast padrão (cor `negative`) + página de erro amigável |
| 7.4 | Animações — fade-in 200ms nas transições de página (Vue `<transition>`) |
| 7.5 | Microinterações — hover em cards com `transform: translateY(-1px)` + shadow-md |
| 7.6 | Foco de teclado — todos os botões e inputs com outline teal de 2px |
| 7.7 | Acessibilidade — auditar contraste WCAG AA em todas as combinações |
| 7.8 | Documentação — atualizar `design.md` com o novo sistema |

---

## 4. Resumo de impacto esperado

| Antes | Depois |
|---|---|
| 9+ cores nos ícones do menu | 1 cor (teal-tint) + 2 cores externas (ML/Shopee) |
| Sidebar roxa/azul escuro | Sidebar branco, leve |
| Cards KPI com cores aleatórias | 4 cores semânticas (teal/verde/âmbar/vermelho) |
| Roboto (default Quasar) | Inter (legível, moderna) |
| 3 páginas em 404 | Resolvido |
| `PromotionsPage` em branco | Resolvido |
| `axios.js` aponta para 8000 fixo | Usa `VITE_BACKEND_HOST` |
| Sem sistema de design aplicável | `tokens.scss` + componentes `Sb*` reutilizáveis |

**Resultado**: app coeso, profissional, leve, que reflete a seriedade da plataforma financeira que o SellerBot é.

---

## 5. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Quebrar regras de negócio dos marketplaces (cores das marcas) | Preservar `#FFE600` e `#EE4D2D` **só** em logos e badges de identificação |
| Performance — Inter como Google Font | Usar `font-display: swap` e pré-load |
| Resistência da equipe ao redesign | Fazer migração **progressiva** (1 sprint por página) sem big-bang |
| Componentes `Sb*` ficarem subutilizados | Code review exigindo uso; remover componentes antigos em sprint 8 |
| Acessibilidade — contraste de teal em teal-50 | Usar `teal-700` (`#0f766e`) como texto, não `teal-600` |

---

## 6. Métricas de sucesso

- **Coesão**: número de cores hex distintas em CSS do app: **atual ~80, meta < 30**
- **Bugs de rota**: páginas em 404: **atual 3+, meta 0**
- **Componentes reutilizados**: `SbCard`, `SbBadge`, `SbKpiCard` em **≥ 80% das páginas**
- **Bundle size**: não aumentar mais que 10% (Inter é leve)
- **Tempo de carregamento da 1ª página**: manter abaixo de 2s

---

*Documento gerado a partir de navegação real com Playwright e login `admin`. 15 screenshots capturados em `/home/losimonassi/projetos/backend_sellerbot/*.png` (01-dashboard.png até 15-krivus.png) como evidência.*
