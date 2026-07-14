<template>
  <q-page class="dash-page">

    <!-- ══════════ HEADER (slim) ══════════════════════════════════════════ -->
    <DashboardHeader
      :preset="activeDatePreset"
      :date-from="dateFrom"
      :date-to="dateTo"
      :date-presets="datePresets"
      :ml-accounts="knownMlAccounts"
      :shopee-accounts="knownShopeeAccounts"
      :selected-keys="selectedAccountKeys"
      :all-keys="allAccountKeys"
      :loading="loading"
      @update:preset="applyPreset"
      @update:selected-keys="onSelectedKeysChange"
      @refresh="load"
      @open-filters="showFilters = true"
    />

    <!-- ══════════ LOADING ═════════════════════════════════════════════════ -->
    <div v-if="loading" class="loading-center">
      <q-spinner-dots color="teal" size="48px" />
      <div class="loading-text">Carregando dados...</div>
    </div>

    <template v-else-if="data || shopeeData">

      <!-- ══════════ FILTROS DRAWER ════════════════════════════════════════ -->
      <FiltersDrawer
        v-model="showFilters"
        :preset="activeDatePreset"
        :date-from="dateFrom"
        :date-to="dateTo"
        :date-presets="datePresets"
        :ml-accounts="knownMlAccounts"
        :shopee-accounts="knownShopeeAccounts"
        :selected-keys="selectedAccountKeys"
        :all-keys="allAccountKeys"
        :chart-metrics="chartMetrics"
        :active-metrics="activeMetrics"
        :chart-mode="chartMode"
        @update:preset="applyPreset"
        @update:date-from="dateFrom = $event; activeDatePreset = null; debouncedLoad()"
        @update:date-to="dateTo = $event; activeDatePreset = null; debouncedLoad()"
        @update:selected-keys="onSelectedKeysChange"
        @update:chart-mode="setChartMode"
        @toggle-metric="toggleMetric"
        @clear="clearFilters"
        @apply="showFilters = false"
      />

      <!-- ══════════ LAYOUT PRINCIPAL ════════════════════════════════════ -->
      <div class="dash-main-layout">

        <!-- ── ÁREA DE CONTEÚDO ────────────────────────────────────────── -->
        <div class="dash-content">

          <!-- ══ HOJE EM DESTAQUE (acima do gráfico) ════════════════════ -->
          <div v-if="combinedToday && activeDatePreset !== 'hoje'" class="today-banner">
            <div class="today-label" title="Tempo real — leitura direta dos pedidos">
              <div class="today-label-row">
                <span class="live-dot"></span>
                <span class="today-label-text">Hoje</span>
              </div>
              <span class="today-label-caption">tempo real</span>
            </div>
            <div class="today-kpis">
              <div class="today-kpi">
                <div class="today-kpi-label">GMV</div>
                <div class="today-kpi-val">{{ fmt(combinedToday.gmv) }}</div>
              </div>
              <div class="today-kpi">
                <div class="today-kpi-label">Pedidos</div>
                <div class="today-kpi-val">{{ combinedToday.orders_count || 0 }}</div>
              </div>
              <div class="today-kpi">
                <div class="today-kpi-label">Rec. líquida</div>
                <div class="today-kpi-val">{{ fmt(combinedToday.net_revenue) }}</div>
              </div>
              <div class="today-kpi">
                <div class="today-kpi-label">Margem de contribuição</div>
                <div class="today-kpi-val" :class="(combinedToday.gross_profit || 0) >= 0 ? 'today-pos' : 'today-neg'">{{ fmt(combinedToday.gross_profit) }}</div>
              </div>
              <div class="today-kpi">
                <div class="today-kpi-label">Lucro após Ads</div>
                <div class="today-kpi-val" :class="(combinedToday.lucro_liquido || 0) >= 0 ? 'today-pos' : 'today-neg'">{{ fmt(combinedToday.lucro_liquido) }}</div>
              </div>
              <div class="today-kpi">
                <div class="today-kpi-label">Ticket médio</div>
                <div class="today-kpi-val">{{ fmt(combinedToday.avg_ticket) }}</div>
              </div>
              <div class="today-kpi">
                <div class="today-kpi-label">Unidades</div>
                <div class="today-kpi-val">{{ combinedToday.units_sold || 0 }}</div>
              </div>
            </div>
          </div>

          <!-- ══ GRÁFICO HERO ════════════════════════════════════════════ -->
          <div class="chart-card hero-chart">
            <div class="chart-header-row1">
              <div class="chart-title-block">
                <div class="chart-title">{{ chartMode === 'weekday' ? 'Média por Dia da Semana' : 'Evolução' }}</div>
                <div class="chart-period-tag">{{ periodLabel }}</div>
              </div>

              <div class="chart-header-actions">
                <!-- Botão filtros — só mobile, evita scroll de volta ao header -->
                <button class="lt-sm chart-filter-btn" @click="showFilters = true">
                  <q-icon name="tune" size="14px" />
                  Filtros
                </button>

                <span v-if="chartLoading || loadingAccountData" class="chart-loading-badge">
                  <q-spinner-dots size="14px" color="teal" />
                </span>

                <!-- Seletor de métrica (modo Por Conta e Semana) -->
                <div v-if="chartMode !== 'metrics'" class="chart-metric-pills">
                  <button v-for="m in chartMetrics" :key="m.key"
                    :class="['chart-metric-pill', (chartMode === 'per_account' ? chartAccountMetric : weekdayChartMetric) === m.key && 'chart-metric-pill--on']"
                    :style="(chartMode === 'per_account' ? chartAccountMetric : weekdayChartMetric) === m.key ? `--pill-color:${m.color}` : ''"
                    @click="chartMode === 'per_account' ? (chartAccountMetric = m.key) : (weekdayChartMetric = m.key); renderPlotlyChart()">
                    {{ m.label }}
                  </button>
                </div>

                <!-- Toggle Agregado / Por Conta -->
                <div v-if="chartMode !== 'weekday'" class="chart-mode-toggle">
                  <button :class="['cmt-btn', chartMode === 'metrics' && 'cmt-btn--on']"
                    @click="setChartMode('metrics')">
                    <q-icon name="show_chart" size="13px" />Agregado
                  </button>
                  <button :class="['cmt-btn', chartMode === 'per_account' && 'cmt-btn--on']"
                    @click="setChartMode('per_account')">
                    <q-icon name="account_tree" size="13px" />Por Conta
                  </button>
                  <!-- Hint tooltip -->
                  <q-icon name="help_outline" size="14px" class="cmt-help-icon">
                    <q-tooltip max-width="220px" anchor="bottom right" self="top right" class="chart-hint-tooltip">
                      <div class="cht-tip">
                        <div class="cht-tip-row">
                          <q-icon name="show_chart" size="12px" /><strong>Agregado</strong> — todas as contas somadas em métricas separadas (GMV, Lucro…)
                        </div>
                        <div class="cht-tip-row">
                          <q-icon name="account_tree" size="12px" /><strong>Por Conta</strong> — uma linha por conta, escolha a métrica nas pílulas acima
                        </div>
                        <div class="cht-tip-row">
                          <q-icon name="event_note" size="12px" /><strong>Semana</strong> — média histórica por dia da semana (ative nos filtros)
                        </div>
                        <div class="cht-tip-divider"></div>
                        <div class="cht-tip-row cht-tip-muted">Scroll para zoom · Duplo clique para resetar</div>
                      </div>
                    </q-tooltip>
                  </q-icon>
                </div>
              </div>
            </div>
            <!-- Modo ativo — destaque contextual -->
            <div class="chart-mode-bar">
              <span v-if="chartMode === 'metrics'" class="chart-mode-bar-badge chart-mode-bar-badge--agg">
                <q-icon name="show_chart" size="12px" />Agregado
                <span class="chart-mode-bar-hint">múltiplas métricas · todas as contas combinadas</span>
              </span>
              <span v-else-if="chartMode === 'per_account'" class="chart-mode-bar-badge chart-mode-bar-badge--acc">
                <q-icon name="account_tree" size="12px" />Por Conta
                <span class="chart-mode-bar-hint">uma linha por conta · métrica selecionada: <strong>{{ chartMetrics.find(m => m.key === chartAccountMetric)?.label }}</strong></span>
              </span>
              <span v-else class="chart-mode-bar-badge chart-mode-bar-badge--week">
                <q-icon name="event_note" size="12px" />Média por Dia da Semana
                <span class="chart-mode-bar-hint">média histórica de {{ chartMetrics.find(m => m.key === weekdayChartMetric)?.label }}</span>
              </span>
            </div>
            <div v-if="chartData.length" class="plotly-wrap">
              <div ref="plotlyContainer" class="plotly-chart-container"></div>
              <!-- Loading overlay — bloqueia interação enquanto dados por conta carregam -->
              <transition name="chart-overlay-fade">
                <div v-if="loadingAccountData" class="plotly-loading-overlay">
                  <q-spinner-dots size="36px" color="teal" />
                  <div class="plotly-loading-text">Carregando dados por conta…</div>
                </div>
              </transition>
            </div>
            <div v-else class="chart-empty">Sem dados para o período selecionado</div>
          </div>


      <!-- ══════════ ALERTA CMV ════════════════════════════════════════════ -->
      <div v-if="!dismissCmvAlert && data?.cost_coverage && data.cost_coverage.cobertura_pct < 95" class="cmv-alert">
        <q-icon name="warning" size="16px" />
        <div class="cmv-alert-text">
          <strong>{{ (100 - data.cost_coverage.cobertura_pct).toFixed(0) }}% do GMV sem custo cadastrado</strong>
          — {{ fmt(data.cost_coverage.gmv_sem_custo) }} em pedidos sem CMV ({{ data.cost_coverage.orders_sem_custo }} pedidos).
          O lucro exibido pode estar <strong>inflado</strong>.
          <span class="cmv-alert-cta">→ Cadastre os custos em Configurações de Produto</span>
        </div>
        <button class="cmv-alert-close" @click="dismissCmvAlert = true">✕</button>
      </div>

      <!-- ══════════ KPI CARDS ══════════════════════════════════════════════ -->
      <div class="kpi-grid-header">
        <span class="kpi-grid-title">Resumo do Período</span>
        <span class="kpi-period-badge">
          <q-icon name="calendar_today" size="11px" />
          {{ periodLabel }}
        </span>
        <span v-if="selectedAccountKeys.length < allAccountKeys.length && selectedAccountKeys.length > 0" class="kpi-period-badge kpi-accts-badge">
          <q-icon name="filter_alt" size="11px" />
          {{ selectedAccountKeys.length }} de {{ allAccountKeys.length }} contas
        </span>
      </div>

      <SbKpiGrid :columns="4" :gap="12">
        <!-- GMV -->
        <SbKpiCard
          label="GMV"
          :value="fmt(op?.gmv)"
          variant="indigo"
          :delta="deltaFmt(op?.vs_prev?.gmv)"
          :sparkline-data="sparklineData('gmv')"
          sparkline-color="#6366f1"
        >
          <template #info>
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">Faturamento bruto total — o valor que o comprador pagou. Não desconta tarifas nem custo do produto.</q-tooltip>
            </q-icon>
          </template>
        </SbKpiCard>

        <!-- Receita Líquida -->
        <SbKpiCard
          label="Receita Líquida"
          :value="fmt(op?.net_revenue)"
          variant="sky"
          :delta="deltaFmt(op?.vs_prev?.net_revenue)"
          :sparkline-data="sparklineData('net_revenue')"
          sparkline-color="#0284c7"
        >
          <template #info>
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">GMV menos as tarifas cobradas pelo Mercado Livre. É o que entra na sua conta.</q-tooltip>
            </q-icon>
          </template>
        </SbKpiCard>

        <!-- Margem de Contribuição -->
        <SbKpiCard
          label="Margem de Contribuição"
          :value="fmt(op?.gross_profit)"
          variant="green"
          :sub="'Margem ' + pct(op?.gross_profit, op?.net_revenue)"
          :delta="deltaFmt(op?.vs_prev?.gross_profit)"
          :sparkline-data="sparklineData('gross_profit')"
          sparkline-color="#16a34a"
        >
          <template #info>
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">Receita Líquida menos o Custo Médio do Produto (CMV). É o que sobra para cobrir custos fixos e marketing.</q-tooltip>
            </q-icon>
          </template>
        </SbKpiCard>

        <!-- Lucro após Ads -->
        <SbKpiCard
          label="Lucro após Ads"
          :value="fmt(op?.lucro_liquido)"
          variant="teal"
          :sub="'Margem ' + pct(op?.lucro_liquido, op?.net_revenue)"
          :delta="deltaFmt(op?.vs_prev?.lucro_liquido)"
          :sparkline-data="sparklineData('lucro_liquido')"
          sparkline-color="#0f766e"
        >
          <template #info>
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">Margem de Contribuição menos o gasto com Ads. O lucro real da operação.</q-tooltip>
            </q-icon>
          </template>
        </SbKpiCard>

        <!-- Gasto com Ads -->
        <SbKpiCard
          label="Gasto com Ads"
          :value="fmt(op?.ads_cost)"
          variant="amber"
          :sub="'TACoS ' + pctRaw(op?.ads_cost, op?.gmv)"
          :delta="deltaFmt(op?.vs_prev?.ads_cost)"
          :invert-delta="true"
          :sparkline-data="sparklineData('ads_cost')"
          sparkline-color="#f59e0b"
        >
          <template #info>
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">Total investido em Ads. TACoS = Ads / GMV total.</q-tooltip>
            </q-icon>
          </template>
        </SbKpiCard>

        <!-- Pedidos Pagos -->
        <SbKpiCard
          label="Pedidos Pagos"
          :value="(op?.orders_count || 0).toLocaleString('pt-BR')"
          variant="indigo"
          :sub="'Ticket médio ' + fmt(op?.avg_ticket)"
          :delta="deltaFmt(op?.vs_prev?.orders_count)"
          :sparkline-data="sparklineData('orders_count')"
          sparkline-color="#8b5cf6"
        >
          <template #info>
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">Quantidade de pedidos pagos. Ticket médio = GMV ÷ pedidos.</q-tooltip>
            </q-icon>
          </template>
        </SbKpiCard>

        <!-- Unidades Vendidas -->
        <SbKpiCard
          label="Unidades Vendidas"
          :value="(op?.units_sold || 0).toLocaleString('pt-BR')"
          variant="slate"
          :sub="(op?.catalog_orders_count || 0) + ' via catálogo · ' + (op?.flex_orders_count || 0) + ' Flex'"
        >
          <template #info>
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Quantidade total de unidades vendidas. Pode ser maior que pedidos quando um pedido contém múltiplos itens.
              </q-tooltip>
            </q-icon>
          </template>
        </SbKpiCard>

        <!-- ROAS -->
        <SbKpiCard
          label="ROAS"
          :value="op?.roas ? op?.roas + 'x' : '—'"
          variant="sky"
          :sub="'ACoS ' + (op?.acos != null ? op?.acos + '%' : '—')"
          :delta="deltaFmt(op?.vs_prev?.tacos)"
          delta-prefix="TACoS"
          :invert-delta="true"
        >
          <template #info>
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Retorno sobre o investimento em Ads. ROAS = receita atribuída / gasto. ACoS = gasto / receita atribuída × 100.
              </q-tooltip>
            </q-icon>
          </template>
        </SbKpiCard>

        <!-- Margem Líquida -->
        <SbKpiCard
          label="Margem Líquida"
          :value="op?.lucro_liquido_pct != null ? op?.lucro_liquido_pct + '%' : '—'"
          :variant="(op?.lucro_liquido_pct || 0) >= 0 ? 'green' : 'red'"
          :sub="'Margem bruta ' + (op?.gross_margin_pct != null ? op?.gross_margin_pct + '%' : '—')"
        >
          <template #info>
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Lucro Após Ads ÷ Receita Líquida. É a margem real depois de descontar todos os custos operacionais e de marketing.
              </q-tooltip>
            </q-icon>
          </template>
        </SbKpiCard>

        <!-- Cancelamentos -->
        <SbKpiCard
          label="Cancelamentos"
          :value="op?.canceled_count || 0"
          :variant="(op?.canceled_count || 0) > 0 ? 'red' : 'slate'"
          :sub="op?.orders_count ? 'Taxa ' + pctRaw(op?.canceled_count, (op?.orders_count || 0) + (op?.canceled_count || 0)) : ''"
        >
          <template #info>
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">
                Pedidos cancelados no período. Alta taxa de cancelamento pode indicar problemas de estoque ou qualidade do anúncio.
              </q-tooltip>
            </q-icon>
          </template>
        </SbKpiCard>
      </SbKpiGrid>

          <!-- ══════════ ABAS ═══════════════════════════════════════════════════ -->
          <div class="tab-bar">
            <button v-for="t in tabs" :key="t.key" :class="['tab-btn', activeTab === t.key && 'tab-btn--on']"
              @click="activeTab = t.key">
              <q-icon :name="t.icon" size="14px" class="q-mr-xs" />{{ t.label }}
            </button>
          </div>

          <!-- ══════════ ABA: EVOLUÇÃO (tabela diária) ══════════════════════════ -->
          <div v-show="activeTab === 'evolucao'" class="tab-content">

        <!-- Daily table -->
        <div class="daily-table-card">
          <div class="daily-table-header">
            <div class="daily-table-title">
              <q-icon name="calendar_month" size="15px" />
              Detalhamento Diário
            </div>
            <div class="daily-table-meta">
              {{ chartDataDesc.length }} dias
              <span v-if="selectedAccountKeys.length < allAccountKeys.length" class="daily-filter-badge">
                <q-icon name="filter_alt" size="11px" />
                {{ selectedAccountKeys.length }} conta{{ selectedAccountKeys.length > 1 ? 's' : '' }}
              </span>
            </div>
          </div>
          <div class="daily-table-wrap">
            <table class="daily-table">
              <thead>
                <tr>
                  <th class="col-date">Data</th>
                  <th class="col-num">GMV</th>
                  <th class="col-num">Rec. Líquida</th>
                  <th class="col-num">Margem de Contribuição</th>
                  <th class="col-num col-ads">Ads</th>
                  <th class="col-num col-ads">TACoS</th>
                  <th class="col-num col-ll">Lucro Após Ads</th>
                  <th class="col-num">Pedidos</th>
                  <th class="col-num">Margem</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="d in chartDataDesc" :key="d.date">
                  <!-- Linha principal do dia -->
                  <tr :class="['dt-row', d.lucro_liquido < 0 ? 'dt-row--neg' : '', expandedDays.has(d.date) ? 'dt-row--open' : '']"
                    @click="toggleDayExpand(d.date)">
                    <td class="col-date">
                      <span class="dt-expand-btn">
                        <q-icon :name="expandedDays.has(d.date) ? 'expand_less' : 'chevron_right'" size="13px" />
                      </span>
                      <span class="dt-date-label">{{ d.dateLabel }}</span>
                    </td>
                    <td class="col-num dt-gmv">{{ fmt(d.gmv) }}</td>
                    <td class="col-num">{{ fmt(d.net_revenue) }}</td>
                    <td class="col-num" :class="d.gross_profit >= 0 ? 'dt-pos' : 'dt-neg'">{{ fmt(d.gross_profit) }}</td>
                    <td class="col-num col-ads dt-warn">{{ fmt(d.ads_cost) }}</td>
                    <td class="col-num col-ads">
                      <span v-if="d.gmv > 0" :class="['dt-tacos-badge', tacosBadgeClass(d.ads_cost / d.gmv * 100)]">
                        {{ (d.ads_cost / d.gmv * 100).toFixed(1) }}%
                      </span>
                      <span v-else class="dt-empty">—</span>
                    </td>
                    <td class="col-num col-ll" :class="d.lucro_liquido >= 0 ? 'dt-pos' : 'dt-neg'">
                      <strong>{{ fmt(d.lucro_liquido) }}</strong>
                    </td>
                    <td class="col-num">{{ d.orders_count }}</td>
                    <td class="col-num">
                      <span :class="d.net_revenue > 0 ? (d.lucro_liquido / d.net_revenue >= 0.15 ? 'dt-pos' : d.lucro_liquido / d.net_revenue >= 0.05 ? '' : 'dt-warn-text') : ''">
                        {{ pct(d.lucro_liquido, d.net_revenue) }}
                      </span>
                    </td>
                  </tr>
                  <!-- Breakdown por conta -->
                  <template v-if="expandedDays.has(d.date)">
                    <tr v-for="a in dayAccountRows(d.date)" :key="a.label + d.date" class="dt-acct-row">
                      <td class="col-date">
                        <span class="dt-acct-indent">
                          <span class="dt-acct-dot" :style="{ background: a.color }"></span>
                          {{ a.label }}
                          <span :class="['dt-mkt-tag', `dt-mkt-tag--${a.marketplace}`]">{{ a.marketplace === 'ml' ? 'ML' : 'SH' }}</span>
                        </span>
                      </td>
                      <td class="col-num dt-sub">{{ fmt(a.gmv) }}</td>
                      <td class="col-num dt-sub">{{ fmt(a.net_revenue) }}</td>
                      <td class="col-num dt-sub" :class="(a.gross_profit || 0) >= 0 ? 'dt-pos' : 'dt-neg'">{{ fmt(a.gross_profit) }}</td>
                      <td class="col-num col-ads dt-sub dt-warn">{{ a.ads_cost ? fmt(a.ads_cost) : '—' }}</td>
                      <td class="col-num col-ads dt-sub">
                        <span v-if="a.gmv > 0">{{ (a.ads_cost / a.gmv * 100).toFixed(1) }}%</span>
                        <span v-else class="dt-empty">—</span>
                      </td>
                      <td class="col-num col-ll dt-sub" :class="(a.lucro_liquido || 0) >= 0 ? 'dt-pos' : 'dt-neg'">{{ fmt(a.lucro_liquido) }}</td>
                      <td class="col-num dt-sub">{{ a.orders_count || 0 }}</td>
                      <td class="col-num dt-sub">{{ pct(a.lucro_liquido, a.net_revenue) }}</td>
                    </tr>
                    <tr v-if="!dayAccountRows(d.date).length" class="dt-acct-row">
                      <td colspan="9" class="dt-loading-hint">
                        <q-spinner-dots size="12px" color="teal" />
                        Carregando dados por conta…
                      </td>
                    </tr>
                  </template>
                </template>
              </tbody>
              <tfoot>
                <tr class="dt-total-row">
                  <td class="col-date">
                    <q-icon name="functions" size="13px" style="opacity:.6;margin-right:5px" />
                    Total {{ chartDataDesc.length }}d
                  </td>
                  <td class="col-num dt-gmv">{{ fmt(chartTotals.gmv) }}</td>
                  <td class="col-num">{{ fmt(chartTotals.net_revenue) }}</td>
                  <td class="col-num" :class="(chartTotals.gross_profit || 0) >= 0 ? 'dt-pos' : 'dt-neg'">{{ fmt(chartTotals.gross_profit) }}</td>
                  <td class="col-num col-ads dt-warn">{{ fmt(chartTotals.ads_cost) }}</td>
                  <td class="col-num col-ads">{{ chartTotals.gmv > 0 ? (chartTotals.ads_cost / chartTotals.gmv * 100).toFixed(1) + '%' : '—' }}</td>
                  <td class="col-num col-ll" :class="(chartTotals.lucro_liquido || 0) >= 0 ? 'dt-pos' : 'dt-neg'">
                    <strong>{{ fmt(chartTotals.lucro_liquido) }}</strong>
                  </td>
                  <td class="col-num">{{ chartTotals.orders_count }}</td>
                  <td class="col-num">{{ pct(chartTotals.lucro_liquido, chartTotals.net_revenue) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- ══════════ ABA: RANKING CONTAS ════════════════════════════════════ -->
      <div v-show="activeTab === 'ranking'" class="tab-content">
        <div class="table-card">
          <div class="table-header-row">
            <div class="table-title">
              <q-icon name="leaderboard" size="16px" class="q-mr-xs text-teal-7" />
              Ranking de Contas — {{ dateFrom }} → {{ dateTo }}
            </div>
            <div class="table-controls">
              <select v-model="rankingSortKey" class="sort-select">
                <option value="gmv">Maior GMV</option>
                <option value="lucro_liquido">Maior Lucro Real</option>
                <option value="gross_profit">Maior Margem de Contribuição</option>
                <option value="lucro_liquido_pct">Melhor Margem Líquida</option>
                <option value="gross_margin_pct">Melhor Margem Bruta</option>
                <option value="roas">Melhor ROAS</option>
                <option value="tacos">Menor TACoS</option>
                <option value="orders_count">Mais pedidos</option>
              </select>
            </div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Marketplace</th>
                  <th>Conta</th>
                  <th class="right">GMV</th>
                  <th class="right">Rec. Líq.</th>
                  <th class="right">Margem de Contribuição</th>
                  <th class="right">Margem Bruta</th>
                  <th class="right">Ads</th>
                  <th class="right">TACoS</th>
                  <th class="right">Lucro Real</th>
                  <th class="right">Margem Líq.</th>
                  <th class="right">ROAS</th>
                  <th class="right">Pedidos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(a, i) in rankingRows" :key="a.key">
                  <td class="rank">
                    <span :class="['rank-medal', i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : '']">
                      {{ i + 1 }}
                    </span>
                  </td>
                  <td>
                    <span :class="['mkt-badge', a.marketplace === 'ml' ? 'mkt-badge--ml' : 'mkt-badge--shopee']">
                      {{ a.marketplace === 'ml' ? 'ML' : 'Shopee' }}
                    </span>
                  </td>
                  <td class="bold">
                    <span class="acct-dot-inline" :style="{ background: accountColor(a.key) }"></span>
                    {{ a.label }}
                  </td>
                  <td class="right">{{ fmt(a.gmv) }}</td>
                  <td class="right">{{ fmt(a.net_revenue) }}</td>
                  <td class="right" :class="(a.gross_profit || 0) >= 0 ? 'pos' : 'neg'">{{ fmt(a.gross_profit) }}</td>
                  <td class="right">
                    <span :class="a.gross_margin_pct >= 30 ? 'pos' : a.gross_margin_pct >= 15 ? '' : 'neg'">
                      {{ a.gross_margin_pct != null ? a.gross_margin_pct + '%' : '—' }}
                    </span>
                  </td>
                  <td class="right warn">{{ a.ads_cost ? fmt(a.ads_cost) : '—' }}</td>
                  <td class="right">
                    <span v-if="a.tacos != null" :class="tacosBadgeClass(a.tacos)">{{ a.tacos.toFixed(1) }}%</span>
                    <span v-else class="muted">—</span>
                  </td>
                  <td class="right" :class="(a.lucro_liquido || 0) >= 0 ? 'pos' : 'neg'">{{ fmt(a.lucro_liquido) }}</td>
                  <td class="right">
                    <span :class="a.lucro_liquido_pct >= 15 ? 'pos' : a.lucro_liquido_pct >= 5 ? '' : 'neg'">
                      {{ a.lucro_liquido_pct != null ? a.lucro_liquido_pct + '%' : '—' }}
                    </span>
                  </td>
                  <td class="right">{{ a.roas ? a.roas + 'x' : '—' }}</td>
                  <td class="right">{{ a.orders_count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Cards de destaque -->
        <div class="ranking-highlights" v-if="rankingRows.length >= 2">
          <div class="ranking-highlight-card" v-for="h in rankingHighlights" :key="h.label">
            <div class="rh-label">{{ h.label }}</div>
            <div class="rh-winner">
              <span class="acct-dot-inline" :style="{ background: accountColor(h.winner.key) }"></span>
              <strong>{{ h.winner.label }}</strong>
            </div>
            <div class="rh-value" :class="h.positive ? 'pos' : ''">{{ h.value }}</div>
            <div v-if="h.loser" class="rh-loser muted">
              Último: {{ h.loser.label }} ({{ h.loserValue }})
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════ ABA: DRE-APROXIMADA ══════════════════════════════════ -->
      <div v-show="activeTab === 'dre'" class="tab-content">
        <div class="waterfall-card" v-if="op?.gmv">
          <div class="waterfall-header">
            <div class="waterfall-title">
              <q-icon name="account_balance" size="16px" class="q-mr-xs" />
              DRE-Aproximada
            </div>
            <div class="waterfall-subtitle">Demonstrativo de Resultado do Exercício — período selecionado</div>
            <div class="projection-badge" v-if="monthProjection">
              <q-icon name="trending_up" size="12px" />
              Projeção mês: <strong>{{ fmt(monthProjection.gmv) }}</strong> GMV · <strong>{{ fmt(monthProjection.lucro) }}</strong> lucro
              <span class="muted" style="font-size:10px">(dia {{ monthProjection.dayOfMonth }} de {{ monthProjection.daysInMonth }})</span>
            </div>
          </div>

          <!-- Cascata visual -->
          <div class="waterfall-steps">
            <div class="wf-step wf-step--start">
              <div class="wf-label">GMV</div>
              <div class="wf-bar-wrap"><div class="wf-bar wf-bar--gmv" style="width:100%"></div></div>
              <div class="wf-value">{{ fmt(op?.gmv) }}</div>
            </div>
            <div class="wf-arrow">▼</div>
            <div class="wf-step wf-step--deduct">
              <div class="wf-label" title="Comissão + tarifa fixa do Mercado Livre (taxas Shopee já descontadas na Rec. Líquida)">− Taxas de marketplace (ML)</div>
              <div class="wf-bar-wrap"><div class="wf-bar wf-bar--deduct" :style="{ width: wfPct(op?.total_fees, op?.gmv) + '%' }"></div></div>
              <div class="wf-value wf-value--neg">−{{ fmt(op?.total_fees) }} <span class="wf-pct">({{ wfPct(op?.total_fees, op?.gmv).toFixed(1) }}%)</span></div>
            </div>
            <div class="wf-arrow">▼</div>
            <div class="wf-step wf-step--result">
              <div class="wf-label">= Rec. Líquida</div>
              <div class="wf-bar-wrap"><div class="wf-bar wf-bar--net" :style="{ width: wfPct(op?.net_revenue, op?.gmv) + '%' }"></div></div>
              <div class="wf-value">{{ fmt(op?.net_revenue) }} <span class="wf-pct">({{ wfPct(op?.net_revenue, op?.gmv).toFixed(1) }}% do GMV)</span></div>
            </div>
            <div class="wf-arrow">▼</div>
            <div class="wf-step wf-step--deduct">
              <div class="wf-label" title="Custo da Mercadoria Vendida — custo por SKU (Tiny) × quantidade">− CMV (custo da mercadoria)</div>
              <div class="wf-bar-wrap"><div class="wf-bar wf-bar--deduct" :style="{ width: wfPct(op?.cmv_total, op?.gmv) + '%' }"></div></div>
              <div class="wf-value wf-value--neg">−{{ fmt(op?.cmv_total) }} <span class="wf-pct">({{ wfPct(op?.cmv_total, op?.gmv).toFixed(1) }}%)</span></div>
            </div>
            <div class="wf-arrow">▼</div>
            <div class="wf-step wf-step--result">
              <div class="wf-label" title="Receita líquida menos CMV, antes dos custos variáveis de venda">= Resultado após CMV</div>
              <div class="wf-bar-wrap"><div class="wf-bar wf-bar--gp" :style="{ width: wfPct(op?.gross_profit, op?.gmv) + '%' }"></div></div>
              <div class="wf-value">{{ fmt(op?.gross_profit) }} <span class="wf-pct">({{ wfPct(op?.gross_profit, op?.gmv).toFixed(1) }}% do GMV)</span></div>
            </div>
            <div class="wf-arrow">▼</div>
            <div class="wf-step wf-step--deduct">
              <div class="wf-label" title="Product Ads (ML) + Shopee Ads no período">− Investimento em Ads</div>
              <div class="wf-bar-wrap"><div class="wf-bar wf-bar--ads" :style="{ width: wfPct(op?.ads_cost, op?.gmv) + '%' }"></div></div>
              <div class="wf-value wf-value--warn">−{{ fmt(op?.ads_cost) }} <span class="wf-pct">(TACoS {{ wfPct(op?.ads_cost, op?.gmv).toFixed(1) }}%)</span></div>
            </div>
            <template v-if="op?.affiliate_cost > 0">
              <div class="wf-arrow">▼</div>
              <div class="wf-step wf-step--deduct">
                <div class="wf-label" title="Comissão paga a afiliados do programa Shopee (AMS)">− Afiliados (Shopee)</div>
                <div class="wf-bar-wrap"><div class="wf-bar wf-bar--ads" :style="{ width: wfPct(op?.affiliate_cost, op?.gmv) + '%' }"></div></div>
                <div class="wf-value wf-value--warn">−{{ fmt(op?.affiliate_cost) }} <span class="wf-pct">({{ wfPct(op?.affiliate_cost, op?.gmv).toFixed(1) }}%)</span></div>
              </div>
            </template>
            <div class="wf-arrow">▼</div>
            <div class="wf-step wf-step--final" :class="(op?.lucro_liquido || 0) >= 0 ? 'wf-step--pos' : 'wf-step--neg'">
              <div class="wf-label" title="O que sobra das vendas para cobrir custos fixos e gerar lucro. Não desconta despesas fixas.">= Margem de Contribuição</div>
              <div class="wf-bar-wrap">
                <div class="wf-bar" :class="(op?.lucro_liquido || 0) >= 0 ? 'wf-bar--ll' : 'wf-bar--neg'"
                  :style="{ width: Math.abs(wfPct((op?.lucro_liquido || 0) - (op?.affiliate_cost || 0), op?.gmv)) + '%' }"></div>
              </div>
              <div class="wf-value wf-value--highlight">
                {{ fmt((op?.lucro_liquido || 0) - (op?.affiliate_cost || 0)) }}
                <span class="wf-pct">({{ wfPct((op?.lucro_liquido || 0) - (op?.affiliate_cost || 0), op?.gmv).toFixed(1) }}% do GMV)</span>
              </div>
            </div>
          </div>

          <!-- Breakdown por conta -->
          <div class="dre-breakdown">
            <div class="dre-breakdown-title">
              <q-icon name="account_tree" size="13px" class="q-mr-xs" />
              Origem dos valores — por conta e marketplace
            </div>
            <div class="table-wrap">
              <table class="data-table dre-breakdown-table">
                <thead>
                  <tr>
                    <th>Marketplace</th>
                    <th>Conta</th>
                    <th class="right">GMV</th>
                    <th class="right">Tarifas</th>
                    <th class="right">Rec. Líquida</th>
                    <th class="right">CPV</th>
                    <th class="right">Margem de Contribuição</th>
                    <th class="right">Ads</th>
                    <th class="right">Lucro Real</th>
                    <th class="right">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="activeMarketplaces.includes('ml') && data?.accounts">
                    <tr v-for="a in data.accounts.filter(a => selectedAccountKeys.includes('ml:' + a.account_id))" :key="'dre2-ml-' + a.account_id">
                      <td><span class="mkt-badge mkt-badge--ml">ML</span></td>
                      <td class="bold">
                        <span class="acct-dot-inline" :style="{ background: accountColor('ml:' + a.account_id) }"></span>
                        {{ a.account_nickname }}
                      </td>
                      <td class="right">{{ fmt(a.gmv) }}</td>
                      <td class="right warn">{{ fmt(a.total_fees) }}</td>
                      <td class="right">{{ fmt(a.net_revenue) }}</td>
                      <td class="right warn">{{ fmt(a.cmv_total) }}</td>
                      <td class="right" :class="(a.gross_profit || 0) >= 0 ? 'pos' : 'neg'">{{ fmt(a.gross_profit) }}</td>
                      <td class="right warn">{{ fmt(a.ads_cost) }}</td>
                      <td class="right" :class="(a.lucro_liquido || 0) >= 0 ? 'pos' : 'neg'">{{ fmt(a.lucro_liquido) }}</td>
                      <td class="right">{{ pct(a.lucro_liquido, a.net_revenue) }}</td>
                    </tr>
                  </template>
                  <template v-if="activeMarketplaces.includes('shopee') && shopeeData?.by_account">
                    <tr v-for="a in shopeeData.by_account.filter(a => selectedAccountKeys.includes('shopee:' + a.account_id))" :key="'dre2-sh-' + a.account_id">
                      <td><span class="mkt-badge mkt-badge--shopee">Shopee</span></td>
                      <td class="bold">
                        <span class="acct-dot-inline" :style="{ background: accountColor('shopee:' + a.account_id) }"></span>
                        {{ a.shop_name }}
                      </td>
                      <td class="right">{{ fmt(a.gmv) }}</td>
                      <td class="right warn">
                        <span :title="'Comissão + taxas Shopee + frete líquido'">{{ fmt(a.gmv - a.net_revenue) }}</span>
                      </td>
                      <td class="right">{{ fmt(a.net_revenue) }}</td>
                      <td class="right warn">{{ a.gross_profit != null ? fmt(a.net_revenue - a.gross_profit) : '—' }}</td>
                      <td class="right" :class="(a.gross_profit || 0) >= 0 ? 'pos' : 'neg'">{{ a.gross_profit != null ? fmt(a.gross_profit) : '—' }}</td>
                      <td class="right warn">—</td>
                      <td class="right" :class="(a.gross_profit || 0) >= 0 ? 'pos' : 'neg'">{{ a.gross_profit != null ? fmt(a.gross_profit) : '—' }}</td>
                      <td class="right">{{ pct(a.gross_profit, a.net_revenue) }}</td>
                    </tr>
                  </template>
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td colspan="2">TOTAL</td>
                    <td class="right">{{ fmt(op?.gmv) }}</td>
                    <td class="right warn">{{ fmt(op?.total_fees) }}</td>
                    <td class="right">{{ fmt(op?.net_revenue) }}</td>
                    <td class="right warn">{{ fmt(op?.cmv_total) }}</td>
                    <td class="right" :class="(op?.gross_profit || 0) >= 0 ? 'pos' : 'neg'">{{ fmt(op?.gross_profit) }}</td>
                    <td class="right warn">{{ fmt(op?.ads_cost) }}</td>
                    <td class="right" :class="(op?.lucro_liquido || 0) >= 0 ? 'pos' : 'neg'">{{ fmt(op?.lucro_liquido) }}</td>
                    <td class="right">{{ pct(op?.lucro_liquido, op?.net_revenue) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        <div v-else class="chart-empty">Sem dados para o período</div>
      </div>

      <!-- ══════════ ABA: CONTAS & CNPJ ════════════════════════════════════ -->
      <div v-show="activeTab === 'contas'" class="tab-content">

        <!-- By CNPJ -->
        <div class="section-label">Por CNPJ / Empresa</div>
        <div class="cnpj-grid">
          <div v-for="c in (data?.by_cnpj || [])" :key="c.cnpj || 'sem'" class="cnpj-card">
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
          <!-- ML -->
          <div v-if="activeMarketplace !== 'shopee' && data" v-for="mp in data.marketplaces" :key="mp.key" class="mp-card mp-card--ml">
            <div class="mp-name">
              <q-icon name="storefront" size="16px" class="q-mr-xs text-yellow-8" />
              {{ mp.name }}
            </div>
            <div class="mp-kpis">
              <div class="mp-kpi"><span class="mp-kpi-label">GMV</span> <span class="mp-kpi-val">{{ fmt(mp.gmv) }}</span></div>
              <div class="mp-kpi"><span class="mp-kpi-label">Rec. Líquida</span> <span class="mp-kpi-val">{{ fmt(mp.net_revenue) }}</span></div>
              <div class="mp-kpi"><span class="mp-kpi-label">Lucro</span> <span class="mp-kpi-val" :class="mp.lucro_liquido >= 0 ? 'pos' : 'neg'">{{ fmt(mp.lucro_liquido) }}</span></div>
              <div class="mp-kpi"><span class="mp-kpi-label">Pedidos</span> <span class="mp-kpi-val">{{ mp.orders_count }}</span></div>
            </div>
            <div class="gmv-bar-wrap q-mt-sm">
              <div class="gmv-bar-fill gmv-bar-fill--ml" :style="{ width: combinedGmvShare('ml', mp.gmv) + '%' }"></div>
              <span class="gmv-bar-pct">{{ combinedGmvShare('ml', mp.gmv) }}% do GMV total</span>
            </div>
          </div>
          <!-- Shopee -->
          <div v-if="activeMarketplace !== 'ml' && filteredShopeeOp" class="mp-card mp-card--shopee">
            <div class="mp-name">
              <q-icon name="shopping_bag" size="16px" class="q-mr-xs text-deep-orange" />
              Shopee
            </div>
            <div class="mp-kpis">
              <div class="mp-kpi"><span class="mp-kpi-label">GMV</span> <span class="mp-kpi-val">{{ fmt(filteredShopeeOp.gmv) }}</span></div>
              <div class="mp-kpi"><span class="mp-kpi-label">Rec. Estimada</span> <span class="mp-kpi-val">{{ fmt(filteredShopeeOp.net_revenue) }}</span></div>
              <div class="mp-kpi"><span class="mp-kpi-label">Lucro</span> <span class="mp-kpi-val" :class="(filteredShopeeOp.gross_profit || 0) >= 0 ? 'pos' : 'neg'">{{ fmt(filteredShopeeOp.gross_profit) }}</span></div>
              <div class="mp-kpi"><span class="mp-kpi-label">Pedidos</span> <span class="mp-kpi-val">{{ filteredShopeeOp.orders_count }}</span></div>
            </div>
            <div class="gmv-bar-wrap q-mt-sm">
              <div class="gmv-bar-fill gmv-bar-fill--shopee" :style="{ width: combinedGmvShare('shopee', filteredShopeeOp.gmv) + '%' }"></div>
              <span class="gmv-bar-pct">{{ combinedGmvShare('shopee', filteredShopeeOp.gmv) }}% do GMV total</span>
            </div>
          </div>
        </div>

        <!-- By account -->
        <div class="section-label q-mt-lg">Por Conta</div>
        <div class="acct-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Marketplace</th>
                <th>Conta</th>
                <th>CNPJ</th>
                <th class="right">GMV</th>
                <th class="right">Rec. Líq.</th>
                <th class="right">Lucro</th>
                <th class="right">Ads</th>
                <th class="right">Pedidos</th>
                <th class="right">Share GMV</th>
              </tr>
            </thead>
            <tbody>
              <!-- ML accounts -->
              <template v-if="activeMarketplace !== 'shopee' && data?.accounts">
                <tr v-for="a in data.accounts" :key="'ml-' + a.account_id">
                  <td><span class="mkt-badge mkt-badge--ml">ML</span></td>
                  <td class="bold">{{ a.account_nickname }}</td>
                  <td class="muted">{{ a.cnpj || '—' }}</td>
                  <td class="right">{{ fmt(a.gmv) }}</td>
                  <td class="right">{{ fmt(a.net_revenue) }}</td>
                  <td class="right" :class="a.lucro_liquido >= 0 ? 'pos' : 'neg'">{{ fmt(a.lucro_liquido) }}</td>
                  <td class="right warn">{{ fmt(a.ads_cost) }}</td>
                  <td class="right">{{ a.orders_count }}</td>
                  <td class="right">
                    <div class="inline-bar-wrap">
                      <div class="inline-bar-fill" :style="{ width: combinedGmvShare('ml', a.gmv) + '%' }"></div>
                      <span>{{ combinedGmvShare('ml', a.gmv) }}%</span>
                    </div>
                  </td>
                </tr>
              </template>
              <!-- Shopee accounts -->
              <template v-if="activeMarketplace !== 'ml' && shopeeData?.by_account">
                <tr v-for="a in shopeeData.by_account.filter(a => selectedAccountKeys.includes('shopee:' + a.account_id))" :key="'sh-' + a.account_id">
                  <td><span class="mkt-badge mkt-badge--shopee">Shopee</span></td>
                  <td class="bold">{{ a.shop_name }}</td>
                  <td class="muted">—</td>
                  <td class="right">{{ fmt(a.gmv) }}</td>
                  <td class="right">{{ fmt(a.net_revenue) }}</td>
                  <td class="right" :class="(a.gross_profit || 0) >= 0 ? 'pos' : 'neg'">{{ fmt(a.gross_profit) }}</td>
                  <td class="right warn">—</td>
                  <td class="right">{{ a.orders_count }}</td>
                  <td class="right">
                    <div class="inline-bar-wrap">
                      <div class="inline-bar-fill inline-bar-fill--shopee" :style="{ width: combinedGmvShare('shopee', a.gmv) + '%' }"></div>
                      <span>{{ combinedGmvShare('shopee', a.gmv) }}%</span>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══════════ ABA: TOP PRODUTOS ══════════════════════════════════════ -->
      <div v-show="activeTab === 'produtos'" class="tab-content">

        <!-- Concentração de receita -->
        <div v-if="concentrationAlert" :class="['concentration-badge', concentrationAlert.level]">
          <q-icon :name="concentrationAlert.icon" size="14px" />
          {{ concentrationAlert.text }}
        </div>

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
                  <th class="right">% Acum.</th>
                  <th class="right">Tarifas</th>
                  <th class="right">CPV</th>
                  <th class="right">Margem de Contribuição</th>
                  <th class="right">Margem</th>
                  <th class="right" v-if="topGroupBy === 'item' && activeMarketplace !== 'shopee'">
                    <q-tooltip>Visitas → Vendas no período</q-tooltip>
                    Conversão
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in topProductsSorted" :key="p.item_id || p.sku"
                  :class="paretoLine(i) === 80 ? 'pareto-line-80' : paretoLine(i) === 95 ? 'pareto-line-95' : ''">
                  <td class="rank">{{ i + 1 }}</td>
                  <td class="product-cell">
                    <img v-if="p.thumbnail" :src="p.thumbnail.replace(/^http:\/\//i, 'https://')" class="prod-thumb" />
                    <div class="prod-info">
                      <div class="prod-title">
                        <span v-if="p.marketplace === 'shopee'" class="mkt-badge mkt-badge--shopee">Shopee</span>
                        {{ p.title }}
                      </div>
                      <div class="prod-id muted">{{ p.item_id }}</div>
                    </div>
                  </td>
                  <td class="right">{{ p.qty_sold }}</td>
                  <td class="right">{{ fmt(p.revenue) }}</td>
                  <td class="right">
                    <div class="pareto-cell">
                      <div class="pareto-bar-bg">
                        <div class="pareto-bar-fill"
                          :style="{ width: paretoAccum(i) + '%',
                            background: paretoAccum(i) <= 80 ? '#6366f1' : paretoAccum(i) <= 95 ? '#f59e0b' : '#94a3b8' }">
                        </div>
                      </div>
                      <span class="pareto-pct">{{ paretoAccum(i) }}%</span>
                    </div>
                  </td>
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
                  <td class="right" v-if="topGroupBy === 'item' && activeMarketplace !== 'shopee'">
                    <span v-if="p.visits_count > 0" class="conv-funnel">
                      <span class="conv-visits">{{ p.visits_count?.toLocaleString('pt-BR') || '—' }}</span>
                      <span class="conv-arrow">→</span>
                      <span :class="['conv-rate', convClass(p.qty_sold, p.visits_count)]">
                        {{ ((p.qty_sold / p.visits_count) * 100).toFixed(1) }}%
                      </span>
                    </span>
                    <span v-else class="muted">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ══════════ ABA: FLEX ══════════════════════════════════════════════ -->
      <div v-show="activeTab === 'flex' && activeMarketplace !== 'shopee'" class="tab-content">

        <!-- KPI cards -->
        <div class="kpi-grid">
          <div class="kpi-card kpi-flex-orders">
            <div class="kpi-label">Pedidos Flex no Período</div>
            <div class="kpi-value">{{ (data?.flex?.orders_count || 0).toLocaleString('pt-BR') }}</div>
            <div class="kpi-sub">{{ pctRaw(data?.flex?.orders_count, op?.orders_count) }} dos pedidos</div>
          </div>
          <div class="kpi-card kpi-warn-card">
            <div class="kpi-label">Custo Total Flex</div>
            <div class="kpi-value kpi-warn">{{ fmt(data?.flex?.shipping_cost_total) }}</div>
            <div class="kpi-sub">{{ pctRaw(data?.flex?.shipping_cost_total, op?.gmv) }} do GMV</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Custo Médio por Pedido Flex</div>
            <div class="kpi-value">{{ fmt(data?.flex?.avg_cost) }}</div>
            <div class="kpi-sub" v-if="op?.orders_count">
              {{ ((data?.flex?.shipping_cost_total || 0) / (op?.gmv || 1) * 100).toFixed(1) }}% do GMV
            </div>
          </div>
          <div class="kpi-card" v-if="data?.flex?.avg_ticket_flex">
            <div class="kpi-label">Ticket Médio — Flex vs Padrão</div>
            <div class="kpi-value kpi-highlight">{{ fmt(data?.flex?.avg_ticket_flex) }}</div>
            <div class="kpi-sub">
              Padrão: {{ fmt(data?.flex?.avg_ticket_nonflex) }}
              <span v-if="data?.flex?.avg_ticket_flex && data?.flex?.avg_ticket_nonflex"
                :class="data.flex.avg_ticket_flex > data.flex.avg_ticket_nonflex ? 'pos' : 'neg'">
                ({{ data.flex.avg_ticket_flex > data.flex.avg_ticket_nonflex ? '+' : '' }}{{ ((data.flex.avg_ticket_flex / data.flex.avg_ticket_nonflex - 1) * 100).toFixed(0) }}%)
              </span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Taxa de Adoção Flex</div>
            <div class="kpi-value kpi-highlight">
              {{ op?.orders_count ? ((data?.flex?.orders_count || 0) / op.orders_count * 100).toFixed(1) + '%' : '—' }}
            </div>
            <div class="kpi-sub">dos pedidos usam Flex</div>
          </div>
        </div>

        <!-- Gráfico diário de pedidos Flex -->
        <div class="chart-card q-mt-md" v-if="flexDailyData.length">
          <div class="chart-header">
            <div class="chart-title">
              <q-icon name="electric_bike" size="16px" class="q-mr-xs text-teal-7" />
              Pedidos Flex por Dia
            </div>
            <div class="chart-title muted" style="font-size:12px; font-weight:400">
              {{ data?.flex?.orders_count || 0 }} pedidos no período
            </div>
          </div>
          <!-- SVG bar chart -->
          <svg class="flex-bar-svg" :viewBox="`0 0 ${FLEX_W} ${FLEX_H}`" preserveAspectRatio="none">
            <!-- Grid lines -->
            <line v-for="(tick, i) in flexYTicks" :key="'fg'+i"
              :x1="FLEX_PAD" :y1="flexSvgY(tick)"
              :x2="FLEX_W - FLEX_PAD_R" :y2="flexSvgY(tick)"
              stroke="#e8edf3" stroke-width="1" stroke-dasharray="4 4" />
            <!-- X baseline -->
            <line :x1="FLEX_PAD" :y1="FLEX_H - FLEX_PAD_B"
              :x2="FLEX_W - FLEX_PAD_R" :y2="FLEX_H - FLEX_PAD_B"
              stroke="#e0e5ed" stroke-width="1.5" />
            <!-- Bars -->
            <g v-for="(d, i) in flexDailyData" :key="'fb'+i">
              <rect
                :x="flexBarX(i)"
                :y="flexSvgY(d.flex_orders_count)"
                :width="flexBarW"
                :height="Math.max(2, (FLEX_H - FLEX_PAD_B) - flexSvgY(d.flex_orders_count))"
                :fill="d.flex_orders_count > 0 ? '#0d9488' : '#e8edf3'"
                rx="2"
                opacity="0.85"
              />
              <!-- Value label on bar -->
              <text v-if="d.flex_orders_count > 0 && flexBarW > 20"
                :x="flexBarX(i) + flexBarW / 2"
                :y="flexSvgY(d.flex_orders_count) - 4"
                text-anchor="middle" font-size="9" fill="#0d9488" font-weight="600">
                {{ d.flex_orders_count }}
              </text>
            </g>
            <!-- X labels -->
            <text v-for="(d, i) in flexDailyData" :key="'fl'+i"
              v-show="showFlexXLabel(i)"
              :x="flexBarX(i) + flexBarW / 2"
              :y="FLEX_H - 2"
              text-anchor="middle" font-size="9" fill="#9aa0ac">
              {{ d.dateLabel }}
            </text>
            <!-- Y labels -->
            <text v-for="(tick, i) in flexYTicks" :key="'fy'+i"
              :x="FLEX_PAD - 4"
              :y="flexSvgY(tick) + 4"
              text-anchor="end" font-size="9" fill="#64748b">
              {{ tick }}
            </text>
          </svg>
        </div>

        <!-- Breakdown por conta -->
        <div class="table-card q-mt-md" v-if="flexByAccount.length">
          <div class="table-header-row">
            <div class="table-title">
              <q-icon name="store" size="14px" class="q-mr-xs text-teal-7" />
              Flex por Conta
            </div>
            <div class="muted" style="font-size:12px">
              Contas que utilizaram entrega Flex no período
            </div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th class="right">Pedidos Flex</th>
                  <th class="right">% dos pedidos</th>
                  <th class="right">Adoção</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in flexByAccount" :key="a.account_id">
                  <td class="bold">{{ a.account_nickname }}</td>
                  <td class="right kpi-highlight" style="font-weight:700">{{ a.flex_orders_count }}</td>
                  <td class="right">{{ pctRaw(a.flex_orders_count, data?.flex?.orders_count) }}</td>
                  <td class="right">
                    <div class="flex-bar-wrap">
                      <div class="flex-bar-fill"
                        :style="{ width: (a.orders_count ? Math.min(100, a.flex_orders_count / a.orders_count * 100) : 0) + '%' }">
                      </div>
                      <span>{{ a.orders_count ? (a.flex_orders_count / a.orders_count * 100).toFixed(1) + '%' : '—' }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="info-box q-mt-md">
          <q-icon name="info" size="16px" class="q-mr-xs" />
          O custo Flex é o valor estimado registrado no momento da venda (snapshot).
          Pedidos sem entrega Flex não são contabilizados aqui.
        </div>
      </div>

      <!-- ══════════ ABA: DIAS DA SEMANA ══════════════════════════════════ -->
      <div v-show="activeTab === 'semana'" class="tab-content">

        <!-- Seletor de métrica -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">
              <q-icon name="event_note" size="16px" class="q-mr-xs text-teal-7" />
              Padrão de Vendas por Dia da Semana
            </div>
            <div class="chart-metric-toggles">
              <select v-model="weekdayMetric" class="sort-select">
                <option value="gmv">GMV</option>
                <option value="orders_count">Pedidos</option>
                <option value="gross_profit">Margem de Contribuição</option>
                <option value="lucro_liquido">Lucro Após Ads</option>
                <option value="ads_cost">Ads</option>
              </select>
              <span class="muted" style="font-size:11px">Baseado nos últimos {{ weekdaySourceData.length }} dias carregados</span>
            </div>
          </div>

          <!-- Gráfico de barras: média por dia da semana -->
          <div v-if="weekdayAvgs.length">
            <svg class="weekday-avg-svg" viewBox="0 0 700 180" preserveAspectRatio="none">
              <line v-for="(t, i) in weekdayYTicks" :key="'wt'+i"
                x1="50" :y1="weekdayBarY(t)" x2="680" :y2="weekdayBarY(t)"
                stroke="#e8edf3" stroke-width="1" stroke-dasharray="4 4" />
              <line x1="50" y1="155" x2="680" y2="155" stroke="#e0e5ed" stroke-width="1.5" />
              <g v-for="(d, i) in weekdayAvgs" :key="'wa'+i">
                <rect
                  :x="50 + i * 90 + 10" :y="weekdayBarY(d.avg)"
                  :width="60"
                  :height="Math.max(2, 155 - weekdayBarY(d.avg))"
                  :fill="d.isTop ? '#0d9488' : '#cbd5e1'"
                  rx="4" />
                <text :x="50 + i * 90 + 40" :y="weekdayBarY(d.avg) - 5"
                  text-anchor="middle" font-size="10" :fill="d.isTop ? '#0d9488' : '#64748b'" font-weight="600">
                  {{ weekdayFmt(d.avg) }}
                </text>
                <text :x="50 + i * 90 + 40" y="170"
                  text-anchor="middle" font-size="11" fill="#374151" font-weight="600">
                  {{ d.label }}
                </text>
                <text :x="50 + i * 90 + 40" y="180"
                  text-anchor="middle" font-size="9" fill="#9aa0ac">
                  {{ d.count }}x
                </text>
              </g>
              <text v-for="(t, i) in weekdayYTicks" :key="'wyl'+i"
                x="44" :y="weekdayBarY(t) + 4"
                text-anchor="end" font-size="9" fill="#64748b">{{ weekdayFmt(t) }}</text>
            </svg>
          </div>
        </div>

        <!-- Comparar últimas N ocorrências de dias selecionados -->
        <div class="chart-card q-mt-md">
          <div class="chart-header">
            <div class="chart-title">
              <q-icon name="compare_arrows" size="16px" class="q-mr-xs text-teal-7" />
              Comparar Dias da Semana — últimas ocorrências
            </div>
            <div class="chart-metric-toggles" style="gap:6px;flex-wrap:wrap">
              <button v-for="(d, i) in WEEKDAYS" :key="d.key"
                :class="['wd-pill', weekdaySelected.includes(i) && 'wd-pill--on']"
                :style="weekdaySelected.includes(i) ? `background:${d.color}20;color:${d.color};border-color:${d.color}` : ''"
                @click="toggleWeekday(i)">
                {{ d.label }}
              </button>
              <select v-model="weekdayNCount" class="sort-select" style="min-width:100px">
                <option :value="5">Últimas 5</option>
                <option :value="8">Últimas 8</option>
                <option :value="10">Últimas 10</option>
                <option :value="13">Últimas 13</option>
              </select>
            </div>
          </div>

          <!-- Série temporal das últimas N ocorrências de cada dia selecionado -->
          <div v-if="weekdayCompareSvgSeries.length" class="weekday-compare-area">
            <svg class="weekday-compare-svg" :viewBox="`0 0 ${WD_W} ${WD_H}`" preserveAspectRatio="none">
              <defs>
                <linearGradient v-for="d in WEEKDAYS.filter((_, i) => weekdaySelected.includes(i))" :key="'wdg'+d.key"
                  :id="'wdgrad-'+d.key" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" :stop-color="d.color" stop-opacity="0.15" />
                  <stop offset="100%" :stop-color="d.color" stop-opacity="0" />
                </linearGradient>
              </defs>
              <!-- Grid -->
              <line v-for="(t, i) in wdYTicks" :key="'wdg'+i"
                :x1="WD_PAD" :y1="wdSvgY(t)"
                :x2="WD_W - 20" :y2="wdSvgY(t)"
                stroke="#e8edf3" stroke-width="1" stroke-dasharray="4 4" />
              <line :x1="WD_PAD" :y1="WD_H - 24" :x2="WD_W - 20" :y2="WD_H - 24" stroke="#e0e5ed" stroke-width="1.5" />

              <!-- Lines per selected weekday -->
              <template v-for="(ser, si) in weekdayCompareSvgSeries" :key="'wds'+si">
                <path :d="wdAreaPath(ser.points)" :fill="`url(#wdgrad-${ser.dayKey})`" />
                <path :d="wdLinePath(ser.points)" fill="none" :stroke="ser.color" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" />
                <!-- Dots -->
                <circle v-for="(pt, pi) in ser.points" :key="'wdpt'+pi"
                  :cx="pt.x" :cy="pt.y" r="3.5" :fill="ser.color" stroke="#fff" stroke-width="2" />
                <!-- X labels (last row) -->
                <text v-for="(pt, pi) in ser.points" :key="'wdxl'+pi"
                  :x="pt.x" :y="WD_H - 8"
                  text-anchor="middle" font-size="8.5" fill="#9aa0ac">{{ pt.label }}</text>
              </template>

              <!-- Y labels -->
              <text v-for="(t, i) in wdYTicks" :key="'wdyl'+i"
                :x="WD_PAD - 4" :y="wdSvgY(t) + 4"
                text-anchor="end" font-size="9" fill="#64748b">{{ weekdayFmt(t) }}</text>
            </svg>

            <!-- Legenda -->
            <div class="wd-legend">
              <div v-for="ser in weekdayCompareSvgSeries" :key="'wdl'+ser.dayKey" class="wd-legend-item">
                <span class="wd-legend-dot" :style="{ background: ser.color }"></span>
                <span>{{ ser.dayLabel }}</span>
                <span class="muted">avg: <strong>{{ weekdayFmt(ser.avg) }}</strong></span>
              </div>
            </div>
          </div>
          <div v-else class="chart-empty">Selecione pelo menos um dia acima</div>
        </div>

        <!-- Tabela detalhada das últimas N ocorrências -->
        <div class="table-card q-mt-md" v-if="weekdayTableRows.length">
          <div class="table-header-row">
            <div class="table-title">Últimas {{ weekdayNCount }} ocorrências por dia</div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Data</th>
                  <th>Dia</th>
                  <th class="right">GMV</th>
                  <th class="right">Pedidos</th>
                  <th class="right">Lucro</th>
                  <th class="right">Ads</th>
                  <th class="right">TACoS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in weekdayTableRows" :key="r.date"
                  :style="{ borderLeft: `3px solid ${WEEKDAYS[r.dow].color}` }">
                  <td class="rank">{{ r.rank }}</td>
                  <td>{{ r.dateLabel }}</td>
                  <td><span class="wd-day-badge" :style="{ background: WEEKDAYS[r.dow].color + '20', color: WEEKDAYS[r.dow].color }">{{ WEEKDAYS[r.dow].label }}</span></td>
                  <td class="right">{{ fmt(r.gmv) }}</td>
                  <td class="right">{{ r.orders_count }}</td>
                  <td class="right" :class="r.lucro_liquido >= 0 ? 'pos' : 'neg'">{{ fmt(r.lucro_liquido) }}</td>
                  <td class="right warn">{{ fmt(r.ads_cost) }}</td>
                  <td class="right">{{ r.gmv > 0 ? (r.ads_cost / r.gmv * 100).toFixed(1) + '%' : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- ══════════ ABA: SAZONALIDADE ══════════════════════════════════════ -->
      <div v-show="activeTab === 'sazonalidade' && activeMarketplace !== 'shopee'" class="tab-content">

        <div class="saz-intro">
          <q-icon name="compare_arrows" size="16px" class="q-mr-xs text-indigo-5" />
          Comparação do período selecionado com o <strong>mesmo período do ano anterior</strong>.
          Use o preset <strong>Mês</strong> para comparar este mês vs mês do ano passado.
        </div>

        <!-- KPI comparativo -->
        <div v-if="loadingLastYear" class="loading-center" style="min-height:120px">
          <q-spinner-dots color="teal" size="32px" />
        </div>
        <template v-else>
          <div class="saz-kpi-grid">
            <div class="saz-kpi-card" v-for="kpi in [
              { label: 'GMV',          curr: op?.gmv,          prev: lastYearOp?.gmv,          fmt: true },
              { label: 'Rec. Líquida', curr: op?.net_revenue,  prev: lastYearOp?.net_revenue,  fmt: true },
              { label: 'Margem de Contribuição',  curr: op?.gross_profit, prev: lastYearOp?.gross_profit, fmt: true },
              { label: 'Lucro Após Ads', curr: op?.lucro_liquido, prev: lastYearOp?.lucro_liquido, fmt: true },
              { label: 'Pedidos',      curr: op?.orders_count, prev: lastYearOp?.orders_count, fmt: false },
              { label: 'Ads',          curr: op?.ads_cost,     prev: lastYearOp?.ads_cost,     fmt: true },
            ]" :key="kpi.label">
              <div class="saz-kpi-label">{{ kpi.label }}</div>
              <div class="saz-kpi-row">
                <div class="saz-side">
                  <div class="saz-year-label">{{ new Date(dateTo).getFullYear() }}</div>
                  <div class="saz-value">{{ kpi.fmt ? fmt(kpi.curr) : (kpi.curr || 0).toLocaleString('pt-BR') }}</div>
                </div>
                <div class="saz-delta" v-if="lastYearOp">
                  <span :class="['saz-pct', yoyClass(yoyPct(kpi.curr || 0, kpi.prev || 0))]">
                    {{ yoyPct(kpi.curr || 0, kpi.prev || 0) !== null
                      ? (yoyPct(kpi.curr || 0, kpi.prev || 0) >= 0 ? '+' : '') + yoyPct(kpi.curr || 0, kpi.prev || 0) + '%'
                      : '—' }}
                  </span>
                  <div class="saz-arrow">vs {{ new Date(dateFrom).getFullYear() - 1 }}</div>
                </div>
                <div class="saz-side saz-side--prev" v-if="lastYearOp">
                  <div class="saz-year-label">{{ new Date(dateFrom).getFullYear() - 1 }}</div>
                  <div class="saz-value saz-value--prev">{{ kpi.fmt ? fmt(kpi.prev) : (kpi.prev || 0).toLocaleString('pt-BR') }}</div>
                </div>
                <div v-else class="saz-no-data">Sem dados do ano anterior</div>
              </div>
            </div>
          </div>

          <!-- Gráfico linha: atual vs ano anterior (GMV) -->
          <div class="chart-card q-mt-md" v-if="lastYearOp && chartData.length">
            <div class="chart-header">
              <div class="chart-title">
                <q-icon name="timeline" size="16px" class="q-mr-xs text-indigo-5" />
                GMV Diário — Ano Atual vs Ano Anterior
              </div>
            </div>
            <div class="saz-chart-wrap">
              <svg class="saz-chart" :viewBox="`0 0 ${SAZ_W} ${SAZ_H}`" preserveAspectRatio="none"
                @mousemove="onSazMouseMove" @mouseleave="sazHoveredIdx = -1">
                <defs>
                  <linearGradient id="saz-grad-curr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#6366f1" stop-opacity="0.18"/>
                    <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
                  </linearGradient>
                  <linearGradient id="saz-grad-prev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#94a3b8" stop-opacity="0.12"/>
                    <stop offset="100%" stop-color="#94a3b8" stop-opacity="0"/>
                  </linearGradient>
                </defs>

                <!-- Grid lines -->
                <line v-for="gl in sazGridLines" :key="gl" :x1="SAZ_PAD" :y1="gl" :x2="SAZ_W - SAZ_PAD" :y2="gl"
                  stroke="#e2e8f0" stroke-width="0.5" />

                <!-- Área ano anterior -->
                <path v-if="sazPathPrev" :d="sazPathPrev.area" fill="url(#saz-grad-prev)" />
                <path v-if="sazPathPrev" :d="sazPathPrev.line" fill="none" stroke="#94a3b8" stroke-width="1.5"
                  stroke-dasharray="4,3" stroke-linecap="round" />

                <!-- Área ano atual -->
                <path v-if="sazPathCurr" :d="sazPathCurr.area" fill="url(#saz-grad-curr)" />
                <path v-if="sazPathCurr" :d="sazPathCurr.line" fill="none" stroke="#6366f1" stroke-width="2"
                  stroke-linecap="round" />

                <!-- Legenda inline -->
                <line :x1="SAZ_PAD + 8" :y1="14" :x2="SAZ_PAD + 26" :y2="14" stroke="#6366f1" stroke-width="2"/>
                <text :x="SAZ_PAD + 30" y="18" font-size="9" fill="#6366f1" font-family="sans-serif">Ano atual</text>
                <line :x1="SAZ_PAD + 90" :y1="14" :x2="SAZ_PAD + 108" :y2="14" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,3"/>
                <text :x="SAZ_PAD + 112" y="18" font-size="9" fill="#94a3b8" font-family="sans-serif">Ano anterior</text>

                <!-- Tooltip crosshair -->
                <template v-if="sazHoveredIdx >= 0 && sazHoveredIdx < chartData.length">
                  <line :x1="sazXPos(sazHoveredIdx)" y1="20" :x2="sazXPos(sazHoveredIdx)" :y2="SAZ_H - 20"
                    stroke="#6366f1" stroke-width="0.8" stroke-dasharray="3,2" />
                </template>
              </svg>

              <!-- Tooltip box -->
              <div v-if="sazHoveredIdx >= 0 && sazHoveredIdx < chartData.length" class="saz-tooltip">
                <div class="saz-tt-date">{{ chartData[sazHoveredIdx]?.date }}</div>
                <div class="saz-tt-row">
                  <span class="saz-tt-dot" style="background:#6366f1"></span>
                  Atual: <strong>{{ fmt(chartData[sazHoveredIdx]?.gmv) }}</strong>
                </div>
                <div class="saz-tt-row" v-if="lastYearChartData[sazHoveredIdx]">
                  <span class="saz-tt-dot" style="background:#94a3b8"></span>
                  Anterior: <strong>{{ fmt(lastYearChartData[sazHoveredIdx]?.gmv) }}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Sem dados do ano anterior -->
          <div v-if="!lastYearOp" class="saz-empty">
            <q-icon name="history" size="36px" color="grey-5" />
            <div>Sem dados do ano anterior para o período selecionado.</div>
            <div class="muted">O SellerBot precisa ter dados históricos do mesmo período em {{ new Date(dateFrom).getFullYear() - 1 }} para exibir a comparação.</div>
          </div>
        </template>

          </div><!-- /tab sazonalidade -->

        </div><!-- /dash-content -->
      </div><!-- /dash-main-layout -->

    </template>

    <div v-else-if="!loading" class="empty-state">
      <q-icon name="bar_chart" size="48px" color="grey-5" />
      <div>Nenhum dado encontrado para o período.</div>
    </div>


  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import MercadoLivreService from 'src/services/MercadoLivreService'
import ShopeeService from 'src/services/ShopeeService'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import SbKpiGrid from 'src/components/common/SbKpiGrid.vue'
import DashboardHeader from 'src/components/dashboard/DashboardHeader.vue'
import FiltersDrawer from 'src/components/dashboard/FiltersDrawer.vue'

const $q = useQuasar()

// ── State ─────────────────────────────────────────────────────────────────
const loading = ref(false)
const data = ref(null)
const todayData = ref(null)
const shopeeData = ref(null)     // dados Shopee para o período
const shopeeTodayData = ref(null) // dados Shopee de hoje

// ── Layout ────────────────────────────────────────────────────────────────
const showFilters = ref($q.screen.gt.sm)  // aberto no desktop, fechado no mobile

// ── Multi-select account filter ─────────────────────────────────────────
const showAccountPicker = ref(false)
const selectedAccountKeys = ref([])  // e.g. ['ml:123', 'shopee:456']
const knownMlAccounts    = ref([])   // { key, id, marketplace, label, color }
const knownShopeeAccounts = ref([])

// Status do pedido (desativado — aguarda backend)
const activeStatuses = ref([])  // e.g. ['paid', 'pending']

// Nova paleta de cores — tons mais sóbrios e harmoniosos (Redesign Jul/2026)
const ACCOUNT_COLORS = ['#0f766e','#0284c7','#6366f1','#8b5cf6','#f59e0b','#64748b','#16a34a','#d97706','#0ea5e9','#94a3b8']

function buildAccountKey(marketplace, id) { return `${marketplace}:${id}` }

const allAccountKeys = computed(() => [
  ...knownMlAccounts.value.map(a => a.key),
  ...knownShopeeAccounts.value.map(a => a.key),
])

const allMlSelected    = computed(() => knownMlAccounts.value.length > 0 && knownMlAccounts.value.every(a => selectedAccountKeys.value.includes(a.key)))
const someMlSelected   = computed(() => knownMlAccounts.value.some(a => selectedAccountKeys.value.includes(a.key)))
const allShopeeSelected = computed(() => knownShopeeAccounts.value.length > 0 && knownShopeeAccounts.value.every(a => selectedAccountKeys.value.includes(a.key)))
const someShopeeSelected = computed(() => knownShopeeAccounts.value.some(a => selectedAccountKeys.value.includes(a.key)))

const isComparativeMode = computed(() => selectedAccountKeys.value.length > 1)

// Active marketplaces derived from selection (empty = all)
const activeMarketplaces = computed(() => {
  if (selectedAccountKeys.value.length === 0 || selectedAccountKeys.value.length === allAccountKeys.value.length) return ['ml', 'shopee']
  const set = new Set(selectedAccountKeys.value.map(k => k.split(':')[0]))
  return [...set]
})

// Legacy activeMarketplace for tabs that still use it (sazonalidade, etc.)
const activeMarketplace = computed(() => {
  const mps = activeMarketplaces.value
  if (mps.includes('ml') && mps.includes('shopee')) return 'all'
  return mps[0] || 'all'
})

function accountColor(key) {
  const all = allAccountKeys.value
  const idx = all.indexOf(key)
  return ACCOUNT_COLORS[idx >= 0 ? idx % ACCOUNT_COLORS.length : 0]
}

function accountLabel(key) {
  const ml = knownMlAccounts.value.find(a => a.key === key)
  if (ml) return ml.label
  const sh = knownShopeeAccounts.value.find(a => a.key === key)
  if (sh) return sh.label
  return key
}

function toggleAllMl() {
  if (allMlSelected.value) {
    selectedAccountKeys.value = selectedAccountKeys.value.filter(k => !k.startsWith('ml:'))
  } else {
    const mlKeys = knownMlAccounts.value.map(a => a.key)
    selectedAccountKeys.value = [...new Set([...selectedAccountKeys.value, ...mlKeys])]
  }
  onFilterChange()
}

function toggleAllShopee() {
  if (allShopeeSelected.value) {
    selectedAccountKeys.value = selectedAccountKeys.value.filter(k => !k.startsWith('shopee:'))
  } else {
    const shopeeKeys = knownShopeeAccounts.value.map(a => a.key)
    selectedAccountKeys.value = [...new Set([...selectedAccountKeys.value, ...shopeeKeys])]
  }
  onFilterChange()
}

function onFilterChange() {
  // Sem chamada à API — todos os computeds (filteredMlOp, filteredMlDaily, chartData)
  // já reagem ao selectedAccountKeys. Só precisa re-renderizar o Plotly.
  renderPlotlyChart()
}

// Handler para mudança de contas selecionadas (usado pelos novos componentes)
function onSelectedKeysChange(keys) {
  selectedAccountKeys.value = keys
  onFilterChange()
}

// Limpar todos os filtros
function clearFilters() {
  activeDatePreset.value = '30d'
  applyPreset('30d')
  selectedAccountKeys.value = [...allAccountKeys.value]
  activeStatuses.value = []  // Reset status (desativado — aguarda backend)
  onFilterChange()
}

// ── DRE ───────────────────────────────────────────────────────────────────

// ── Plotly ────────────────────────────────────────────────────────────────
const plotlyContainer    = ref(null)
const chartLoading       = ref(false)
const chartMode          = ref('metrics')        // 'metrics' | 'per_account'
const chartAccountMetric = ref('gmv')            // which metric to compare across accounts
const chartVisibleAccounts = ref([])             // account keys visible in per_account mode
const chartShowTotal     = ref(true)             // show dashed total line in per_account mode
const accountDailyData   = ref({})               // { 'ml:123': [{date, gmv, ...}] }
const loadingAccountData = ref(false)
const weekdayChartMetric = ref('gmv')            // metric for weekday bar chart mode
let plotlyLoaded = false

const loadPlotly = () => new Promise((resolve) => {
  if (plotlyLoaded || window.Plotly) { plotlyLoaded = true; resolve(); return }
  const script = document.createElement('script')
  script.src = 'https://cdn.plot.ly/plotly-basic-3.0.0.min.js'
  script.onload = () => { plotlyLoaded = true; resolve() }
  document.head.appendChild(script)
})

// ── Ranking ────────────────────────────────────────────────────────────────
const rankingSortKey = ref('gmv')

// ── Expandable daily table rows ───────────────────────────────────────────
const expandedDays = ref(new Set())
function toggleDayExpand(date) {
  const s = new Set(expandedDays.value)
  if (s.has(date)) s.delete(date)
  else s.add(date)
  expandedDays.value = s
}

// Per-account breakdown for a given date
function dayAccountRows(date) {
  const rows = []
  const selected = new Set(selectedAccountKeys.value)
  for (const a of knownMlAccounts.value) {
    if (!selected.has(a.key)) continue
    const day = (accountDailyData.value[a.key] || []).find(d => d.date === date)
    if (day && (day.gmv || day.orders_count)) {
      rows.push({ ...day, label: a.label, color: a.color, marketplace: 'ml' })
    }
  }
  for (const a of knownShopeeAccounts.value) {
    if (!selected.has(a.key)) continue
    const shopeeAccountDaily = accountDailyData.value[a.key] || []
    const day = shopeeAccountDaily.find(d => d.date === date)
    if (day && (day.gmv || day.orders_count)) {
      rows.push({ ...day, label: a.label, color: a.color, marketplace: 'shopee' })
    }
  }
  return rows
}

// ── Legacy compat (kept for tabs/sazonalidade that reference these) ──────
const hoveredIdx = ref(null)
const activeTab = ref('evolucao')
const activeMetrics = ref(['gmv', 'lucro_liquido'])
const activeDatePreset = ref('30d')
const normalizeChart = ref(false)
const topGroupBy = ref('item')
const topSortBy = ref('gross_profit')

// kept for loadLastYear compat
const selectedAccountId = computed(() => {
  const mlKeys = selectedAccountKeys.value.filter(k => k.startsWith('ml:'))
  if (mlKeys.length === 1 && knownMlAccounts.value.length > 1) return mlKeys[0].replace('ml:', '')
  return null
})
const knownAccounts = knownMlAccounts  // alias

// ── Per-account filtered aggregates (respects selectedAccountKeys) ────────

// Filtered ML operation: sums only selected ML accounts from data.value?.accounts
const filteredMlOp = computed(() => {
  if (!data.value) return null
  const accounts = data.value.accounts || []
  const mlKeys = selectedAccountKeys.value.filter(k => k.startsWith('ml:'))
  const allMlKeys = knownMlAccounts.value.map(a => a.key)
  // Nenhuma conta ML na seleção → sem dados ML
  if (!mlKeys.length) return null
  // Todas ML selecionadas ou sem breakdown por conta → usa agregado da API
  if (mlKeys.length === allMlKeys.length || !accounts.length) {
    return data.value.operation || null
  }
  // Partial selection (1 or more accounts) → sum from per-account data
  const selectedIds = new Set(mlKeys.map(k => k.replace('ml:', '')))
  const selected = accounts.filter(a => selectedIds.has(String(a.account_id)))
  if (!selected.length) return data.value.operation || null
  const s = (f) => selected.reduce((acc, a) => acc + (a[f] || 0), 0)
  const gmv = s('gmv'), net = s('net_revenue'), gp = s('gross_profit')
  const ads = s('ads_cost'), orders = s('orders_count'), units = s('units_sold')
  const ll = selected.reduce((acc, a) => acc + (a.lucro_liquido != null ? a.lucro_liquido : (a.gross_profit || 0) - (a.ads_cost || 0)), 0)
  return {
    gmv, net_revenue: net, gross_profit: gp, ads_cost: ads, lucro_liquido: ll,
    orders_count: orders, units_sold: units,
    avg_ticket: orders ? +(gmv / orders).toFixed(2) : null,
    total_fees: +(gmv - net).toFixed(2), cmv_total: s('cmv_total'),
    lucro_liquido_pct: net ? +(ll / net * 100).toFixed(2) : null,
    gross_margin_pct: net ? +(gp / net * 100).toFixed(2) : null,
    roas: ads ? +(gmv / ads).toFixed(2) : null,
    acos: gmv ? +(ads / gmv * 100).toFixed(2) : null,
    tacos: gmv ? +(ads / gmv * 100).toFixed(2) : null,
    canceled_count: s('canceled_count'),
    catalog_orders_count: s('catalog_orders_count'),
    flex_orders_count: s('flex_orders_count'),
    vs_prev: null,
  }
})

// Filtered Shopee operation: sums only selected Shopee accounts
const filteredShopeeOp = computed(() => {
  if (!shopeeData.value) return null
  const byAccount = shopeeData.value.by_account || []
  const shopeeKeys = selectedAccountKeys.value.filter(k => k.startsWith('shopee:'))
  const allShopeeKeys = knownShopeeAccounts.value.map(a => a.key)
  // Nenhuma conta Shopee na seleção → sem dados Shopee
  if (!shopeeKeys.length) return null
  // Todas Shopee selecionadas ou sem breakdown por conta → usa agregado
  if (shopeeKeys.length === allShopeeKeys.length || !byAccount.length) {
    return shopeeData.value || null
  }
  const selectedIds = new Set(shopeeKeys.map(k => k.replace('shopee:', '')))
  const selected = byAccount.filter(a => selectedIds.has(String(a.account_id)))
  if (!selected.length) return null
  const s = (f) => selected.reduce((acc, a) => acc + (a[f] || 0), 0)
  const gmv = s('gmv'), net = s('net_revenue'), gp = s('gross_profit'), orders = s('orders_count')
  const ads = s('ads_cost'), ll = s('lucro_liquido')
  return { gmv, net_revenue: net, gross_profit: gp, ads_cost: ads, lucro_liquido: ll || null, orders_count: orders, avg_ticket: orders ? +(gmv / orders).toFixed(2) : null, units_sold: 0, by_account: selected }
})

// Filtered ML daily: sums selected accounts from accountDailyData (when partial multi-account selection)
const filteredMlDaily = computed(() => {
  const mlKeys = selectedAccountKeys.value.filter(k => k.startsWith('ml:'))
  const allMlKeys = knownMlAccounts.value.map(a => a.key)
  const hasAccountData = Object.keys(accountDailyData.value).length > 0
  // Nenhuma conta ML na seleção → sem dados diários ML
  if (!mlKeys.length) return []
  // Todas ML selecionadas ou sem dados por conta ainda → usa agregado da API
  if (mlKeys.length === allMlKeys.length || !hasAccountData) {
    return data.value?.daily || []
  }
  // Partial selection (1 or more accounts) → sum from accountDailyData for selected accounts only
  const byDate = {}
  for (const key of mlKeys) {
    for (const d of (accountDailyData.value[key] || [])) {
      if (!byDate[d.date]) byDate[d.date] = { date: d.date, gmv: 0, net_revenue: 0, gross_profit: 0, ads_cost: 0, lucro_liquido: 0, orders_count: 0 }
      byDate[d.date].gmv           += d.gmv || 0
      byDate[d.date].net_revenue   += d.net_revenue || 0
      byDate[d.date].gross_profit  += d.gross_profit || 0
      byDate[d.date].ads_cost      += d.ads_cost || 0
      byDate[d.date].lucro_liquido += d.lucro_liquido || 0
      byDate[d.date].orders_count  += d.orders_count || 0
    }
  }
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
})

// Filtered Shopee daily: mesma lógica do filteredMlDaily mas para contas Shopee
const filteredShopeeDaily = computed(() => {
  const shopeeKeys = selectedAccountKeys.value.filter(k => k.startsWith('shopee:'))
  const allShopeeKeys = knownShopeeAccounts.value.map(a => a.key)
  const hasAccountData = Object.keys(accountDailyData.value).length > 0
  if (!shopeeKeys.length) return []
  // Todas selecionadas ou dados ainda não carregados → usa agregado
  if (shopeeKeys.length === allShopeeKeys.length || !hasAccountData) {
    return shopeeData.value?.daily || []
  }
  // Seleção parcial → soma apenas as contas selecionadas usando dados por conta
  const byDate = {}
  for (const key of shopeeKeys) {
    for (const d of (accountDailyData.value[key] || [])) {
      if (!byDate[d.date]) byDate[d.date] = { date: d.date, gmv: 0, net_revenue: 0, gross_profit: 0, ads_cost: 0, lucro_liquido: 0, orders_count: 0 }
      byDate[d.date].gmv           += d.gmv || 0
      byDate[d.date].net_revenue   += d.net_revenue || 0
      byDate[d.date].gross_profit  += d.gross_profit || 0
      byDate[d.date].ads_cost      += d.ads_cost || 0
      byDate[d.date].lucro_liquido += d.lucro_liquido ?? d.gross_profit ?? 0
      byDate[d.date].orders_count  += d.orders_count || 0
    }
  }
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
})

const today = new Date()
// Usa data local (não UTC) para evitar problema de fuso horário
// toISOString() retorna UTC, o que em UTC-3 pode dar o dia seguinte após 21h
const fmtDate = d => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const dateFrom = ref(fmtDate(new Date(today - 29 * 86400000)))
const dateTo = ref(fmtDate(today))

// Rótulo do período para exibir nos KPI cards
const periodLabel = computed(() => {
  if (activeDatePreset.value === 'hoje') return 'Hoje'
  const from = new Date(dateFrom.value + 'T12:00:00')
  const to   = new Date(dateTo.value   + 'T12:00:00')
  const days = Math.round((to - from) / 86400000) + 1
  const fmt2 = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  if (dateFrom.value === dateTo.value) return fmt2(from)
  return `${days}d · ${fmt2(from)} → ${fmt2(to)}`
})

// ── Config ────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'evolucao',    label: 'Evolução',       icon: 'show_chart' },
  { key: 'ranking',     label: 'Ranking Contas', icon: 'leaderboard' },
  { key: 'dre',         label: 'DRE-Aprox.',     icon: 'account_balance' },
  { key: 'contas',      label: 'Contas & CNPJ',  icon: 'storefront' },
  { key: 'produtos',    label: 'Top Produtos',   icon: 'inventory_2' },
  { key: 'flex',        label: 'Flex Delivery',  icon: 'electric_bike' },
  { key: 'semana',      label: 'Dias da Semana', icon: 'event_note' },
  { key: 'sazonalidade',label: 'Sazonalidade',   icon: 'compare_arrows' },
]

const chartMetrics = [
  { key: 'gmv', label: 'GMV', color: '#6366f1' },           // indigo
  { key: 'net_revenue', label: 'Rec. Líquida', color: '#0284c7' },  // sky-600
  { key: 'gross_profit', label: 'Margem de Contribuição', color: '#16a34a' },  // green-600
  { key: 'lucro_liquido', label: 'Lucro Após Ads', color: '#0f766e' },  // teal-700
  { key: 'ads_cost', label: 'Ads', color: '#f59e0b' },       // amber
]

const datePresets = [
  { key: 'hoje',     label: 'Hoje' },
  { key: '7d',       label: '7d' },
  { key: '14d',      label: '14d' },
  { key: '30d',      label: '30d' },
  { key: '90d',      label: '90d' },
  { key: 'mes',      label: 'Mês' },
  { key: 'mes_ant',  label: 'Mês ant.' },
]

// ── SVG chart constants ────────────────────────────────────────────────────
const SVG_W = 900
const SVG_H = 300
// x1 = 845 deixa 55px à direita para o eixo do Ads
const PLOT = { x0: 62, x1: 845, y0: 14, y1: 272 }

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

const metricStats = computed(() => {
  if (!chartData.value.length) return {}
  const result = {}
  for (const m of chartMetrics) {
    const vals = chartData.value.map(d => d[m.key] || 0)
    result[m.key] = { min: Math.min(...vals), max: Math.max(...vals) }
  }
  return result
})

// Ascendente (esquerda = mais antigo) — usado no gráfico
// Mescla dados diários ML + Shopee por data
const chartData = computed(() => {
  const hasShopeeSelected = selectedAccountKeys.value.some(k => k.startsWith('shopee:'))
  const mlDaily     = filteredMlDaily.value
  const shopeeDaily = hasShopeeSelected ? filteredShopeeDaily.value : []

  // Indexa por data e soma os campos
  const byDate = {}
  for (const d of mlDaily) {
    byDate[d.date] = {
      date:          d.date,
      gmv:           d.gmv || 0,
      net_revenue:   d.net_revenue || 0,
      gross_profit:  d.gross_profit || 0,
      ads_cost:      d.ads_cost || 0,
      lucro_liquido: d.lucro_liquido || 0,
      orders_count:  d.orders_count || 0,
    }
  }
  for (const d of shopeeDaily) {
    if (byDate[d.date]) {
      byDate[d.date].gmv          += d.gmv || 0
      byDate[d.date].net_revenue  += d.net_revenue || 0
      byDate[d.date].gross_profit  = (byDate[d.date].gross_profit || 0) + (d.gross_profit || 0)
      byDate[d.date].ads_cost     += d.ads_cost || 0
      byDate[d.date].lucro_liquido = (byDate[d.date].lucro_liquido || 0) + (d.lucro_liquido ?? d.gross_profit ?? 0)
      byDate[d.date].orders_count += d.orders_count || 0
    } else {
      byDate[d.date] = {
        date:          d.date,
        gmv:           d.gmv || 0,
        net_revenue:   d.net_revenue || 0,
        gross_profit:  d.gross_profit || 0,
        ads_cost:      d.ads_cost || 0,
        lucro_liquido: d.lucro_liquido ?? d.gross_profit ?? 0,
        orders_count:  d.orders_count || 0,
      }
    }
  }

  return Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ ...d, dateLabel: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }))
})

// Descendente (mais recente primeiro) — usado na tabela
const chartDataDesc = computed(() => [...chartData.value].reverse())

// Produtos ordenados pelo critério selecionado.
// Feedback #13: inclui os produtos Shopee (que ficavam fora do ranking).
const topProductsSorted = computed(() => {
  const ml = activeMarketplace.value !== 'shopee' ? (data.value?.top_products || []) : []
  const sh = activeMarketplace.value !== 'ml' ? (shopeeData.value?.top_products || []) : []
  const prods = [...ml, ...sh]
  return prods.sort((a, b) => (b[topSortBy.value] || 0) - (a[topSortBy.value] || 0))
})

// Flex: dados diários com flex_orders_count
const flexDailyData = computed(() => {
  const daily = filteredMlDaily.value
  return daily
    .map(d => ({
      ...d,
      flex_orders_count: d.flex_orders_count || 0,
      dateLabel: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    }))
    .filter(d => true)  // incluir todos os dias mesmo com 0
})

// Flex: breakdown por conta (apenas contas com flex > 0)
const flexByAccount = computed(() => {
  return (data.value?.accounts || [])
    .filter(a => a.flex_orders_count > 0)
    .sort((a, b) => b.flex_orders_count - a.flex_orders_count)
})

// ── Flex bar chart constants ───────────────────────────────────────────────
const FLEX_W    = 900
const FLEX_H    = 200
const FLEX_PAD  = 40   // esquerda
const FLEX_PAD_R = 20  // direita
const FLEX_PAD_B = 24  // baixo

const flexYMax = computed(() => {
  const max = Math.max(...flexDailyData.value.map(d => d.flex_orders_count), 1)
  return Math.ceil(max * 1.2) || 1
})

const flexYTicks = computed(() => {
  const max = flexYMax.value
  return [max, Math.round(max * 0.5), 0]
})

const flexBarW = computed(() => {
  const n = flexDailyData.value.length
  if (!n) return 10
  const totalW = FLEX_W - FLEX_PAD - FLEX_PAD_R
  return Math.max(2, totalW / n * 0.7)
})

function flexBarX(i) {
  const n = flexDailyData.value.length
  if (!n) return FLEX_PAD
  const totalW = FLEX_W - FLEX_PAD - FLEX_PAD_R
  const step = totalW / n
  return FLEX_PAD + i * step + step * 0.15
}

function flexSvgY(val) {
  const ratio = Math.min(1, Math.max(0, (val || 0) / flexYMax.value))
  const plotH = FLEX_H - FLEX_PAD_B - 10
  return (FLEX_H - FLEX_PAD_B) - ratio * plotH
}

function showFlexXLabel(i) {
  const n = flexDailyData.value.length
  if (n <= 14) return true
  if (n <= 31) return i % 3 === 0 || i === n - 1
  return i % 7 === 0 || i === n - 1
}

// Eixo esquerdo — exclui ads_cost (que tem escala própria à direita)
const LEFT_KEYS = ['gmv', 'net_revenue', 'gross_profit', 'lucro_liquido']

const chartYMax = computed(() => {
  if (normalizeChart.value) return 100
  if (!chartData.value.length) return 1
  let max = 0
  for (const d of chartData.value)
    for (const key of activeMetrics.value.filter(k => LEFT_KEYS.includes(k)))
      max = Math.max(max, d[key] || 0)
  return max || 1
})

const chartYMin = computed(() => {
  if (normalizeChart.value) return 0
  if (!chartData.value.length) return 0
  let min = Infinity
  for (const d of chartData.value)
    for (const key of activeMetrics.value.filter(k => LEFT_KEYS.includes(k)))
      if ((d[key] || 0) > 0) min = Math.min(min, d[key])
  if (!isFinite(min)) return 0
  const floor = Math.max(0, min * 0.85)
  return (chartYMax.value - floor) / chartYMax.value > 0.15 ? floor : 0
})

const chartYRange = computed(() => chartYMax.value - chartYMin.value || 1)

const svgYTicks = computed(() => {
  const min = chartYMin.value
  const max = chartYMax.value
  return [max, min + (max - min) * 0.75, min + (max - min) * 0.5, min + (max - min) * 0.25, min]
    .map(v => Math.round(v))
})

// Eixo direito — exclusivo para ads_cost
const adsActive = computed(() => activeMetrics.value.includes('ads_cost') && !normalizeChart.value)

const adsYMax = computed(() => {
  if (!chartData.value.length) return 1
  let max = 0
  for (const d of chartData.value) max = Math.max(max, d.ads_cost || 0)
  return max * 1.25 || 1  // 25% headroom
})

const adsYRange = computed(() => adsYMax.value || 1)

const svgYTicksRight = computed(() => {
  if (!adsActive.value) return []
  const max = adsYMax.value
  return [max, max * 0.75, max * 0.5, max * 0.25, 0].map(v => Math.round(v))
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

function plotVal(metric, rawValue) {
  if (!normalizeChart.value) return rawValue || 0
  const stats = metricStats.value[metric]
  if (!stats) return 0
  const span = stats.max - stats.min
  if (span === 0) return 50
  return ((rawValue || 0) - stats.min) / span * 100
}

function svgY(val) {
  const ratio = Math.min(1, Math.max(0, ((val || 0) - chartYMin.value) / chartYRange.value))
  return PLOT.y1 - ratio * (PLOT.y1 - PLOT.y0)
}

function svgYRight(val) {
  const ratio = Math.min(1, Math.max(0, (val || 0) / adsYRange.value))
  return PLOT.y1 - ratio * (PLOT.y1 - PLOT.y0)
}

// Despacha para o eixo correto (esq vs dir) conforme a métrica
function svgYForMetric(metric, rawVal) {
  if (metric === 'ads_cost' && !normalizeChart.value) return svgYRight(rawVal || 0)
  return svgY(plotVal(metric, rawVal))
}

function svgPoints(metric) {
  return chartData.value.map((d, i) => `${svgXAt(i)},${svgYForMetric(metric, d[metric] || 0)}`).join(' ')
}

function svgAreaPath(metric) {
  const n = chartData.value.length
  if (!n) return ''
  const pts = chartData.value.map((d, i) => `${svgXAt(i)},${svgYForMetric(metric, d[metric] || 0)}`)
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
let _loadTimer = null
function debouncedLoad() {
  clearTimeout(_loadTimer)
  _loadTimer = setTimeout(() => load(), 350)
}

async function load() {
  loading.value = true
  try {
    const base = { date_from: dateFrom.value, date_to: dateTo.value, group_by: topGroupBy.value }

    // Always fetch all ML data so data.value?.accounts has per-account info for filtering
    // (filtering by account is done in computed properties: filteredMlOp, filteredMlDaily)
    const mlParams = { ...base }

    // Only call ML if ml accounts are in selection (or no selection = all)
    const wantMl     = activeMarketplaces.value.includes('ml')
    const wantShopee = activeMarketplaces.value.includes('shopee')

    const [mlRes, shopeeRes] = await Promise.allSettled([
      wantMl     ? MercadoLivreService.getDashboardOperation(mlParams) : Promise.resolve(null),
      wantShopee ? ShopeeService.getDashboardStats({ date_from: dateFrom.value, date_to: dateTo.value }) : Promise.resolve(null),
    ])
    data.value       = (mlRes.status === 'fulfilled' && mlRes.value) ? mlRes.value.data : null
    shopeeData.value = (shopeeRes.status === 'fulfilled' && shopeeRes.value) ? shopeeRes.value.data : null

    // Build/update known accounts list from full API response
    if (data.value?.accounts?.length) {
      knownMlAccounts.value = data.value.accounts.map((a, i) => ({
        key: buildAccountKey('ml', a.account_id),
        id: a.account_id,
        marketplace: 'ml',
        label: a.account_nickname,
        color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
      }))
    }
    if (shopeeData.value?.by_account?.length) {
      const offset = knownMlAccounts.value.length
      knownShopeeAccounts.value = shopeeData.value.by_account.map((a, i) => ({
        key: buildAccountKey('shopee', a.account_id),
        id: a.account_id,
        marketplace: 'shopee',
        label: a.shop_name,
        color: ACCOUNT_COLORS[(offset + i) % ACCOUNT_COLORS.length],
      }))
    }

    // Initialize selectedAccountKeys on first load (select all)
    if (selectedAccountKeys.value.length === 0 && allAccountKeys.value.length > 0) {
      selectedAccountKeys.value = [...allAccountKeys.value]
    }
    // Sync chartVisibleAccounts with known accounts on first load
    if (chartVisibleAccounts.value.length === 0 && allChartAccounts.value.length > 0) {
      chartVisibleAccounts.value = allChartAccounts.value.map(a => a.key)
    }

    // Padrão: modo Per Conta quando há múltiplas contas, Agregado quando há só uma
    if (allChartAccounts.value.length > 1 && chartMode.value === 'metrics') {
      chartMode.value = 'per_account'
    } else if (allChartAccounts.value.length <= 1) {
      chartMode.value = 'metrics'
    }

    // Carrega dados do ano anterior (sazonalidade)
    if (activeMarketplace.value !== 'shopee') loadLastYear()

    // Sempre carrega dados por conta para per_account mode e filtros reativos
    loadAccountDailyData()

    // Render Plotly chart after data arrives
    await nextTick()
    renderPlotlyChart()
  } catch (e) {
    console.error('Dashboard error', e)
    data.value = null
  } finally {
    loading.value = false
  }
}

async function loadToday() {
  try {
    // Passa as contas ML selecionadas como filtro (consistente com DashboardDailyView).
    // Se nenhuma conta ML estiver selecionada, o backend retorna sem filtro (= todas).
    const mlKeys = selectedAccountKeys.value.filter(k => k.startsWith('ml:'))
    const allMlKeys = knownMlAccounts.value.map(a => a.key)
    // Só envia filtro quando for uma seleção PARCIAL — evita chamadas desnecessárias
    // quando o usuário tem todas as contas marcadas (cenário padrão).
    const isPartial = mlKeys.length > 0 && mlKeys.length < allMlKeys.length
    const accountParam = isPartial
      ? mlKeys.map(k => k.split(':')[1]).join(',')
      : ''

    const params = accountParam ? { account: accountParam } : {}

    // Idem para Shopee. O endpoint /shopee/orders/today_stats/ lê os IDs via
    // request.query_params.getlist('account'), que exige a MESMA chave repetida
    // (?account=1&account=2) — por isso usamos URLSearchParams em vez de um
    // array no objeto de params (axios serializaria como account[]=1&account[]=2,
    // que o getlist('account') do Django não enxerga).
    const shopeeKeys = selectedAccountKeys.value.filter(k => k.startsWith('shopee:'))
    const allShopeeKeys = knownShopeeAccounts.value.map(a => a.key)
    const isShopeePartial = shopeeKeys.length > 0 && shopeeKeys.length < allShopeeKeys.length
    let shopeeParams = {}
    if (isShopeePartial) {
      const usp = new URLSearchParams()
      shopeeKeys.forEach(k => usp.append('account', k.split(':')[1]))
      shopeeParams = usp
    }

    const [mlRes, shopeeRes] = await Promise.allSettled([
      MercadoLivreService.getDashboardToday(params),
      ShopeeService.getTodayStats(shopeeParams),
    ])
    todayData.value      = mlRes.status === 'fulfilled' ? mlRes.value.data : null
    shopeeTodayData.value = shopeeRes.status === 'fulfilled' ? shopeeRes.value.data : null
  } catch (e) {
    console.error('Today data error', e)
  }
}

// ── Dados combinados (ML + Shopee) ────────────────────────────────────────

// Filtra o hoje do ML pelas contas selecionadas usando o breakdown por conta.
// O backend (DashboardTodayView) já filtra os totais quando recebe o param `account`
// via loadToday(), então em geral `ml.accounts` já contém só as contas selecionadas
// e `ml.gmv` etc. já são os totais filtrados — neste caso retorna `ml` direto.
// Este filtro client-side existe como fallback para o caso de race condition
// entre load() e loadToday() (ex: knownMlAccounts ainda vazio quando loadToday roda).
function mlFilteredToday(ml) {
  if (!ml) return null
  const mlKeys = selectedAccountKeys.value.filter(k => k.startsWith('ml:'))
  const totalMl = knownMlAccounts.value.length
  // Sem filtro, todas selecionadas, ou knownMlAccounts ainda vazio → ml direto
  if (mlKeys.length === 0 || mlKeys.length >= totalMl) return ml
  const selectedIds = new Set(mlKeys.map(k => k.split(':')[1]))
  const mlAccounts = ml.accounts || []
  const accounts = mlAccounts.filter(a => selectedIds.has(String(a.account_id)))
  // Se accounts tem o mesmo tamanho de ml.accounts, o backend JÁ filtrou
  // (ou todas as contas do backend correspondem à seleção) → ml direto
  if (accounts.length === mlAccounts.length) return ml
  // Senão, backend retornou mais contas do que a seleção (race condition
  // ou cache antigo) → aplica filtro client-side somando os campos
  const sum = (field) => accounts.reduce((s, a) => s + (a[field] || 0), 0)
  return {
    ...ml,
    gmv:           sum('gmv'),
    total_fees:    sum('total_fees'),
    net_revenue:   sum('net_revenue'),
    cmv_total:     sum('cmv_total'),
    units_sold:    sum('units_sold'),
    gross_profit:  sum('gross_profit'),
    ads_cost:      sum('ads_cost'),
    lucro_liquido: sum('lucro_liquido'),
    orders_count:  sum('orders_count'),
    avg_ticket:    null,
  }
}

const combinedToday = computed(() => {
  const ml = todayData.value
  const sh = shopeeTodayData.value
  if (activeMarketplace.value === 'ml')     return mlFilteredToday(ml)
  if (activeMarketplace.value === 'shopee') return sh ? shopeeToMLFormat(sh) : null

  // all: soma ML filtrado + Shopee
  if (!ml && !sh) return null
  const fml = mlFilteredToday(ml)
  return {
    gmv:           (fml?.gmv || 0) + (sh?.gmv || 0),
    orders_count:  (fml?.orders_count || 0) + (sh?.count_paid || 0),
    net_revenue:   (fml?.net_revenue || 0) + (sh?.faturamento || 0),
    gross_profit:  (fml?.gross_profit || 0) + (sh?.lucro_apos_cmp || 0),
    lucro_liquido: (fml?.lucro_liquido || 0) + (sh?.lucro_apos_cmp || 0),
    units_sold:    (fml?.units_sold || 0),
    avg_ticket:    null,
    _ml: fml,
    _shopee: sh,
  }
})

function shopeeToMLFormat(sh) {
  return {
    gmv:          sh.gmv || 0,          // GMV bruto (total_amount), consistente com dashboard_stats
    orders_count: sh.count_paid || 0,
    net_revenue:  sh.faturamento || 0,  // receita líquida (escrow real ou estimado)
    gross_profit: sh.lucro_apos_cmp || 0,
    lucro_liquido: sh.lucro_apos_cmp || 0,
    units_sold:   0,
    avg_ticket:   null,
  }
}

// KPIs mesclados: quando preset=hoje usa combinedToday, senão usa ML + shopeeData somados
const combinedOp = computed(() => {
  if (activeDatePreset.value === 'hoje' && combinedToday.value) {
    const d = combinedToday.value
    const ll_pct = d.net_revenue ? +(d.lucro_liquido / d.net_revenue * 100).toFixed(2) : null
    const gm_pct = d.net_revenue ? +(d.gross_profit / d.net_revenue * 100).toFixed(2) : null
    return { ...d, lucro_liquido_pct: ll_pct, gross_margin_pct: gm_pct, roas: null, acos: null, catalog_orders_count: 0, flex_orders_count: 0, canceled_count: null, vs_prev: null }
  }

  const ml = activeMarketplace.value !== 'shopee' ? filteredMlOp.value    : null
  const sh = activeMarketplace.value !== 'ml'     ? filteredShopeeOp.value : null

  if (!ml && !sh) return null
  if (!sh) return ml
  if (!ml) return {
    gmv:          sh.gmv,
    net_revenue:  sh.net_revenue,
    gross_profit: sh.gross_profit || 0,
    lucro_liquido: sh.lucro_liquido ?? sh.gross_profit ?? 0,
    orders_count: sh.orders_count,
    avg_ticket:   sh.avg_ticket,
    units_sold:   sh.units_sold,
    ads_cost:     sh.ads_cost || 0,
    affiliate_cost: sh.affiliate_cost || 0,
    total_fees:   0,
    cmv_total:    0,
    lucro_liquido_pct: sh.net_revenue ? +((sh.lucro_liquido ?? sh.gross_profit ?? 0) / sh.net_revenue * 100).toFixed(2) : null,
    gross_margin_pct:  null,
    vs_prev: null,
  }

  return {
    gmv:           (ml.gmv || 0) + (sh.gmv || 0),
    net_revenue:   (ml.net_revenue || 0) + (sh.net_revenue || 0),
    gross_profit:  (ml.gross_profit || 0) + (sh.gross_profit || 0),
    lucro_liquido: (ml.lucro_liquido || 0) + (sh.lucro_liquido ?? sh.gross_profit ?? 0),
    orders_count:  (ml.orders_count || 0) + (sh.orders_count || 0),
    units_sold:    (ml.units_sold || 0) + (sh.units_sold || 0),
    avg_ticket:    null,
    ads_cost:      (ml.ads_cost || 0) + (sh.ads_cost || 0),
    affiliate_cost: sh.affiliate_cost || 0,
    total_fees:    ml.total_fees || 0,
    cmv_total:     ml.cmv_total || 0,
    lucro_liquido_pct: null,
    gross_margin_pct:  null,
    roas: ml.roas, acos: ml.acos, tacos: ml.tacos,
    canceled_count: ml.canceled_count,
    catalog_orders_count: ml.catalog_orders_count,
    flex_orders_count:    ml.flex_orders_count,
    vs_prev: ml.vs_prev,
  }
})

// op = alias para combinedOp (mantém compatibilidade com template)
const op = combinedOp

function combinedGmvShare(marketplace, gmv) {
  const mlGmv     = data.value?.operation?.gmv || 0
  const shopeeGmv = filteredShopeeOp.value?.gmv || 0
  const total     = mlGmv + shopeeGmv
  if (!total || !gmv) return 0
  return Math.min(100, Math.round((gmv / total) * 100))
}

function applyPreset(key) {
  activeDatePreset.value = key
  if (key === 'hoje') {
    dateFrom.value = fmtDate(today)
    dateTo.value   = fmtDate(today)
  } else if (key === 'mes') {
    const d = new Date(today)
    dateFrom.value = fmtDate(new Date(d.getFullYear(), d.getMonth(), 1))
    dateTo.value   = fmtDate(today)
  } else if (key === 'mes_ant') {
    const d = new Date(today)
    const firstOfLast  = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    const lastOfLast   = new Date(d.getFullYear(), d.getMonth(), 0)
    dateFrom.value = fmtDate(firstOfLast)
    dateTo.value   = fmtDate(lastOfLast)
  } else {
    const days = parseInt(key)
    dateFrom.value = fmtDate(new Date(today - (days - 1) * 86400000))
    dateTo.value   = fmtDate(today)
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
  renderPlotlyChart()
}

// ── Chart helpers ─────────────────────────────────────────────────────────
const allChartAccounts = computed(() => [
  ...knownMlAccounts.value,
  ...knownShopeeAccounts.value,
])

function setChartMode(mode) {
  chartMode.value = mode
  if (mode === 'per_account') {
    if (chartVisibleAccounts.value.length === 0) {
      chartVisibleAccounts.value = allChartAccounts.value.map(a => a.key)
    }
    loadAccountDailyData()
  } else {
    renderPlotlyChart()
  }
}

// Weekday averages for Plotly (uses chartData which already respects filters)
const weekdayPlotlyData = computed(() => {
  const src = chartData.value
  if (!src.length) return []
  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const buckets = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }))
  for (const d of src) {
    const dow = new Date(d.date + 'T12:00:00').getDay()
    buckets[dow].sum   += d[weekdayChartMetric.value] || 0
    buckets[dow].count += 1
  }
  return DAYS.map((label, i) => ({
    label,
    avg: buckets[i].count > 0 ? buckets[i].sum / buckets[i].count : 0,
    count: buckets[i].count,
  }))
})

function toggleChartAccount(key) {
  const idx = chartVisibleAccounts.value.indexOf(key)
  if (idx === -1) chartVisibleAccounts.value = [...chartVisibleAccounts.value, key]
  else if (chartVisibleAccounts.value.length > 1) chartVisibleAccounts.value = chartVisibleAccounts.value.filter(k => k !== key)
  renderPlotlyChart()
}

async function loadAccountDailyData() {
  loadingAccountData.value = true
  const params = { date_from: dateFrom.value, date_to: dateTo.value, group_by: topGroupBy.value }
  const result = {}

  // ML accounts — one API call per account in parallel
  await Promise.all(knownMlAccounts.value.map(async (a) => {
    try {
      const res = await MercadoLivreService.getDashboardOperation({ ...params, account_id: a.id })
      result[a.key] = (res.data?.daily || []).map(d => ({ ...d }))
    } catch { result[a.key] = [] }
  }))

  // Shopee — usa daily por conta retornado em by_account[].daily
  for (const a of knownShopeeAccounts.value) {
    const accData = shopeeData.value?.by_account?.find(b => b.account_id === a.id)
    result[a.key] = accData?.daily?.map(d => ({ ...d })) || []
  }

  accountDailyData.value = result
  loadingAccountData.value = false
  renderPlotlyChart()
}

// ── Plotly render ─────────────────────────────────────────────────────────
async function renderPlotlyChart() {
  if (!chartData.value.length) return
  chartLoading.value = true
  try {
    await loadPlotly()
    await nextTick()
    if (!plotlyContainer.value) return

    const isMobile = window.innerWidth <= 600

    const traces = []
    let hasRightAxis = false

    // ── MODO: Por Conta ──────────────────────────────────────────────────
    if (chartMode.value === 'per_account') {
      const metric    = chartAccountMetric.value
      const meta      = chartMetrics.find(m => m.key === metric)
      const metaLabel = meta?.label || metric
      const isOrders  = metric === 'orders_count'

      const fmtS = v => isOrders
        ? Math.round(v).toLocaleString('pt-BR')
        : (v >= 1000000 ? 'R$' + (v/1000000).toFixed(1)+'M' : v >= 1000 ? 'R$'+(v/1000).toFixed(0)+'k' : 'R$'+Math.round(v))

      const todayStrAcc = fmtDate(today)

      for (const acc of allChartAccounts.value) {
        if (!selectedAccountKeys.value.includes(acc.key)) continue
        const dailyRaw = accountDailyData.value[acc.key] || []
        const daily = dailyRaw.filter(d => d.date !== todayStrAcc)
        if (!daily.length) continue

        const nPts    = daily.length
        const showAll = nPts <= 14
        const rawVals = daily.map(d => d[metric] || 0)
        const total   = rawVals.reduce((s, v) => s + v, 0)
        const maxIdx  = rawVals.indexOf(Math.max(...rawVals))
        const lastIdx = rawVals.length - 1
        const step    = nPts <= 14 ? 1 : nPts <= 31 ? 7 : 14
        const lblSet  = new Set([maxIdx, lastIdx])
        for (let i = 0; i < nPts; i += step) lblSet.add(i)

        traces.push({
          x: daily.map(d => d.date),
          y: rawVals,
          name: acc.label + '  ·  ' + fmtS(total),
          type: 'scatter',
          mode: isMobile ? 'lines+markers' : 'lines+markers+text',
          line:   { color: acc.color, width: isMobile ? 2 : 2.5, shape: 'spline' },
          marker: {
            size:  rawVals.map((_, i) => i === maxIdx ? (isMobile ? 6 : 9) : i === lastIdx ? (isMobile ? 5 : 7) : (isMobile ? 3 : 4)),
            color: rawVals.map((_, i) => i === maxIdx ? '#fff' : acc.color),
            line:  { color: rawVals.map((_, i) => i === maxIdx ? acc.color : 'transparent'), width: rawVals.map((_, i) => i === maxIdx ? 2.5 : 0) },
          },
          ...(isMobile ? {} : {
            text:         rawVals.map((v, i) => lblSet.has(i) ? fmtS(v) : ''),
            textposition: 'top center',
            textfont:     { size: 10, color: acc.color, family: 'Inter, sans-serif' },
          }),
          fill:      'tozeroy',
          fillcolor: acc.color + '10',
          hovertemplate:
            '<b>%{x|%A, %d/%m}</b><br>' +
            '<span style="color:' + acc.color + '">●</span> ' + acc.label +
            ': <b>' + (isOrders ? '%{y:,.0f}' : 'R$%{y:,.0f}') + '</b><extra></extra>',
        })
      }

    // ── MODO: Dias da Semana ──────────────────────────────────────────────
    } else if (chartMode.value === 'weekday') {
      const wd     = weekdayPlotlyData.value
      const meta   = chartMetrics.find(m => m.key === weekdayChartMetric.value)
      const color  = meta?.color || '#6366f1'
      const isMonetary = weekdayChartMetric.value !== 'orders_count'

      const maxAvg = Math.max(...wd.map(d => d.avg))
      traces.push({
        x: wd.map(d => d.label),
        y: wd.map(d => +d.avg.toFixed(2)),
        name: meta?.label || weekdayChartMetric.value,
        type: 'bar',
        marker: {
          color: wd.map(d => d.avg === maxAvg && d.avg > 0 ? color : color + '88'),
          line: { width: 0 },
        },
        text: wd.map(d => d.count > 0
          ? (isMonetary ? 'R$' + (d.avg >= 1000 ? (d.avg/1000).toFixed(1)+'k' : Math.round(d.avg)) : Math.round(d.avg))
          : ''),
        textposition: 'outside',
        textfont: { size: 11, color: '#64748b' },
        hovertemplate: '<b>%{x}</b><br>Média: <b>' + (isMonetary ? 'R$%{y:,.0f}' : '%{y:.0f}') + '</b><br>Amostras: %{customdata}<extra></extra>',
        customdata: wd.map(d => d.count),
      })

    // ── MODO: Métricas ────────────────────────────────────────────────────
    } else {
      // Helpers de formatação inline para labels e legendas
      const fmtShort = (v, isOrders) => {
        if (isOrders) return Math.round(v).toLocaleString('pt-BR')
        if (v >= 1000000) return 'R$' + (v / 1000000).toFixed(1) + 'M'
        if (v >= 1000)    return 'R$' + (v / 1000).toFixed(0) + 'k'
        return 'R$' + Math.round(v)
      }

      // Remove hoje — dia incompleto distorce a visualização e faz as linhas convergirem
      const todayStr  = fmtDate(today)
      const chartDays = chartData.value.filter(d => d.date !== todayStr)

      const nPts = chartDays.length
      if (!nPts) return

      // Decide quais índices recebem label de valor
      // ≤14d: todos | ≤31d: cada 7 + máx + mín | >31d: cada 14 + máx + mín
      function labelIndices(vals) {
        const maxIdx = vals.indexOf(Math.max(...vals))
        const minIdx = vals.indexOf(Math.min(...vals.filter(v => v > 0)))
        const step   = nPts <= 14 ? 1 : nPts <= 31 ? 7 : 14
        const set    = new Set([maxIdx, minIdx < 0 ? maxIdx : minIdx])
        for (let i = 0; i < nPts; i += step) set.add(i)
        set.add(nPts - 1) // sempre mostra o último
        return set
      }

      for (const m of chartMetrics) {
        if (!activeMetrics.value.includes(m.key)) continue
        const isAds    = m.key === 'ads_cost' && !normalizeChart.value
        const isOrders = m.key === 'orders_count'
        if (isAds) hasRightAxis = true

        const rawVals = chartDays.map(d => d[m.key] || 0)
        const total   = rawVals.reduce((s, v) => s + v, 0)
        const maxVal  = Math.max(...rawVals)
        const maxIdx  = rawVals.indexOf(maxVal)
        const lastIdx = rawVals.length - 1
        const lblSet  = labelIndices(rawVals)

        const vals = normalizeChart.value
          ? (() => {
              const mn = Math.min(...rawVals), mx = Math.max(...rawVals)
              const span = mx - mn || 1
              return rawVals.map(v => ((v - mn) / span) * 100)
            })()
          : rawVals

        const textArr = rawVals.map((v, i) => lblSet.has(i) ? fmtShort(v, isOrders) : '')

        // Marcadores: maior = 9px, último = 8px, resto = 4px
        const markerSizes  = rawVals.map((v, i) => i === maxIdx ? 9 : i === lastIdx ? 8 : 4)
        const markerColors = rawVals.map((v, i) =>
          i === maxIdx ? '#fff' : m.color
        )

        // Legenda com total do período
        const legendName = m.label + '  ·  ' + fmtShort(total, isOrders)

        traces.push({
          x:    chartDays.map(d => d.date),
          y:    vals,
          name: legendName,
          type: 'scatter',
          mode: isMobile ? 'lines+markers' : 'lines+markers+text',
          line:    { color: m.color, width: isMobile ? 2 : 2.5, shape: 'spline' },
          marker: {
            size:  isMobile ? markerSizes.map(s => s > 4 ? 6 : 3) : markerSizes,
            color: markerColors,
            line:  { color: rawVals.map((_, i) => i === maxIdx ? m.color : 'transparent'), width: rawVals.map((_, i) => i === maxIdx ? 2.5 : 0) },
          },
          ...(isMobile ? {} : {
            text:         textArr,
            textposition: 'top center',
            textfont:     { size: 10, color: m.color, family: 'Inter, sans-serif' },
          }),
          fill:      'tozeroy',
          fillcolor: m.color + '12',
          yaxis: isAds ? 'y2' : 'y',
          hovertemplate:
            '<b>%{x|%A, %d/%m}</b><br>' +
            '<span style="color:' + m.color + '">●</span> ' + m.label +
            ': <b>' + (normalizeChart.value ? '%{y:.1f}%' : (isOrders ? '%{y:,.0f}' : 'R$%{y:,.0f}')) + '</b>' +
            '<extra></extra>',
        })
      }
    }

    const isWeekdayMode = chartMode.value === 'weekday'
    const isMonetary    = weekdayChartMetric.value !== 'orders_count'
    // nPts: usa os dados já filtrados (sem hoje) para calcular formatação do eixo
    const nPts = isWeekdayMode ? 7 : (chartData.value.filter(d => d.date !== fmtDate(today)).length)

    // ── Annotations: label no fim de cada linha (sem hover) ──────────────
    const annotations = []
    if (!isWeekdayMode) {
      for (const t of traces) {
        if (!t.x?.length || t.line?.dash === 'dot') continue // skip totais tracejados
        const lastX = t.x[t.x.length - 1]
        const lastY = t.y[t.y.length - 1]
        if (lastY == null) continue

        // Extrai apenas o nome sem o total (antes do '  ·  ')
        const shortName = (t.name || '').split('  ·  ')[0].trim()

        annotations.push({
          x: lastX,
          y: lastY,
          xref: 'x',
          yref: t.yaxis === 'y2' ? 'y2' : 'y',
          text: '<b>' + shortName + '</b>',
          showarrow: false,
          xanchor: 'left',
          yanchor: 'middle',
          xshift: 10,
          font: {
            size: 11,
            color: t.line?.color || '#64748b',
            family: 'Inter, sans-serif',
          },
          bgcolor: 'rgba(255,255,255,0.85)',
          borderpad: 2,
        })
      }
    }

    const layout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor:  '#fafbfd',
      margin: {
        t: isMobile ? 12 : 32,
        r: isMobile ? 8  : (isWeekdayMode ? 20 : 155),
        b: isMobile ? 50 : 60,
        l: isMobile ? 52 : (isWeekdayMode ? 16 : 80),
      },
      height: isMobile ? 260 : 460,

      // Annotations de fim-de-linha apenas no desktop (precisam de margem direita grande)
      annotations: (isMobile || isWeekdayMode) ? [] : annotations,

      // No mobile mostra legenda compacta; no desktop só no modo weekday
      showlegend: isMobile ? true : isWeekdayMode,
      legend: {
        orientation: 'h',
        y: isMobile ? -0.32 : -0.22,
        x: 0,
        font: { size: isMobile ? 10 : 11, color: '#374151', family: 'Inter, sans-serif' },
        bgcolor: 'transparent',
        bordercolor: 'transparent',
        itemwidth: isMobile ? 30 : 40,
      },

      hovermode: isWeekdayMode ? 'closest' : 'x unified',
      hoverlabel: {
        bgcolor: '#1e293b',
        bordercolor: '#334155',
        font: { size: isMobile ? 11 : 12, color: '#f1f5f9', family: 'Inter, sans-serif' },
        align: 'left',
      },

      xaxis: isWeekdayMode ? {
        gridcolor: 'transparent',
        linecolor: '#e0e5ed',
        tickfont: { size: isMobile ? 11 : 13, color: '#374151', family: 'Inter, sans-serif' },
        showgrid: false,
        fixedrange: true,
      } : {
        type: 'date',
        tickformat: nPts <= 14 ? '%d/%m' : (nPts <= 60 ? '%d/%m' : '%b/%y'),
        gridcolor: '#eef0f4',
        linecolor: '#e0e5ed',
        tickfont: { size: isMobile ? 9 : 10, color: '#94a3b8', family: 'Inter, sans-serif' },
        showgrid: true,
        gridwidth: 1,
        tickangle: isMobile ? -45 : (nPts > 20 ? -35 : 0),
        nticks: isMobile ? Math.min(nPts, 7) : Math.min(nPts, 20),
        fixedrange: isMobile,
      },

      yaxis: isWeekdayMode ? {
        visible: false,
        zeroline: false,
      } : {
        gridcolor: '#eef0f4',
        gridwidth: 1,
        tickprefix: normalizeChart.value ? '' : 'R$',
        ticksuffix: normalizeChart.value ? '%' : '',
        tickformat: isMobile ? (normalizeChart.value ? '.0f' : '~s') : '',
        tickfont: { size: isMobile ? 9 : 10, color: '#94a3b8', family: 'Inter, sans-serif' },
        hoverformat: ',.0f',
        zeroline: false,
        automargin: true,
        nticks: isMobile ? 5 : undefined,
      },

      ...(hasRightAxis ? {
        yaxis2: {
          overlaying: 'y',
          side: 'right',
          tickprefix: 'R$',
          tickformat: isMobile ? '~s' : '',
          tickfont: { size: isMobile ? 9 : 10, color: '#d97706', family: 'Inter, sans-serif' },
          gridcolor: 'transparent',
          showgrid: false,
          zeroline: false,
          title: { text: 'Ads', font: { color: '#d97706', size: 10 } },
          automargin: true,
          nticks: isMobile ? 5 : undefined,
        }
      } : {}),
    }

    window.Plotly.react(plotlyContainer.value, traces, layout, {
      responsive: true,
      displayModeBar: !isMobile,
      displaylogo: false,
      modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'lasso2d', 'select2d', 'autoScale2d'],
      modeBarButtonsToAdd: [],
      scrollZoom: !isMobile,
      doubleClick: 'reset',
    })
  } finally {
    chartLoading.value = false
  }
}

// Watch metric toggles to re-render
watch(activeMetrics, renderPlotlyChart)
watch(() => $q.screen.lt.sm, renderPlotlyChart)

function setTopGroupBy(val) {
  if (topGroupBy.value === val) return
  topGroupBy.value = val
  load()
}

// Curva suave (cubic bezier com midpoints) para o gráfico
function smoothLine(metric) {
  const pts = chartData.value.map((d, i) => [svgXAt(i), svgYForMetric(metric, d[metric] || 0)])
  if (!pts.length) return ''
  if (pts.length === 1) return `M ${pts[0][0]},${pts[0][1]}`
  let path = `M ${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const mx = (x0 + x1) / 2
    path += ` C ${mx},${y0} ${mx},${y1} ${x1},${y1}`
  }
  return path
}

function smoothArea(metric) {
  const n = chartData.value.length
  if (!n) return ''
  const pts = chartData.value.map((d, i) => [svgXAt(i), svgYForMetric(metric, d[metric] || 0)])
  let path = `M ${pts[0][0]},${PLOT.y1} L ${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const mx = (x0 + x1) / 2
    path += ` C ${mx},${y0} ${mx},${y1} ${x1},${y1}`
  }
  path += ` L ${pts[n - 1][0]},${PLOT.y1} Z`
  return path
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

function fmtTick(v) {
  if (normalizeChart.value) return Math.round(v) + '%'
  return fmtShort(v)
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

// ── Dias da Semana — constantes ──────────────────────────────────────────
const WEEKDAYS = [
  { key: 'dom', label: 'Dom', color: '#ef4444' },
  { key: 'seg', label: 'Seg', color: '#6366f1' },
  { key: 'ter', label: 'Ter', color: '#0ea5e9' },
  { key: 'qua', label: 'Qua', color: '#10b981' },
  { key: 'qui', label: 'Qui', color: '#f59e0b' },
  { key: 'sex', label: 'Sex', color: '#8b5cf6' },
  { key: 'sab', label: 'Sáb', color: '#ec4899' },
]

const weekdayMetric   = ref('gmv')
const weekdaySelected = ref([1, 5])   // Seg e Sex por padrão
const weekdayNCount   = ref(8)
const dismissCmvAlert = ref(false)

// Fonte de dados para análise por dia: usa todos os dados diários disponíveis
// Se < 30 dias carregados, expande para 90d quando o tab Semana for aberto
const weekdaySourceData = computed(() => chartData.value.length > 0 ? chartData.value : [])

// Médias por dia da semana
const weekdayAvgs = computed(() => {
  const src = weekdaySourceData.value
  if (!src.length) return []
  const buckets = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }))
  for (const d of src) {
    const dow = new Date(d.date + 'T12:00:00').getDay()
    buckets[dow].sum   += d[weekdayMetric.value] || 0
    buckets[dow].count += 1
  }
  const avgs = buckets.map((b, i) => ({
    ...WEEKDAYS[i],
    dow:   i,
    avg:   b.count > 0 ? b.sum / b.count : 0,
    count: b.count,
  }))
  const maxAvg = Math.max(...avgs.map(a => a.avg))
  return avgs.map(a => ({ ...a, isTop: a.avg === maxAvg && a.avg > 0 }))
})

const weekdayYMax = computed(() => Math.max(...weekdayAvgs.value.map(a => a.avg), 1) * 1.2)
const weekdayYTicks = computed(() => {
  const m = weekdayYMax.value
  return [m, m * 0.5, 0].map(v => Math.round(v))
})
function weekdayBarY(val) {
  const ratio = Math.min(1, Math.max(0, (val || 0) / weekdayYMax.value))
  return 155 - ratio * 140
}
function weekdayFmt(v) {
  if (!v) return '0'
  if (weekdayMetric.value === 'orders_count') return Math.round(v).toLocaleString('pt-BR')
  if (v >= 1000000) return 'R$' + (v / 1000000).toFixed(1) + 'M'
  if (v >= 1000)    return 'R$' + (v / 1000).toFixed(0) + 'k'
  return 'R$' + Math.round(v)
}

// Séries comparativas: últimas N ocorrências de cada dia selecionado
const weekdayCompareSeries = computed(() => {
  const src = [...weekdaySourceData.value].sort((a, b) => a.date.localeCompare(b.date))
  const n   = weekdayNCount.value
  return WEEKDAYS
    .map((wd, i) => {
      if (!weekdaySelected.value.includes(i)) return null
      const occurrences = src.filter(d => new Date(d.date + 'T12:00:00').getDay() === i)
      const last = occurrences.slice(-n)
      return { dayKey: wd.key, dayLabel: wd.label, color: wd.color, occurrences: last }
    })
    .filter(Boolean)
    .map(ser => {
      const vals = ser.occurrences.map(d => d[weekdayMetric.value] || 0)
      const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      return { ...ser, avg, vals }
    })
})

// SVG para weekday compare
const WD_W   = 860
const WD_H   = 220
const WD_PAD = 55

const wdYMax = computed(() => {
  const allVals = weekdayCompareSeries.value.flatMap(s => s.vals)
  return Math.max(...allVals, 1) * 1.15
})
const wdYTicks = computed(() => {
  const m = wdYMax.value
  return [m, m * 0.5, 0].map(v => Math.round(v))
})
function wdSvgY(val) {
  const ratio = Math.min(1, Math.max(0, (val || 0) / wdYMax.value))
  const plotH = WD_H - 24 - 14
  return (WD_H - 24) - ratio * plotH
}
function wdSvgX(ptIdx, totalPts) {
  const w = WD_W - WD_PAD - 20
  return totalPts <= 1 ? WD_PAD + w / 2 : WD_PAD + (ptIdx / (totalPts - 1)) * w
}

// Build points for a series
const weekdayCompareSvgSeries = computed(() => {
  return weekdayCompareSeries.value.map(ser => {
    const n = ser.occurrences.length
    const points = ser.occurrences.map((d, i) => ({
      x: wdSvgX(i, n),
      y: wdSvgY(d[weekdayMetric.value] || 0),
      label: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    }))
    return { ...ser, points }
  })
})


function wdLinePath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`
  let p = `M ${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const mx = (points[i - 1].x + points[i].x) / 2
    p += ` C ${mx},${points[i - 1].y} ${mx},${points[i].y} ${points[i].x},${points[i].y}`
  }
  return p
}
function wdAreaPath(points) {
  if (!points.length) return ''
  const n = points.length
  let p = `M ${points[0].x},${WD_H - 24} L ${points[0].x},${points[0].y}`
  for (let i = 1; i < n; i++) {
    const mx = (points[i - 1].x + points[i].x) / 2
    p += ` C ${mx},${points[i - 1].y} ${mx},${points[i].y} ${points[i].x},${points[i].y}`
  }
  p += ` L ${points[n - 1].x},${WD_H - 24} Z`
  return p
}

