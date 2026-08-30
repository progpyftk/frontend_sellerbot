# PROMO-12B — Redesign da visão "Promoções → Por anúncios" (frontend)

Branch: `feat/PROMO-12-redesign` · worktree: `.worktrees/frontend_sellerbot-PROMO-12-redesign`
Status: implementação local, **sem deploy**. Aguarda revisão do contrato visual e do ajuste backend (PROMO-12A).

Referências: `backend_sellerbot/docs/plans/2026-08-29-promo-11-promocoes-por-anuncios.md`
(§4 contrato read-only, §7 replanejamento PROMO-12) e o briefing da sprint
`sprints/done/2026-08-18-remocao-promocoes-ml/plans/briefing.md`.

---

## 1. O que foi entregue

Tudo novo e isolado — **o fluxo legado "Por promoções" não foi tocado** (`PromotionsManagerPage.vue`,
rota `promotions`, `getPromotions/activatePromotions/activateAllPromotions`, trava legada, endpoints
e payloads legados permanecem intactos).

| Arquivo | Papel |
|---|---|
| `src/pages/PromotionsAdsPage.vue` | **Reescrita completa.** Cabeçalho + indicadores, filtros, toggle Por anúncios/Por SKU, árvore agrupada, resumo do lote fixo, modal de revisão. |
| `src/utils/promotionsAdsView.js` | **Novo.** Lógica pura: normalização do contrato, agrupamento hierárquico, regra de seleção exclusiva, motivos de bloqueio, resumo do lote, montagem do payload de ativação, formatação. |
| `src/components/promotions-ads/PromotionsAdsGroup.vue` | **Novo.** Um grupo de conta como tabela agrupada expansível (conta → [SKU] → anúncio/variação → propostas), com seleção por rádio no nível da proposta. |
| `src/components/promotions-ads/PromotionsAdsReviewDialog.vue` | **Novo.** Modal de revisão item a item com "Serão enviados" / "Não serão enviados" + motivos, e trava `max_discount_pct` visível/configurável. |
| `src/services/MercadoLivreService.js` | **Aditivo.** `getPromotionsAds()` e `activatePromotionsAds()` — namespace `promotions-ads/`, sem compartilhar nada com os métodos legados. |
| `tests/unit/promotionsAdsView.spec.js` | **Novo.** 22 testes da lógica pura (agrupamento, seleção exclusiva, pisos financeiros, resumo, payload). |

Verificação: `vitest run` → 104/104 (82 pré-existentes + 22 novos). `quasar build` → **Build succeeded**.

### Modelo mental implementado

```
Conta Mercado Livre
└── SKU                       (sub-cabeçalho, só na visão "Por SKU")
    └── Anúncio / variação    (linha-resumo: SKU, título+MLB, variação, nº promoções, melhor margem, estado)
        └── Promoções          (sub-tabela expandida: rádio | tipo | status | preço atual |
                                proposto | desconto | frete | CMV | lucro | margem | situação)
```

- **Seleção no nível da proposta.** Cada anúncio/variação admite **no máximo uma** proposta
  (`choosePromotion` substitui, nunca acumula; `rowKey = account_id::item_id::variation_id`).
  Existe um rádio "Não ativar nenhuma proposta" para limpar a linha. Nada de
  `selectedRows.flatMap(row => row.promotions)`.
- As duas visões (`Por anúncios` / `Por SKU`) usam **o mesmo `selection`** e os mesmos dados;
  só muda o agrupamento (`groupByAccount` vs `groupByAccountSku`).
- Estado de seleção guarda `{ account_id, item_id, variation_id, promotion_id, promotion_type,
  promotion_name, status, sku, title, variation_name, financials, rawFinancials }`.
- Payload de ativação = **contrato PROMO-11D intocado**
  (`POST /mercadolivre/promotions-ads/activate/` com `confirmed: true`, `max_discount_pct`,
  `candidates[]` só com os **explicitamente selecionados e aptos**; `financials` cru é enviado
  verbatim para o servidor revalidar a aritmética).
- Cores só para estado: margem ≥ 8% verde, 0–8% laranja, < 0 vermelho, ausente neutro.
  Estados de loading / vazio / erro / **erro parcial** (`skipped[]`) via `SbEmptyState` / banners.

---

## 2. Lacunas do contrato atual (`GET /mercadolivre/promotions-ads/`) e contornos aplicados

O contrato read-only entregue na PROMO-11 (§4.2 do plano) atende à listagem por anúncio/variação
com `financials` estimado, mas **não cobre** parte do que a UX da PROMO-12 exige. Onde faltou dado,
foi aplicado um contorno **client-side** e a pendência está listada abaixo para o PROMO-12A decidir.

### 2.1 `account_nickname` ausente nas linhas — **contornado**

