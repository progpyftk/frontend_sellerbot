<template>
  <q-page class="dash-page">

    <!-- ══════════ HEADER ══════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon"><q-icon name="dashboard" size="20px" /></div>
        <div>
          <div class="header-eyebrow">SellerBot</div>
          <div class="header-title">Dashboard da Operação</div>
        </div>
      </div>
      <div class="header-right">
        <div class="date-range-group">
          <button v-for="p in datePresets" :key="p.key"
            :class="['date-preset-btn', activeDatePreset === p.key && 'date-preset-btn--on']"
            @click="applyPreset(p.key)">{{ p.label }}</button>
          <div class="date-inputs">
            <q-input v-model="dateFrom" type="date" dense borderless class="date-inp"
              @update:model-value="activeDatePreset = null; load()" />
            <span class="date-sep">→</span>
            <q-input v-model="dateTo" type="date" dense borderless class="date-inp"
              @update:model-value="activeDatePreset = null; load()" />
          </div>
        </div>
        <q-btn flat round icon="refresh" color="teal-7" :loading="loading" @click="load" size="sm">
          <q-tooltip>Atualizar</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ══════════ LOADING / EMPTY ══════════════════════════════════════════ -->
    <div v-if="loading" class="loading-center">
      <q-spinner-dots color="teal" size="48px" />
      <div class="loading-text">Carregando dados...</div>
    </div>

    <template v-else-if="data">

      <!-- ══════════ HOJE EM DESTAQUE ══════════════════════════════════════ -->
      <div v-if="todayData && activeDatePreset !== 'hoje'" class="today-banner">
        <div class="today-label">
          <span class="live-dot"></span>
          Hoje
        </div>
        <div class="today-kpis">
          <div class="today-kpi">
            <div class="today-kpi-label">GMV do Dia</div>
            <div class="today-kpi-val today-gmv">{{ fmt(todayData.operation?.gmv) }}</div>
          </div>
          <div class="today-sep">|</div>
          <div class="today-kpi">
            <div class="today-kpi-label">Pedidos</div>
            <div class="today-kpi-val">{{ todayData.operation?.orders_count || 0 }}</div>
          </div>
          <div class="today-sep">|</div>
          <div class="today-kpi">
            <div class="today-kpi-label">Receita Líquida</div>
            <div class="today-kpi-val">{{ fmt(todayData.operation?.net_revenue) }}</div>
          </div>
          <div class="today-sep">|</div>
          <div class="today-kpi">
            <div class="today-kpi-label">Lucro Após Ads</div>
            <div class="today-kpi-val" :class="(todayData.operation?.lucro_liquido || 0) >= 0 ? 'today-pos' : 'today-neg'">{{ fmt(todayData.operation?.lucro_liquido) }}</div>
          </div>
          <div class="today-sep">|</div>
          <div class="today-kpi">
            <div class="today-kpi-label">Ticket Médio</div>
            <div class="today-kpi-val">{{ fmt(todayData.operation?.avg_ticket) }}</div>
          </div>
          <div class="today-sep">|</div>
          <div class="today-kpi">
            <div class="today-kpi-label">Unidades</div>
            <div class="today-kpi-val">{{ todayData.operation?.units_sold || 0 }}</div>
          </div>
        </div>
        <div class="today-note">Atualizado a cada sync de pedidos</div>
      </div>

      <!-- ══════════ KPI CARDS ══════════════════════════════════════════════ -->
      <div class="kpi-grid">

        <div class="kpi-card kpi-gmv">
          <div class="kpi-label">
            GMV
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Faturamento bruto total — o valor que o comprador pagou. Não desconta tarifas nem custo do produto.
              </q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value">{{ fmt(data.operation.gmv) }}</div>
          <div class="kpi-delta" :class="deltaClass(data.operation.vs_prev?.gmv)">
            <q-icon :name="deltaIcon(data.operation.vs_prev?.gmv)" size="12px" />
            {{ deltaFmt(data.operation.vs_prev?.gmv) }} vs período anterior
          </div>
        </div>

        <div class="kpi-card kpi-net">
          <div class="kpi-label">
            Receita Líquida
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                GMV menos as tarifas cobradas pelo Mercado Livre (comissão de venda, tarifa de frete, etc.). É o que
                entra na sua conta.
              </q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value">{{ fmt(data.operation.net_revenue) }}</div>
          <div class="kpi-delta" :class="deltaClass(data.operation.vs_prev?.net_revenue)">
            <q-icon :name="deltaIcon(data.operation.vs_prev?.net_revenue)" size="12px" />
            {{ deltaFmt(data.operation.vs_prev?.net_revenue) }} vs período anterior
          </div>
        </div>

        <div class="kpi-card kpi-gp">
          <div class="kpi-label">
            Lucro Bruto
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Receita Líquida menos o CPV (Custo do Produto Vendido). Lucro antes de descontar marketing.
              </q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value">{{ fmt(data.operation.gross_profit) }}</div>
          <div class="kpi-sub">Margem {{ pct(data.operation.gross_profit, data.operation.net_revenue) }}</div>
          <div class="kpi-delta" :class="deltaClass(data.operation.vs_prev?.gross_profit)">
            <q-icon :name="deltaIcon(data.operation.vs_prev?.gross_profit)" size="12px" />
            {{ deltaFmt(data.operation.vs_prev?.gross_profit) }} vs período anterior
          </div>
        </div>

        <div class="kpi-card kpi-ll">
          <div class="kpi-label">
            Lucro após Ads
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Lucro Bruto menos o gasto com Mercado Ads. É o lucro real da operação — o número que mais importa.
              </q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value kpi-highlight">{{ fmt(data.operation.lucro_liquido) }}</div>
          <div class="kpi-sub">Margem {{ pct(data.operation.lucro_liquido, data.operation.net_revenue) }}</div>
          <div class="kpi-delta" :class="deltaClass(data.operation.vs_prev?.lucro_liquido)">
            <q-icon :name="deltaIcon(data.operation.vs_prev?.lucro_liquido)" size="12px" />
            {{ deltaFmt(data.operation.vs_prev?.lucro_liquido) }} vs período anterior
          </div>
        </div>

        <div class="kpi-card kpi-ads">
          <div class="kpi-label">
            Gasto com Ads
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Total investido em Mercado Ads no período. TACoS = Ads / GMV total (inclui vendas orgânicas).
              </q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value kpi-warn">{{ fmt(data.operation.ads_cost) }}</div>
          <div class="kpi-sub">TACoS {{ pctRaw(data.operation.ads_cost, data.operation.gmv) }}</div>
          <div class="kpi-delta" :class="deltaClass(-(data.operation.vs_prev?.ads_cost || 0))">
            <q-icon :name="deltaIcon(-(data.operation.vs_prev?.ads_cost || 0))" size="12px" />
            {{ deltaFmt(data.operation.vs_prev?.ads_cost) }} vs período anterior
          </div>
        </div>

        <div class="kpi-card kpi-orders">
          <div class="kpi-label">
            Pedidos Pagos
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Quantidade de pedidos com status "pago" no período. O ticket médio é GMV ÷ pedidos.
              </q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value">{{ (data.operation.orders_count || 0).toLocaleString('pt-BR') }}</div>
          <div class="kpi-sub">Ticket médio {{ fmt(data.operation.avg_ticket) }}</div>
          <div class="kpi-delta" :class="deltaClass(data.operation.vs_prev?.orders_count)">
            <q-icon :name="deltaIcon(data.operation.vs_prev?.orders_count)" size="12px" />
            {{ deltaFmt(data.operation.vs_prev?.orders_count) }} vs período anterior
          </div>
        </div>

        <div class="kpi-card kpi-units">
          <div class="kpi-label">
            Unidades Vendidas
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Quantidade total de unidades vendidas. Pode ser maior que pedidos quando um pedido contém múltiplos itens.
              </q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value">{{ (data.operation.units_sold || 0).toLocaleString('pt-BR') }}</div>
          <div class="kpi-sub">{{ data.operation.catalog_orders_count || 0 }} via catálogo · {{ data.operation.flex_orders_count || 0 }} Flex</div>
        </div>

        <div class="kpi-card kpi-roas">
          <div class="kpi-label">
            ROAS
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Retorno sobre o investimento em Ads. ROAS = receita atribuída / gasto. ACoS = gasto / receita atribuída × 100.
              </q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value">{{ data.operation.roas ? data.operation.roas + 'x' : '—' }}</div>
          <div class="kpi-sub">ACoS {{ data.operation.acos != null ? data.operation.acos + '%' : '—' }}</div>
          <div class="kpi-delta" :class="deltaClass(-(data.operation.vs_prev?.tacos || 0))">
            <q-icon :name="deltaIcon(-(data.operation.vs_prev?.tacos || 0))" size="12px" />
            TACoS {{ deltaFmt(data.operation.vs_prev?.tacos) }} vs anterior
          </div>
        </div>

        <div class="kpi-card kpi-margin">
          <div class="kpi-label">
            Margem Líquida
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Lucro Após Ads ÷ Receita Líquida. É a margem real depois de descontar todos os custos operacionais e de marketing.
              </q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value" :class="(data.operation.lucro_liquido_pct || 0) >= 0 ? 'kpi-highlight' : 'neg'">
            {{ data.operation.lucro_liquido_pct != null ? data.operation.lucro_liquido_pct + '%' : '—' }}
          </div>
          <div class="kpi-sub">Margem bruta {{ data.operation.gross_margin_pct != null ? data.operation.gross_margin_pct + '%' : '—' }}</div>
        </div>

        <div class="kpi-card kpi-canc">
          <div class="kpi-label">
            Cancelamentos
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Pedidos cancelados no período. Alta taxa de cancelamento pode indicar problemas de estoque ou qualidade do anúncio.
              </q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value" :class="(data.operation.canceled_count || 0) > 0 ? 'kpi-warn' : ''">
            {{ data.operation.canceled_count || 0 }}
          </div>
          <div class="kpi-sub" v-if="data.operation.orders_count">
            Taxa {{ pctRaw(data.operation.canceled_count, (data.operation.orders_count || 0) + (data.operation.canceled_count || 0)) }}
          </div>
        </div>

      </div>

      <!-- ══════════ ABAS ═══════════════════════════════════════════════════ -->
      <div class="tab-bar">
        <button v-for="t in tabs" :key="t.key" :class="['tab-btn', activeTab === t.key && 'tab-btn--on']"
          @click="activeTab = t.key">
          <q-icon :name="t.icon" size="14px" class="q-mr-xs" />{{ t.label }}
        </button>
      </div>

      <!-- ══════════ ABA: EVOLUÇÃO ══════════════════════════════════════════ -->
      <div v-show="activeTab === 'evolucao'" class="tab-content">
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Evolução Diária</div>
            <div class="chart-metric-toggles">
              <button v-for="m in chartMetrics" :key="m.key"
                :class="['metric-btn', activeMetrics.includes(m.key) && 'metric-btn--on']" :style="activeMetrics.includes(m.key)
                  ? `background:${m.color}20; color:${m.color}; border-color:${m.color}`
                  : ''" @click="toggleMetric(m.key)">
                <span class="metric-btn-dot" :style="{ background: m.color }"></span>
                {{ m.label }}
              </button>

            </div>
          </div>

          <div class="chart-area" v-if="chartData.length">
            <!-- SVG line chart -->
            <svg class="line-chart-svg" :viewBox="`0 0 ${SVG_W} ${SVG_H}`" preserveAspectRatio="none"
              @mousemove="onChartMouseMove" @mouseleave="hoveredIdx = null">
              <!-- Y grid lines -->
              <line v-for="(tick, i) in svgYTicks" :key="'g' + i" :x1="PLOT.x0" :y1="svgY(tick)" :x2="PLOT.x1"
                :y2="svgY(tick)" stroke="#334155" stroke-width="0.5" />

              <!-- Zig-zag de eixo truncado (mostra que Y não começa em 0) -->
              <template v-if="chartYMin > 0">
                <polyline
                  :points="`${PLOT.x0 - 6},${PLOT.y1 + 4} ${PLOT.x0 - 2},${PLOT.y1 - 2} ${PLOT.x0 + 2},${PLOT.y1 + 4} ${PLOT.x0 + 6},${PLOT.y1 - 2}`"
                  stroke="#475569" stroke-width="1.5" fill="none" />
              </template>

              <!-- Area fills -->
              <path v-for="m in chartMetrics.filter(m => activeMetrics.includes(m.key))" :key="'area-' + m.key"
                :d="svgAreaPath(m.key)" :fill="m.color" fill-opacity="0.07" />

              <!-- Lines -->
              <polyline v-for="m in chartMetrics.filter(m => activeMetrics.includes(m.key))" :key="'line-' + m.key"
                :points="svgPoints(m.key)" :stroke="m.color" stroke-width="2" fill="none" stroke-linejoin="round"
                stroke-linecap="round" />

              <!-- Hover vertical line -->
              <line v-if="hoveredIdx !== null" :x1="svgXAt(hoveredIdx)" y1="10" :x2="svgXAt(hoveredIdx)" :y2="PLOT.y1"
                stroke="#475569" stroke-width="1" stroke-dasharray="4 3" />

              <!-- Dots on hover -->
              <template v-if="hoveredIdx !== null">
                <circle v-for="m in chartMetrics.filter(m => activeMetrics.includes(m.key))" :key="'dot-' + m.key"
                  :cx="svgXAt(hoveredIdx)" :cy="svgY(chartData[hoveredIdx]?.[m.key] || 0)" r="4" :fill="m.color"
                  stroke="#1e293b" stroke-width="2" />
              </template>

              <!-- X axis labels (every N days to avoid clutter) -->
              <text v-for="(d, i) in chartData" :key="'xl' + i" v-show="showXLabel(i)" :x="svgXAt(i)" :y="SVG_H - 2"
                text-anchor="middle" font-size="9" fill="#475569">{{ d.dateLabel }}</text>

              <!-- Y axis labels -->
              <text v-for="(tick, i) in svgYTicks" :key="'yl' + i" :x="PLOT.x0 - 4" :y="svgY(tick) + 3"
                text-anchor="end" font-size="9" fill="#475569">{{ fmtShort(tick) }}</text>
            </svg>

            <!-- Floating tooltip -->
            <div v-if="hoveredIdx !== null && chartData[hoveredIdx]" class="line-tooltip" :style="tooltipStyle">
              <div class="tooltip-date">{{ chartData[hoveredIdx].dateLabel }}</div>
              <div v-for="m in chartMetrics.filter(m => activeMetrics.includes(m.key))" :key="'tt-' + m.key"
                class="tooltip-row">
                <span class="tooltip-dot" :style="{ background: m.color }"></span>
                <span class="tooltip-label">{{ m.label }}</span>
                <span class="tooltip-val">{{ fmt(chartData[hoveredIdx][m.key]) }}</span>
              </div>
              <div class="tooltip-row">
                <span class="tooltip-dot" style="background:#64748b"></span>
                <span class="tooltip-label">Pedidos</span>
                <span class="tooltip-val">{{ chartData[hoveredIdx].orders_count }}</span>
              </div>
            </div>
          </div>
          <div v-else class="chart-empty">Sem dados para o período</div>
        </div>

        <!-- Daily table -->
        <div class="table-card">
          <div class="table-title">Detalhamento Diário</div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th class="right">GMV</th>
                  <th class="right">Rec. Líquida</th>
                  <th class="right">Lucro Bruto</th>
                  <th class="right">Ads</th>
                  <th class="right">Lucro Após Ads</th>
                  <th class="right">Pedidos</th>
                  <th class="right">Margem LL</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in chartData" :key="d.date">
                  <td>{{ d.dateLabel }}</td>
                  <td class="right">{{ fmt(d.gmv) }}</td>
                  <td class="right">{{ fmt(d.net_revenue) }}</td>
                  <td class="right">{{ fmt(d.gross_profit) }}</td>
                  <td class="right warn">{{ fmt(d.ads_cost) }}</td>
                  <td class="right" :class="d.lucro_liquido >= 0 ? 'pos' : 'neg'">{{ fmt(d.lucro_liquido) }}</td>
                  <td class="right">{{ d.orders_count }}</td>
                  <td class="right">{{ pct(d.lucro_liquido, d.net_revenue) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td>TOTAL</td>
                  <td class="right">{{ fmt(chartTotals.gmv) }}</td>
                  <td class="right">{{ fmt(chartTotals.net_revenue) }}</td>
                  <td class="right">{{ fmt(chartTotals.gross_profit) }}</td>
                  <td class="right warn">{{ fmt(chartTotals.ads_cost) }}</td>
                  <td class="right" :class="(chartTotals.lucro_liquido || 0) >= 0 ? 'pos' : 'neg'">{{ fmt(chartTotals.lucro_liquido) }}</td>
                  <td class="right">{{ chartTotals.orders_count }}</td>
                  <td class="right">{{ pct(chartTotals.lucro_liquido, chartTotals.net_revenue) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- ══════════ ABA: CONTAS & CNPJ ════════════════════════════════════ -->
      <div v-show="activeTab === 'contas'" class="tab-content">

        <!-- By CNPJ -->
        <div class="section-label">Por CNPJ / Empresa</div>
        <div class="cnpj-grid">
          <div v-for="c in data.by_cnpj" :key="c.cnpj || 'sem'" class="cnpj-card">
            <div class="cnpj-header">
              <div class="cnpj-name">{{ c.cnpj || 'Sem CNPJ' }}</div>
              <div class="cnpj-accounts">{{ c.accounts.join(' · ') }}</div>
            </div>
            <div class="cnpj-kpis">
              <div class="cnpj-kpi">
                <div class="cnpj-kpi-label">GMV</div>
                <div class="cnpj-kpi-val">{{ fmt(c.gmv) }}</div>
              </div>
              <div class="cnpj-kpi">
                <div class="cnpj-kpi-label">Lucro Após Ads</div>
                <div class="cnpj-kpi-val" :class="c.lucro_liquido >= 0 ? 'pos' : 'neg'">{{ fmt(c.lucro_liquido) }}</div>
              </div>
              <div class="cnpj-kpi">
                <div class="cnpj-kpi-label">Pedidos</div>
                <div class="cnpj-kpi-val">{{ c.orders_count }}</div>
              </div>
            </div>
            <div class="gmv-bar-wrap">
              <div class="gmv-bar-fill" :style="{ width: c.gmv_share + '%' }"></div>
              <span class="gmv-bar-pct">{{ c.gmv_share }}% do faturamento</span>
            </div>
          </div>
        </div>

        <!-- Marketplaces -->
        <div class="section-label q-mt-lg">Por Marketplace</div>
        <div class="mp-grid">
          <div v-for="mp in data.marketplaces" :key="mp.key" class="mp-card">
            <div class="mp-name">
              <img v-if="mp.key === 'mercado_livre'" src="/icons/ml-logo.png" height="18" class="q-mr-xs" alt="ML" />
              {{ mp.name }}
            </div>
            <div class="mp-kpis">
              <div class="mp-kpi"><span class="mp-kpi-label">GMV</span> <span class="mp-kpi-val">{{ fmt(mp.gmv)
                  }}</span>
              </div>
              <div class="mp-kpi"><span class="mp-kpi-label">Lucro Após Ads</span> <span class="mp-kpi-val">{{
                fmt(mp.lucro_liquido) }}</span></div>
              <div class="mp-kpi"><span class="mp-kpi-label">Pedidos</span> <span class="mp-kpi-val">{{ mp.orders_count
                  }}</span></div>
              <div class="mp-kpi"><span class="mp-kpi-label">Share</span> <span class="mp-kpi-val">{{ mp.gmv_share
                  }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- By account -->
        <div class="section-label q-mt-lg">Por Conta</div>
        <div class="acct-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Conta</th>
                <th>CNPJ</th>
                <th class="right">GMV</th>
                <th class="right">Rec. Líq.</th>
                <th class="right">Lucro Bruto</th>
                <th class="right">Ads</th>
                <th class="right">Lucro Após Ads</th>
                <th class="right">Pedidos</th>
                <th class="right">TACoS</th>
                <th class="right">Share GMV</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in data.accounts" :key="a.account_id">
                <td class="bold">{{ a.account_nickname }}</td>
                <td class="muted">{{ a.cnpj || '—' }}</td>
                <td class="right">{{ fmt(a.gmv) }}</td>
                <td class="right">{{ fmt(a.net_revenue) }}</td>
                <td class="right">{{ fmt(a.gross_profit) }}</td>
                <td class="right warn">{{ fmt(a.ads_cost) }}</td>
                <td class="right" :class="a.lucro_liquido >= 0 ? 'pos' : 'neg'">{{ fmt(a.lucro_liquido) }}</td>
                <td class="right">{{ a.orders_count }}</td>
                <td class="right">{{ a.tacos }}%</td>
                <td class="right">
                  <div class="inline-bar-wrap">
                    <div class="inline-bar-fill" :style="{ width: a.gmv_share + '%' }"></div>
                    <span>{{ a.gmv_share }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══════════ ABA: TOP PRODUTOS ══════════════════════════════════════ -->
      <div v-show="activeTab === 'produtos'" class="tab-content">
        <div class="table-card">
          <div class="table-header-row">
            <div class="table-title">Ranking de Produtos</div>
            <div class="table-controls">
              <div class="toggle-group">
                <button :class="['tg-btn', topGroupBy === 'item' && 'tg-btn--on']" @click="setTopGroupBy('item')">
                  <q-icon name="sell" size="12px" class="q-mr-xs" />Anúncio ML
                </button>
                <button :class="['tg-btn', topGroupBy === 'sku' && 'tg-btn--on']" @click="setTopGroupBy('sku')">
                  <q-icon name="qr_code" size="12px" class="q-mr-xs" />SKU
                </button>
              </div>
              <select v-model="topSortBy" class="sort-select">
                <option value="gross_profit">Mais lucrativo</option>
                <option value="qty_sold">Mais vendido (qtd)</option>
                <option value="revenue">Maior receita</option>
              </select>
            </div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Produto</th>
                  <th class="right">Qtd</th>
                  <th class="right">Receita</th>
                  <th class="right">Tarifas</th>
                  <th class="right">CPV</th>
                  <th class="right">Lucro Bruto</th>
                  <th class="right">Margem</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in data.top_products" :key="p.item_id">
                  <td class="rank">{{ i + 1 }}</td>
                  <td class="product-cell">
                    <img v-if="p.thumbnail" :src="p.thumbnail.replace(/^http:\/\//i, 'https://')" class="prod-thumb" />
                    <div class="prod-info">
                      <div class="prod-title">{{ p.title }}</div>
                      <div class="prod-id muted">{{ p.item_id }}</div>
                    </div>
                  </td>
                  <td class="right">{{ p.qty_sold }}</td>
                  <td class="right">{{ fmt(p.revenue) }}</td>
                  <td class="right warn">{{ fmt(p.fees_total) }}</td>
                  <td class="right warn">{{ fmt(p.cmv_total) }}</td>
                  <td class="right" :class="p.gross_profit >= 0 ? 'pos' : 'neg'">{{ fmt(p.gross_profit) }}</td>
                  <td class="right">
                    <div class="margin-bar-wrap">
                      <div class="margin-bar-fill" :style="{
                        width: Math.max(0, Math.min(100, p.gross_margin_pct)) + '%',
                        background: p.gross_margin_pct > 20 ? '#0d9488' : p.gross_margin_pct > 0 ? '#f59e0b' : '#ef4444'
                      }"></div>
                      <span>{{ p.gross_margin_pct }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ══════════ ABA: FLEX ══════════════════════════════════════════════ -->
      <div v-show="activeTab === 'flex'" class="tab-content">
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Pedidos Flex no Período</div>
            <div class="kpi-value">{{ (data.flex.orders_count || 0).toLocaleString('pt-BR') }}</div>
            <div class="kpi-sub">{{ pctRaw(data.flex.orders_count, data.operation.orders_count) }} dos pedidos</div>
          </div>
          <div class="kpi-card kpi-warn-card">
            <div class="kpi-label">Custo Total Flex</div>
            <div class="kpi-value kpi-warn">{{ fmt(data.flex.shipping_cost_total) }}</div>
            <div class="kpi-sub">{{ pctRaw(data.flex.shipping_cost_total, data.operation.gmv) }} do GMV</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Custo Médio por Pedido Flex</div>
            <div class="kpi-value">{{ fmt(data.flex.avg_cost) }}</div>
          </div>
        </div>
        <div class="info-box q-mt-md">
          <q-icon name="info" size="16px" class="q-mr-xs" />
          O custo Flex é o valor estimado registrado no momento da venda (snapshot).
          Pedidos sem entrega Flex não são contabilizados aqui.
        </div>
      </div>

    </template>

    <div v-else-if="!loading" class="empty-state">
      <q-icon name="bar_chart" size="48px" color="grey-5" />
      <div>Nenhum dado encontrado para o período.</div>
    </div>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'

// ── State ─────────────────────────────────────────────────────────────────
const loading = ref(false)
const data = ref(null)
const todayData = ref(null)
const hoveredIdx = ref(null)
const activeTab = ref('evolucao')
const activeMetrics = ref(['gmv', 'lucro_liquido'])
const activeDatePreset = ref('30d')

const today = new Date()
const fmtDate = d => d.toISOString().slice(0, 10)
const dateFrom = ref(fmtDate(new Date(today - 29 * 86400000)))
const dateTo = ref(fmtDate(today))

// ── Config ────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'evolucao', label: 'Evolução', icon: 'show_chart' },
  { key: 'contas', label: 'Contas & CNPJ', icon: 'account_balance' },
  { key: 'produtos', label: 'Top Produtos', icon: 'inventory_2' },
  { key: 'flex', label: 'Flex Delivery', icon: 'electric_bike' },
]

const chartMetrics = [
  { key: 'gmv', label: 'GMV', color: '#6366f1' },
  { key: 'net_revenue', label: 'Rec. Líquida', color: '#0ea5e9' },
  { key: 'gross_profit', label: 'Lucro Bruto', color: '#10b981' },
  { key: 'lucro_liquido', label: 'Lucro Após Ads', color: '#0d9488' },
  { key: 'ads_cost', label: 'Ads', color: '#f59e0b' },
]

const datePresets = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7d', label: '7d' },
  { key: '14d', label: '14d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
]

// ── SVG chart constants ────────────────────────────────────────────────────
const SVG_W = 900
const SVG_H = 220
const PLOT = { x0: 58, x1: 895, y0: 12, y1: 195 }

// ── Computed ──────────────────────────────────────────────────────────────
const chartTotals = computed(() => {
  if (!chartData.value.length) return {}
  const sum = (key) => chartData.value.reduce((acc, d) => acc + (d[key] || 0), 0)
  const gmv  = sum('gmv')
  const netr = sum('net_revenue')
  const gp   = sum('gross_profit')
  const adsc = sum('ads_cost')
  const ords = sum('orders_count')
  const ll   = gp - adsc
  return {
    gmv:           Math.round(gmv   * 100) / 100,
    net_revenue:   Math.round(netr  * 100) / 100,
    gross_profit:  Math.round(gp    * 100) / 100,
    ads_cost:      Math.round(adsc  * 100) / 100,
    orders_count:  ords,
    lucro_liquido: Math.round(ll    * 100) / 100,
  }
})

const chartData = computed(() => {
  if (!data.value?.daily) return []
  return [...data.value.daily].sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
    ...d,
    dateLabel: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }))
})

const chartYMax = computed(() => {
  if (!chartData.value.length) return 1
  let max = 0
  for (const d of chartData.value)
    for (const key of activeMetrics.value)
      max = Math.max(max, d[key] || 0)
  return max || 1
})

// Y mínimo inteligente: começa em 85% do menor valor real (não em 0)
// Isso evita que linhas fiquem espremidas na parte inferior do gráfico
const chartYMin = computed(() => {
  if (!chartData.value.length) return 0
  let min = Infinity
  for (const d of chartData.value)
    for (const key of activeMetrics.value)
      if ((d[key] || 0) > 0) min = Math.min(min, d[key])
  if (!isFinite(min)) return 0
  // Deixa 15% de espaço abaixo do menor valor, mas nunca vai abaixo de 0
  const floor = Math.max(0, min * 0.85)
  // Só aplica o floor se o range coberto for pelo menos 15% do max
  // (evita distorção quando os valores estão muito próximos do zero)
  return (chartYMax.value - floor) / chartYMax.value > 0.15 ? floor : 0
})

const chartYRange = computed(() => chartYMax.value - chartYMin.value || 1)

const svgYTicks = computed(() => {
  const min = chartYMin.value
  const max = chartYMax.value
  return [max, min + (max - min) * 0.75, min + (max - min) * 0.5, min + (max - min) * 0.25, min]
    .map(v => Math.round(v))
})

const tooltipStyle = computed(() => {
  if (hoveredIdx.value === null || !chartData.value.length) return {}
  const n = chartData.value.length
  const frac = n > 1 ? hoveredIdx.value / (n - 1) : 0.5
  // keep tooltip inside the card
  const left = frac > 0.65 ? 'auto' : (frac * 82 + 7) + '%'
  const right = frac > 0.65 ? '4%' : 'auto'
  return { left, right, top: '8px' }
})

// ── SVG helpers ────────────────────────────────────────────────────────────
function svgXAt(i) {
  const n = chartData.value.length
  if (n <= 1) return (PLOT.x0 + PLOT.x1) / 2
  return PLOT.x0 + (i / (n - 1)) * (PLOT.x1 - PLOT.x0)
}

function svgY(val) {
  const ratio = Math.min(1, Math.max(0, ((val || 0) - chartYMin.value) / chartYRange.value))
  return PLOT.y1 - ratio * (PLOT.y1 - PLOT.y0)
}

function svgPoints(metric) {
  return chartData.value.map((d, i) => `${svgXAt(i)},${svgY(d[metric] || 0)}`).join(' ')
}

function svgAreaPath(metric) {
  const n = chartData.value.length
  if (!n) return ''
  const pts = chartData.value.map((d, i) => `${svgXAt(i)},${svgY(d[metric] || 0)}`)
  // Close the area at the bottom of the plot area (PLOT.y1 = baseline)
  return `M ${svgXAt(0)},${PLOT.y1} L ${pts.join(' L ')} L ${svgXAt(n - 1)},${PLOT.y1} Z`
}

function showXLabel(i) {
  const n = chartData.value.length
  if (n <= 14) return true
  if (n <= 31) return i % 3 === 0 || i === n - 1
  return i % 7 === 0 || i === n - 1
}

function onChartMouseMove(e) {
  const svg = e.currentTarget
  const rect = svg.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width * SVG_W
  const n = chartData.value.length
  if (!n) return
  const xStep = n > 1 ? (PLOT.x1 - PLOT.x0) / (n - 1) : 1
  const idx = Math.round((x - PLOT.x0) / xStep)
  hoveredIdx.value = Math.max(0, Math.min(n - 1, idx))
}

// ── Methods ───────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const res = await MercadoLivreService.getDashboardOperation({ date_from: dateFrom.value, date_to: dateTo.value })
    data.value = res.data
  } catch (e) {
    console.error('Dashboard error', e)
    data.value = null
  } finally {
    loading.value = false
  }
}

