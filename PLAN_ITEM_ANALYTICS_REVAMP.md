---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
title: Item Analytics Experience Revamp
type: feature
date: 2026-08-04
---

# Item Analytics Experience Revamp

## Goal Capsule

- **Objetivo:** reativar `/app/item-analytics` como uma ferramenta diária de decisão, tornando anúncios fáceis de encontrar, dados fáceis de interpretar e limitações visíveis.
- **Problema:** `src/pages/ItemAnalyticsPage.vue` é monolítico, tem layout desktop rígido, lista limitada a 80 itens, não tem busca/conta/URL state, engole erros e mistura muitas métricas em eixos Plotly difíceis de ler.
- **Resultado esperado:** uma experiência master-detail responsiva, baseada nos componentes v2, com descoberta robusta, overview confiável, timeline por modo, inventário Full separado do estoque do anúncio e insights com linguagem estatística honesta.
- **Backend dependency:** consumir os contratos normalizados definidos em `docs/plans/2026-08-04-full-inventory-and-snapshot-audit.md` no repositório backend. Durante a transição, adaptar o contrato legado sem esconder suas limitações.

## Scope Boundaries

- **Inclui:** Mercado Livre; lista, busca, filtros, paginação, overview, inventário Full, qualidade dos dados, timeline, insights, mobile, acessibilidade, testes e rollout.
- **Inclui:** reatoração da página e extração de composables/componentes; mudança da aparência e da hierarquia de informação.
- **Inclui:** suporte temporário a endpoint legado durante a migração do backend.
- **Fora:** Shopee/TikTok nesta primeira entrega; edição de anúncio; alteração de estoque; dashboard financeiro geral; substituição global da biblioteca de gráficos.

## Product Contract

### Requirements

- **UI.1.** O usuário encontra um anúncio por título, SKU ou item ID sem navegar manualmente por uma lista extensa.
- **UI.2.** O usuário filtra por conta, status, logística, Full e estado de estoque.
- **UI.3.** A página mostra claramente a diferença entre “estoque informado pelo anúncio” e “inventário Full disponível/total”.
- **UI.4.** Todo bloco de dados mostra frescor, cobertura ou estado parcial quando aplicável.
- **UI.5.** O gráfico oferece modos com no máximo dois eixos principais e não mistura métricas incompatíveis por padrão.
- **UI.6.** O histórico mostra lacunas, eventos de preço/promoção/logística e tooltips com origem.
- **UI.7.** A análise usa “relações observadas”/“associações”, nunca apresenta correlação como causalidade comprovada.
- **UI.8.** Erro de rede, ausência de histórico, histórico insuficiente e inventário stale têm estados visuais diferentes.
- **UI.9.** Seleção, período, filtros e modo de gráfico podem ser compartilhados via URL.
- **UI.10.** A página funciona em desktop, tablet e mobile, com lista recolhível/drawer no mobile.
- **UI.11.** A tela é navegável por teclado, tem labels acessíveis e passa auditoria axe na rota.
- **UI.12.** Trocas rápidas de anúncio, métrica e período não permitem resposta antiga sobrescrever a seleção atual.

### Acceptance Examples

- **AE.1.** Buscar `ureia` retorna anúncios matching sem recarregar a página inteira; limpar a busca restaura a lista.
- **AE.2.** Filtrar MOGIVITTA + Full mostra somente a conta e logística selecionadas, com paginação correta.
- **AE.3.** Um item com anúncio disponível 2 e inventário Full total 4/disponível 2 exibe dois cards distintos.
- **AE.4.** Um inventário sem observação não aparece como zero; exibe “não consultado” e a data mais recente disponível.
- **AE.5.** Um histórico com 56 de 60 dias exibe estado `Parcial` e quatro lacunas na timeline.
- **AE.6.** Clicar rapidamente em três anúncios deixa visível apenas o detalhe do último selecionado.
- **AE.7.** Um 404 de histórico mostra a causa recebida pelo backend e uma ação possível, não “Erro ao carregar gráfico”.
- **AE.8.** No mobile, o usuário abre a lista, escolhe o anúncio e retorna ao detalhe sem perder filtros.
- **AE.9.** A timeline de tráfego não coloca preço e estoque no mesmo eixo; o usuário muda de modo para analisá-los.
- **AE.10.** Um insight de Pearson aparece como associação, com número de pontos e aviso de que não prova causalidade.

## Technical Decisions