§4.2 do plano prevê "nome da conta", mas `service.py::_item_rows` devolve só `account_id`.
**Contorno:** a tela chama `GET /mercadolivre/accounts/` uma vez, monta `account_id → nickname` e
injeta em `normalizeRow`. Cai para `account_id` quando a conta não está no mapa.
**Pedido ao backend:** incluir `account_nickname` em cada linha de `results[]` (fonte já disponível
em `item.account`), evitando a segunda chamada e o risco de conta não mapeada.

### 2.2 Sem agregados globais — só contagem da página — **contornado / sinalizado**

`total_estimate` é `len(results)` da página; não há total real nem somatórios por conta/SKU/estado.
**Contorno:** os 5 indicadores do cabeçalho (anúncios, SKUs, promoções, calculáveis, bloqueadas)
são calculados sobre **as linhas já carregadas** (`headerMetrics`), com nota explícita na tela.
**Pedido ao backend:** um bloco `summary` na resposta com totais reais do filtro atual
(`ads_total`, `skus_total`, `promotions_total`, `estimable_total`, `blocked_total`) e um
`total` de linhas confiável para paginação.

### 2.3 Filtros financeiros não existem server-side — **contornado / sinalizado**

Query params suportados hoje: `account_id`, `q`, `sku`, `status`, `promotion_type`, `cursor`,
`page_size`. Não há `min_margin_pct`, `min_profit`, nem `only_estimable`.
**Contorno:** "margem mínima", "lucro mínimo" e "somente calculáveis" filtram **as linhas já
carregadas** (`applyClientFilters`). Propostas não calculáveis continuam visíveis e sinalizadas
(só o toggle "somente calculáveis" as remove), conforme a proteção do briefing (§30).
**Limitação:** interage com "Carregar mais" — o piso é reaplicado a cada página; um anúncio só
aparece depois de sua página ser buscada.
**Pedido ao backend:** aceitar `min_margin_pct`, `min_profit`, `only_estimable` como filtros
server-side (aplicados após o cálculo de `financials`), para paginação coerente.

### 2.4 Capacidade de ativação não vem por proposta — **degradado com segurança**

