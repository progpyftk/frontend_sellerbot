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
        <!-- Filtro de marketplace -->
        <div class="mkt-filter-group">
          <button :class="['mkt-btn', activeMarketplace === 'all' && 'mkt-btn--on']"
            @click="activeMarketplace = 'all'">
            <q-icon name="all_inclusive" size="13px" />Todos
          </button>
          <button :class="['mkt-btn', 'mkt-btn--ml', activeMarketplace === 'ml' && 'mkt-btn--on']"
            @click="activeMarketplace = 'ml'">
            <img src="/img/ml-logo.svg" height="13" style="vertical-align:middle" onerror="this.style.display='none'" />
            Mercado Livre
          </button>
          <button :class="['mkt-btn', 'mkt-btn--shopee', activeMarketplace === 'shopee' && 'mkt-btn--on']"
            @click="activeMarketplace = 'shopee'">
            <img src="/img/shopee-logo.svg" height="13" style="vertical-align:middle" onerror="this.style.display='none'" />
            Shopee
          </button>
        </div>

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

    <!-- ══════════ ACCOUNT FILTER PILLS ════════════════════════════════════ -->
    <div v-if="knownAccounts.length > 1 && activeMarketplace !== 'shopee'" class="acct-filter-bar">
      <span class="acct-filter-label">Conta:</span>
      <button :class="['acct-pill', !selectedAccountId && 'acct-pill--on']" @click="selectAccount(null)">
        <q-icon name="all_inclusive" size="11px" />
        Todas
      </button>
      <button v-for="a in knownAccounts" :key="a.id"
        :class="['acct-pill', selectedAccountId === a.id && 'acct-pill--on']"
        @click="selectAccount(a.id)">
        {{ a.label }}
      </button>
    </div>

    <!-- ══════════ LOADING / EMPTY ══════════════════════════════════════════ -->
    <div v-if="loading" class="loading-center">
      <q-spinner-dots color="teal" size="48px" />
      <div class="loading-text">Carregando dados...</div>
    </div>

    <template v-else-if="data || shopeeData">

      <!-- ══════════ HOJE EM DESTAQUE ══════════════════════════════════════ -->
      <div v-if="combinedToday && activeDatePreset !== 'hoje'" class="today-banner">
        <div class="today-label">
          <span class="live-dot"></span>
          Hoje
        </div>
        <div class="today-kpis">
          <div class="today-kpi">
            <div class="today-kpi-label">GMV do Dia</div>
            <div class="today-kpi-val today-gmv">{{ fmt(combinedToday.gmv) }}</div>
          </div>
          <div class="today-sep">|</div>
          <div class="today-kpi">
            <div class="today-kpi-label">Pedidos</div>
            <div class="today-kpi-val">{{ combinedToday.orders_count || 0 }}</div>
          </div>
          <div class="today-sep">|</div>
          <div class="today-kpi">
            <div class="today-kpi-label">Receita Líquida</div>
            <div class="today-kpi-val">{{ fmt(combinedToday.net_revenue) }}</div>
          </div>
          <div class="today-sep">|</div>
          <div class="today-kpi">
            <div class="today-kpi-label">Lucro Bruto</div>
            <div class="today-kpi-val" :class="(combinedToday.gross_profit || 0) >= 0 ? 'today-pos' : 'today-neg'">{{ fmt(combinedToday.gross_profit) }}</div>
          </div>
          <div class="today-sep">|</div>
          <div class="today-kpi">
            <div class="today-kpi-label">Lucro Após Ads</div>
            <div class="today-kpi-val" :class="(combinedToday.lucro_liquido || 0) >= 0 ? 'today-pos' : 'today-neg'">{{ fmt(combinedToday.lucro_liquido) }}</div>
          </div>
          <div class="today-sep">|</div>
          <div class="today-kpi">
            <div class="today-kpi-label">Ticket Médio</div>
            <div class="today-kpi-val">{{ fmt(combinedToday.avg_ticket) }}</div>
          </div>
          <div class="today-sep">|</div>
          <div class="today-kpi">
            <div class="today-kpi-label">Unidades</div>
            <div class="today-kpi-val">{{ combinedToday.units_sold || 0 }}</div>
          </div>
        </div>
        <div class="today-note">Tempo real — leitura direta dos pedidos</div>
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

      <!-- ══════════ CASCATA P&L ════════════════════════════════════════════ -->
      <div class="waterfall-card" v-if="op?.gmv">
        <div class="waterfall-header">
          <div class="waterfall-title">
            <q-icon name="waterfall_chart" size="16px" class="q-mr-xs" />
            Cascata P&L
          </div>
          <div class="waterfall-subtitle">Fluxo completo de margem no período</div>
          <!-- Projeção do mês -->
          <div class="projection-badge" v-if="monthProjection">
            <q-icon name="trending_up" size="12px" />
            Projeção mês: <strong>{{ fmt(monthProjection.gmv) }}</strong> GMV · <strong>{{ fmt(monthProjection.lucro) }}</strong> lucro
            <span class="muted" style="font-size:10px">(dia {{ monthProjection.dayOfMonth }} de {{ monthProjection.daysInMonth }})</span>
          </div>
        </div>
        <div class="waterfall-steps">
          <div class="wf-step wf-step--start">
            <div class="wf-label">GMV</div>
            <div class="wf-bar-wrap">
              <div class="wf-bar wf-bar--gmv" style="width:100%"></div>
            </div>
            <div class="wf-value">{{ fmt(op?.gmv) }}</div>
          </div>
          <div class="wf-arrow">▼</div>
          <div class="wf-step wf-step--deduct">
            <div class="wf-label">− Tarifas ML</div>
            <div class="wf-bar-wrap">
              <div class="wf-bar wf-bar--deduct" :style="{ width: wfPct(op?.total_fees, op?.gmv) + '%' }"></div>
            </div>
            <div class="wf-value wf-value--neg">−{{ fmt(op?.total_fees) }} <span class="wf-pct">({{ wfPct(op?.total_fees, op?.gmv).toFixed(1) }}%)</span></div>
          </div>
          <div class="wf-arrow">▼</div>
          <div class="wf-step wf-step--result">
            <div class="wf-label">= Rec. Líquida</div>
            <div class="wf-bar-wrap">
              <div class="wf-bar wf-bar--net" :style="{ width: wfPct(op?.net_revenue, op?.gmv) + '%' }"></div>
            </div>
            <div class="wf-value">{{ fmt(op?.net_revenue) }} <span class="wf-pct">({{ wfPct(op?.net_revenue, op?.gmv).toFixed(1) }}% do GMV)</span></div>
          </div>
          <div class="wf-arrow">▼</div>
          <div class="wf-step wf-step--deduct">
            <div class="wf-label">− CPV (custo do produto)</div>
            <div class="wf-bar-wrap">
              <div class="wf-bar wf-bar--deduct" :style="{ width: wfPct(op?.cmv_total, op?.gmv) + '%' }"></div>
            </div>
            <div class="wf-value wf-value--neg">−{{ fmt(op?.cmv_total) }} <span class="wf-pct">({{ wfPct(op?.cmv_total, op?.gmv).toFixed(1) }}%)</span></div>
          </div>
          <div class="wf-arrow">▼</div>
          <div class="wf-step wf-step--result">
            <div class="wf-label">= Lucro Bruto</div>
            <div class="wf-bar-wrap">
              <div class="wf-bar wf-bar--gp" :style="{ width: wfPct(op?.gross_profit, op?.gmv) + '%' }"></div>
            </div>
            <div class="wf-value">{{ fmt(op?.gross_profit) }} <span class="wf-pct">({{ wfPct(op?.gross_profit, op?.gmv).toFixed(1) }}% do GMV)</span></div>
          </div>
          <div class="wf-arrow">▼</div>
          <div class="wf-step wf-step--deduct">
            <div class="wf-label">− Investimento Ads</div>
            <div class="wf-bar-wrap">
              <div class="wf-bar wf-bar--ads" :style="{ width: wfPct(op?.ads_cost, op?.gmv) + '%' }"></div>
            </div>
            <div class="wf-value wf-value--warn">−{{ fmt(op?.ads_cost) }} <span class="wf-pct">(TACoS {{ wfPct(op?.ads_cost, op?.gmv).toFixed(1) }}%)</span></div>
          </div>
          <div class="wf-arrow">▼</div>
          <div class="wf-step wf-step--final" :class="(op?.lucro_liquido || 0) >= 0 ? 'wf-step--pos' : 'wf-step--neg'">
            <div class="wf-label">= Lucro Real</div>
            <div class="wf-bar-wrap">
              <div class="wf-bar" :class="(op?.lucro_liquido || 0) >= 0 ? 'wf-bar--ll' : 'wf-bar--neg'"
                :style="{ width: Math.abs(wfPct(op?.lucro_liquido, op?.gmv)) + '%' }"></div>
            </div>
            <div class="wf-value wf-value--highlight">
              {{ fmt(op?.lucro_liquido) }}
              <span class="wf-pct">({{ wfPct(op?.lucro_liquido, op?.gmv).toFixed(1) }}% margem)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════ KPI CARDS ══════════════════════════════════════════════ -->
      <div class="kpi-grid">

        <div class="kpi-card kpi-gmv">
          <div class="kpi-label">
            GMV
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">Faturamento bruto total — o valor que o comprador pagou. Não desconta tarifas nem custo do produto.</q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value">{{ fmt(op?.gmv) }}</div>
          <svg class="sparkline" viewBox="0 0 60 20" preserveAspectRatio="none">
            <path :d="sparklinePath('gmv')" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <div class="kpi-delta" :class="deltaClass(op?.vs_prev?.gmv)">
            <q-icon :name="deltaIcon(op?.vs_prev?.gmv)" size="12px" />
            {{ deltaFmt(op?.vs_prev?.gmv) }} vs período anterior
          </div>
        </div>

        <div class="kpi-card kpi-net">
          <div class="kpi-label">
            Receita Líquida
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">GMV menos as tarifas cobradas pelo Mercado Livre. É o que entra na sua conta.</q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value">{{ fmt(op?.net_revenue) }}</div>
          <svg class="sparkline" viewBox="0 0 60 20" preserveAspectRatio="none">
            <path :d="sparklinePath('net_revenue')" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <div class="kpi-delta" :class="deltaClass(op?.vs_prev?.net_revenue)">
            <q-icon :name="deltaIcon(op?.vs_prev?.net_revenue)" size="12px" />
            {{ deltaFmt(op?.vs_prev?.net_revenue) }} vs período anterior
          </div>
        </div>

        <div class="kpi-card kpi-gp">
          <div class="kpi-label">
            Lucro Bruto
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">Receita Líquida menos o CPV. Lucro antes de descontar marketing.</q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value">{{ fmt(op?.gross_profit) }}</div>
          <svg class="sparkline" viewBox="0 0 60 20" preserveAspectRatio="none">
            <path :d="sparklinePath('gross_profit')" fill="none" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <div class="kpi-sub">Margem {{ pct(op?.gross_profit, op?.net_revenue) }}</div>
          <div class="kpi-delta" :class="deltaClass(op?.vs_prev?.gross_profit)">
            <q-icon :name="deltaIcon(op?.vs_prev?.gross_profit)" size="12px" />
            {{ deltaFmt(op?.vs_prev?.gross_profit) }} vs período anterior
          </div>
        </div>

        <div class="kpi-card kpi-ll">
          <div class="kpi-label">
            Lucro após Ads
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">Lucro Bruto menos o gasto com Ads. O lucro real da operação.</q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value kpi-highlight">{{ fmt(op?.lucro_liquido) }}</div>
          <svg class="sparkline" viewBox="0 0 60 20" preserveAspectRatio="none">
            <path :d="sparklinePath('lucro_liquido')" fill="none" stroke="#0d9488" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <div class="kpi-sub">Margem {{ pct(op?.lucro_liquido, op?.net_revenue) }}</div>
          <div class="kpi-delta" :class="deltaClass(op?.vs_prev?.lucro_liquido)">
            <q-icon :name="deltaIcon(op?.vs_prev?.lucro_liquido)" size="12px" />
            {{ deltaFmt(op?.vs_prev?.lucro_liquido) }} vs período anterior
          </div>
        </div>

        <div class="kpi-card kpi-ads">
          <div class="kpi-label">
            Gasto com Ads
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">Total investido em Ads. TACoS = Ads / GMV total.</q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value kpi-warn">{{ fmt(op?.ads_cost) }}</div>
          <svg class="sparkline" viewBox="0 0 60 20" preserveAspectRatio="none">
            <path :d="sparklinePath('ads_cost')" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <div class="kpi-sub">TACoS {{ pctRaw(op?.ads_cost, op?.gmv) }}</div>
          <div class="kpi-delta" :class="deltaClass(-(op?.vs_prev?.ads_cost || 0))">
            <q-icon :name="deltaIcon(-(op?.vs_prev?.ads_cost || 0))" size="12px" />
            {{ deltaFmt(op?.vs_prev?.ads_cost) }} vs período anterior
          </div>
        </div>

        <div class="kpi-card kpi-orders">
          <div class="kpi-label">
            Pedidos Pagos
            <q-icon name="help_outline" size="12px" class="kpi-info">
              <q-tooltip max-width="220px" class="kpi-tooltip-pop">Quantidade de pedidos pagos. Ticket médio = GMV ÷ pedidos.</q-tooltip>
            </q-icon>
          </div>
          <div class="kpi-value">{{ (op?.orders_count || 0).toLocaleString('pt-BR') }}</div>
          <svg class="sparkline" viewBox="0 0 60 20" preserveAspectRatio="none">
            <path :d="sparklinePath('orders_count')" fill="none" stroke="#ec4899" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <div class="kpi-sub">Ticket médio {{ fmt(op?.avg_ticket) }}</div>
          <div class="kpi-delta" :class="deltaClass(op?.vs_prev?.orders_count)">
            <q-icon :name="deltaIcon(op?.vs_prev?.orders_count)" size="12px" />
            {{ deltaFmt(op?.vs_prev?.orders_count) }} vs período anterior
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
          <div class="kpi-value">{{ (op?.units_sold || 0).toLocaleString('pt-BR') }}</div>
          <div class="kpi-sub">{{ op?.catalog_orders_count || 0 }} via catálogo · {{ op?.flex_orders_count || 0 }} Flex</div>
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
          <div class="kpi-value">{{ op?.roas ? op?.roas + 'x' : '—' }}</div>
          <div class="kpi-sub">ACoS {{ op?.acos != null ? op?.acos + '%' : '—' }}</div>
          <div class="kpi-delta" :class="deltaClass(-(op?.vs_prev?.tacos || 0))">
            <q-icon :name="deltaIcon(-(op?.vs_prev?.tacos || 0))" size="12px" />
            TACoS {{ deltaFmt(op?.vs_prev?.tacos) }} vs anterior
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
          <div class="kpi-value" :class="(op?.lucro_liquido_pct || 0) >= 0 ? 'kpi-highlight' : 'neg'">
            {{ op?.lucro_liquido_pct != null ? op?.lucro_liquido_pct + '%' : '—' }}
          </div>
          <div class="kpi-sub">Margem bruta {{ op?.gross_margin_pct != null ? op?.gross_margin_pct + '%' : '—' }}</div>
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
          <div class="kpi-value" :class="(op?.canceled_count || 0) > 0 ? 'kpi-warn' : ''">
            {{ op?.canceled_count || 0 }}
          </div>
          <div class="kpi-sub" v-if="op?.orders_count">
            Taxa {{ pctRaw(op?.canceled_count, (op?.orders_count || 0) + (op?.canceled_count || 0)) }}
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
              <button :class="['metric-btn', 'metric-btn--normalize', normalizeChart && 'metric-btn--on']"
                :style="normalizeChart ? 'background:#64748b20;color:#64748b;border-color:#64748b' : ''"
                @click="normalizeChart = !normalizeChart">
                <q-icon name="show_chart" size="11px" />
                Normalizar
              </button>

            </div>
          </div>

          <div class="chart-area" v-if="chartData.length">
            <!-- SVG line chart -->
            <svg class="line-chart-svg" :viewBox="`0 0 ${SVG_W} ${SVG_H}`" preserveAspectRatio="none"
              @mousemove="onChartMouseMove" @mouseleave="hoveredIdx = null">

              <!-- Gradient defs -->
              <defs>
                <linearGradient v-for="m in chartMetrics" :key="'grad-' + m.key"
                  :id="'grad-' + m.key" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" :stop-color="m.color" stop-opacity="0.22" />
                  <stop offset="100%" :stop-color="m.color" stop-opacity="0" />
                </linearGradient>
              </defs>

              <!-- Y grid lines (dashed) -->
              <line v-for="(tick, i) in svgYTicks" :key="'g' + i" :x1="PLOT.x0" :y1="svgY(tick)" :x2="PLOT.x1"
                :y2="svgY(tick)" stroke="#e8edf3" stroke-width="1" stroke-dasharray="4 4" />

              <!-- X axis baseline -->
              <line :x1="PLOT.x0" :y1="PLOT.y1" :x2="PLOT.x1" :y2="PLOT.y1" stroke="#e0e5ed" stroke-width="1.5" />

              <!-- Area fills with gradient -->
              <path v-for="m in chartMetrics.filter(m => activeMetrics.includes(m.key))" :key="'area-' + m.key"
                :d="smoothArea(m.key)" :fill="`url(#grad-${m.key})`" />

              <!-- Smooth lines -->
              <path v-for="m in chartMetrics.filter(m => activeMetrics.includes(m.key))" :key="'line-' + m.key"
                :d="smoothLine(m.key)" :stroke="m.color" stroke-width="2.5" fill="none"
                stroke-linejoin="round" stroke-linecap="round" />

              <!-- Hover vertical line -->
              <line v-if="hoveredIdx !== null" :x1="svgXAt(hoveredIdx)" y1="10" :x2="svgXAt(hoveredIdx)" :y2="PLOT.y1"
                stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3" />

              <!-- Eixo direito: linha separadora (apenas quando ads está ativo) -->
              <line v-if="adsActive" :x1="PLOT.x1" :y1="PLOT.y0" :x2="PLOT.x1" :y2="PLOT.y1"
                stroke="#fde68a" stroke-width="1" stroke-dasharray="3 4" opacity="0.8" />

              <!-- Dots on hover -->
              <template v-if="hoveredIdx !== null">
                <circle v-for="m in chartMetrics.filter(m => activeMetrics.includes(m.key))" :key="'dot-' + m.key"
                  :cx="svgXAt(hoveredIdx)" :cy="svgYForMetric(m.key, chartData[hoveredIdx]?.[m.key] || 0)" r="5" :fill="m.color"
                  stroke="#ffffff" stroke-width="2.5" />
              </template>

              <!-- X axis labels (every N days) -->
              <text v-for="(d, i) in chartData" :key="'xl' + i" v-show="showXLabel(i)" :x="svgXAt(i)" :y="SVG_H - 1"
                text-anchor="middle" font-size="10" fill="#9aa0ac">{{ d.dateLabel }}</text>

              <!-- Y axis labels (esquerda) -->
              <text v-for="(tick, i) in svgYTicks" :key="'yl' + i" :x="PLOT.x0 - 6" :y="svgY(tick) + 4"
                text-anchor="end" font-size="10" fill="#64748b" font-weight="500">{{ fmtTick(tick) }}</text>

              <!-- Y axis labels (direita — Ads) -->
              <template v-if="adsActive">
                <text v-for="(tick, i) in svgYTicksRight" :key="'yr' + i" :x="PLOT.x1 + 6" :y="svgYRight(tick) + 4"
                  text-anchor="start" font-size="10" fill="#d97706" font-weight="500">{{ fmtShort(tick) }}</text>
                <!-- Label "Ads →" no topo do eixo direito -->
                <text :x="PLOT.x1 + 6" :y="PLOT.y0 - 2"
                  text-anchor="start" font-size="9" fill="#f59e0b" font-weight="600" letter-spacing="0.5">ADS</text>
              </template>
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
                  <th class="right">TACoS</th>
                  <th class="right">Lucro Após Ads</th>
                  <th class="right">Pedidos</th>
                  <th class="right">Margem LL</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in chartDataDesc" :key="d.date"
                  :class="d.lucro_liquido < 0 ? 'row-negative' : ''">
                  <td>{{ d.dateLabel }}</td>
                  <td class="right">{{ fmt(d.gmv) }}</td>
                  <td class="right">{{ fmt(d.net_revenue) }}</td>
                  <td class="right">{{ fmt(d.gross_profit) }}</td>
                  <td class="right warn">{{ fmt(d.ads_cost) }}</td>
                  <td class="right">
                    <span :class="d.gmv > 0 ? tacosBadgeClass(d.ads_cost / d.gmv * 100) : ''">
                      {{ d.gmv > 0 ? (d.ads_cost / d.gmv * 100).toFixed(1) + '%' : '—' }}
                    </span>
                  </td>
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
                  <td class="right">{{ chartTotals.gmv > 0 ? (chartTotals.ads_cost / chartTotals.gmv * 100).toFixed(1) + '%' : '—' }}</td>
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
          <div v-if="activeMarketplace !== 'ml' && shopeeData" class="mp-card mp-card--shopee">
            <div class="mp-name">
              <q-icon name="shopping_bag" size="16px" class="q-mr-xs text-deep-orange" />
              Shopee
            </div>
            <div class="mp-kpis">
              <div class="mp-kpi"><span class="mp-kpi-label">GMV</span> <span class="mp-kpi-val">{{ fmt(shopeeData.gmv) }}</span></div>
              <div class="mp-kpi"><span class="mp-kpi-label">Rec. Estimada</span> <span class="mp-kpi-val">{{ fmt(shopeeData.net_revenue) }}</span></div>
              <div class="mp-kpi"><span class="mp-kpi-label">Lucro</span> <span class="mp-kpi-val" :class="(shopeeData.gross_profit || 0) >= 0 ? 'pos' : 'neg'">{{ fmt(shopeeData.gross_profit) }}</span></div>
              <div class="mp-kpi"><span class="mp-kpi-label">Pedidos</span> <span class="mp-kpi-val">{{ shopeeData.orders_count }}</span></div>
            </div>
            <div class="gmv-bar-wrap q-mt-sm">
              <div class="gmv-bar-fill gmv-bar-fill--shopee" :style="{ width: combinedGmvShare('shopee', shopeeData.gmv) + '%' }"></div>
              <span class="gmv-bar-pct">{{ combinedGmvShare('shopee', shopeeData.gmv) }}% do GMV total</span>
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
                <tr v-for="a in shopeeData.by_account" :key="'sh-' + a.account_id">
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
                  <th class="right">Tarifas</th>
                  <th class="right">CPV</th>
                  <th class="right">Lucro Bruto</th>
                  <th class="right">Margem</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in topProductsSorted" :key="p.item_id || p.sku">
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
                <option value="gross_profit">Lucro Bruto</option>
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
import ShopeeService from 'src/services/ShopeeService'