function toggleWeekday(i) {
  const idx = weekdaySelected.value.indexOf(i)
  if (idx === -1) weekdaySelected.value = [...weekdaySelected.value, i]
  else if (weekdaySelected.value.length > 1) weekdaySelected.value = weekdaySelected.value.filter(x => x !== i)
}

// Tabela comparativa
const weekdayTableRows = computed(() => {
  if (!weekdaySelected.value.length) return []
  const src = [...weekdaySourceData.value].sort((a, b) => b.date.localeCompare(a.date))
  const result = []
  const counters = {}
  for (const d of src) {
    const dow = new Date(d.date + 'T12:00:00').getDay()
    if (!weekdaySelected.value.includes(dow)) continue
    counters[dow] = (counters[dow] || 0) + 1
    if (counters[dow] > weekdayNCount.value) continue
    result.push({
      ...d,
      dow,
      rank: counters[dow],
      dateLabel: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
    })
  }
  return result.sort((a, b) => b.date.localeCompare(a.date))
})

// ── Sparklines ────────────────────────────────────────────────────────────

// Dados brutos para sparkline (usado pelo componente SbKpiCard)
function sparklineData(metric) {
  const data = chartData.value
  if (!data.length) return null
  return data.map(d => d[metric] || 0)
}

// ── Cascata P&L helpers ───────────────────────────────────────────────────
function wfPct(num, den) {
  if (!den || num == null) return 0
  return (num / den) * 100
}