- **KTD.1. Composable:** mover estado e requests para `src/composables/useItemAnalytics.js`; a página será composição visual e orquestração de eventos.
- **KTD.2. Componentes:** extrair blocos em `src/components/item-analytics/` seguindo `SbPageHeader`, `SbCard`, `SbKpiCard`, `SbBadge`, `SbEmptyState`, `SbTable` e tokens existentes.
- **KTD.3. Contrato normalizado:** preferir overview/list/timeline JSON do backend; manter um adapter em `src/services/MercadoLivreService.js` para o legado durante o rollout.
- **KTD.4. Gráfico:** manter Plotly inicialmente para reduzir risco de migração, mas renderizar séries normalizadas no frontend. Encapsular o renderer para permitir troca posterior.
- **KTD.5. URL state:** usar `useRoute`/`useRouter` para `days`, `search`, `account`, `status`, `logistic`, `is_full`, `sort`, `item` e `mode`; valores inválidos voltam aos defaults.
- **KTD.6. Request safety:** usar `AbortController` quando suportado pelo client ou request sequence token; toda resposta valida query/selection antes de aplicar estado.
- **KTD.7. Linguagem confiável:** labels de estoque e qualidade vêm do backend; o frontend não infere “Full físico” a partir de `available_quantity`.
- **KTD.8. Mobile-first:** desktop mantém master-detail; mobile converte a lista em drawer/painel alternável e transforma comparações em cards empilhados.

## Information Architecture

### Header

- eyebrow SellerBot;
- título “Análise de anúncios”;
- subtítulo com período e escopo de contas;
- botão de atualizar;
- indicador de idade do dado;
- filtros rápidos de período;
- botão de filtros no mobile.

### Discovery panel

- campo de busca por título/SKU/ID;
- filtro de conta;
- filtro de status;
- filtro de logística;
- toggle Full;
- filtro de estoque/cobertura;
- ordenação por visitas, pedidos, GMV, conversão, estoque ou cobertura;
- contador de resultados e paginação;
- estado de carregamento com skeleton;
- estado de erro com retry;
- estado vazio contextual.

### Selected item overview

- thumbnail e título completo;
- item ID copiável;
- SKU;
- conta;
- link para anúncio;
- status e logística;
- última sincronização;
- qualidade histórica.

KPI cards:

- visitas;
- pedidos;
- conversão;
- GMV;
- ticket médio;
- estoque informado pelo anúncio;
- inventário Full disponível;
- cobertura estimada.

### Timeline modes

- **Tráfego:** visitas, média móvel, pedidos, conversão.
- **Preço e promoção:** preço de venda, preço de lista, promoção, eventos.
- **Estoque e logística:** estoque do anúncio, Full disponível, Full total, indisponível, mudanças de logística.
- **Ads:** custo, receita atribuída, ROAS, ACOS/TACoS.

Each mode must define its own series, axes, legend, colors and empty-data behavior. Do not expose all current 15 metric toggles at once.

### Insights and evidence

- “O que mudou”;
- “O que merece atenção”;
- “Relações observadas”;
- “Impacto de promoção”;
- “Mudanças de preço”;
- “Eventos de logística”;
- “Próxima ação”.

Every insight shows its evidence window, sample size and confidence/limitation badge when supplied by the backend.

## Implementation Units

### Unit 1: API adapter and composable

- **Files:** `src/services/MercadoLivreService.js`, `src/composables/useItemAnalytics.js`.
- **Work:** add typed-by-convention methods for list/overview/timeline/inventory; normalize legacy and new responses; centralize query state, URL state, loading/error/empty states, debounce and request cancellation.
- **Tests:** `tests/unit/useItemAnalytics.spec.js` covers defaults, query serialization, search/filter changes, selection, stale response rejection, abort/retry, empty/error/partial and URL hydration.

### Unit 2: Discovery components

- **Files:** `src/components/item-analytics/ItemAnalyticsFilters.vue`, `ItemAnalyticsItemList.vue`, `ItemAnalyticsItemRow.vue`, `ItemAnalyticsEmptyState.vue`.
- **Work:** implement accessible filters, result count, pagination, item rows with account/logistic/status/freshness badges and mobile drawer behavior.
- **Tests:** `tests/unit/itemAnalyticsDiscovery.spec.js` covers keyboard search, filter emission, pagination, row selection, empty/error/loading and mobile visibility.

### Unit 3: Overview and data quality

- **Files:** `src/components/item-analytics/ItemAnalyticsOverview.vue`, `ItemAnalyticsKpiStrip.vue`, `ItemAnalyticsInventoryCard.vue`, `ItemAnalyticsDataQuality.vue`.
- **Work:** show selected item context, KPIs, separate listing stock from Full inventory, freshness, missing days, source and partial state; format values consistently with existing dashboard conventions.
- **Tests:** `tests/unit/itemAnalyticsOverview.spec.js` covers normal, stale, unavailable, legacy, partial and zero-vs-null states.

