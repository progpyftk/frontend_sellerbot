# SellerBot — Design System

Paleta oficial de cores, tipografia e tokens visuais usados no app e na landing page.

---

## Paleta de Cores

### 🟢 Teal — Cor Principal

A identidade do SellerBot. Usada em botões primários, ícones de ação, bordas de destaque e gradientes de fundo.

| Token | Hex | Uso |
|---|---|---|
| `teal-400` (florescente) | `#2dd4bf` | Headlines em fundo escuro, badges de destaque, brilhos |
| `teal-500` | `#14b8a6` | Badge dot animado, hover states |
| `teal-600` **← primary** | `#0d9488` | Botões primários, ícones, bordas de card em destaque |
| `teal-700` | `#0f766e` | Hover de botão primário, secondary no Quasar |
| `teal-50` (surface) | `#f0fdf9` | Background de seções alternadas (claro) |
| `teal-100` | `#ccfbf1` | Chips, badges sutis |

```scss
// Quasar variables
$primary   : #0d9488;
$secondary : #0f766e;
```

---

### 🟠 Amber — Cor de Destaque / Acento

Usada para badges "Mais popular", estrelas de avaliação, avisos e elementos que precisam de atenção visual sem urgência.

| Token | Hex | Uso |
|---|---|---|
| `amber-400` **← accent** | `#f59e0b` | Badge, estrelas, decoração geométrica, warnings |
| `amber-100` | `#fef9c3` | Badge status "Pausado" em anúncios |

```scss
$accent : #f59e0b;
```

---

### ⬛ Slate — Fundos Escuros e Texto

O escuro do SellerBot. Não é preto puro — tem um toque de azul que harmoniza com o teal.

| Token | Hex | Uso |
|---|---|---|
| `slate-950` | `#020617` | Fundo da página escura (dark-page) |
| `slate-900` **← dark** | `#0f172a` | Hero, toolbar, footer, seção de depoimentos |
| `slate-800` | `#1e293b` | Cards em fundo escuro |
| `slate-700` | `#334155` | Headers de cards, títulos secundários |
| `slate-600` | `#475569` | Texto de corpo |
| `slate-500` | `#64748b` | Subtítulos, labels, descrições |
| `slate-400` | `#94a3b8` | Texto secundário em fundo escuro, placeholders |
| `slate-300` | `#cbd5e1` | Quotes em fundo escuro |
| `slate-200` | `#e2e8f0` | Bordas de card no tema claro |
| `slate-100` | `#f1f5f9` | Títulos em fundo escuro, texto claro |
| `slate-50`  | `#f8fafc` | Background de seções alternadas (cinza quase branco) |

```scss
$dark      : #0f172a;
$dark-page : #020617;
```

---

### ✅ Status / Semântico

Cores usadas para indicar estado em tabelas, badges e alertas.

| Token | Hex | Uso |
|---|---|---|
| `green-500` | `#22c55e` | Positivo, lucro, anúncio ativo, check |
| `red-500`   | `#ef4444` | Negativo, erro, custo, dedução |
| `blue-500`  | `#38bdf8` | Info, destaque informativo |
| `indigo-500` | `#6366f1` | Acento roxo-azulado (Pedidos/Vendas) |

```scss
$positive : #22c55e;
$negative : #ef4444;
$info     : #38bdf8;
$warning  : #f59e0b;
```

---

## Gradientes

Usados em heroes, CTAs, footer e seções de depoimentos.

```scss
// Hero / CTA principal — escuro com teal
background: linear-gradient(135deg, #0f172a 0%, #134e4a 55%, #0d9488 100%);

// Toolbar glass
background: rgba(15, 23, 42, 0.96);
backdrop-filter: blur(12px);

// Glow radial (decoração de fundo)
background: radial-gradient(ellipse 700px 500px at 85% 40%, rgba(13,148,136,.20) 0%, transparent 70%);

// Surface claro (seções alternadas)
background: #f0fdf9;  // teal-50
background: #f8fafc;  // slate-50
background: #ffffff;
```