// ── Projeção do mês ───────────────────────────────────────────────────────
const monthProjection = computed(() => {
  // Só projeta se estiver vendo o mês atual ou um período que inclua hoje
  const daily = chartData.value
  if (!daily.length) return null
  const todayStr = fmtDate(today)
  const hasToday = daily.some(d => d.date === todayStr)
  if (!hasToday && activeDatePreset.value !== 'mes') return null

  const now = new Date(today)
  const dayOfMonth  = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  if (dayOfMonth >= daysInMonth) return null  // último dia, sem projeção

  // Média diária dos dias disponíveis (exclui hoje para não sub-estimar — dia incompleto)
  const completeDays = daily.filter(d => d.date !== todayStr)
  const nDays = completeDays.length || 1
  const gmvAvg   = completeDays.reduce((s, d) => s + (d.gmv || 0), 0)   / nDays
  const lucroAvg = completeDays.reduce((s, d) => s + (d.lucro_liquido || 0), 0) / nDays

  return {
    gmv:        Math.round(gmvAvg * daysInMonth),
    lucro:      Math.round(lucroAvg * daysInMonth),
    dayOfMonth,
    daysInMonth,
  }
})

// ── Alerta de concentração de receita ────────────────────────────────────
const concentrationAlert = computed(() => {
  const prods = data.value?.top_products || []
  if (!prods.length || !op.value?.gmv) return null
  const top3gmv = topProductsSorted.value.slice(0, 3).reduce((s, p) => s + (p.revenue || 0), 0)
  const pct3    = top3gmv / op.value.gmv * 100
  if (pct3 >= 70) return {
    level: 'conc-high',
    icon:  'warning',
    text:  `Atenção: top 3 produtos = ${pct3.toFixed(0)}% do GMV — concentração de receita alta. Se um produto for suspenso, o impacto é severo.`,
  }
  if (pct3 >= 50) return {
    level: 'conc-med',
    icon:  'info',
    text:  `Top 3 produtos = ${pct3.toFixed(0)}% do GMV. Concentração moderada — considere diversificar.`,
  }
  return null
})

