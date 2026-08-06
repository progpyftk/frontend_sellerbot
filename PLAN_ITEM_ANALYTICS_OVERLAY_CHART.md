---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
title: Item Analytics — Gráfico combinado com overlay de métricas
type: feature
date: 2026-08-06
supersedes_section: UI.5 do PLAN_ITEM_ANALYTICS_REVAMP.md
---

# Item Analytics — Gráfico combinado com overlay de métricas

## Goal Capsule

- **Objetivo:** permitir ver todas as métricas do anúncio no **mesmo gráfico**, selecionáveis por checkbox, para comparar o efeito de uma curva sobre a outra (ex.: preço caindo enquanto a conversão sobe).
- **Problema:** o chart atual (`src/components/item-analytics/ItemAnalyticsTimeline.vue`) alterna entre modos fixos `traffic`/`price`/`stock`, cada um com séries fixas e eixos `y`/`y2`. Não é possível sobrepor preço + conversão + visitas na mesma tela — o caso de uso central de decisão do seller.
- **Resultado esperado:** um 4º modo **Combinar** que renderiza um painel de checkboxes agrupados (Tráfego / Preço / Estoque), permite ligar/desligar cada curva, usa eixos por natureza de unidade (contagem/percentual/moeda), e oferece um toggle **Tendência (0–100)** que normaliza as séries para evidenciar correlação de formato.
- **Backend dependency:** nenhuma. Todas as séries necessárias já são entregues em cada ponto da timeline (`app_mercado_livre/services/item_analytics_service.py::_snapshot_payload`): `visits`, `orders_count`, `units_sold`, `gmv`, `price`, `original_price`, `has_promotion`, `conversion_rate`, `available_quantity`, `fulfillment_available_quantity`, `fulfillment_total_quantity`.

## Conflict with prior plan (origem)

O `PLAN_ITEM_ANALYTICS_REVAMP.md` fixou **UI.5** ("no máximo dois eixos principais, não misturar métricas incompatíveis **por padrão**") e "do not expose all 15 metric toggles at once". Este plano **revisa deliberadamente** esse limite para o modo Combinar: a palavra-chave que preserva o contrato anterior é o *"por padrão"* — os presets continuam com a regra de 2 eixos; apenas o modo **Combinar, opt-in, explícito** expõe o overlay multi-eixo e multi-métrica. Nenhum outro modo muda de comportamento.

## Scope Boundaries

- **Inclui:** Mercado Livre; modo "Combinar" no chart da timeline; painel de checkboxes agrupados; eixos por natureza (y/y2/y3); toggle valores-reais ↔ tendência normalizada; faixas de fundo de promoção; seleção persistida por URL.
- **Inclui:** os 3 presets existentes (`traffic`/`price`/`stock`) permanecem intactos e são o default.
- **Fora:** Shopee/TikTok; alteração de backend/API; mudança nos modos existentes; troca da biblioteca de gráficos; novas métricas que o backend não entrega (ex.: ads_cost/ads_roas ainda não disponíveis — já previsto no catálogo como inativo).

## Product Contract

### Requirements

- **OC.1.** O usuário escolhe "Combinar" e vê todas as curvas disponíveis no mesmo gráfico.
- **OC.2.** O usuário liga/desliga cada curva por um checkbox agrupado por categoria (Tráfego / Preço / Estoque). Também pode ocultar/mostrar via clique na legenda (nativo do Plotly).
- **OC.3.** Curvas de natureza diferente não se achatarão umas sobre as outras: contagens em `y`, percentual em `y2`, moeda em `y3`, por padrão.
- **OC.4.** O usuário pode alternar para **"Tendência (0–100)"**: todas as curvas selecionadas são min-max normalizadas e sobrepostas, evidenciando a correlação de formato (ex.: preço caindo / conversão subindo). Um aviso de contexto indica "curvas normalizadas p/ comparar tendência".
- **OC.5.** Promoção é renderizada como **faixa de fundo** (regiões sombreadas no período ativo), nunca como curva — para não disputar escala.
- **OC.6.** A seleção do modo Combinar é compartilhável via URL (mesmo contrato de `mode` dos presets).
- **OC.7.** Métricas inativas por contrato de backend (ex.: ads) aparecem desabilitadas com tooltip, não somem nem quebram.

### Acceptance Examples