async function loadToday() {
  const todayStr = fmtDate(today)
  try {
    const res = await MercadoLivreService.getDashboardOperation({ date_from: todayStr, date_to: todayStr })
    todayData.value = res.data
  } catch (e) {
    console.error('Today data error', e)
  }
}

function applyPreset(key) {
  activeDatePreset.value = key
  if (key === 'hoje') {
    dateFrom.value = fmtDate(today)
    dateTo.value = fmtDate(today)
  } else {
    const days = parseInt(key)
    dateFrom.value = fmtDate(new Date(today - (days - 1) * 86400000))
    dateTo.value = fmtDate(today)
  }
  load()
}

function toggleMetric(key) {
  const idx = activeMetrics.value.indexOf(key)
  if (idx === -1) {
    activeMetrics.value = [...activeMetrics.value, key]
  } else if (activeMetrics.value.length > 1) {
    activeMetrics.value = activeMetrics.value.filter(k => k !== key)
  }
}

// ── Formatters ────────────────────────────────────────────────────────────
function fmt(v) {
  if (v == null || isNaN(v)) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function fmtShort(v) {
  if (v == null) return ''
  const abs = Math.abs(v)
  if (abs >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `R$${(v / 1000).toFixed(0)}k`
  return `R$${Math.round(v)}`
}

function pct(num, den) {
  if (!den || !num) return '—'
  return (num / den * 100).toFixed(1) + '%'
}
function pctRaw(num, den) {
  if (!den || !num) return '—'
  return (num / den * 100).toFixed(1) + '%'
}
function deltaFmt(v) {
  if (v == null) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(1)}%`
}
function deltaClass(v) {
  if (v == null) return 'delta-neutral'
  return v >= 0 ? 'delta-pos' : 'delta-neg'
}
function deltaIcon(v) {
  if (v == null) return 'remove'
  return v >= 0 ? 'arrow_upward' : 'arrow_downward'
}

onMounted(() => { load(); loadToday() })
</script>

<style scoped>
/* ── Page ──────────────────────────────────────────────────────────────── */
.dash-page {
  background: #0f172a;
  min-height: 100vh;
  padding: 24px;
  color: #e2e8f0;
  font-family: 'Inter', sans-serif;
}

/* ── Header ────────────────────────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #0d9488, #0891b2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.header-eyebrow {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  color: #f1f5f9;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* ── Date range ────────────────────────────────────────────────────────── */
.date-range-group {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1e293b;
  border-radius: 10px;
  padding: 6px 10px;
}

.date-preset-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all .15s;
}

.date-preset-btn--on {
  background: #0d9488;
  color: white;
}

.date-preset-btn:hover:not(.date-preset-btn--on) {
  background: #334155;
  color: #e2e8f0;
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
}

.date-sep {
  color: #475569;
  font-size: 12px;
}

.date-inp {
  font-size: 12px;
  color: #cbd5e1;
  min-width: 100px;
}

/* ── Loading ───────────────────────────────────────────────────────────── */
.loading-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 0;
}

.loading-text {
  color: #64748b;
  font-size: 14px;
}

/* ── KPI Grid ──────────────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.kpi-card {
  background: #1e293b;
  border-radius: 12px;
  padding: 18px 20px;
  border: 1px solid #334155;
  position: relative;
  overflow: hidden;
  transition: transform .15s, box-shadow .15s;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .3);
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.kpi-gmv::before {
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
}

.kpi-net::before {
  background: linear-gradient(90deg, #0ea5e9, #38bdf8);
}

.kpi-gp::before {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.kpi-ll::before {
  background: linear-gradient(90deg, #0d9488, #2dd4bf);
}

.kpi-ads::before {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.kpi-orders::before {
  background: linear-gradient(90deg, #ec4899, #f472b6);
}

.kpi-label {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .7px;
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 24px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1.1;
}

.kpi-highlight {
  color: #2dd4bf;
}

.kpi-warn {
  color: #f59e0b;
}

.kpi-warn-card .kpi-value {
  color: #f59e0b;
}

.kpi-sub {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}

.kpi-delta {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  margin-top: 8px;
}

.delta-pos {
  color: #10b981;
}

.delta-neg {
  color: #ef4444;
}

.delta-neutral {
  color: #64748b;
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */
.tab-bar {
  display: flex;
  gap: 4px;
  background: #1e293b;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 20px;
  border: 1px solid #334155;
}

.tab-btn {
  padding: 8px 16px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  transition: all .15s;
}

.tab-btn--on {
  background: #0d9488;
  color: white;
}

.tab-btn:hover:not(.tab-btn--on) {
  background: #334155;
  color: #cbd5e1;
}

/* ── Chart ─────────────────────────────────────────────────────────────── */
.chart-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
}

.chart-metric-toggles {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.metric-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid #334155;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all .2s;
}

.metric-btn:hover:not(.metric-btn--on) {
  border-color: #475569;
  color: #94a3b8;
}

.metric-btn-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0.4;
  transition: opacity .2s;
}

.metric-btn--on .metric-btn-dot {
  opacity: 1;
}

.chart-area {
  position: relative;
}

.chart-empty {
  padding: 60px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  font-size: 13px;
}

.line-chart-svg {
  display: block;
  width: 100%;
  height: 220px;
  cursor: crosshair;
}

.line-tooltip {
  position: absolute;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 10px 14px;
  z-index: 20;
  min-width: 160px;
  pointer-events: none;
  box-shadow: 0 8px 28px rgba(0, 0, 0, .6);
}

.tooltip-date {
  font-size: 11px;
  font-weight: 700;
  color: #cbd5e1;
  margin-bottom: 7px;
  padding-bottom: 6px;
  border-bottom: 1px solid #334155;
}

.tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.tooltip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tooltip-label {
  font-size: 11px;
  color: #64748b;
  flex: 1;
}

.tooltip-val {
  font-size: 11px;
  font-weight: 600;
  color: #f1f5f9;
}

/* ── Tables ────────────────────────────────────────────────────────────── */
.table-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 20px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 16px;
}

.table-wrap,
.acct-table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  text-align: left;
  padding: 8px 12px;
  color: #64748b;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .6px;
  border-bottom: 1px solid #334155;
  white-space: nowrap;
}

.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #1e293b;
  color: #cbd5e1;
  white-space: nowrap;
}

.data-table tr:hover td {
  background: #1a2744;
}

.data-table tfoot td {
  border-top: 1px solid #334155;
  border-bottom: none;
}

.right {
  text-align: right;
}

.data-table th.right,
.data-table td.right {
  text-align: right;
}

.bold {
  font-weight: 600;
  color: #f1f5f9;
}

.muted {
  color: #475569;
  font-size: 11px;
}

.pos {
  color: #10b981;
  font-weight: 600;
}

.neg {
  color: #ef4444;
  font-weight: 600;
}

.warn {
  color: #f59e0b;
}

.total-row td {
  font-weight: 700;
  color: #f1f5f9;
  background: #0f172a;
}

.rank {
  color: #475569;
  font-weight: 700;
  width: 30px;
}

/* Products */
.product-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 280px;
}

.prod-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #334155;
  flex-shrink: 0;
}

.prod-info {
  min-width: 0;
}

.prod-title {
  color: #cbd5e1;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

.prod-id {
  font-size: 10px;
  color: #475569;
}

/* Margin bar */
.margin-bar-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 80px;
}

.margin-bar-fill {
  height: 6px;
  border-radius: 3px;
  flex-shrink: 0;
  transition: width .3s;
}

/* ── CNPJ & Marketplace ────────────────────────────────────────────────── */
.section-label {
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .8px;
  font-weight: 600;
  margin-bottom: 12px;
}

.cnpj-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin-bottom: 4px;
}

.cnpj-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 18px;
  transition: transform .15s;
}

.cnpj-card:hover {
  transform: translateY(-2px);
}

.cnpj-header {
  margin-bottom: 14px;
}

.cnpj-name {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  font-family: monospace;
}

.cnpj-accounts {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.cnpj-kpis {
  display: flex;
  gap: 16px;
  margin-bottom: 14px;
}

.cnpj-kpi {
  flex: 1;
}

.cnpj-kpi-label {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.cnpj-kpi-val {
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
}

.gmv-bar-wrap {
  position: relative;
  background: #0f172a;
  border-radius: 4px;
  height: 6px;
  overflow: hidden;
}

.gmv-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0d9488, #2dd4bf);
  border-radius: 4px;
  transition: width .4s;
}

.gmv-bar-pct {
  position: absolute;
  right: 0;
  top: 8px;
  font-size: 10px;
  color: #64748b;
}

.mp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.mp-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 16px;
}

.mp-name {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 12px;
}

.mp-kpis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mp-kpi {
  display: flex;
  flex-direction: column;
}

.mp-kpi-label {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
}

.mp-kpi-val {
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
}

/* Inline share bar */
.inline-bar-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 80px;
}

.inline-bar-fill {
  height: 6px;
  background: linear-gradient(90deg, #6366f1, #818cf8);
  border-radius: 3px;
  flex-shrink: 0;
}

/* ── Info box ───────────────────────────────────────────────────────────── */
.info-box {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

/* ── Empty ──────────────────────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 0;
  color: #475569;
}

/* ── Today banner ───────────────────────────────────────────────────────── */
.today-banner {
  background: linear-gradient(135deg, #0c1f2e, #091a23);
  border: 1px solid #0d9488;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.today-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #2dd4bf;
  text-transform: uppercase;
  letter-spacing: .8px;
  white-space: nowrap;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2dd4bf;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

.today-kpis {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  flex: 1;
}

.today-sep {
  color: #1e3a4a;
  font-size: 20px;
  line-height: 1;
}

.today-kpi {
  text-align: center;
}

.today-kpi-label {
  font-size: 10px;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 2px;
}

.today-kpi-val {
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
}

.today-gmv { color: #818cf8; }
.today-pos { color: #2dd4bf; }
.today-neg { color: #ef4444; }

.today-note {
  font-size: 10px;
  color: #334155;
  margin-left: auto;
  white-space: nowrap;
}

/* ── New KPI card accent lines ───────────────────────────────────────────── */
.kpi-units::before {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

.kpi-roas::before {
  background: linear-gradient(90deg, #0ea5e9, #06b6d4);
}

.kpi-margin::before {
  background: linear-gradient(90deg, #2dd4bf, #34d399);
}

.kpi-canc::before {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.kpi-info {
  cursor: help;
  opacity: 0.5;
  vertical-align: middle;
}

.kpi-tooltip-pop {
  font-size: 12px;
  background: #0f172a;
  color: #cbd5e1;
}
</style>