// ── TACoS badge color ─────────────────────────────────────────────────────
function tacosBadgeClass(pct) {
  if (pct > 15) return 'tacos-high'
  if (pct > 8)  return 'tacos-med'
  return 'tacos-ok'
}

// ── Ranking ───────────────────────────────────────────────────────────────
const rankingRows = computed(() => {
  const rows = []

  // ML accounts
  for (const a of (data.value?.accounts || [])) {
    const key = buildAccountKey('ml', a.account_id)
    if (!selectedAccountKeys.value.includes(key)) continue
    const gmv = a.gmv || 0
    const net = a.net_revenue || 0
    const gp  = a.gross_profit || 0
    const ads = a.ads_cost || 0
    const ll  = a.lucro_liquido ?? (gp - ads)
    rows.push({
      key,
      marketplace: 'ml',
      label: a.account_nickname,
      gmv,
      net_revenue: net,
      gross_profit: gp,
      gross_margin_pct: net ? +(gp / net * 100).toFixed(1) : null,
      ads_cost: ads,
      tacos: gmv ? +(ads / gmv * 100).toFixed(1) : null,
      lucro_liquido: ll,
      lucro_liquido_pct: net ? +(ll / net * 100).toFixed(1) : null,
      roas: a.roas || null,
      orders_count: a.orders_count || 0,
    })
  }

  // Shopee accounts
  for (const a of (shopeeData.value?.by_account || [])) {
    const key = buildAccountKey('shopee', a.account_id)
    if (!selectedAccountKeys.value.includes(key)) continue
    const gmv = a.gmv || 0
    const net = a.net_revenue || 0
    const gp  = a.gross_profit || 0
    rows.push({
      key,
      marketplace: 'shopee',
      label: a.shop_name,
      gmv,
      net_revenue: net,
      gross_profit: gp,
      gross_margin_pct: net ? +(gp / net * 100).toFixed(1) : null,
      ads_cost: null,
      tacos: null,
      lucro_liquido: gp,
      lucro_liquido_pct: net ? +(gp / net * 100).toFixed(1) : null,
      roas: null,
      orders_count: a.orders_count || 0,
    })
  }

  // Sort
  return rows.sort((a, b) => {
    const key = rankingSortKey.value
    if (key === 'tacos') {
      // Lower TACoS is better — put nulls last
      if (a.tacos == null) return 1
      if (b.tacos == null) return -1
      return a.tacos - b.tacos
    }
    return (b[key] || 0) - (a[key] || 0)
  })
})

