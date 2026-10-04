# Capturas do SellerBot — IDV-37

Interfaces Vue reais capturadas em ambiente local em 04/10/2026 após aplicar a paleta Krivus ao aplicativo. Respostas de API demonstrativas interceptadas apenas no navegador: nenhum acesso a contas, banco ou escrita no marketplace. Os exemplos não são resultados dos clientes; a landing identifica os dados demonstrativos.

- `dashboard.webp`: gráfico real de `/app/dashboard`, setembro/2026, sem suavização, faturamento e contribuição após Ads.
- `ads.webp`: `/app/ads`, quatro campanhas com diferentes custos, metas e diagnósticos.
- `promocoes.webp`: cobertura de `/app/promotions/advisor`, 148 anúncios distribuídos em 92 ativos, 11 agendados, 38 sem promoção e 7 não confirmados.
- `precos.webp`: cascata de `/app/financeiro/margem`; composição de custos, não screenshot de módulo autônomo de precificação.
- `saude.webp`: visão financeira real do aplicativo, incluindo resultado após despesas e variação de caixa; cenário demonstrativo, sem apuração tributária de cliente.
- `anuncios.webp`: SellerBot AI, mensagem em rascunho; nada enviado ou publicado.

Cenário demonstrativo coerente: 2.817 pedidos, GMV R$324.449,90, ticket R$115,18, publicidade R$15.676,07 e receita atribuída às campanhas R$139.513,46 (ACoS 11,24%; TACoS 4,83%). Custos: taxas R$47.163,78; impostos R$35.689,50; frete R$24.819,18; embalagem R$3.568,97; produto R$139.475,67. Contribuição após Ads R$58.056,73. Soma das campanhas = total de Ads; cascata = contribuição do dashboard. Série diária com variação de volume, ticket e custos. Percentuais seguem a base de cada interface, sem modificar fórmulas de negócio do aplicativo.

WebP 88%, codificado pelo Chromium sem retoque da interface; capturas recortadas nos componentes, dimensões explícitas e ampliação acessível. Atualizar as imagens quando o produto mudar.