---

## Tipografia

**Fonte**: Roboto (já inclusa via Quasar extras)

| Uso | Size | Weight | Color |
|---|---|---|---|
| H1 Hero | `clamp(2.4rem, 5vw, 3.8rem)` | 800 | `#f1f5f9` |
| H2 Seção | `clamp(1.8rem, 3.5vw, 2.6rem)` | 800 | `#0f172a` |
| H3 Card | `1.1–1.15rem` | 700 | `#0f172a` |
| Eyebrow (label acima do título) | `0.75rem` | 700 | `#0d9488` |
| Corpo | `0.9–1rem` | 400 | `#64748b` |
| Caption / sub | `0.72–0.82rem` | 400 | `#94a3b8` |

**Letter-spacing**:
- H1/H2: `-0.5px` a `-1.5px` (tight)
- Eyebrows: `+1.2px` (wide, uppercase)

---

## Espaçamento de Seções

Todas as seções da landing page usam padding vertical consistente:

```scss
padding: 96px 20px;  // seções normais
padding: 90px 20px;  // hero
padding: 100px 20px; // CTA
padding: 72px 20px 40px; // footer
```

---

## Bordas e Raios

| Uso | Valor |
|---|---|
| Cards principais | `border-radius: 16–18px` |
| Ícone/avatar wrap | `border-radius: 12–14px` |
| Botões | `border-radius: 8–12px` |
| Pills / badges | `border-radius: 20px` |
| Botão CTA principal | `border-radius: 10–12px` |

Borda padrão de card: `1.5px solid #e2e8f0`
Borda de card em destaque: `1.5px solid #0d9488`

---

## Sombras

```scss
// Card padrão (hover)
box-shadow: 0 12px 40px rgba(13, 148, 136, 0.10);

// Card popular / hero mock
box-shadow: 0 8px 32px rgba(15, 23, 42, 0.08);

// Card popular com borda teal
box-shadow: 0 8px 32px rgba(13, 148, 136, 0.18);
```

---

## Tokens de Ícone

Cada "domínio" do app tem uma cor e background associados:

| Domínio | Ícone | Cor | Background |
|---|---|---|---|
| Anúncios / Gestão | `inventory_2`, `sell` | `#0d9488` | `rgba(13,148,136,.10)` |
| Financeiro / CMV | `account_balance_wallet`, `percent` | `#f59e0b` | `rgba(245,158,11,.10)` |
| Pedidos / Vendas | `receipt_long` | `#6366f1` | `rgba(99,102,241,.10)` |
| Positivo / Lucro | `trending_up`, `check_circle` | `#22c55e` | `rgba(34,197,94,.10)` |
| Frete / Logística | `local_shipping` | `#6366f1` | `rgba(99,102,241,.10)` |
| Integrações | `webhook`, `corporate_fare` | varia | varia |

---

## Quasar Brand (quasar.config.js)

Para sobrescrever os defaults do Quasar globalmente:

```js
// quasar.config.js → framework.config.brand
brand: {
  primary:   '#0d9488',
  secondary: '#0f766e',
  accent:    '#f59e0b',
  dark:      '#0f172a',
  positive:  '#22c55e',
  negative:  '#ef4444',
  info:      '#38bdf8',
  warning:   '#f59e0b',
}
```

---

## Resumo Visual Rápido

```
ESCURO    ████  #0f172a  slate-900
TEAL      ████  #0d9488  primary
FLORESCENTE ████  #2dd4bf  teal-400
LARANJA   ████  #f59e0b  amber / accent
BRANCO    ████  #f1f5f9  texto em fundo escuro
SURFACE   ████  #f0fdf9  fundo seção clara
```

> **Regra de ouro**: fundos escuros pedem `#2dd4bf` (teal florescente).
> Fundos claros pedem `#0d9488` (teal primário). Amber aparece apenas como sotaque — nunca como cor dominante.