const rankingHighlights = computed(() => {
  const rows = rankingRows.value
  if (rows.length < 2) return []

  const sorted = (key, asc = false) => {
    const valid = rows.filter(r => r[key] != null)
    if (!valid.length) return { winner: null, loser: null }
    const s = [...valid].sort((a, b) => asc ? a[key] - b[key] : b[key] - a[key])
    return { winner: s[0], loser: s[s.length - 1] }
  }

  const highlights = []

  const gmv = sorted('gmv')
  if (gmv.winner) highlights.push({
    label: '🏆 Maior GMV',
    winner: gmv.winner,
    value: fmt(gmv.winner.gmv),
    loser: gmv.loser !== gmv.winner ? gmv.loser : null,
    loserValue: gmv.loser ? fmt(gmv.loser.gmv) : null,
    positive: true,
  })

  const margin = sorted('lucro_liquido_pct')
  if (margin.winner) highlights.push({
    label: '💹 Melhor Margem',
    winner: margin.winner,
    value: (margin.winner.lucro_liquido_pct ?? '—') + '%',
    loser: margin.loser !== margin.winner ? margin.loser : null,
    loserValue: margin.loser ? (margin.loser.lucro_liquido_pct ?? '—') + '%' : null,
    positive: true,
  })

  const roas = sorted('roas')
  if (roas.winner && roas.winner.roas) highlights.push({
    label: '📈 Melhor ROAS',
    winner: roas.winner,
    value: roas.winner.roas + 'x',
    loser: roas.loser !== roas.winner ? roas.loser : null,
    loserValue: roas.loser?.roas ? roas.loser.roas + 'x' : null,
    positive: true,
  })

  const tacos = sorted('tacos', true)  // ascending — lower is better
  if (tacos.winner && tacos.winner.tacos != null) highlights.push({
    label: '🎯 Menor TACoS',
    winner: tacos.winner,
    value: tacos.winner.tacos.toFixed(1) + '%',
    loser: tacos.loser !== tacos.winner ? tacos.loser : null,
    loserValue: tacos.loser?.tacos != null ? tacos.loser.tacos.toFixed(1) + '%' : null,
    positive: false,
  })

  return highlights
})