- **AE.1.** Selecione Combinar e marque Preço + Conversão; se o preço caiu e a conversão subiu no período, as duas curvas se cruzam/movem em direções opostas nos eixos direito — legível sem meio-eixo compartilhado.
- **AE.2.** Ligue "Tendência (0–100)": Preço e Conversão agora ocupam o mesmo espaço 0–100 e o espelho entre as curvas é imediato; um aviso discreto aparece.
- **AE.3.** Um item com faixa de promoção ativa entre dois dias mostra a região sombreada + queda de preço + subida de conversão no mesmo gráfico.
- **AE.4.** Desmarcando todos os checkboxes, o gráfico exibe estado vazio contextual (não um plot em branco).
- **AE.5.** Recarregar a URL com `mode=combine&metrics=price,conversion_rate` restaura exatamente essa seleção.
- **AE.6.** Metrica `ads_cost` (inativa) aparece desabilitada no painel com tooltip "disponível quando o backend entregar" e não quebra o render.
- **AE.7.** Mudar de modo (Combinar ↔ Tráfego) não deixa traces fantasmas: cada render limpa a instância anterior.

## Technical Decisions

- **KTD.1. Um modo a mais, não substituição.** `ANALYTICS_MODES` ganha `'combine'`; os 3 presets existentes não mudam de comportamento nem de eixos. Default continua `traffic`.
- **KTD.2. Catálogo de métricas centralizado.** Novo módulo exporta a definição declarativa de cada métrica (key, label, categoria, eixo, cor, formato de hover, formato de valor), reutilizada pelo catálogo atual e pelo painel de checkboxes. Extrair para `src/utils/itemAnalytics.js` (já é o lar dos normalizers/formatadores).
- **KTD.3. Eixos por natureza.** `combine` usa três eixos: `y` = contagens/quantidades (visitas, pedidos, unidades, estoques), `y2` = percentual (conversão), `y3` = moeda (preço, preço original, GMV). `y3` é um segundo eixo direito com `overlaying: 'y'`, `side: 'right'`, e `anchor`/offset para não colidir tick labels com `y2`.
- **KTD.4. Normalização via helper puro.** `normalizeForOverlay(rows, keys)` faz min-max 0–100 por série, testável sem Plotly. No modo Tendência, os três eixos viram `rangemode: 'manual', range: [0, 100]` e os traces usam o valor normalizado.
- **KTD.5. Promoção como `shapes` de fundo.** No modo Combinar, `has_promotion` vira retângulos verticais (`Plotly.layout.shapes`), não um trace — reutiliza a convenção de evento visual do histórico.
- **KTD.6. Seleção persistida por URL.** Estender o estado de `useItemAnalytics` com `metrics` (lista de keys ativas no combine). `hydrateFromRoute`/`syncRoute` filtram contra o catálogo; keys inválidas são descartadas; default do combine = `price,conversion_rate,visits`.
- **KTD.7. Granularidade do render.** Manter `Plotly.react` por mudança; `traceFor()` assume `definition.axis` (y/y2/y3) e ganha branch normalizado; o render do combinar passa `layout.shapes` para promoção.

## Implementation Units

### Unit A: Catálogo e helpers em `src/utils/itemAnalytics.js`

- **Files:** `src/utils/itemAnalytics.js`
- **Work:**
  - Adicionar `'combine'` a `ANALYTICS_MODES`.
  - Exportar catálogo `METRIC_CATALOG` (cada métrica: `key`, `label`, `category` [`traffic`/`price`/`stock`], `axis` [`y`/`y2`/`y3`], `color`, `format` [`count`/`percent`/`currency`], `disabled`+`disabledHint` para métricas sem dado de backend).
  - Exportar `normalizeForOverlay(rows, keys, { min, max }) => { key: number[] }` (numérico por série, min-max; séries constantes ficam aplainadas sem `NaN`).
  - Exportar `axisRangeFor(mode, normalized)` (resolve range `[0,100]` para tendência; `undefined` para valores reais).
- **Tests:** `tests/unit/itemAnalytics.spec.js`
  - `ANALYTICS_MODES` contém `combine` e preserva `traffic/price/stock`.
  - Catálogo: cada métrica tem categoria/eixo/formato válidos; `available_quantity` cai em `y`, `conversion_rate` em `y2`, `price` em `y3`; `ads_cost` vem `disabled`.
  - `normalizeForOverlay`: série `[10,20]` → `[0,100]`; série constante `[5,5]` → `[0,0]` sem `NaN`; valores `null` ignorados preservando o shape do array de pontos.
  - `axisRangeFor`: modo tendência → `[0,100]`; valores reais → `undefined`.

### Unit B: Modo Combinar em `src/components/item-analytics/ItemAnalyticsTimeline.vue`