O contrato read-only **não expõe** `can_manual_activate` / `activation_block_reason` /
`candidate_count` por promoção (o painel legado expõe; aqui foi omitido — §4.2 "Sem
can_remove/removal_*"). A tela só bloqueia por capacidade quando o backend manda
`can_manual_activate === false` explicitamente; caso contrário confia no gate financeiro
(`financials.estimable` + pisos) e deixa o **servidor ser a autoridade final** —
bloqueios de capacidade aparecem no retorno de `activate` (`blocked[]`) e são notificados.
**Pedido ao backend:** incluir `can_manual_activate`, `activation_block_reason` e
`candidate_count` em cada `promotions[]` da listagem, para a revisão mostrar o bloqueio
**antes** do envio (a UX pede "o usuário sabe exatamente o que será ativado").

### 2.5 Simulação vazia (`estimable: false`) e **ativação por markup** — bloqueio real, plano em PROMO-12A

**Objetivo do produto:** ativar cada promoção comparando seu resultado a um **markup-alvo**. Isso
não funciona hoje: `estimated_sale_fee` e `estimated_shipping_cost` chegam `null` para quase todos
os anúncios (o normalizador da promoção do ML não os fornece; `financials()` só tem fallback de Flex
para `logistic_type == "self_service"`), então `estimable=false` e net/lucro/margem/markup ficam
vazios. `cmv_unit` já é resolvido via `ProductCost`.

**Fórmula canônica** (mesma de `_update_order_financials`), por unidade, ao preço promocional `P`:

```
net_unit   = P − sale_fee(P) − seller_shipping − cupom_unit + credito_flex_unit
lucro_unit = net_unit − cmv_unit
margem_%   = lucro_unit / P × 100                                  (denominador = preço bruto)
markup_%   = ( P / (cmv_unit + sale_fee(P) + seller_shipping) − 1 ) × 100
```

`markup` ≠ `margem` — a UI (filtro/resumo/revisão) deve deixar claro qual piso está sendo travado.

**Origem dos insumos que faltam** (implementação = PROMO-12A no backend, dentro de
`services/promotions_ads/`, sem tocar `_update_order_financials` nem o legado):

| Insumo | Como obter para um preço promocional arbitrário |
|---|---|
| `cmv_unit` | ✅ pronto — `ProductCost.avg_cost_price ?? cost_price` por SKU normalizado. |
| `sale_fee(P)` | **Não é linear** (percentual + custo fixo de baixo valor). (A) `GET /sites/MLB/listing_prices?price=P&listing_type_id=…&category_id=…` → `sale_fee_amount`/`sale_fee_details`; requer `category_id` no anúncio (hoje só em `OrderItem` — adicionar coluna + preencher no sync). (B) fallback: derivar de `OrderItem.sale_fee`/`unit_price` dos pedidos reais do próprio anúncio. |
| `seller_shipping` | Por `logistic_type`: Flex → snapshot da conta (✅); FULL/ME2 grátis → média de `OrderShipment.net_cost / unidade` dos pedidos recentes do anúncio (não escala com `P`); comprador paga → ≈ 0. |
| `cupom` / `credito_flex` | 0 na simulação; só quando determináveis. |

**Ativação por markup (PROMO-12C):** usuário define `markup_alvo`; cada proposta vira apta/bloqueada
pelo `markup_%`/`margem_%` calculado. Útil computar o **menor preço promocional que ainda bate o
alvo** (`P_min` iterativo, porque `sale_fee` depende de `P`) para mostrar folga/inviabilidade. O
`activate()` do backend deve revalidar o markup no servidor, não confiar no booleano do navegador.

**Tratamento atual do frontend (mantém até PROMO-12A entregar):** cada `missing_input` é traduzido
("tarifa ausente", "frete ausente", "CMV ausente"), a proposta aparece como **não calculável** e
fica fora da aprovação (nunca entra no payload).

> Detalhamento canônico: `backend_sellerbot/docs/plans/2026-08-29-promo-11-promocoes-por-anuncios.md`
> §7.5 (e ponteiro em §4.3).

### 2.6 `variation_id` não é usado na ativação — **enviado, mas ignorado hoje**

`service.py::activate` despacha por `account_id` + `promotion_id` e **não lê `variation_id`**.
A UX modela seleção por anúncio **e por variação**; o payload já inclui `variation_id` para
compatibilidade futura.
**Risco a validar no PROMO-12A:** se duas variações do mesmo `item_id` compartilham o mesmo
`promotion_id`, escolher propostas diferentes por variação pode colidir no dispatch.
**Pedido ao backend:** confirmar a granularidade real da ativação (por promoção do item, ou por
variação) e, se for por item, a UI deve impedir seleções conflitantes entre variações do mesmo
`item_id`.

### 2.7 `max_discount_pct` fixo/invisível no legado da PROMO-11 — **resolvido nesta frente**

Estava cravado em `15` e escondido. Agora é um campo numérico **visível e editável** no modal de
revisão (1–99%), com hint explicando a semântica da trava, e vai no payload.
Pendência: se a regra da trava for redesenhada (por proposta? por conta?), ajustar aqui.

---

## 3. Contrato-alvo sugerido para o PROMO-12A (resumo)

```jsonc
// GET /mercadolivre/promotions-ads/?account_id=&q=&sku=&status=&promotion_type=
//     &min_margin_pct=&min_profit=&only_estimable=&cursor=&page_size=
{
  "success": true,
  "summary": {                       // NOVO — totais reais do filtro atual
    "ads_total": 0, "skus_total": 0, "promotions_total": 0,
    "estimable_total": 0, "blocked_total": 0
  },
  "results": [
    {
      "account_id": "…",
      "account_nickname": "…",        // NOVO
      "item_id": "…", "title": "…",
      "sku": "…", "sku_ambiguous": false,
      "variation_id": null, "variation_name": null,
      "current_price": 0,
      "promotions": [
        {
          "promotion_id": "…", "promotion_type": "…", "offer_id": "…",
          "status": "candidate", "name": "…",
          "original_price": 0, "price": 0, "discount_pct": 0,
          "can_manual_activate": true,          // NOVO
          "activation_block_reason": null,      // NOVO
          "candidate_count": 0,                 // NOVO
          "financials": { /* §4.3 — com fee/shipping enriquecidos */ }
        }
      ]
    }
  ],
  "next_cursor": null,
  "total": 0,                          // contagem confiável, não "estimativa da página"
  "skipped": [], "partial": false
}
```

Ativação: `POST /mercadolivre/promotions-ads/activate/` **sem mudança de contrato** — o frontend já
envia `confirmed`, `max_discount_pct`, `fixed_discount_pct?` e `candidates[]` com
`account_id/item_id/variation_id/promotion_id/promotion_type/financials`.

---

## 4. Como revisar localmente

```
cd .worktrees/frontend_sellerbot-PROMO-12-redesign
npm ci            # Node 20 (.nvmrc); em Node mais novo sai warning de engine
npx vitest run    # 104/104
npx quasar dev    # /app/promotions/ads  (a rota e o item de menu já existem no main)
```

Nenhum deploy foi feito. Próximo passo depende da revisão: (a) aprovar o contrato visual e abrir o
ajuste PROMO-12A no backend; (b) ajustes de UX antes disso.