// ── Pareto 80/20 ──────────────────────────────────────────────────────────
// Retorna o % acumulado de GMV até o produto i (inclusive), arredondado
const paretoAccumData = computed(() => {
  const prods = topProductsSorted.value
  const totalRev = prods.reduce((s, p) => s + (p.revenue || 0), 0)
  if (!totalRev) return []
  let accum = 0
  return prods.map(p => {
    accum += p.revenue || 0
    return Math.round(accum / totalRev * 100)
  })
})

function paretoAccum(i) {
  return paretoAccumData.value[i] ?? 0
}

// Retorna o número (80 ou 95) se este índice é o ponto de corte, senão null
function paretoLine(i) {
  const data = paretoAccumData.value
  if (!data.length) return null
  const prev = i > 0 ? data[i - 1] : 0
  if (prev < 80 && data[i] >= 80) return 80
  if (prev < 95 && data[i] >= 95) return 95
  return null
}

// ── Funil de conversão ────────────────────────────────────────────────────
function convClass(qty, visits) {
  if (!visits) return ''
  const rate = qty / visits * 100
  if (rate >= 5)  return 'conv-high'
  if (rate >= 2)  return 'conv-med'
  return 'conv-low'
}

// ── Sazonalidade — ano anterior ───────────────────────────────────────────
const lastYearData   = ref(null)
const loadingLastYear = ref(false)