// ── State ─────────────────────────────────────────────────────────────────
const loading = ref(false)
const data = ref(null)
const todayData = ref(null)
const shopeeData = ref(null)     // dados Shopee para o período
const shopeeTodayData = ref(null) // dados Shopee de hoje

// Filtro de marketplace: 'all' | 'ml' | 'shopee'
const activeMarketplace = ref('all')
const hoveredIdx = ref(null)
const activeTab = ref('evolucao')
const activeMetrics = ref(['gmv', 'lucro_liquido'])
const activeDatePreset = ref('30d')
const normalizeChart = ref(false)
const topGroupBy = ref('item')
const topSortBy = ref('gross_profit')

// Filtro por conta
const selectedAccountId = ref(null)
const knownAccounts = ref([])  // persiste mesmo quando account_id está filtrado

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

// ── Config ────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'evolucao', label: 'Evolução',      icon: 'show_chart' },
  { key: 'contas',   label: 'Contas & CNPJ', icon: 'account_balance' },
  { key: 'produtos', label: 'Top Produtos',  icon: 'inventory_2' },
  { key: 'flex',     label: 'Flex Delivery', icon: 'electric_bike' },
  { key: 'semana',   label: 'Dias da Semana', icon: 'event_note' },
]

const chartMetrics = [
  { key: 'gmv', label: 'GMV', color: '#6366f1' },
  { key: 'net_revenue', label: 'Rec. Líquida', color: '#0ea5e9' },
  { key: 'gross_profit', label: 'Lucro Bruto', color: '#10b981' },
  { key: 'lucro_liquido', label: 'Lucro Após Ads', color: '#0d9488' },
  { key: 'ads_cost', label: 'Ads', color: '#f59e0b' },
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
  const mlDaily      = activeMarketplace.value !== 'shopee' ? (data.value?.daily || []) : []
  const shopeeDaily  = activeMarketplace.value !== 'ml'     ? (shopeeData.value?.daily || []) : []

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
      byDate[d.date].lucro_liquido = (byDate[d.date].lucro_liquido || 0) + (d.gross_profit || 0)
      byDate[d.date].orders_count += d.orders_count || 0
    } else {
      byDate[d.date] = {
        date:          d.date,
        gmv:           d.gmv || 0,
        net_revenue:   d.net_revenue || 0,
        gross_profit:  d.gross_profit || 0,
        ads_cost:      0,
        lucro_liquido: d.gross_profit || 0,
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

// Produtos ordenados pelo critério selecionado
const topProductsSorted = computed(() => {
  const prods = [...(data.value?.top_products || [])]
  return prods.sort((a, b) => (b[topSortBy.value] || 0) - (a[topSortBy.value] || 0))
})

// Flex: dados diários com flex_orders_count
const flexDailyData = computed(() => {
  const daily = data.value?.daily || []
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
async function load() {
  loading.value = true
  try {
    const params = {
      date_from: dateFrom.value,
      date_to:   dateTo.value,
      group_by:  topGroupBy.value,
    }
    if (selectedAccountId.value) params.account_id = selectedAccountId.value

    const [mlRes, shopeeRes] = await Promise.allSettled([
      MercadoLivreService.getDashboardOperation(params),
      ShopeeService.getDashboardStats({ date_from: dateFrom.value, date_to: dateTo.value }),
    ])
    data.value       = mlRes.status === 'fulfilled' ? mlRes.value.data : null
    shopeeData.value = shopeeRes.status === 'fulfilled' ? shopeeRes.value.data : null

    // Atualiza lista de contas conhecidas apenas quando sem filtro (para manter as pills visíveis)
    if (!selectedAccountId.value && data.value?.accounts?.length) {
      knownAccounts.value = data.value.accounts.map(a => ({ id: a.account_id, label: a.account_nickname }))
    }
  } catch (e) {
    console.error('Dashboard error', e)
    data.value = null
  } finally {
    loading.value = false
  }
}

function selectAccount(id) {
  selectedAccountId.value = id
  load()
}

async function loadToday() {
  try {
    const [mlRes, shopeeRes] = await Promise.allSettled([
      MercadoLivreService.getDashboardToday(),
      ShopeeService.getTodayStats(),
    ])
    todayData.value      = mlRes.status === 'fulfilled' ? mlRes.value.data : null
    shopeeTodayData.value = shopeeRes.status === 'fulfilled' ? shopeeRes.value.data : null
  } catch (e) {
    console.error('Today data error', e)
  }
}

// ── Dados combinados (ML + Shopee) ────────────────────────────────────────
const combinedToday = computed(() => {
  const ml = todayData.value
  const sh = shopeeTodayData.value
  if (activeMarketplace.value === 'ml')     return ml ? { ...ml } : null
  if (activeMarketplace.value === 'shopee') return sh ? shopeeToMLFormat(sh) : null

  // all: soma ML + Shopee
  if (!ml && !sh) return null
  return {
    gmv:          (ml?.gmv || 0) + (sh?.faturamento || 0),
    orders_count: (ml?.orders_count || 0) + (sh?.count_paid || 0),
    net_revenue:  (ml?.net_revenue || 0) + (sh?.faturamento || 0),
    gross_profit: (ml?.gross_profit || 0) + (sh?.lucro_apos_cmp || 0),
    lucro_liquido: (ml?.lucro_liquido || 0) + (sh?.lucro_apos_cmp || 0),
    units_sold:   (ml?.units_sold || 0),
    avg_ticket:   null, // recalculado abaixo
    _ml: ml,
    _shopee: sh,
  }
})

function shopeeToMLFormat(sh) {
  return {
    gmv:          sh.faturamento || 0,
    orders_count: sh.count_paid || 0,
    net_revenue:  sh.faturamento || 0,
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

  const ml = activeMarketplace.value !== 'shopee' ? data.value?.operation : null
  const sh = activeMarketplace.value !== 'ml'     ? shopeeData.value      : null

  if (!ml && !sh) return null
  if (!sh) return ml
  if (!ml) return {
    gmv:          sh.gmv,
    net_revenue:  sh.net_revenue,
    gross_profit: sh.gross_profit || 0,
    lucro_liquido: sh.gross_profit || 0,
    orders_count: sh.orders_count,
    avg_ticket:   sh.avg_ticket,
    units_sold:   sh.units_sold,
    ads_cost:     0,
    total_fees:   0,
    cmv_total:    0,
    lucro_liquido_pct: sh.net_revenue ? +((sh.gross_profit || 0) / sh.net_revenue * 100).toFixed(2) : null,
    gross_margin_pct:  null,
    vs_prev: null,
  }

  return {
    gmv:           (ml.gmv || 0) + (sh.gmv || 0),
    net_revenue:   (ml.net_revenue || 0) + (sh.net_revenue || 0),
    gross_profit:  (ml.gross_profit || 0) + (sh.gross_profit || 0),
    lucro_liquido: (ml.lucro_liquido || 0) + (sh.gross_profit || 0),
    orders_count:  (ml.orders_count || 0) + (sh.orders_count || 0),
    units_sold:    (ml.units_sold || 0) + (sh.units_sold || 0),
    avg_ticket:    null,
    ads_cost:      ml.ads_cost || 0,
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
  const shopeeGmv = shopeeData.value?.gmv      || 0
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
}

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
function sparklinePath(metric) {
  const data = chartData.value
  if (!data.length) return ''
  const vals = data.map(d => d[metric] || 0)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const n = vals.length
  const pts = vals.map((v, i) => {
    const x = n <= 1 ? 30 : (i / (n - 1)) * 60
    const y = 20 - ((v - min) / span) * 18
    return [x, y]
  })
  if (pts.length === 1) return `M ${pts[0][0]},${pts[0][1]}`
  let path = `M ${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1][0] + pts[i][0]) / 2
    path += ` C ${mx},${pts[i - 1][1]} ${mx},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`
  }
  return path
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

onMounted(() => { load(); loadToday() })
</script>

<style scoped>
/* ── Page ──────────────────────────────────────────────────────────────── */
.dash-page {
  background: #f5f7fa;
  min-height: 100vh;
  padding: 24px;
  color: #374151;
  font-family: 'Inter', 'Roboto', sans-serif;
}

/* ── Header ────────────────────────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
  background: #fff;
  border: 1.5px solid #e8edf3;
  border-radius: 14px;
  padding: 14px 20px;
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
  color: #9aa0ac;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1f36;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* ── Marketplace filter ────────────────────────────────────────────────── */
.mkt-filter-group {
  display: flex; align-items: center; gap: 4px;
  background: #f1f5f9; border-radius: 8px;
  padding: 3px;
}
.mkt-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 6px;
  font-size: 12px; font-weight: 500; color: #64748b;
  border: none; background: transparent; cursor: pointer;
  transition: all .15s;
}
.mkt-btn:hover { background: #e2e8f0; color: #334155; }
.mkt-btn--on { background: #fff; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,.1); font-weight: 700; }
.mkt-btn--ml.mkt-btn--on { color: #FFE600; background: #1a1a2e; }
.mkt-btn--shopee.mkt-btn--on { color: #EE4D2D; background: #fff7f5; }

/* ── Date range ────────────────────────────────────────────────────────── */
.date-range-group {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f5f7fa;
  border-radius: 10px;
  padding: 6px 10px;
  border: 1.5px solid #e8edf3;
}

.date-preset-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #6b7280;
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
  background: #e8edf3;
  color: #374151;
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
}

.date-sep {
  color: #d1d5db;
  font-size: 12px;
}

.date-inp {
  font-size: 12px;
  color: #374151;
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
  color: #9aa0ac;
  font-size: 14px;
}

/* ── Today banner ───────────────────────────────────────────────────────── */
.today-banner {
  background: linear-gradient(135deg, #f0fdf9, #e8faf6);
  border: 1.5px solid #0d9488;
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
  color: #0d9488;
  text-transform: uppercase;
  letter-spacing: .8px;
  white-space: nowrap;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #0d9488;
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
  color: #d1d5db;
  font-size: 20px;
  line-height: 1;
}

.today-kpi {
  text-align: center;
}

.today-kpi-label {
  font-size: 10px;
  color: #9aa0ac;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 2px;
}

.today-kpi-val {
  font-size: 15px;
  font-weight: 700;
  color: #1a1f36;
}

.today-gmv { color: #6366f1; }
.today-pos { color: #0d9488; }
.today-neg { color: #ef4444; }

.today-note {
  font-size: 10px;
  color: #94a3b8;
  margin-left: auto;
  white-space: nowrap;
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
</style>
