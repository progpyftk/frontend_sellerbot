# SellerBot — Design System v2.0

> Identidade visual oficial após redesign (jul/2026). Tema **light-only**.
> Veja `IDENTIDADE_VISUAL_PLANO.md` para o diagnóstico completo e plano de implementação.

---

## Conceito

**"Pro, leve, inteligente, confiável"** — plataforma financeira séria para e-commerce.

**Pilares**:
- Clareza (alto contraste para dados)
- Foco (1 cor dominante: teal)
- Calma (sem gradientes saturados ou efeitos "neon")
- Profundidade (sombras sutis, não brilho)

---

## Paleta de Cores

### 🟢 Teal — Cor da Marca

| Token | Hex | Uso |
|---|---|---|
| `teal-50` (surface) | `#f0fdf9` | Background de seções alternadas, sidebar ativa |
| `teal-100` | `#ccfbf1` | Chips, badges sutis, hover de item ativo |
| `teal-600` **← primary** | `#0d9488` | Botões primários, ícones, bordas de destaque |
| `teal-700` | `#0f766e` | Hover de botão primário, texto em fundo teal-50 |

```scss
$primary   : #0d9488;
$secondary : #0f766e;
```

> **Regra**: use teal-600 para fundos sólidos (botões), teal-700 para texto em fundos claros, teal-50 para áreas de destaque, teal-100 para badges.

---

### 🟠 Amber — Sotaque

| Token | Hex | Uso |
|---|---|---|
| `amber-500` **← accent** | `#f59e0b` | Badges "novo", estrelas, decoração pontual |
| `amber-600` | `#d97706` | Texto de warning |

> **Regra**: amber é **sotaque**, nunca cor dominante. Limite: 1 elemento amber por tela.

---

### ⬜ Slate — Texto e Superfícies

| Token | Hex | Uso |
|---|---|---|
| `slate-900` | `#0f172a` | Títulos, texto primário |
| `slate-700` | `#334155` | Corpo de texto |
| `slate-500` | `#64748b` | Labels, descrições, placeholders |
| `slate-400` | `#94a3b8` | Texto desabilitado, ícones secundários |
| `slate-300` | `#cbd5e1` | Bordas fortes, divisores |
| `slate-200` | `#e2e8f0` | Bordas de card |
| `slate-100` | `#f1f5f9` | Hovers, áreas alternadas |
| `slate-50`  | `#f8fafc` | Background da página |
| `white`     | `#ffffff` | Cards, modais, header, sidebar |

---

### ✅ Cores Semânticas

| Token | Hex | Uso |
|---|---|---|
| `green-600` | `#16a34a` | Lucro, sucesso, status "Conectado/Ativo" |
| `red-600`   | `#dc2626` | Prejuízo, erro, status "Erro" |
| `sky-600`   | `#0284c7` | Info neutro, links, badges informativos |
| `amber-600` | `#d97706` | Atenção, aviso, "Token expira em breve" |

**Tintas para badges/chips** (sempre `bg + text` da mesma família):

| Variante | bg | text |
|---|---|---|
| teal | `#ccfbf1` | `#0f766e` |
| green | `#dcfce7` | `#166534` |
| red | `#fee2e2` | `#991b1b` |
| amber | `#fef3c7` | `#92400e` |
| sky | `#e0f2fe` | `#075985` |
| indigo | `#e0e7ff` | `#3730a3` |
| slate | `#f1f5f9` | `#475569` |

---

### 🟡🟠 Cores de Marketplace (uso restrito)

| Marketplace | Cor | Quando usar |
|---|---|---|
| Mercado Livre | `#FFE600` (amarelo) | **Apenas** no logo/badge de identificação de conta ML |
| Shopee | `#EE4D2D` (laranja) | **Apenas** no logo/badge de identificação de conta Shopee |

> **Regra**: nunca usar essas cores como destaque de UI. São cores de marca externa.

---

## Tipografia

**Fonte única**: **Inter** (carregada via Google Fonts em `index.html`).

| Uso | Size | Weight | Color | Letter-spacing |
|---|---|---|---|---|
| Page title (H1) | 24px | 700 | `#0f172a` | -0.4px |
| Section title (H2) | 18px | 700 | `#0f172a` | -0.2px |
| Card title (H3) | 15px | 600 | `#0f172a` | 0 |
| Eyebrow | 11px | 700 UPPERCASE | `#0d9488` | +0.8px |
| Body | 14px | 400 | `#334155` | 0 |
| Label | 12px | 500 | `#64748b` | 0 |
| KPI value | 28px | 700 | `#0f172a` | -0.5px |
| Tabela header | 11px | 600 UPPERCASE | `#64748b` | +0.5px |