async function loadLastYear() {
  if (!dateFrom.value || !dateTo.value) return
  loadingLastYear.value = true
  try {
    const d0 = new Date(dateFrom.value + 'T12:00:00')
    const d1 = new Date(dateTo.value   + 'T12:00:00')
    d0.setFullYear(d0.getFullYear() - 1)
    d1.setFullYear(d1.getFullYear() - 1)
    const params = { date_from: fmtDate(d0), date_to: fmtDate(d1) }
    if (selectedAccountId.value) params.account_id = selectedAccountId.value
    const res = await MercadoLivreService.getDashboardOperation(params)
    lastYearData.value = res.data
  } catch {
    lastYearData.value = null
  } finally {
    loadingLastYear.value = false
  }
}

// Calcula variação % entre atual e ano anterior
function yoyPct(curr, prev) {
  if (!prev || prev === 0) return null
  return ((curr - prev) / Math.abs(prev) * 100).toFixed(1)
}

function yoyClass(pct) {
  if (pct === null) return ''
  return pct >= 0 ? 'pos' : 'neg'
}

// Série diária do ano anterior alinhada por day-of-year offset para o gráfico
const lastYearChartData = computed(() => {
  return lastYearData.value?.daily || []
})

// KPIs do ano anterior
const lastYearOp = computed(() => {
  const d = lastYearData.value
  if (!d) return null
  return {
    gmv:          d.gmv || 0,
    net_revenue:  d.net_revenue || 0,
    gross_profit: d.gross_profit || 0,
    lucro_liquido: d.lucro_liquido || 0,
    orders_count: d.orders_count || 0,
    ads_cost:     d.ads_cost || 0,
  }
})

// ── Gráfico de sazonalidade ───────────────────────────────────────────────
const SAZ_W = 700
const SAZ_H = 160
const SAZ_PAD = 12

const sazHoveredIdx = ref(-1)

function sazXPos(i) {
  const n = chartData.value.length
  if (n <= 1) return SAZ_PAD
  return SAZ_PAD + i * (SAZ_W - SAZ_PAD * 2) / (n - 1)
}

function onSazMouseMove(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width * SAZ_W
  const n = chartData.value.length
  if (!n) return
  const xStep = n > 1 ? (SAZ_W - SAZ_PAD * 2) / (n - 1) : 1
  sazHoveredIdx.value = Math.max(0, Math.min(n - 1, Math.round((x - SAZ_PAD) / xStep)))
}

function buildSazPath(series, maxVal) {
  if (!series.length || !maxVal) return null
  const n = series.length
  const top = 22, bot = SAZ_H - 20
  const h = bot - top
  const pts = series.map((d, i) => ({
    x: SAZ_PAD + i * (SAZ_W - SAZ_PAD * 2) / Math.max(n - 1, 1),
    y: bot - (d.gmv || 0) / maxVal * h,
  }))
  let line = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i-1].x + pts[i].x) / 2
    line += ` C ${cx} ${pts[i-1].y} ${cx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`
  }
  const area = line + ` L ${pts[pts.length-1].x} ${bot} L ${pts[0].x} ${bot} Z`
  return { line, area }
}

const sazMaxVal = computed(() => {
  const curr = chartData.value.map(d => d.gmv || 0)
  const prev = lastYearChartData.value.map(d => d.gmv || 0)
  return Math.max(...curr, ...prev, 1)
})

const sazPathCurr = computed(() => buildSazPath(chartData.value, sazMaxVal.value))
const sazPathPrev = computed(() => buildSazPath(lastYearChartData.value, sazMaxVal.value))

const sazGridLines = computed(() => {
  const top = 22, bot = SAZ_H - 20
  return [top, top + (bot - top) / 3, top + (bot - top) * 2 / 3, bot]
})

onMounted(() => {
  loadPlotly()  // pre-fetch Plotly in parallel with API calls — eliminates chart render delay
  load()
  loadToday()
  // Close account picker on outside click
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.acct-picker-wrap')
    if (wrap && !wrap.contains(e.target)) showAccountPicker.value = false
  })
})

// Re-chama loadToday sempre que a seleção de contas muda,
// para que o banner "Hoje" reflita o filtro escolhido.
// (Antes o banner só era carregado 1x no onMounted e nunca reagia a filtros.)
watch(selectedAccountKeys, () => {
  loadToday()
}, { deep: true })
</script>

<style scoped>

/* ── Loading ───────────────────────────────────────────────────────────── */
.loading-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 0;
}

.loading-text {
  color: #9aa0ac;
  font-size: 14px;
}

/* ── Today banner ───────────────────────────────────────────────────────── */
/* Faixa slim: bloco "Hoje" à esquerda + KPIs separados por divisores de 1px.
   Superfície neutra; cor só no live-dot e no semântico pos/neg. */
.today-banner {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  overflow-x: auto;
  scrollbar-width: thin;
}

.today-label {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-right: 16px;
  margin-right: 4px;
  border-right: 1px solid #eef2f6;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: default;
}

.today-label-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.today-label-text {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.today-label-caption {
  font-size: 10px;
  color: #94a3b8;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #16a34a;
  animation: pulse-dot 2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.today-kpis {
  display: flex;
  align-items: stretch;
  flex: 1;
  min-width: 0;
}

.today-kpi {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 0 16px;
  white-space: nowrap;
  flex: 1; /* distribui as células por toda a largura da faixa */
}

.today-kpi + .today-kpi {
  border-left: 1px solid #eef2f6;
}

.today-kpi-label {
  font-size: 11px;
  color: #64748b;
  line-height: 1.3;
}

.today-kpi-val {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.today-pos { color: #16a34a; }
.today-neg { color: #dc2626; }

/* ── KPI Grid header ────────────────────────────────────────────────────── */
.kpi-grid-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.kpi-grid-title {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  flex: 1;
}
.kpi-period-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 20px;
  background: #f0fdfb;
  border: 1px solid #99f6e4;
  color: #0d9488;
  font-size: 11px;
  font-weight: 600;
}
.kpi-accts-badge {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #b45309;
}

/* ── KPI Grid ──────────────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.kpi-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 18px 20px;
  border: 1.5px solid #e8edf3;
  position: relative;
  overflow: hidden;
  transition: transform .15s, box-shadow .15s;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(13, 148, 136, .08);
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.kpi-gmv::before    { background: linear-gradient(90deg, #6366f1, #8b5cf6); }
.kpi-net::before    { background: linear-gradient(90deg, #0ea5e9, #38bdf8); }
.kpi-gp::before     { background: linear-gradient(90deg, #10b981, #34d399); }
.kpi-ll::before     { background: linear-gradient(90deg, #0d9488, #2dd4bf); }
.kpi-ads::before    { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.kpi-orders::before { background: linear-gradient(90deg, #ec4899, #f472b6); }
.kpi-units::before  { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
.kpi-roas::before   { background: linear-gradient(90deg, #0ea5e9, #06b6d4); }
.kpi-margin::before { background: linear-gradient(90deg, #2dd4bf, #34d399); }
.kpi-canc::before   { background: linear-gradient(90deg, #ef4444, #f87171); }

.kpi-label {
  font-size: 11px;
  color: #9aa0ac;
  text-transform: uppercase;
  letter-spacing: .7px;
  margin-bottom: 8px;
  font-weight: 600;
}

.kpi-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1f36;
  line-height: 1.1;
}

.kpi-highlight {
  color: #0d9488;
}

.kpi-warn {
  color: #f59e0b;
}

.kpi-warn-card .kpi-value {
  color: #f59e0b;
}

.kpi-sub {
  font-size: 11px;
  color: #9aa0ac;
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
  color: #0d9488;
}

.delta-neg {
  color: #ef4444;
}

.delta-neutral {
  color: #9aa0ac;
}

.kpi-info {
  cursor: help;
  opacity: 0.5;
  vertical-align: middle;
}

.kpi-tooltip-pop {
  font-size: 12px;
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */
.tab-bar {
  display: flex;
  gap: 4px;
  background: #fff;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 20px;
  border: 1.5px solid #e8edf3;
}

.tab-btn {
  padding: 8px 16px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: #6b7280;
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
  background: #f0f2f5;
  color: #374151;
}

/* ── Chart ─────────────────────────────────────────────────────────────── */
.chart-card {
  background: #fff;
  border: 1.5px solid #e8edf3;
  border-radius: 16px;
  padding: 24px 20px 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,.04);
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
  color: #1a1f36;
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
  border: 1px solid #e8edf3;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all .2s;
}

.metric-btn:hover:not(.metric-btn--on) {
  border-color: #9aa0ac;
  color: #374151;
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
  color: #9aa0ac;
  font-size: 13px;
}

.line-chart-svg {
  display: block;
  width: 100%;
  height: 320px;
  cursor: crosshair;
  background: linear-gradient(180deg, #fafbfd 0%, #ffffff 100%);
  border-radius: 8px;
}

.line-tooltip {
  position: absolute;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 12px 16px;
  z-index: 20;
  min-width: 175px;
  pointer-events: none;
  box-shadow: 0 12px 36px rgba(0, 0, 0, .24);
  backdrop-filter: blur(4px);
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
  color: #94a3b8;
  flex: 1;
}

.tooltip-val {
  font-size: 11px;
  font-weight: 600;
  color: #f1f5f9;
}

/* ── Tables ────────────────────────────────────────────────────────────── */
.table-card {
  background: #fff;
  border: 1.5px solid #e8edf3;
  border-radius: 14px;
  padding: 20px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1f36;
  margin-bottom: 16px;
}

.table-wrap {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 480px;
  border-radius: 8px;
  border: 1px solid #f0f2f5;
}

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
  color: #9aa0ac;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .6px;
  border-bottom: 1.5px solid #e8edf3;
  white-space: nowrap;
  background: #f8f9fa;
  position: sticky;
  top: 0;
  z-index: 2;
}

.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f2f5;
  color: #374151;
  white-space: nowrap;
}

.data-table tr:hover td {
  background: #f8fdfc;
}

.data-table tfoot td {
  border-top: 1.5px solid #e8edf3;
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
  color: #1a1f36;
}

.muted {
  color: #9aa0ac;
  font-size: 11px;
}

.pos {
  color: #0d9488;
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
  color: #1a1f36;
  background: #f8f9fa;
  position: sticky;
  bottom: 0;
}

.rank {
  color: #9aa0ac;
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
  border: 1px solid #e8edf3;
  flex-shrink: 0;
}

.prod-info {
  min-width: 0;
}

.prod-title {
  color: #374151;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

.prod-id {
  font-size: 10px;
  color: #9aa0ac;
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
  color: #9aa0ac;
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
  background: #fff;
  border: 1.5px solid #e8edf3;
  border-radius: 12px;
  padding: 18px;
  transition: transform .15s, box-shadow .15s;
}

.cnpj-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(13,148,136,.08);
}

.cnpj-header {
  margin-bottom: 14px;
}

.cnpj-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1f36;
  font-family: monospace;
}

.cnpj-accounts {
  font-size: 11px;
  color: #9aa0ac;
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
  color: #9aa0ac;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.cnpj-kpi-val {
  font-size: 15px;
  font-weight: 700;
  color: #1a1f36;
}

.gmv-bar-wrap {
  position: relative;
  background: #f0f2f5;
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
  color: #9aa0ac;
}

.mp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.mp-card {
  background: #fff;
  border: 1.5px solid #e8edf3;
  border-radius: 12px;
  padding: 16px;
}

.mp-name {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #1a1f36;
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
  color: #9aa0ac;
  text-transform: uppercase;
}

.mp-kpi-val {
  font-size: 14px;
  font-weight: 700;
  color: #1a1f36;
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

/* ── Marketplace badges ─────────────────────────────────────────────────── */
.mkt-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .4px;
  text-transform: uppercase;
}
.mkt-badge--ml     { background: #1a1a2e; color: #FFE600; }
.mkt-badge--shopee { background: #fff3f1; color: #EE4D2D; border: 1px solid #EE4D2D44; }

/* ── Toggle group ───────────────────────────────────────────────────────── */
.toggle-group {
  display: flex;
  gap: 4px;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 3px;
  border: 1.5px solid #e8edf3;
}

.tg-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  transition: all .15s;
}

.tg-btn--on {
  background: #0d9488;
  color: white;
}

.sort-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1.5px solid #e8edf3;
  background: #fff;
  color: #374151;
  font-size: 12px;
  cursor: pointer;
  outline: none;
}

.table-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.table-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── Info box ───────────────────────────────────────────────────────────── */
.info-box {
  background: #f8f9fa;
  border: 1.5px solid #e8edf3;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 12px;
  color: #9aa0ac;
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
  color: #9aa0ac;
}

/* ── Skeleton rows (not used currently, placeholder) ─────────────────────── */
.skeleton-row {
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  margin-bottom: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Account filter bar ─────────────────────────────────────────────────── */
.acct-filter-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: #fff;
  border: 1.5px solid #e8edf3;
  border-radius: 12px;
  margin-bottom: 18px;
}

.acct-filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #9aa0ac;
  text-transform: uppercase;
  letter-spacing: .6px;
  margin-right: 4px;
  white-space: nowrap;
}

.acct-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 14px;
  border-radius: 20px;
  border: 1.5px solid #e8edf3;
  background: transparent;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}

.acct-pill:hover:not(.acct-pill--on) {
  border-color: #0d9488;
  color: #0d9488;
  background: #f0fdf9;
}

.acct-pill--on {
  background: #0d9488;
  border-color: #0d9488;
  color: #fff;
  font-weight: 600;
}