- **Files:** `src/components/item-analytics/ItemAnalyticsTimeline.vue`
- **Work:**
  - Adicionar entrada `Combinar` no `modeOptions`.
  - Quando `mode === 'combine'`, renderizar um painel de **checkboxes agrupados** (Tráfego / Preço / Estoque) acima do gráfico; cada checkbox controla a presença da métrica no trace; métricas `disabled` exibem tooltip.
  - `traceFor()`: suportar `definition.axis` (`y`/`y2`/`y3`) e branch de valor normalizado (via `normalizeForOverlay`); hovertemplate por `format` (currencia/percentual/count).
  - Layout do combine: três eixos configurados por natureza; `y3` como 2º direito com offset de anchor; `hovermode: 'x unified'`; legenda clicável (nativo do Plotly) com `traces` re-renderizados por re-seleção.
  - **Promoção:** quando `has_promotion` estiver selecionada, montar `layout.shapes` (retângulos verticais) nos intervalos ativos; não cria trace.
  - Toggle **"Valores reais ↔ Tendência (0–100)"** visível apenas no combine; quando Tendência, usar `axisRangeFor` e exibir aviso "curvas normalizadas p/ comparar tendência".
  - Estado vazio: se zero métricas selecionadas no combine, mostrar empty state contextual (não plot branco).
  - Limpeza: manter `Plotly.purge` no unmount e re-render por `watch` no estado de seleção.
- **Tests:** `tests/unit/itemAnalyticsTimeline.spec.js` (novo — mockar o módulo `plotly` e `window.Plotly`; montar o componente com `@vue/test-utils`)
  - Renderiza painel de checkboxes agrupados quando `mode='combine'`; não aparece nos presets.
  - Marcar/desmarcar muda o array de traces assertado (não snapshot do Plotly; checar traces/`layout`/`shapes` semanticamente).
  - `y3` presente no layout quando uma métrica de moeda está ativa; ausente caso contrário.
  - `has_promotion` ativa pilha `shapes` (regiões sombreadas) e não gera trace de linha.
  - Tendência ligada → traces normalizados e eixos `range:[0,100]`; aviso visível.
  - Zero métricas selecionadas → estado vazio contextual.
  - Troca de modo limpa a instância anterior (purge chamado / próximo react tem traces corretos).
  - `disabled` (ads) não quebra render e exibe tooltip.

### Unit C: Persistência de seleção em `src/composables/useItemAnalytics.js`

- **Files:** `src/composables/useItemAnalytics.js`
- **Work:**
  - Estado `filters.metrics` (array de keys ativas no combine); `hydrateFromRoute` lê `metrics` da URL e filtra contra `METRIC_CATALOG` (keys inválidas caem fora; default do combine = `['price','conversion_rate','visits']`); `syncRoute` persiste `metrics`.
  - `setMode` já aceita valores de `ANALYTICS_MODES` — sem mudança de fluxo; passar a incluir `combine`. Expor `setMetrics` e o valor para o `ItemAnalyticsTimeline`.
- **Tests:** `tests/unit/useItemAnalytics.spec.js` (novo — vazio de URL, combos de `metrics` válidas/inválidas, mudança de modo não corrompe `metrics` selecionada).

## Sequencing

1. Area de helpers/catálogo em `itemAnalytics.js` + testes (Unit A).
2. Persistência em `useItemAnalytics.js` + testes (Unit C).
3. Modo Combinar no componente + testes (Unit B).
4. `npm run test` (vitest) — suíte focada e completa.
5. `npm run build` — validar build.
6. QA manual no browser (dev server) para os cenários AE.1–AE.7 no desktop/mobile.

## Risks and Mitigations

- **Colisão de tick labels entre `y2` e `y3` (dois eixos à direita):** usar offset + `anchor` dedicado em `y3`; validar visualmente no dev server (AE). Fallback: mover moeda para `y` esquerdo quando `y3` ficar ilegível e nenhuma contagem estiver ativa.
- **Regressão nos presets:** nenhuma lógica de `traffic/price/stock` é alterada; só adição. Coberto por testes de catálogo e pelo diff mínimo.
- **Séries em escalas extremamente diferentes no modo tendência:** min-max aplaina séries constantes (evita `NaN`); tooltip mostra valor real, não normalizado.
- **Re-render caro com 3 eixos:** `Plotly.react` (não `newPlot`) + seleção enxuta por default; sem debounce extra.
- **Teste de componente com Plotly:** mock acessível e asserções semânticas (traces/`layout`/`shapes`), sem snapshot do objeto Plotly ou do DOM do canvas.

## Definition of Done

- Modo Combinar permite sobrepor qualquer combinação de métricas no mesmo gráfico.
- Eixos por natureza mantêm contagem/percentual/moeda legíveis sem achatamento.
- Toggle Tendência evidencia correlação de formato com aviso explícito.
- Promoção aparece como faixa de fundo, não curva.
- Seleção (modo + métricas) compartilhável por URL.
- Presets `traffic/price/stock` intactos (esquemas + testes).
- Unit (vitest) e build verdes.