```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

---

## Espaçamento

| Token | Valor | Uso típico |
|---|---|---|
| `$space-1` | 4px | gaps internos |
| `$space-2` | 8px | entre ícone e label |
| `$space-3` | 12px | padding de chip |
| `$space-4` | 16px | padding de card, gap padrão |
| `$space-6` | 24px | padding de seção |
| `$space-8` | 32px | entre cards |
| `$space-12` | 48px | margem entre seções |

---

## Bordas e Raios

| Uso | Valor |
|---|---|
| Inputs, chips pequenos | `6px` |
| Botões | `8px` |
| Cards | `14px` |
| Modais, hero cards | `20px` |
| Avatares | `50%` (circular) |

**Bordas**: `1px solid #e2e8f0` (padrão) · `1.5px solid #0d9488` (em destaque)

---

## Sombras

```scss
$shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);                // hover sutil
$shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px ...;  // card default
$shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);               // dropdown
$shadow-lg: 0 12px 32px rgba(15, 23, 42, 0.10);              // modal, popover
$shadow-xl: 0 24px 60px rgba(15, 23, 42, 0.12);              // hero
```

> **Regra**: nunca use glow (`box-shadow: 0 0 ...`) — é coisa de tema escuro.

---

## Componentes Padrão

| Componente | Spec |
|---|---|
| **Botão primário** | `bg #0d9488`, texto `#fff`, `radius 8px`, `padding 8px 16px`, hover `#0f766e` |
| **Botão secundário** | `bg #fff`, borda `1px #e2e8f0`, texto `#0f172a`, hover `bg #f8fafc` |
| **Botão ghost** | sem fundo, texto `#0d9488`, hover `bg #f0fdf9` |
| **Botão danger** | `bg #fff`, borda `1px #dc2626`, texto `#dc2626` |
| **Card** | `bg #fff`, `border 1px #e2e8f0`, `radius 14px`, `shadow-xs` |
| **Input** | `bg #fff`, `border 1.5px #e2e8f0`, focus `border #0d9488` + ring `0 0 0 3px rgba(13,148,136,0.15)` |
| **Badge** | `radius 6px`, `padding 2px 8px`, `font 11px 600`, sempre com par `tint-X-bg/text` |
| **Tabela header** | `bg #f8fafc`, `font 11px 600 UPPERCASE #64748b`, `padding 12px 16px` |
| **Tabela row** | `border-bottom 1px #f1f5f9`, hover `bg #f8fafc` |
| **Tabs** | underline `2px` teal no ativo, `1px` transparente no inativo |

---

## Regras de Ouro

1. **Light-only**: nada de tema escuro. O app é claro por padrão.
2. **1 cor de destaque por tela**: além das cores semânticas (verde/vermelho/âmbar).
3. **Marketplace cores = só logos**: amarelo ML e laranja Shopee só onde o marketplace é o assunto.
4. **Cores de ícones do menu = teal tint**: nunca 9+ cores diferentes.
5. **Sidebar claro, conteúdo claro**: contraste visual vem de sombras e bordas, não de cores.
6. **Tudo com estado**: loading, empty, error — usar `SbEmptyState`.
7. **WCAG AA mínimo**: contraste 4.5:1 para texto, 3:1 para UI.
8. **Animações discretas**: fade 200ms, sem "bounce" ou scale exagerado.
9. **Mobile-first**: tudo funciona em 360px, desktop amplia.
10. **Componentes `Sb*`**: usar `SbCard`, `SbBadge`, `SbKpiCard`, `SbTable` — não recriar.

---

## Resumo Visual Rápido

```
PRIMARY    ████  #0d9488  teal-600
SURFACE    ████  #ffffff  cards
BACKGROUND ████  #f8fafc  página
TEXTO      ████  #0f172a  títulos
BORDER     ████  #e2e8f0  divisórias
SUCCESS    ████  #16a34a  lucro
DANGER     ████  #dc2626  prejuízo
WARNING    ████  #d97706  atenção
INFO       ████  #0284c7  info
```

> **Antes** (v1, design com tema escuro + múltiplas cores): dispersão visual, sem coesão.
> **Depois** (v2, light-only + semântica): 1 cor de marca, 4 cores semânticas, 2 cores externas de marketplace.

---

## Histórico

- **v1.0** (~2024-2025): sidebar roxa/azul escuro, gradientes neon, 9+ cores de ícones no menu. Documentado em `design.md` original mas não aplicado.
- **v2.0** (jul/2026): redesign completo. Sidebar claro, 1 cor de marca (teal), 4 cores semânticas, 2 cores de marketplace. Componentes `Sb*` reutilizáveis. Ver `IDENTIDADE_VISUAL_PLANO.md` para o diagnóstico completo.