/* ── Flex tab ────────────────────────────────────────────────────────────── */
.kpi-flex-orders::before { background: linear-gradient(90deg, #0d9488, #34d399); }

.flex-bar-svg {
  display: block;
  width: 100%;
  height: 200px;
  background: linear-gradient(180deg, #fafbfd 0%, #ffffff 100%);
  border-radius: 8px;
}

.flex-bar-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 100px;
}

.flex-bar-fill {
  height: 6px;
  background: linear-gradient(90deg, #0d9488, #2dd4bf);
  border-radius: 3px;
  flex-shrink: 0;
  transition: width .4s;
}

/* Marketplace bar variants */
.gmv-bar-fill--ml     { background: linear-gradient(90deg, #ffe600, #ffd000); }
.gmv-bar-fill--shopee { background: linear-gradient(90deg, #ee4d2d, #ff6b4a); }
.inline-bar-fill--shopee { background: linear-gradient(90deg, #ee4d2d, #ff6b4a); }

/* ── CMV Alert ──────────────────────────────────────────────────────────── */
.cmv-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: #fff7ed;
  border: 1.5px solid #f97316;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #9a3412;
  font-size: 13px;
}
.cmv-alert-text { flex: 1; line-height: 1.5; }
.cmv-alert-cta { color: #ea580c; font-weight: 600; cursor: pointer; }
.cmv-alert-close {
  border: none; background: transparent; cursor: pointer;
  color: #f97316; font-size: 14px; padding: 0 4px;
}

/* ── Waterfall P&L ──────────────────────────────────────────────────────── */
.waterfall-card {
  background: #fff;
  border: 1.5px solid #e8edf3;
  border-radius: 16px;
  padding: 22px 24px 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,.04);
}
.waterfall-header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.waterfall-title {
  display: flex; align-items: center;
  font-size: 15px; font-weight: 700; color: #1a1f36;
}
.waterfall-subtitle {
  font-size: 12px; color: #9aa0ac;
}
.projection-badge {
  margin-left: auto;
  background: #f0fdf9;
  border: 1.5px solid #0d9488;
  border-radius: 20px;
  padding: 5px 14px;
  font-size: 12px;
  color: #0d9488;
  display: flex;
  align-items: center;
  gap: 6px;
}

.waterfall-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wf-step {
  display: grid;
  grid-template-columns: 180px 1fr 220px;
  align-items: center;
  gap: 12px;
}
.wf-arrow {
  text-align: center;
  color: #cbd5e1;
  font-size: 12px;
  line-height: 1;
  margin-left: 180px;
}
.wf-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}
.wf-step--result .wf-label { color: #1a1f36; }
.wf-step--final .wf-label  { color: #1a1f36; font-size: 13px; }

.wf-bar-wrap {
  height: 10px;
  background: #f1f5f9;
  border-radius: 5px;
  overflow: hidden;
}
.wf-bar {
  height: 100%;
  border-radius: 5px;
  transition: width .5s ease;
}
.wf-bar--gmv   { background: linear-gradient(90deg, #6366f1, #8b5cf6); }
.wf-bar--deduct{ background: linear-gradient(90deg, #fca5a5, #f87171); }
.wf-bar--net   { background: linear-gradient(90deg, #0ea5e9, #38bdf8); }
.wf-bar--gp    { background: linear-gradient(90deg, #10b981, #34d399); }
.wf-bar--ads   { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.wf-bar--ll    { background: linear-gradient(90deg, #0d9488, #2dd4bf); }
.wf-bar--neg   { background: linear-gradient(90deg, #ef4444, #f87171); }

.wf-value {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}
.wf-value--neg      { color: #ef4444; }
.wf-value--warn     { color: #f59e0b; }
.wf-value--highlight{ color: #0d9488; font-size: 15px; }
.wf-pct {
  font-size: 11px;
  font-weight: 400;
  color: #9aa0ac;
  margin-left: 6px;
}
.wf-step--pos { background: #f0fdf9; border-radius: 8px; padding: 6px 8px; }
.wf-step--neg { background: #fff1f2; border-radius: 8px; padding: 6px 8px; }

/* ── Sparkline ──────────────────────────────────────────────────────────── */
.sparkline {
  display: block;
  width: 100%;
  height: 22px;
  margin: 6px 0 4px;
  opacity: 0.7;
}

/* ── Concentration alert ────────────────────────────────────────────────── */
.concentration-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 14px;
  font-weight: 500;
}
.conc-high {
  background: #fff1f2;
  border: 1.5px solid #f87171;
  color: #9f1239;
}
.conc-med {
  background: #fff7ed;
  border: 1.5px solid #fbbf24;
  color: #92400e;
}

/* ── Row highlight ──────────────────────────────────────────────────────── */
.row-negative td {
  background: #fff1f2 !important;
}

/* ── Daily table (new design) ───────────────────────────────────────────── */
.daily-table-card {
  background: #fff;
  border: 1.5px solid #e8edf3;
  border-radius: 16px;
  overflow: hidden;
}
.daily-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 14px;
  border-bottom: 1.5px solid #f1f5f9;
}
.daily-table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}
.daily-table-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
}
.daily-filter-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f0fdfa;
  color: #0d9488;
  border: 1px solid #99f6e4;
  border-radius: 20px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
}
.daily-table-wrap {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 520px;
}
.daily-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.daily-table thead th {
  padding: 9px 14px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .7px;
  color: #94a3b8;
  background: #f8fafc;
  border-bottom: 1.5px solid #e8edf3;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}
.daily-table thead th.col-date { text-align: left; }
.daily-table thead th.col-num { text-align: right; }
.daily-table thead th.col-ll { color: #0d9488; }
.daily-table thead th.col-ads { color: #f59e0b; }

.daily-table td {
  padding: 9px 14px;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
  color: #374151;
}
.daily-table td.col-date { text-align: left; }
.daily-table td.col-num { text-align: right; font-variant-numeric: tabular-nums; }

/* Row states */
.dt-row { cursor: pointer; transition: background .1s; }
.dt-row:hover td { background: #f8fffe; }
.dt-row--open td { background: #f0fdfa; font-weight: 600; }
.dt-row--open .dt-expand-btn { color: #0d9488; }
.dt-row--neg td { background: #fff8f8; }
.dt-row--neg:hover td { background: #fff0f0; }

/* Expand button */
.dt-expand-btn {
  display: inline-flex;
  align-items: center;
  color: #cbd5e1;
  margin-right: 6px;
  vertical-align: middle;
  transition: color .15s;
}
.dt-row:hover .dt-expand-btn { color: #94a3b8; }
.dt-date-label { vertical-align: middle; }

/* Value styles */
.dt-gmv { color: #1e293b; font-weight: 600; }
.dt-pos { color: #0d9488; font-weight: 600; }
.dt-neg { color: #ef4444; font-weight: 600; }
.dt-warn { color: #f59e0b; }
.dt-warn-text { color: #f59e0b; }
.dt-empty { color: #cbd5e1; }
.dt-tacos-badge { font-size: 12px; padding: 1px 0; }

/* Account breakdown rows */
.dt-acct-row td {
  background: #fafbfc;
  border-bottom: 1px solid #f1f5f9;
  font-size: 12px;
}
.dt-acct-row:last-of-type td { border-bottom: 2px solid #e8edf3; }
.dt-sub { color: #64748b; }
.dt-acct-indent {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding-left: 28px;
}
.dt-acct-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dt-mkt-tag {
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  letter-spacing: .3px;
}
.dt-mkt-tag--ml { background: #fef9c3; color: #854d0e; }
.dt-mkt-tag--shopee { background: #fee2e2; color: #b91c1c; }

.dt-loading-hint {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-left: 40px !important;
  font-size: 11px;
  color: #94a3b8;
}

/* Total row */
.dt-total-row td {
  background: #1e293b;
  color: #e2e8f0;
  font-weight: 700;
  font-size: 13px;
  border-top: 2px solid #0d9488;
  border-bottom: none;
  position: sticky;
  bottom: 0;
  z-index: 2;
}
.dt-total-row .dt-gmv { color: #f1f5f9; }
.dt-total-row .dt-pos { color: #2dd4bf; }
.dt-total-row .dt-neg { color: #fca5a5; }
.dt-total-row .dt-warn { color: #fcd34d; }

/* Expandable daily rows (legacy — mantidos para outras tabelas) */
.day-row { transition: background .1s; }
.day-row--expanded td { background: #f0fdfb !important; font-weight: 600; }
.day-expand-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
  color: #94a3b8;
  vertical-align: middle;
}
.day-row--expanded .day-expand-icon { color: #0d9488; }
.day-acct-row td {
  background: #f8fafc;
  font-size: 11.5px;
  border-bottom: 1px solid #f1f5f9;
}
.day-acct-row:last-of-type td { border-bottom: 2px solid #e2e8f0; }
.day-acct-indent {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-left: 28px;
}

/* ── TACoS badge ────────────────────────────────────────────────────────── */
.tacos-ok   { color: #0d9488; font-weight: 600; }
.tacos-med  { color: #f59e0b; font-weight: 600; }
.tacos-high { color: #ef4444; font-weight: 600; }

/* ── Dias da Semana ─────────────────────────────────────────────────────── */
.weekday-avg-svg {
  display: block;
  width: 100%;
  height: 190px;
  background: linear-gradient(180deg, #fafbfd 0%, #fff 100%);
  border-radius: 8px;
}

.weekday-compare-area { position: relative; }

.weekday-compare-svg {
  display: block;
  width: 100%;
  height: 230px;
  background: linear-gradient(180deg, #fafbfd 0%, #fff 100%);
  border-radius: 8px;
}

.wd-legend {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding: 0 4px;
}
.wd-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #374151;
}
.wd-legend-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.wd-pill {
  padding: 5px 12px;
  border-radius: 20px;
  border: 1.5px solid #e8edf3;
  background: transparent;
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
}
.wd-pill:hover:not(.wd-pill--on) {
  border-color: #94a3b8;
  color: #374151;
}
.wd-pill--on { font-weight: 700; }

.wd-day-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}

/* ── Pareto 80/20 ──────────────────────────────────────────────────────── */
.pareto-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}
.pareto-bar-bg {
  width: 54px;
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}
.pareto-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width .3s;
}
.pareto-pct {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  min-width: 34px;
  text-align: right;
}
/* Linha de corte — borda inferior tracejada na linha onde o acumulado cruza 80% e 95% */
tr.pareto-line-80 td {
  border-bottom: 2px dashed #6366f1 !important;
  position: relative;
}
tr.pareto-line-80::after {
  content: '◀ 80%';
  position: absolute;
  right: 8px;
  font-size: 10px;
  color: #6366f1;
  font-weight: 700;
}
tr.pareto-line-95 td {
  border-bottom: 2px dashed #f59e0b !important;
}

/* ── Funil de conversão ─────────────────────────────────────────────────── */
.conv-funnel {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}
.conv-visits {
  color: #64748b;
  font-size: 11px;
}
.conv-arrow {
  color: #94a3b8;
  font-size: 10px;
}
.conv-rate {
  font-weight: 700;
  font-size: 12px;
}
.conv-high { color: #0d9488; }
.conv-med  { color: #f59e0b; }
.conv-low  { color: #ef4444; }

/* ── Sazonalidade ───────────────────────────────────────────────────────── */
.saz-intro {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 3px solid #6366f1;
}
.saz-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.saz-kpi-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.saz-kpi-label {
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: .4px;
  margin-bottom: 8px;
  font-weight: 600;
}
.saz-kpi-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.saz-side {
  flex: 1;
}
.saz-side--prev {
  text-align: right;
  opacity: .65;
}
.saz-year-label {
  font-size: 10px;
  color: #94a3b8;
  margin-bottom: 2px;
}
.saz-value {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}
.saz-value--prev {
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}
.saz-delta {
  text-align: center;
  flex-shrink: 0;
}
.saz-pct {
  display: block;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}
.saz-arrow {
  font-size: 9px;
  color: #94a3b8;
  margin-top: 2px;
}
.saz-no-data {
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
}
.saz-chart-wrap {
  position: relative;
}
.saz-chart {
  width: 100%;
  height: 160px;
  display: block;
}
.saz-tooltip {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15,23,42,.88);
  color: #fff;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 12px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 10;
}
.saz-tt-date {
  font-weight: 700;
  margin-bottom: 4px;
  font-size: 11px;
  color: #94a3b8;
}
.saz-tt-row {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.6;
}
.saz-tt-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.saz-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
}

/* ── Multi-select account picker ───────────────────────────────────────── */
.acct-picker-wrap {
  position: relative;
}
.acct-picker-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: border-color .15s, box-shadow .15s;
  min-width: 160px;
  max-width: 300px;
}
.acct-picker-btn:hover { border-color: #0d9488; }
.acct-chip-inline { display: inline-flex; align-items: center; gap: 3px; }
.acct-chip-more  { font-size: 11px; color: #64748b; margin-left: 2px; }

.acct-picker-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 200;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.1);
  min-width: 240px;
  padding: 8px 0 0;
}
.acct-group { padding: 0 10px 8px; }
.acct-group + .acct-group { border-top: 1px solid #f1f5f9; padding-top: 8px; }
.acct-group-header { margin-bottom: 4px; }
.acct-group-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
}
.acct-mkt-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
}
.acct-mkt-badge--ml     { background: #1a1a2e; color: #FFE600; }
.acct-mkt-badge--shopee { background: #fff7f5; color: #EE4D2D; border: 1px solid #EE4D2D40; }
.acct-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
}
.acct-item:hover { background: #f8fafc; }
.acct-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.acct-dot-inline {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
  flex-shrink: 0;
}
.acct-comparative-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  background: #f0fdf4;
  color: #0d9488;
  font-size: 11px;
  border-top: 1px solid #e2e8f0;
}
.acct-picker-footer {
  padding: 6px 10px 8px;
  border-top: 1px solid #f1f5f9;
  text-align: right;
}
.acct-picker-close {
  font-size: 11px;
  color: #64748b;
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  padding: 3px 10px;
  cursor: pointer;
}
.acct-picker-close:hover { background: #f8fafc; }

/* ── Comparative mode banner ────────────────────────────────────────────── */
.comparative-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px;
  background: #f0fdf4;
  border: 1px solid #6ee7b7;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #065f46;
  margin-bottom: 16px;
}
.comp-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid transparent;
}
.comp-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

/* ── DRE breakdown toggle ────────────────────────────────────────────────── */
.dre-breakdown-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 11px;
  color: #64748b;
  cursor: pointer;
  transition: all .15s;
  margin-left: auto;
}
.dre-breakdown-toggle:hover { background: #f1f5f9; color: #0d9488; border-color: #0d9488; }

.dre-breakdown {
  border-top: 1px solid #e8edf3;
  margin-top: 12px;
  padding-top: 12px;
}
.dre-breakdown-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}
.dre-breakdown-table thead th { font-size: 11px; }
.dre-breakdown-table td, .dre-breakdown-table th { padding: 6px 10px; }

/* ── Main layout: sidebar + content ─────────────────────────────────────── */
.dash-page {
  background: #f5f7fa;
  min-height: 100vh;
  padding: 20px 20px 40px;
  color: #374151;
  font-family: 'Inter', 'Roboto', sans-serif;
}
.dash-main-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-top: 16px;
}
.dash-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Hero chart ──────────────────────────────────────────────────────────── */
.hero-chart {
  border: 1.5px solid #e8edf3;
  padding-bottom: 8px;
}
.hero-chart .plotly-wrap {
  margin: 0 -4px;
  border-radius: 10px;
  overflow: hidden;
}
.chart-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.chart-active-metrics {
  display: flex;
  align-items: center;
  gap: 4px;
}
.chart-metric-pip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.chart-loading-badge {
  display: flex;
  align-items: center;
}
.chart-subtitle {
  font-size: 11px;
  margin-top: 2px;
}

/* ── Chart header ───────────────────────────────────────────────────────── */
.chart-header-row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.chart-title-block {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.chart-period-tag {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}
.chart-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chart-filter-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1.5px solid #0d9488;
  background: #f0fdf9;
  color: #0d9488;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background .15s;
}
.chart-filter-btn:active { background: #ccfbf1; }

/* Agregado / Por Conta toggle */
.chart-mode-toggle {
  display: flex;
  gap: 2px;
  background: #f1f5f9;
  border-radius: 9px;
  padding: 3px;
}
.cmt-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 500;
  color: #64748b;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.cmt-btn:hover { color: #0f172a; }
.cmt-btn--on {
  background: #fff;
  color: #0d9488;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0,0,0,.1);
}

/* Help icon no toggle */
.cmt-help-icon {
  color: #94a3b8;
  cursor: pointer;
  margin-left: 2px;
  transition: color .15s;
}
.cmt-help-icon:hover { color: #0d9488; }

/* Tooltip de hints do gráfico */
.cht-tip { display: flex; flex-direction: column; gap: 7px; padding: 2px 0; }
.cht-tip-row { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; line-height: 1.4; }
.cht-tip-muted { font-size: 10.5px; color: #94a3b8; }
.cht-tip-divider { height: 1px; background: rgba(255,255,255,.15); margin: 2px 0; }

/* Barra de modo ativo (abaixo do header, acima do gráfico) */
.chart-mode-bar {
  padding: 6px 16px 4px;
  display: flex;
  align-items: center;
}
.chart-mode-bar-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px 3px 7px;
  border-radius: 20px;
  letter-spacing: .01em;
}
.chart-mode-bar-badge--agg {
  background: rgba(99, 102, 241, .08);
  color: #4f46e5;
  border: 1px solid rgba(99, 102, 241, .18);
}
.chart-mode-bar-badge--acc {
  background: rgba(13, 148, 136, .08);
  color: #0d9488;
  border: 1px solid rgba(13, 148, 136, .2);
}
.chart-mode-bar-badge--week {
  background: rgba(245, 158, 11, .08);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, .2);
}
.chart-mode-bar-hint {
  font-weight: 400;
  color: #64748b;
  font-size: 10.5px;
  margin-left: 2px;
}

/* Metric pills (visíveis no header quando em modo Por Conta / Semana) */
.chart-metric-pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.chart-metric-pill {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  transition: all .15s;
}
.chart-metric-pill:hover { border-color: #94a3b8; color: #374151; }
.chart-metric-pill--on {
  background: color-mix(in srgb, var(--pill-color, #0d9488) 12%, white);
  border-color: var(--pill-color, #0d9488);
  color: var(--pill-color, #0d9488);
  font-weight: 700;
}

.chart-controls-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}
.chart-controls-per-account {
  flex-direction: column;
  align-items: flex-start;
}
.chart-ctrl-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.chart-ctrl-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: .5px;
  min-width: 56px;
}
.mkt-mini-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  margin-left: 4px;
}
.mkt-mini-badge--ml     { background: #1a1a2e; color: #FFE600; }
.mkt-mini-badge--shopee { background: #EE4D2D; color: #fff; }
.acct-loading-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}

/* ── Plotly chart ────────────────────────────────────────────────────────── */
.plotly-wrap {
  position: relative;
  min-height: 180px;
}
.chart-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,.7);
  z-index: 10;
}
.plotly-chart-container {
  width: 100%;
  min-height: 460px;
}
.plotly-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(250, 251, 253, 0.82);
  backdrop-filter: blur(2px);
  border-radius: 10px;
  z-index: 20;
  pointer-events: all;
}
.plotly-loading-text {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  letter-spacing: .01em;
}
.chart-overlay-fade-enter-active,
.chart-overlay-fade-leave-active {
  transition: opacity 0.25s ease;
}
.chart-overlay-fade-enter-from,
.chart-overlay-fade-leave-to {
  opacity: 0;
}

/* ── Ranking tab ─────────────────────────────────────────────────────────── */
.rank-medal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  background: #f1f5f9;
  color: #64748b;
}
.rank-gold   { background: #fef3c7; color: #d97706; }
.rank-silver { background: #f1f5f9; color: #64748b; }
.rank-bronze { background: #fef0e7; color: #c2410c; }

.ranking-highlights {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.ranking-highlight-card {
  background: #fff;
  border: 1.5px solid #e8edf3;
  border-radius: 12px;
  padding: 14px 16px;
}
.rh-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.rh-winner {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}
.rh-value {
  font-size: 18px;
  font-weight: 800;
  color: #0d9488;
  margin-bottom: 4px;
}
.rh-loser {
  font-size: 11px;
}

/* ══════════════════════════════════════════════════════════════════════════
   MOBILE — @media (max-width: 768px) e (max-width: 600px)
══════════════════════════════════════════════════════════════════════════ */

@media (max-width: 768px) {
  .dash-main-layout {
    flex-direction: column;
  }
}

@media (max-width: 600px) {
  /* ── Página ── */
  .dash-page {
    padding: 12px 12px 40px;
  }

  /* Impede que flex column filho expanda além do viewport */
  .dash-main-layout {
    width: 100%;
    overflow-x: hidden;
  }
  .dash-content {
    width: 100%;
    overflow-x: hidden;
  }

  /* ── Today banner — grid 3×2 ── */
  .today-kpis {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px 0;
    overflow-x: visible;
    padding-bottom: 0;
  }

  /* 6 métricas = 2 linhas × 3 colunas perfeitas; oculta Unidades */
  .today-kpis > .today-kpi:last-child {
    display: none;
  }

  .today-kpi {
    min-width: 0;
    padding: 0 6px;
    border-right: 1px solid #eef2f6;
  }

  /* no grid, o divisor via `& + &` (border-left) do desktop vira ruído */
  .today-kpi + .today-kpi {
    border-left: none;
  }

  /* remove borda da 3ª coluna (nth-of-type conta apenas .today-kpi) */
  .today-kpi:nth-of-type(3n) {
    border-right: none;
  }

  .today-kpi-label {
    font-size: 9px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .today-kpi-val {
    font-size: 13px;
    white-space: nowrap;
  }

  /* ── KPI Grid — 2 colunas ── */
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }

  /* ── KPI cards — barra lateral colorida, sem sparkline ── */
  .kpi-card {
    padding: 10px 10px 10px 14px;
    border-radius: 10px;
  }

  /* Converte barra do topo em barra lateral esquerda */
  .kpi-card::before {
    right: auto;
    width: 4px;
    height: auto;
    bottom: 0;
    border-radius: 10px 0 0 10px;
  }

  .sparkline {
    display: none;
  }

  .kpi-label {
    font-size: 9px;
    margin-bottom: 3px;
    letter-spacing: .5px;
  }

  .kpi-value {
    font-size: 17px;
    line-height: 1.15;
  }

  .kpi-sub {
    font-size: 9px;
  }

  .kpi-delta {
    font-size: 10px;
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
  }

  /* ── Chart card ── */
  .chart-card {
    padding: 14px 8px 8px;
    border-radius: 12px;
    overflow: hidden;
  }

  .plotly-chart-container {
    min-height: 260px;
  }

  .plotly-wrap {
    min-height: 260px;
  }

  /* ── Waterfall P&L — colunas menores ── */
  .waterfall-card {
    padding: 14px 12px 12px;
  }

  .wf-step {
    grid-template-columns: 110px 1fr 130px;
    gap: 8px;
  }

  .wf-label {
    font-size: 11px;
  }

  .wf-arrow {
    margin-left: 110px;
  }

  .projection-badge {
    font-size: 11px;
    padding: 4px 10px;
  }

  /* ── Tabela DRE diária ── */
  .daily-table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 12px 12px 10px;
  }

  .daily-table thead th,
  .daily-table td {
    padding: 6px 8px;
    font-size: 11px;
  }

  .daily-table thead th {
    font-size: 9.5px;
  }

  /* ── Ranking grids — 1 coluna ── */
  .ranking-highlights {
    grid-template-columns: 1fr;
  }

  .cnpj-grid {
    grid-template-columns: 1fr;
  }

  .mp-grid {
    grid-template-columns: 1fr;
  }

  .saz-kpi-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .saz-kpi-card {
    padding: 12px 12px;
  }

  /* ── Table card genérico ── */
  .table-card {
    border-radius: 12px;
  }

  /* ── Tab bar ── */
  .tab-bar {
    overflow-x: auto;
    flex-wrap: nowrap;
    scrollbar-width: none;
  }

  .tab-bar::-webkit-scrollbar { display: none; }

  .tab-btn {
    white-space: nowrap;
    padding: 7px 12px;
    font-size: 12px;
  }

  /* ── Today banner ── */
  .today-banner {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 10px 14px;
  }

  .today-label {
    flex-direction: row;
    align-items: baseline;
    gap: 6px;
    padding-right: 0;
    padding-bottom: 6px;
    margin-right: 0;
    border-right: none;
    border-bottom: 1px solid #eef2f6;
  }

  /* ── CMV Alert ── */
  .cmv-alert {
    font-size: 12px;
    padding: 10px 12px;
  }
}
</style>