### Unit 4: Timeline renderer

- **Files:** `src/components/item-analytics/ItemAnalyticsTimeline.vue`, optional `src/components/item-analytics/itemAnalyticsChart.js`.
- **Work:** render normalized series by mode, cap axes, show gaps/events/tooltips/source, handle Plotly load failure and resize/mobile lifecycle, clean previous chart instance on unmount.
- **Tests:** `tests/unit/itemAnalyticsTimeline.spec.js` covers mode series selection, axis contract, gaps, events, empty/error, fallback and cleanup. Avoid snapshotting the entire Plotly object; assert semantic traces/options.

### Unit 5: Insights and evidence

- **Files:** `src/components/item-analytics/ItemAnalyticsInsights.vue`, `ItemAnalyticsEvents.vue`, page integration.
- **Work:** render relation/association language, sample size, p-value/quality where available, promotion comparison, price changes and logistics events; hide unsupported sections with explanatory empty states.
- **Tests:** `tests/unit/itemAnalyticsInsights.spec.js` covers statistical caveat, no-correlation, insufficient sample, promotion-only, price events and stale inventory.

### Unit 6: Page composition and responsive design

- **Files:** `src/pages/ItemAnalyticsPage.vue`, `src/router/routes.js` only if route metadata is needed, `src/css/tokens.scss` only for a missing shared token.
- **Work:** replace the 584-line inline page with composition; preserve route name; use v2 visual language; implement desktop/tablet/mobile breakpoints and URL deep links.
- **Tests:** `tests/e2e/item-analytics.spec.js` covers load, search, select, chart mode, filters, reload/deep link, retry and mobile flow. `tests/a11y/item-analytics.spec.js` runs axe against initial, selected and mobile states.

## Backend Contract Assumptions

- The list endpoint can filter by account/status/logistic/Full and paginate.
- The overview endpoint returns both listing stock and Full inventory with separate names.
- Timeline returns normalized dates/series/events and `data_quality`.
- Causal/diagnostic response includes `data_points`, observed days, missing days and limitations.
- All responses include source/freshness when a value can be stale.

If the backend contract is not ready, implement a narrow adapter around the legacy endpoints but mark missing quality/inventory fields as unavailable. Do not infer them from unrelated fields.

## Sequencing

1. Add characterization tests for current request/error behavior.
2. Implement adapter/composable and URL state.
3. Implement discovery panel and pagination.
4. Implement overview/data quality/inventory cards.
5. Implement timeline modes and renderer cleanup.
6. Implement insights/evidence.
7. Compose the new page and responsive layout.
8. Add e2e/a11y coverage and run browser QA on desktop/mobile.
9. Compare old/new endpoint values with production-like fixtures before rollout.

## Risks and Mitigations

- **Backend not yet deployed:** adapter supports legacy response but never invents unavailable quality fields.
- **Plotly CDN failure:** explicit timeout/error fallback and a compact textual summary remains usable.
- **Large item lists:** server-side filters/pagination; no fixed 80-item truncation as the primary discovery path.
- **Unreliable statistical claims:** evidence badges and non-causal wording are mandatory.
- **Mobile density:** use drawers, stacked cards and mode tabs instead of shrinking the desktop layout.
- **Request races:** sequence/abort guard tested at composable level.
- **Visual drift:** reuse tokens and common components; avoid new hardcoded palette in the page.

## Verification and Rollout

- Run `npm test` with focused unit files and the full suite.
- Run `npm run build`.
- Run Playwright e2e for desktop and mobile viewport.
- Run axe tests on initial, loaded and selected-item states.
- Validate with a fixture containing Full inventory total greater than available, stale data, missing days and no causal sample.
- Release behind the existing route with a temporary feature flag or query switch if backend and frontend deployment timing differs.
- Remove the old inline page code only after the new route passes the production-like smoke flow.

## Definition of Done

- Any announcement is discoverable by title, SKU or ID.
- Filters and pagination work without losing selection or URL state.
- Listing stock and Full inventory are visually and semantically separate.
- Data freshness and missing coverage are visible.
- Timeline modes are readable on desktop and mobile.
- Errors are actionable and not misreported as empty data.
- Statistical output does not claim unsupported causality.
- SellerBot and page can consume the same backend inventory contract.
- Unit, e2e, a11y and build checks are green.
